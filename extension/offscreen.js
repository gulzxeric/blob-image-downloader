// Image bytes and PDF objects stay in memory, never in extension storage.
const jobs = new Map();
const MAX_BYTES = 256 * 1024 * 1024;
const MAX_PIXELS = 40 * 1000 * 1000;

async function handlePdf(message) {
  const { jobId } = message;
  if (message.type === "PDF_INIT") {
    if (jobs.has(jobId)) throw new Error("PDF 任务已存在");
    jobs.set(jobId, { doc: await PDFLib.PDFDocument.create(), bytes: 0, count: 0 });
    return {};
  }
  const job = jobs.get(jobId);
  if (message.type === "PDF_HAS") return { exists: Boolean(job) };
  if (message.type === "PDF_RELEASE") {
    if (job?.url) URL.revokeObjectURL(job.url);
    jobs.delete(jobId);
    return {};
  }
  if (!job?.doc) throw new Error("PDF 合成任务已丢失，请重新合并");
  if (message.type === "PDF_ADD") {
    if (message.index !== job.count) throw new Error("PDF 图片顺序不一致，请重新合并");
    const blob = await (await fetch(message.dataURL)).blob();
    if (job.bytes + blob.size > MAX_BYTES) throw new Error("PDF 图片总大小超过 256 MiB，请减少图片后重试");
    const bitmap = await createImageBitmap(blob);
    let retainedBytes = blob.size;
    let image;
    try {
      if (bitmap.width * bitmap.height > MAX_PIXELS) throw new Error("PDF 单张图片超过 4000 万像素，请缩小图片后重试");
      if (blob.type === "image/jpeg") image = await job.doc.embedJpg(await blob.arrayBuffer());
      else {
        // Decode every non-JPEG format through the browser, including animated
        // formats (first frame), preserving alpha without JPEG recompression.
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        try {
          canvas.getContext("2d").drawImage(bitmap, 0, 0);
          const png = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
          if (!png) throw new Error("图片转换失败");
          if (job.bytes + png.size > MAX_BYTES) throw new Error("PDF 转换后图片超过 256 MiB，请减少图片后重试");
          retainedBytes = Math.max(blob.size, png.size);
          image = await job.doc.embedPng(await png.arrayBuffer());
        } finally { canvas.width = canvas.height = 0; }
      }
    } finally { bitmap.close(); }
    // Stay within PDF's 14,400-point page limit without changing pixel data.
    const scale = Math.min(0.75, 14400 / Math.max(image.width, image.height));
    const width = image.width * scale, height = image.height * scale;
    job.doc.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
    await image.embed(); // Release decoded pixel buffers after each image.
    job.bytes += retainedBytes;
    job.count++;
    return {};
  }
  if (message.type === "PDF_FINISH") {
    if (!job.count || job.count !== message.total) throw new Error("图片不完整，未生成 PDF");
    const bytes = await job.doc.save();
    job.url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    job.doc = null;
    return { url: job.url };
  }
  throw new Error("不支持的 PDF 操作");
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.target !== "pdf-offscreen" || sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL("background.js")) return;
  handlePdf(message).then(result => respond({ ok: true, ...result }), error => respond({ ok: false, error: error.message }));
  return true;
});
