# 更新记录 / Changelog

## 1.1.0 — 2026-10-25

### 新增 / Added

- 新增「合并为 PDF」按钮，按现有阅读顺序将全部图片合并为一个 PDF，每张图片一页。
- 页面保持每张图片的宽高比，支持横竖图混排；JPEG 直接嵌入，其他可解码格式转为 PNG，并保留透明度。
- 在隐藏的扩展页面中本地合成 PDF，关闭弹窗后继续运行，重开可恢复进度显示。
- 合并失败或停止时不导出缺页文档，并显示失败原因。
- 增加 PDF 页数、页序、图片格式、透明度、页面比例、停止和弹窗关闭的测试。

Merge all selected images into one local PDF in reading order, with one image per page. Preserve individual page proportions and transparency, continue after popup closure, and avoid incomplete exports when a merge fails or is stopped.

### 更新 / Changed

- 扩展版本更新为 1.1.0，新增 `offscreen` 权限及本地打包的 PDF 库。
- 保留独立原图下载、原始字节与格式，以及既有筛选和排序规则。
- 重写中英文 README，更新隐私与权限说明、商店材料及弹窗截图。

### 限制 / Limits

- 两种模式均限制原图每张不超过 24 MiB。
- PDF 模式限制每张不超过 4000 万像素；整批累计不超过 256 MiB，按每张原文件与转码后文件大小的较大值计算。

## 1.0.2

- 修复同源课件 iframe 中的 blob 图片发现，支持嵌套框架的坐标计算、筛选和原始字节下载。
- 支持 iframe 内外滚动、隐藏框架排除，以及不可访问框架的跳过处理。

Discover blob images in same-origin course iframes, including nested-frame coordinates, visibility filtering, and original-byte downloads.
