const $ = id => document.getElementById(id);
let tabId;
let scanned = null;
let currentJob = null;
let working = false;
let polling = false;

function options() {
  return BlobImages.normalizeOptions(Object.fromEntries(Object.keys(BlobImages.defaults).map(key => [key, $(key).value])));
}
function showError(error) { $("error").textContent = error || ""; $("error").hidden = !error; }
function buttons() {
  const busy = working || currentJob?.busy;
  $("scan").disabled = busy || !Number.isInteger(tabId);
  $("download").disabled = busy || !scanned?.length;
  $("download").hidden = Boolean(currentJob?.submitting);
  $("stop").hidden = !currentJob?.submitting;
  $("stop").disabled = working;
  for (const input of $("settings").elements) input.disabled = Boolean(busy);
}

function renderList(items, downloading) {
  const labels = { queued: "待提交", in_progress: "保存中", complete: "已保存", failed: "失败", skipped: "未提交" };
  $("image-list").replaceChildren(...items.map((item, index) => {
    const li = document.createElement("li");
    const detail = document.createElement("span");
    const number = document.createElement("span");
    number.className = "number";
    number.textContent = String(index + 1).padStart(3, "0");
    detail.append(number, `${item.width} × ${item.height}`);
    const state = document.createElement("span");
    state.className = `item-state ${item.state || ""}`;
    state.textContent = downloading ? labels[item.state] : `Y ${Math.round(item.top)}`;
    if (item.error) li.title = item.error;
    li.append(detail, state);
    return li;
  }));
}

function renderJob(job) {
  currentJob = job;
  if (!job) { buttons(); return; }
  $("image-count").textContent = `${job.complete}/${job.total}`;
  $("result-heading").textContent = job.busy ? "正在按顺序保存" : job.failed || job.skipped ? "本次下载已结束" : "图片已全部保存";
  $("status").textContent = `已保存 ${job.complete} 张 · 失败 ${job.failed} 张 · 保存中 ${job.pending} 张 · 未提交 ${job.skipped} 张` +
    (job.notice ? `。${job.notice}` : "");
  $("progress").hidden = false;
  $("progress").max = job.total;
  $("progress").value = job.complete + job.failed + job.skipped;
  $("path").hidden = false;
  $("path").textContent = `下载目录 / ${job.folder}/`;
  renderList(job.items, true);
  buttons();
}

async function request(type, extra = {}) {
  const result = await chrome.runtime.sendMessage({ type, tabId, ...extra });
  if (!result?.ok) throw new Error(result?.error || "插件连接失败");
  return result;
}

async function action(task) {
  showError("");
  if (!$("settings").reportValidity()) return;
  const settings = options();
  working = true;
  buttons();
  try {
    await chrome.storage.local.set({ options: settings });
    await task(settings);
  } catch (error) {
    showError(/Cannot access|cannot be scripted|Missing host permission|extensions gallery/i.test(error.message)
      ? "此页面不允许插件运行。请切换到普通网页；本地文件需在扩展详情中启用文件网址访问。" : error.message);
  } finally { working = false; buttons(); }
}

$("scan").addEventListener("click", () => action(async settings => {
  const result = await request("SCAN", { options: settings });
  scanned = result.images;
  currentJob = null;
  $("image-count").textContent = `${scanned.length} 张`;
  $("result-heading").textContent = scanned.length ? "按这个顺序下载" : "没有找到符合条件的图片";
  $("status").textContent = scanned.length ? "下载时会重新扫描页面，每批图片放进独立文件夹。" : "先让图片加载，再试一次。支持主页面及同源 iframe 中的 blob 图片。";
  $("progress").hidden = true;
  $("path").hidden = true;
  renderList(scanned, false);
}));
$("download").addEventListener("click", () => action(async settings => {
  renderJob((await request("START", { options: settings })).job);
}));
$("stop").addEventListener("click", () => action(async () => { renderJob((await request("STOP")).job); }));
$("open-downloads").addEventListener("click", () => chrome.downloads.showDefaultFolder());
$("settings").addEventListener("input", () => {
  scanned = null;
  if (!currentJob) {
    $("image-list").replaceChildren();
    $("image-count").textContent = "—";
    $("status").textContent = "设置已修改，请重新扫描图片。";
  }
  buttons();
});

async function poll() {
  if (polling || working || !Number.isInteger(tabId)) return;
  polling = true;
  try {
    const { job } = await request("GET_STATUS");
    if (job && (job.busy || currentJob)) renderJob(job);
  } catch (error) { showError(error.message); }
  finally { polling = false; }
}

async function initialize() {
  try {
    const stored = await chrome.storage.local.get("options");
    const settings = BlobImages.normalizeOptions(stored.options);
    for (const [key, value] of Object.entries(settings)) $(key).value = value;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = tab?.id;
    $("page-title").textContent = tab?.title || "当前网页";
    if (!Number.isInteger(tabId)) throw new Error("没有可用的网页，请先打开需要下载图片的页面。");
    renderJob((await request("GET_STATUS")).job);
    buttons();
    setInterval(poll, 1000);
  } catch (error) { showError(error.message); }
}
void initialize();
