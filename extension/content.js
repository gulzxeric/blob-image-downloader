(function () {
  if (globalThis.BlobImageRunner) return;
  const runner = { jobId: null, stopped: false };
  globalThis.BlobImageRunner = runner;

  function scan(options) {
    const images = Array.from(document.querySelectorAll("img")).flatMap(img => {
      // Match the original src-based scope; do not expand to remote or background images.
      if (!img.src.startsWith("blob:") || !img.complete || img.naturalWidth <= options.minSize || img.naturalHeight <= options.minSize) return [];
      const rect = img.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || img.getClientRects().length === 0) return [];
      for (let node = img; node instanceof Element; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || Number(style.opacity) === 0) return [];
      }
      return [{ url: img.src, width: img.naturalWidth, height: img.naturalHeight,
        top: rect.top + scrollY, left: rect.left + scrollX }];
    });
    return BlobImages.sortImages(images, options.rowTolerance);
  }

  function readDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("无法读取图片数据"));
      reader.readAsDataURL(blob);
    });
  }

  async function run(job) {
    runner.jobId = job.id;
    runner.stopped = false;
    try {
      for (let index = 0; index < job.images.length && !runner.stopped; index++) {
        try {
          const response = await fetch(job.images[index].url, { signal: AbortSignal.timeout(15000) });
          if (!response.ok) throw new Error(`读取图片失败：${response.status}`);
          const blob = await response.blob();
          // Keep a single JSON message well below Chromium's 64 MiB IPC limit.
          if (blob.size > 24 * 1024 * 1024) throw new Error("单张图片超过 24 MiB，未下载");
          const bytes = new Uint8Array(await blob.slice(0, 64).arrayBuffer());
          const mime = BlobImages.detectMime(bytes, blob.type);
          const dataURL = await readDataURL(blob.slice(0, blob.size, mime));
          if (runner.stopped) break;
          const result = await chrome.runtime.sendMessage({ type: "SAVE_IMAGE", jobId: job.id, index, dataURL, mime });
          if (!result?.ok) throw new Error(result?.error || "浏览器拒绝下载");
        } catch (error) {
          await chrome.runtime.sendMessage({ type: "IMAGE_FAILED", jobId: job.id, index, error: error.message });
        }
        if (!runner.stopped) await new Promise(resolve => setTimeout(resolve, job.options.interval));
      }
    } catch (error) {
      console.warn("Blob 图片下载已停止", error);
    } finally {
      const stopped = runner.stopped;
      runner.jobId = null;
      await chrome.runtime.sendMessage({ type: "RUN_FINISHED", jobId: job.id, stopped }).catch(() => {});
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message.type === "SCAN_PAGE") respond({ images: scan(BlobImages.normalizeOptions(message.options)) });
    if (message.type === "RUN_JOB") {
      if (runner.jobId) { respond({ ok: false, error: "当前页面已有下载任务" }); return; }
      void run(message.job);
      respond({ ok: true });
    }
    if (message.type === "STOP_JOB") { runner.stopped = true; respond({ ok: true }); }
    if (message.type === "PING_JOB") respond({ jobId: runner.jobId });
  });
})();
