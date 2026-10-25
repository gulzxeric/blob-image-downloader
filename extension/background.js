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

async function pdfRequest(type, jobId, extra = {}, create = false) {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"], documentUrls: [chrome.runtime.getURL("offscreen.html")] });
  if (!contexts.length) {
    if (!create) throw new Error("PDF 合成任务已丢失，请重新合并");
    await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: ["BLOBS"], justification: "在本地解码图片、合并 PDF 并管理下载用的 Blob URL" });
  }
  const result = await chrome.runtime.sendMessage({ target: "pdf-offscreen", type, jobId, ...extra });
  if (!result?.ok) throw new Error(result?.error || "PDF 合成失败");
  return result;
}

async function releasePdf(job) {
  await pdfRequest("PDF_RELEASE", job.id).catch(() => {});
}

async function reconcilePdfDownload(job) {
  if (job.pdf?.state !== "in_progress") return;
  const [download] = await chrome.downloads.search({ id: job.pdf.downloadId });
  if (download?.state === "in_progress") return;
  job.pdf.state = download?.state === "complete" ? "complete" : "failed";
  job.pdf.error = job.pdf.state === "failed" ? download?.error || "PDF 下载记录已移除" : "";
  await releasePdf(job);
}

async function reconcile(job) {
  if (!job) return null;
  await reconcilePdfDownload(job);
  if (job.pdf?.state === "generating") {
    job.pdf.state = "failed";
    job.pdf.error = "PDF 生成被中断，请重新合并";
    await releasePdf(job);
  }
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
      if (job.submitting) {
        finishSubmission(job, "页面已刷新或关闭；剩余图片未提交");
        await cancelPdf(job, "页面已刷新或关闭，未生成 PDF");
      }
      job.stopping = false;
    }
  }
  if (job.mode === "pdf" && job.submitting) {
    const alive = await pdfRequest("PDF_HAS", job.id).catch(() => null);
    if (!alive?.exists) {
      await chrome.tabs.sendMessage(job.tabId, { type: "STOP_JOB" }).catch(() => {});
      finishSubmission(job, "PDF 合成任务已丢失，请重新合并");
      await cancelPdf(job, job.notice);
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

async function cancelPdf(job, error) {
  if (job.mode !== "pdf" || ["complete", "in_progress", "failed", "cancelled"].includes(job.pdf.state)) return;
  job.pdf.state = "failed";
  job.pdf.error = error;
  await releasePdf(job);
}

async function finishPdf(job) {
  if (job.mode !== "pdf" || job.pdf.state !== "collecting") return;
  if (job.items.some(item => item.state !== "complete")) {
    await cancelPdf(job, "有图片失败或未提交，未生成 PDF；请重新扫描后重试");
    return;
  }
  job.pdf.state = "generating";
  await writeJob(job);
  try {
    const { url } = await pdfRequest("PDF_FINISH", job.id, { total: job.items.length });
    job.pdf.downloadId = await chrome.downloads.download({ url, filename: job.pdf.filename, saveAs: false, conflictAction: "uniquify" });
    job.pdf.state = "in_progress";
  } catch (error) {
    job.pdf.state = "failed";
    job.pdf.error = error.message;
    await releasePdf(job);
  }
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
      await finishPdf(job);
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
      try {
        if (job.mode === "pdf") {
          if (item.width * item.height > 40 * 1000 * 1000) throw new Error("PDF 单张图片超过 4000 万像素，请缩小图片后重试");
          await pdfRequest("PDF_ADD", job.id, { index: message.index, dataURL: message.dataURL });
          item.state = "complete";
        } else {
          item.filename = BlobImages.filename(job.folder, job.options.prefix, message.index, job.items.length, mime);
          item.downloadId = await chrome.downloads.download({ url: message.dataURL, filename: item.filename, saveAs: false, conflictAction: "uniquify" });
          item.state = "in_progress";
        }
      } catch (error) {
        item.state = "failed";
        item.error = error.message;
      }
    }
    if (job.mode === "pdf" && item.state === "failed") {
      await chrome.tabs.sendMessage(job.tabId, { type: "STOP_JOB" }).catch(() => {});
      finishSubmission(job, "图片处理失败，已停止合并");
      job.stopping = true;
      await cancelPdf(job, `第 ${message.index + 1} 张图片：${item.error}。未生成 PDF`);
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
      await cancelPdf(job, "已停止合并，未生成 PDF");
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
  const mode = message.mode === "pdf" ? "pdf" : "images";
  const job = { id, tabId, mode, options, folder: BlobImages.batchFolder(options, new Date(), id),
    submitting: true, notice: "", items: images.map(({ url, ...image }) => ({ ...image, state: "queued" })) };
  if (mode === "pdf") {
    job.pdf = { state: "collecting", filename: `${job.folder}/${options.prefix}.pdf` };
    await pdfRequest("PDF_INIT", id, {}, true);
  }
  await writeJob(job);
  try {
    const started = await chrome.tabs.sendMessage(tabId, { type: "RUN_JOB", job: { id, options, images } });
    if (!started?.ok) throw new Error(started?.error || "无法启动下载");
  } catch (error) {
    finishSubmission(job, error.message);
    await cancelPdf(job, error.message);
    await writeJob(job);
    throw error;
  }
  return { ok: true, job: BlobImages.summary(job) };
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.target === "pdf-offscreen") return;
  serialize(() => handle(message, sender)).then(respond, error => respond({ ok: false, error: error.message }));
  return true;
});

chrome.downloads.onChanged.addListener(delta => {
  if (!delta.state) return;
  void serialize(async () => {
    const jobs = await chrome.storage.session.get(null);
    for (const [key, job] of Object.entries(jobs)) {
      if (!key.startsWith("job:")) continue;
      if (job.pdf?.downloadId === delta.id) {
        await reconcilePdfDownload(job);
        await writeJob(job);
        continue;
      }
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
    if (job?.submitting) {
      finishSubmission(job, "页面已关闭；剩余图片未提交");
      await cancelPdf(job, "页面已关闭，未生成 PDF");
      await writeJob(job);
    }
  }).catch(console.error);
});
