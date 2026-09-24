# -*- coding: utf-8 -*-
"""生成 TabBar 线性图标（81x81 PNG，纯标准库实现，无需 Pillow）。

用法：python tools/gen_icons.py
输出：assets/tabbar/{home,fridge,recipe,profile}[-active].png
"""
import math
import os
import struct
import zlib

SIZE = 81
SS = 4  # 超采样倍数
COLOR_ON = (126, 140, 106)    # #7E8C6A 抹茶绿 选中
COLOR_OFF = (172, 178, 156)  # #ACB29C 未选中


def seg_dist(px, py, x1, y1, x2, y2):
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot(px - x1, py - y1)
    t = ((px - x1) * dx + (py - y1) * dy) / float(dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))


def stroke(p, x1, y1, x2, y2, w):
    return seg_dist(p[0], p[1], x1, y1, x2, y2) <= w / 2.0


def ring(p, cx, cy, r, w):
    d = math.hypot(p[0] - cx, p[1] - cy)
    return abs(d - r) <= w / 2.0


def arc(p, cx, cy, r, a0, a1, w):
    """a0/a1 为角度（弧度），只画弧线"""
    ang = math.atan2(p[1] - cy, p[0] - cx)
    # 归一化到 [0, 2pi)
    if ang < 0:
        ang += 2 * math.pi
    lo, hi = a0 % (2 * math.pi), a1 % (2 * math.pi)
    in_range = lo <= ang <= hi if lo <= hi else (ang >= lo or ang <= hi)
    if not in_range:
        return False
    return abs(math.hypot(p[0] - cx, p[1] - cy) - r) <= w / 2.0


def icon_home(p):
    # 屋顶
    a = stroke(p, 0.50, 0.16, 0.13, 0.50, 0.075)
    b = stroke(p, 0.50, 0.16, 0.87, 0.50, 0.075)
    # 墙体
    c = stroke(p, 0.22, 0.52, 0.22, 0.86, 0.075)
    d = stroke(p, 0.78, 0.52, 0.78, 0.86, 0.075)
    e = stroke(p, 0.22, 0.86, 0.78, 0.86, 0.075)
    # 门
    f = stroke(p, 0.42, 0.86, 0.42, 0.68, 0.07)
    g = stroke(p, 0.58, 0.86, 0.58, 0.68, 0.07)
    h = stroke(p, 0.42, 0.68, 0.58, 0.68, 0.07)
    return a or b or c or d or e or f or g or h


def icon_fridge(p):
    # 外框
    a = stroke(p, 0.30, 0.12, 0.70, 0.12, 0.075)
    b = stroke(p, 0.30, 0.90, 0.70, 0.90, 0.075)
    c = stroke(p, 0.30, 0.12, 0.30, 0.90, 0.075)
    d = stroke(p, 0.70, 0.12, 0.70, 0.90, 0.075)
    # 中隔板
    e = stroke(p, 0.30, 0.44, 0.70, 0.44, 0.075)
    # 把手
    f = stroke(p, 0.60, 0.22, 0.60, 0.36, 0.07)
    g = stroke(p, 0.60, 0.54, 0.60, 0.76, 0.07)
    return a or b or c or d or e or f or g


def icon_recipe(p):
    # 碗身（下半圆）
    a = arc(p, 0.50, 0.52, 0.30, math.pi * 0.05, math.pi * 0.95, 0.075)
    # 碗口
    b = stroke(p, 0.20, 0.52, 0.80, 0.52, 0.075)
    # 底座
    c = stroke(p, 0.36, 0.85, 0.64, 0.85, 0.07)
    # 热气
    d = stroke(p, 0.42, 0.36, 0.38, 0.22, 0.065)
    e = stroke(p, 0.58, 0.36, 0.62, 0.22, 0.065)
    return a or b or c or d or e


def icon_profile(p):
    # 头
    a = ring(p, 0.50, 0.34, 0.15, 0.075)
    # 肩
    b = arc(p, 0.50, 0.92, 0.30, math.pi * 1.08, math.pi * 1.92, 0.075)
    return a or b


ICONS = {
    "home": icon_home,
    "fridge": icon_fridge,
    "recipe": icon_recipe,
    "profile": icon_profile,
}


def render(fn, color):
    rows = []
    for y in range(SIZE):
        row = bytearray()
        for x in range(SIZE):
            hits = 0
            for sy in range(SS):
                for sx in range(SS):
                    px = (x + (sx + 0.5) / SS) / SIZE
                    py = (y + (sy + 0.5) / SS) / SIZE
                    if fn((px, py)):
                        hits += 1
            if hits:
                alpha = int(round(255 * hits / float(SS * SS)))
                row += bytes((color[0], color[1], color[2], alpha))
            else:
                row += bytes((0, 0, 0, 0))
        rows.append(bytes(row))
    raw = b"".join(b"\x00" + r for r in rows)
    return raw


def png_bytes(raw, w, h):
    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def main():
    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "tabbar")
    os.makedirs(out, exist_ok=True)
    for name, fn in ICONS.items():
        for suffix, color in (("", COLOR_OFF), ("-active", COLOR_ON)):
            data = png_bytes(render(fn, color), SIZE, SIZE)
            path = os.path.join(out, f"{name}{suffix}.png")
            with open(path, "wb") as f:
                f.write(data)
            print("wrote", path, len(data), "bytes")


if __name__ == "__main__":
    main()
