# -*- coding: utf-8 -*-
"""生成治愈风手绘细线插画 PNG（纯标准库，无需 Pillow）。

用法：python tools/gen_illustrations.py
输出：assets/illustration/*.png
"""
import math
import os
import struct
import zlib

LINE = (126, 140, 106)   # #7E8C6A 抹茶绿主线
SOFT = (172, 178, 156)   # #ACB29C 浅线，用于点缀
SS = 3                   # 超采样倍数


# --------------------------------------------------------------------------
# 形状：返回 True 表示该点在线上
# --------------------------------------------------------------------------

def polyline(pts, w):
    """折线/曲线描边"""
    segs = [(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]

    def test(p):
        for (x1, y1), (x2, y2) in segs:
            dx, dy = x2 - x1, y2 - y1
            if dx == 0 and dy == 0:
                d = math.hypot(p[0] - x1, p[1] - y1)
            else:
                t = ((p[0] - x1) * dx + (p[1] - y1) * dy) / float(dx * dx + dy * dy)
                t = max(0.0, min(1.0, t))
                d = math.hypot(p[0] - (x1 + t * dx), p[1] - (y1 + t * dy))
            if d <= w / 2.0:
                return True
        return False

    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return test, (min(xs), min(ys), max(xs), max(ys))


def round_rect(x0, y0, x1, y1, r, w):
    """圆角矩形描边"""
    pts = []
    # 四角用 1/4 圆采样，边用直线
    corners = [
        (x1 - r, y0 + r, -math.pi / 2, 0),
        (x1 - r, y1 - r, 0, math.pi / 2),
        (x0 + r, y1 - r, math.pi / 2, math.pi),
        (x0 + r, y0 + r, math.pi, math.pi * 1.5),
    ]
    for cx, cy, a0, a1 in corners:
        for i in range(11):
            a = a0 + (a1 - a0) * i / 10.0
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    pts.append(pts[0])
    return polyline(pts, w)


def line(x0, y0, x1, y1, w):
    return polyline([(x0, y0), (x1, y1)], w)


def arc(cx, cy, r, a0, a1, w, steps=28):
    pts = []
    for i in range(steps + 1):
        a = a0 + (a1 - a0) * i / steps
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return polyline(pts, w)


def circle(cx, cy, r, w, steps=36):
    return arc(cx, cy, r, 0, math.pi * 2, w, steps)


def leaf(cx, cy, angle, length, half_w, w):
    """叶片：两条正弦弧在叶尖交汇"""
    pts = []
    steps = 22
    for i in range(steps + 1):
        t = i / float(steps)
        u = t * length
        v = half_w * math.sin(math.pi * t)
        pts.append((u, -v))
    for i in range(steps + 1):
        t = 1 - i / float(steps)
        u = t * length
        v = half_w * math.sin(math.pi * t)
        pts.append((u, v))
    ca, sa = math.cos(angle), math.sin(angle)
    rotated = [(cx + p[0] * ca - p[1] * sa, cy + p[0] * sa + p[1] * ca) for p in pts]
    return polyline(rotated, w)


def leaf_vein(cx, cy, angle, length, w):
    pts = []
    for i in range(13):
        t = i / 12.0
        u = t * length * 0.86
        v = math.sin(math.pi * t) * 0.0
        pts.append((u, v))
    ca, sa = math.cos(angle), math.sin(angle)
    rotated = [(cx + p[0] * ca - p[1] * sa, cy + p[1] * sa + p[1] * ca * 0 + p[1] * 0) for p in pts]
    rotated = [(cx + p[0] * ca - p[1] * sa, cy + p[0] * sa + p[1] * ca) for p in pts]
    return polyline(rotated, w)


def dot(cx, cy, r):
    def test(p):
        return math.hypot(p[0] - cx, p[1] - cy) <= r
    return test, (cx - r, cy - r, cx + r, cy + r)


# --------------------------------------------------------------------------
# 渲染
# --------------------------------------------------------------------------

def render(shapes, size, ss=SS):
    grid = [[0.0] * size for _ in range(size)]
    for fn, (bx0, by0, bx1, by1) in shapes:
        px0 = max(0, int(bx0 * size) - 2)
        px1 = min(size - 1, int(bx1 * size) + 2)
        py0 = max(0, int(by0 * size) - 2)
        py1 = min(size - 1, int(by1 * size) + 2)
        for y in range(py0, py1 + 1):
            for x in range(px0, px1 + 1):
                if grid[y][x] >= 1.0:
                    continue
                hits = 0
                for sy in range(ss):
                    for sx in range(ss):
                        p = ((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size)
                        if fn(p):
                            hits += 1
                cov = hits / float(ss * ss)
                if cov > grid[y][x]:
                    grid[y][x] = cov
    return grid


def png_bytes(grid, size):
    rows = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            a = grid[y][x]
            if a <= 0:
                row += bytes((0, 0, 0, 0))
            else:
                # 线越实，颜色越深
                k = a
                r = int(LINE[0] * (0.35 + 0.65 * k))
                g = int(LINE[1] * (0.35 + 0.65 * k))
                b = int(LINE[2] * (0.35 + 0.65 * k))
                row += bytes((r, g, b, int(255 * min(1.0, a * 1.15))))
        rows.append(bytes(row))
    raw = b"".join(b"\x00" + r for r in rows)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


# --------------------------------------------------------------------------
# 插画定义
# --------------------------------------------------------------------------

def splash_hero():
    """开屏主插画：冰箱 + 顶部两片叶子 + 点缀（无地面线，保持干净）"""
    W = 0.020
    s = []
    # 冰箱主体（圆角矩形）
    s.append(round_rect(0.30, 0.30, 0.70, 0.82, 0.055, W))
    # 中缝 + 把手
    s.append(line(0.30, 0.50, 0.70, 0.50, W))
    s.append(line(0.632, 0.37, 0.632, 0.44, W))
    s.append(line(0.632, 0.57, 0.632, 0.71, W))
    # 顶上两片叶子（从冰箱顶部生出）
    s.append(leaf(0.415, 0.288, -1.28, 0.175, 0.050, W))
    s.append(leaf(0.468, 0.292, -0.70, 0.130, 0.042, W))
    # 点缀：左右对称的小圆点 + 右侧短线
    s.append(dot(0.212, 0.400, 0.009))
    s.append(dot(0.788, 0.630, 0.009))
    s.append(line(0.782, 0.360, 0.842, 0.360, W * 0.85))
    s.append(line(0.782, 0.410, 0.826, 0.410, W * 0.85))
    return s


def empty_fridge():
    """空态插画：空冰箱 + 飘落叶子"""
    W = 0.020
    s = []
    s.append(round_rect(0.29, 0.28, 0.71, 0.82, 0.05, W))
    s.append(line(0.29, 0.49, 0.71, 0.49, W))
    s.append(line(0.645, 0.35, 0.645, 0.42, W))
    # 内部空层架
    s.append(line(0.37, 0.62, 0.63, 0.62, W * 0.7))
    s.append(line(0.37, 0.72, 0.63, 0.72, W * 0.7))
    # 飘落的叶子
    s.append(leaf(0.185, 0.42, -0.95, 0.155, 0.044, W))
    s.append(leaf(0.815, 0.60, 1.05, 0.120, 0.036, W))
    s.append(dot(0.775, 0.325, 0.008))
    s.append(dot(0.205, 0.685, 0.008))
    return s


def leaf_deco():
    """装饰叶片（用于首页角标）"""
    W = 0.022
    s = []
    s.append(leaf(0.14, 0.50, -0.62, 0.72, 0.15, W))
    return s


TARGETS = {
    "splash-hero": (splash_hero, 512),
    "empty-fridge": (empty_fridge, 512),
    "leaf-deco": (leaf_deco, 256),
}


# --------------------------------------------------------------------------
# 首页图标格用的线性小图标（96x96 显示，128 出图）
# --------------------------------------------------------------------------

def icon_camera():
    W = 0.035
    s = []
    s.append(round_rect(0.12, 0.30, 0.88, 0.80, 0.10, W))
    s.append(circle(0.50, 0.56, 0.155, W))
    # 顶部取景器
    s.append(line(0.34, 0.30, 0.40, 0.19, W))
    s.append(line(0.40, 0.19, 0.60, 0.19, W))
    s.append(line(0.60, 0.19, 0.66, 0.30, W))
    return s


def icon_album():
    W = 0.035
    s = []
    s.append(round_rect(0.12, 0.22, 0.88, 0.78, 0.10, W))
    s.append(circle(0.33, 0.40, 0.055, W))
    s.append(polyline([(0.18, 0.72), (0.40, 0.47), (0.54, 0.61), (0.66, 0.49), (0.82, 0.68)], W))
    return s


def icon_pen():
    W = 0.035
    s = []
    # 笔身（两条平行线 + 收口）
    s.append(line(0.34, 0.76, 0.78, 0.30, W))
    s.append(line(0.46, 0.84, 0.90, 0.38, W))
    s.append(line(0.78, 0.30, 0.90, 0.38, W))
    # 笔尖
    s.append(line(0.34, 0.76, 0.46, 0.84, W))
    # 笔帽分隔
    s.append(line(0.60, 0.50, 0.72, 0.58, W * 0.8))
    # 书写线
    s.append(line(0.16, 0.90, 0.66, 0.90, W * 0.8))
    return s


def icon_fridge_small():
    W = 0.035
    s = []
    s.append(round_rect(0.22, 0.10, 0.78, 0.90, 0.09, W))
    s.append(line(0.22, 0.44, 0.78, 0.44, W))
    s.append(line(0.68, 0.24, 0.68, 0.34, W))
    s.append(line(0.68, 0.54, 0.68, 0.72, W))
    return s


TARGET_ICONS = {
    "i-camera": icon_camera,
    "i-album": icon_album,
    "i-pen": icon_pen,
    "i-fridge": icon_fridge_small,
}


def main():
    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       "assets", "illustration")
    os.makedirs(out, exist_ok=True)
    for name, (fn, size) in TARGETS.items():
        shapes = fn()
        grid = render(shapes, size)
        data = png_bytes(grid, size)
        path = os.path.join(out, name + ".png")
        with open(path, "wb") as f:
            f.write(data)
        print("wrote", path, len(data), "bytes", f"{size}x{size}")

    icons_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                             "assets", "icon")
    os.makedirs(icons_dir, exist_ok=True)
    for name, fn in TARGET_ICONS.items():
        size = 128
        grid = render(fn(), size, ss=4)
        data = png_bytes(grid, size)
        path = os.path.join(icons_dir, name + ".png")
        with open(path, "wb") as f:
            f.write(data)
        print("wrote", path, len(data), "bytes", f"{size}x{size}")


if __name__ == "__main__":
    main()
