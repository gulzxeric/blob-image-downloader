/* Shared pure helpers. Also loaded into the isolated content-script world. */
(function () {
  const defaults = { minSize: 50, rowTolerance: 20, interval: 300, prefix: "image", folder: "blob-images" };
  function integer(value, fallback, min, max) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : fallback;
  }
  function safeName(value, fallback) {
    const cleaned = String(value ?? "").normalize("NFC").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
      .replace(/\.{2,}/g, "_").replace(/^[.\s]+|[.\s]+$/g, "").slice(0, 64);
    if (!cleaned) return fallback;
    return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(cleaned) ? `_${cleaned}` : cleaned;
  }
  function normalizeOptions(input = {}) {
    return {
      minSize: integer(input.minSize, defaults.minSize, 0, 10000),
      rowTolerance: integer(input.rowTolerance, defaults.rowTolerance, 0, 200),
      interval: integer(input.interval, defaults.interval, 100, 3000),
      prefix: safeName(input.prefix, defaults.prefix),
      folder: safeName(input.folder, defaults.folder)
    };
  }
  // Anchor each row to its smallest top coordinate. Never use a fuzzy comparator:
  // pairwise "within 20px" comparisons are not transitive.
  function sortImages(images, tolerance = 20) {
    const ordered = images.map((item, order) => ({ ...item, order }))
      .sort((a, b) => a.top - b.top || a.left - b.left || a.order - b.order);
    const rows = [];
    for (const image of ordered) {
      let row = rows.at(-1);
      if (!row || image.top - row.top > tolerance) {
        row = { top: image.top, items: [] };
        rows.push(row);
      }
      row.items.push(image);
    }
    return rows.flatMap(row => row.items.sort((a, b) => a.left - b.left || a.top - b.top || a.order - b.order))
      .map(({ order, ...item }) => item);
  }
  function extensionFor(mime) {
    return ({ "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/webp": "webp",
      "image/gif": "gif", "image/avif": "avif", "image/bmp": "bmp", "image/x-ms-bmp": "bmp",
      "image/svg+xml": "svg", "image/x-icon": "ico", "image/vnd.microsoft.icon": "ico",
      "image/tiff": "tif", "image/apng": "png" })[String(mime).split(";")[0].toLowerCase()] || "bin";
  }
  function detectMime(bytes, declared = "") {
    const starts = (...values) => values.every((value, index) => bytes[index] === value);
    const ascii = (start, length) => String.fromCharCode(...bytes.slice(start, start + length));
    if (starts(137, 80, 78, 71, 13, 10, 26, 10)) return "image/png";
    if (starts(255, 216, 255)) return "image/jpeg";
    if (["GIF87a", "GIF89a"].includes(ascii(0, 6))) return "image/gif";
    if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
    if (starts(66, 77)) return "image/bmp";
    if (ascii(4, 4) === "ftyp" && /avif|avis/.test(ascii(8, bytes.length - 8))) return "image/avif";
    return extensionFor(declared) !== "bin" ? declared.split(";")[0].toLowerCase() : "application/octet-stream";
  }
  function batchFolder(options, date = new Date(), id = "") {
    const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}` +
      `-${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}${String(date.getSeconds()).padStart(2, "0")}`;
    return `${options.folder}/${stamp}${id ? `-${id.slice(0, 6)}` : ""}`;
  }
  function filename(folder, prefix, index, count, mime) {
    const digits = Math.max(3, String(count).length);
    return `${folder}/${prefix}_${String(index + 1).padStart(digits, "0")}.${extensionFor(mime)}`;
  }
  function summary(job) {
    if (!job) return null;
    const complete = job.items.filter(item => item.state === "complete").length;
    const failed = job.items.filter(item => item.state === "failed").length;
    const pending = job.items.filter(item => item.state === "in_progress").length;
    const skipped = job.items.filter(item => item.state === "skipped").length;
    return { ...job, total: job.items.length, complete, failed, pending, skipped,
      busy: job.submitting || Boolean(job.stopping) || pending > 0 };
  }
  const api = { defaults, safeName, normalizeOptions, sortImages, extensionFor, detectMime, batchFolder, filename, summary };
  globalThis.BlobImages = api;
  if (typeof module !== "undefined") module.exports = api;
})();
