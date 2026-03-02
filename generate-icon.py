"""Generate icon for Markdown to Action Plan - document with checkmark."""
import struct
import zlib
import math
import os


def create_png(size=128):
    w = h = size
    pixels = [[(0, 0, 0, 0)] * w for _ in range(h)]

    def fill_rect(x1, y1, x2, y2, color):
        for y in range(max(0, y1), min(h, y2)):
            for x in range(max(0, x1), min(w, x2)):
                pixels[y][x] = color

    def fill_circle(cx, cy, r, color):
        for y in range(max(0, int(cy - r)), min(h, int(cy + r) + 1)):
            for x in range(max(0, int(cx - r)), min(w, int(cx + r) + 1)):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2:
                    pixels[y][x] = color

    def draw_thick_line(x1, y1, x2, y2, thickness, color):
        length = math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
        if length == 0:
            return
        dx, dy = (x2 - x1) / length, (y2 - y1) / length
        half_t = thickness / 2
        min_x = max(0, int(min(x1, x2) - half_t))
        max_x = min(w, int(max(x1, x2) + half_t) + 1)
        min_y = max(0, int(min(y1, y2) - half_t))
        max_y = min(h, int(max(y1, y2) + half_t) + 1)
        for y in range(min_y, max_y):
            for x in range(min_x, max_x):
                # Distance from point to line segment
                t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / length))
                px, py = x1 + t * dx * length, y1 + t * dy * length
                dist = math.sqrt((x - px) ** 2 + (y - py) ** 2)
                if dist <= half_t:
                    pixels[y][x] = color

    s = size  # shorthand

    # Colors
    blue = (59, 130, 246, 255)
    white = (255, 255, 255, 255)
    light_blue = (219, 234, 254, 255)
    green = (34, 197, 94, 255)
    gray = (156, 163, 175, 255)
    dark_blue = (37, 99, 235, 255)

    # Document shadow
    fill_rect(int(s * 0.18), int(s * 0.10), int(s * 0.82), int(s * 0.95), (0, 0, 0, 40))

    # Document body - white rectangle
    doc_l, doc_t, doc_r, doc_b = int(s * 0.14), int(s * 0.06), int(s * 0.78), int(s * 0.91)
    fill_rect(doc_l, doc_t, doc_r, doc_b, white)

    # Blue border (top, left, bottom, right)
    bw = max(2, s // 32)  # border width
    fill_rect(doc_l, doc_t, doc_r, doc_t + bw, blue)  # top
    fill_rect(doc_l, doc_b - bw, doc_r, doc_b, blue)  # bottom
    fill_rect(doc_l, doc_t, doc_l + bw, doc_b, blue)  # left
    fill_rect(doc_r - bw, doc_t, doc_r, doc_b, blue)  # right

    # Folded corner (top-right)
    fold_size = int(s * 0.14)
    fold_x = doc_r - bw - fold_size
    fold_y = doc_t + bw
    for y in range(fold_y, fold_y + fold_size):
        for x in range(fold_x, doc_r - bw):
            dy = y - fold_y
            dx = x - fold_x
            if dx + dy >= fold_size:
                # Inside the fold triangle
                pixels[y][x] = light_blue
            if abs(dx + dy - fold_size) <= 1:
                pixels[y][x] = dark_blue

    # Text lines (gray bars)
    line_h = max(2, s // 24)
    line_gap = max(4, s // 14)
    line_start_y = doc_t + bw + int(s * 0.14)
    line_l = doc_l + bw + int(s * 0.06)
    line_r = doc_r - bw - int(s * 0.10)

    for i in range(3):
        ly = line_start_y + i * line_gap
        # Vary line lengths
        lr = line_r if i == 0 else line_r - int(s * 0.08) if i == 1 else line_r - int(s * 0.16)
        fill_rect(line_l, ly, lr, ly + line_h, gray)

    # Green checkmark circle in lower portion
    cx = int(s * 0.46)
    cy = int(s * 0.70)
    cr = int(s * 0.14)
    fill_circle(cx, cy, cr, green)

    # White checkmark inside circle
    t = max(2, s // 24)
    # Left stroke of check
    draw_thick_line(cx - cr * 0.45, cy + cr * 0.0, cx - cr * 0.05, cy + cr * 0.40, t, white)
    # Right stroke of check
    draw_thick_line(cx - cr * 0.05, cy + cr * 0.40, cx + cr * 0.50, cy - cr * 0.35, t, white)

    # Encode as PNG
    raw = b''
    for row in pixels:
        raw += b'\x00'
        for r, g, b, a in row:
            raw += bytes([r, g, b, a])

    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(raw, 9))
    png += chunk(b'IEND', b'')
    return png


def png_to_ico(png_data, size):
    ico = struct.pack('<HHH', 0, 1, 1)
    s = 0 if size >= 256 else size
    ico += struct.pack('<BBBBHHII', s, s, 0, 0, 1, 32, len(png_data), 22)
    ico += png_data
    return ico


if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))

    png = create_png(128)
    ico = png_to_ico(png, 128)

    ico_path = os.path.join(script_dir, 'action-plan.ico')
    with open(ico_path, 'wb') as f:
        f.write(ico)

    # Also save PNG for preview
    png_path = os.path.join(script_dir, 'action-plan.png')
    with open(png_path, 'wb') as f:
        f.write(png)

    print(f'Icon created: {ico_path}')
    print(f'Preview: {png_path}')
