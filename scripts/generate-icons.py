"""Render a simple contact-sheet icon using only Python's standard library."""
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1] / "extension" / "icons"
ROOT.mkdir(parents=True, exist_ok=True)

def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)

def rounded(x, y, left, top, right, bottom, radius):
    if not (left <= x < right and top <= y < bottom):
        return False
    cx = min(max(x, left + radius), right - radius)
    cy = min(max(y, top + radius), bottom - radius)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2

for size in (16, 32, 48, 128):
    raw = bytearray()
    # Supersample for smooth contours at small toolbar sizes.
    for y in range(size):
        raw.append(0)
        for x in range(size):
            samples = []
            for sy in range(4):
                for sx in range(4):
                    # The store icon has 16px transparent padding on each side.
                    inset, art_size = (16, 96) if size == 128 else (0, size)
                    px = (x + (sx + .5) / 4 - inset) * 128 / art_size
                    py = (y + (sy + .5) / 4 - inset) * 128 / art_size
                    color = (33, 91, 221, 255) if rounded(px, py, 0, 0, 128, 128, 26) else (0, 0, 0, 0)
                    for left, top in ((25, 24), (69, 24), (25, 70), (69, 70)):
                        if rounded(px, py, left, top, left + 34, top + 35, 5):
                            color = (255, 255, 255, 255)
                        if left + 7 <= px < left + 18 and top + 24 <= py < top + 28:
                            color = (151, 184, 255, 255)
                    samples.append(color)
            raw.extend(round(sum(pixel[channel] for pixel in samples) / len(samples)) for channel in range(4))
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
    (ROOT / f"icon{size}.png").write_bytes(png)
print(ROOT)
