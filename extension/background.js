importScripts("common.js");

// Serialize storage mutations so a completion event cannot overwrite a new item.
let queue = Promise.resolve();
function serialize(task) {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
}
const keyFor = tabId => `job:${tabId}`;
const readJob = async tabId => (await chrome.storage.session.get(keyFor(tabId)))[keyFor(tabId)] || null;
const writeJob = job => chrome.storage.session.set({ [keyFor(job.tabId)]: job });

async function reconcile(job) {
  if (!job) return null;
  for (const item of job.items.filter(item => item.state === "in_progress")) {
    const [download] = await chrome.downloads.search({ id: item.downloadId });
    if (!download || download.state === "interrupted") {
      item.state = "failed";
      item.error = download?.error || "下载记录已移除";
    } else if (download.state === "complete") item.state = "complete";
  }
  if (job.submitting || job.stopping) {
    const ping = await chrome.tabs.sendMessage(job.tabId, { type: "PING_JOB" }).catch(() => null);
    if (ping?.jobId !== job.id) {
      if (job.submitting) finishSubmission(job, "页面已刷新或关闭；剩余图片未提交");
      job.stopping = false;
    }
  }
  await writeJob(job);
  return BlobImages.summary(job);
}

function finishSubmission(job, reason = "") {
  job.submitting = false;
  if (reason) job.notice = reason;
  for (const item of job.items) if (item.state === "queued") item.state = "skipped";
}

async function scanTab(tabId, options) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ["common.js", "content.js"] });
  const result = await chrome.tabs.sendMessage(tabId, { type: "SCAN_PAGE", options });
  return result.images;
}

function validateTabId(tabId) {
  if (!Number.isInteger(tabId) || tabId < 0) throw new Error("无法确定当前网页");
}

async function handle(message, sender) {
  if (sender.id !== chrome.runtime.id) throw new Error("无效的插件消息");
  const fromPage = Number.isInteger(sender.tab?.id) && !sender.url?.startsWith(chrome.runtime.getURL(""));
  const pageTypes = ["SAVE_IMAGE", "IMAGE_FAILED", "RUN_FINISHED"];
  if (fromPage) {
    if (sender.frameId !== 0 || !pageTypes.includes(message.type)) throw new Error("不支持的页面消息");
    const job = await readJob(sender.tab.id);
    if (!job || job.id !== message.jobId) throw new Error("下载任务已过期");
    if (message.type === "RUN_FINISHED") {
      finishSubmission(job, message.stopped ? "已停止提交；浏览器会继续保存已提交的图片" : "");
      job.stopping = false;
      await writeJob(job);
      return { ok: true };
    }
    const item = job.items[message.index];
    if (!job.submitting || !item || item.state !== "queued") throw new Error("图片已处理或任务已停止");
    if (message.type === "IMAGE_FAILED") {
      item.state = "failed";
      item.error = String(message.error).slice(0, 200);
    } else {
      if (typeof message.dataURL !== "string" || !/^data:(image\/[a-z0-9.+-]+|application\/octet-stream);base64,/i.test(message.dataURL) || message.dataURL.length > 34 * 1024 * 1024) {
        throw new Error("无效的图片数据");
      }
      const mime = message.dataURL.slice(5, message.dataURL.indexOf(";"));
      item.filename = BlobImages.filename(job.folder, job.options.prefix, message.index, job.items.length, mime);
      try {
        item.downloadId = await chrome.downloads.download({ url: message.dataURL, filename: item.filename, saveAs: false, conflictAction: "uniquify" });
        item.state = "in_progress";
      } catch (error) {
        item.state = "failed";
        item.error = error.message;
      }
    }
    await writeJob(job);
    return { ok: true };
  }

  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(""))) throw new Error("无效的插件消息");
  validateTabId(message.tabId);
  const tabId = message.tabId;
  if (message.type === "GET_STATUS") return { ok: true, job: await reconcile(await readJob(tabId)) };
  if (message.type === "STOP") {
    const job = await readJob(tabId);
    if (job?.submitting) {
      await chrome.tabs.sendMessage(tabId, { type: "STOP_JOB" }).catch(() => {});
      finishSubmission(job, "已停止提交；浏览器会继续保存已提交的图片");
      job.stopping = true;
      await writeJob(job);
    }
    return { ok: true, job: BlobImages.summary(job) };
  }
  if (!["SCAN", "START"].includes(message.type)) throw new Error("不支持的操作");
  const previous = await reconcile(await readJob(tabId));
  if (previous?.busy) throw new Error("请等待当前下载任务结束");
  const options = BlobImages.normalizeOptions(message.options);
  const images = await scanTab(tabId, options);
  if (message.type === "SCAN") return { ok: true, images };
  if (!images.length) throw new Error("没有符合条件的 blob 图片。请先让网页加载图片，再重新扫描。");
  const id = crypto.randomUUID();
  const job = { id, tabId, options, folder: BlobImages.batchFolder(options, new Date(), id),
    submitting: true, notice: "", items: images.map(({ url, ...image }) => ({ ...image, state: "queued" })) };
  await writeJob(job);
  try {
    const started = await chrome.tabs.sendMessage(tabId, { type: "RUN_JOB", job: { id, options, images } });
    if (!started?.ok) throw new Error(started?.error || "无法启动下载");
  } catch (error) {
    finishSubmission(job, error.message);
    await writeJob(job);
    throw error;
  }
  return { ok: true, job: BlobImages.summary(job) };
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  serialize(() => handle(message, sender)).then(respond, error => respond({ ok: false, error: error.message }));
  return true;
});

chrome.downloads.onChanged.addListener(delta => {
  if (!delta.state) return;
  void serialize(async () => {
    const jobs = await chrome.storage.session.get(null);
    for (const [key, job] of Object.entries(jobs)) {
      if (!key.startsWith("job:")) continue;
      const item = job.items.find(item => item.downloadId === delta.id);
      if (!item) continue;
      if (delta.state.current === "complete") item.state = "complete";
      if (delta.state.current === "interrupted") { item.state = "failed"; item.error = delta.error?.current || "下载中断"; }
      await writeJob(job);
    }
  }).catch(console.error);
});

chrome.tabs.onRemoved.addListener(tabId => {
  void serialize(async () => {
    const job = await readJob(tabId);
    if (job?.submitting) { finishSubmission(job, "页面已关闭；剩余图片未提交"); await writeJob(job); }
  }).catch(console.error);
});
