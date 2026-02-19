#!/usr/bin/env python3
"""
Generate simple raster icons without external deps.

We generate PPM (P3) and convert to PNG using macOS `sips`.
"""
from __future__ import annotations

import math
import os
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
TMP = ROOT / "tmp"


def clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return lo if x < lo else hi if x > hi else x


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def rgb(r: float, g: float, b: float) -> tuple[int, int, int]:
    return (int(clamp(r) * 255), int(clamp(g) * 255), int(clamp(b) * 255))


def draw_icon(size: int) -> list[list[tuple[int, int, int]]]:
    # Background: soft iOS-ish blue/green gradient.
    img: list[list[tuple[int, int, int]]] = []
    for y in range(size):
        row: list[tuple[int, int, int]] = []
        for x in range(size):
            nx = x / (size - 1)
            ny = y / (size - 1)

            # Radial highlight near top.
            dx = nx - 0.35
            dy = ny - 0.25
            r = math.sqrt(dx * dx + dy * dy)
            hl = clamp(1.0 - r * 2.2)

            # Base gradient (blue -> teal).
            base_r = lerp(0.04, 0.20, ny)
            base_g = lerp(0.40, 0.82, ny)
            base_b = lerp(0.95, 0.70, ny)

            # Add highlight.
            cr = clamp(base_r + hl * 0.20)
            cg = clamp(base_g + hl * 0.18)
            cb = clamp(base_b + hl * 0.10)

            row.append(rgb(cr, cg, cb))
        img.append(row)

    # White check mark (thick line segments).
    def draw_thick_line(x0, y0, x1, y1, thickness, color):
        # Simple Bresenham-like stepping with a circular brush.
        steps = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(steps):
            t = i / max(1, steps - 1)
            x = int(round(lerp(x0, x1, t)))
            y = int(round(lerp(y0, y1, t)))
            brush(img, x, y, thickness, color)

    def brush(img2, cx, cy, radius, color):
        r2 = radius * radius
        for yy in range(max(0, cy - radius), min(size, cy + radius + 1)):
            for xx in range(max(0, cx - radius), min(size, cx + radius + 1)):
                if (xx - cx) * (xx - cx) + (yy - cy) * (yy - cy) <= r2:
                    img2[yy][xx] = color

    white = (255, 255, 255)
    # Checkmark path normalized.
    draw_thick_line(int(size * 0.28), int(size * 0.55), int(size * 0.44), int(size * 0.70), int(size * 0.035), white)
    draw_thick_line(int(size * 0.44), int(size * 0.70), int(size * 0.74), int(size * 0.36), int(size * 0.035), white)

    return img


def write_ppm(path: Path, img: list[list[tuple[int, int, int]]]) -> None:
    h = len(img)
    w = len(img[0]) if h else 0
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="ascii") as f:
        f.write(f"P3\n{w} {h}\n255\n")
        for y in range(h):
            line = []
            for x in range(w):
                r, g, b = img[y][x]
                line.append(f"{r} {g} {b}")
            f.write("  ".join(line) + "\n")


def sips_convert(ppm: Path, out_png: Path) -> None:
    out_png.parent.mkdir(parents=True, exist_ok=True)
    subprocess.check_call(["sips", "-s", "format", "png", str(ppm), "-o", str(out_png)], stdout=subprocess.DEVNULL)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    TMP.mkdir(parents=True, exist_ok=True)

    for size, name in [
        (192, "icon-192.png"),
        (512, "icon-512.png"),
        (180, "apple-touch-icon.png"),
    ]:
        img = draw_icon(size)
        ppm = TMP / f"icon-{size}.ppm"
        write_ppm(ppm, img)
        sips_convert(ppm, ASSETS / name)
        print(f"Wrote {ASSETS / name}")


if __name__ == "__main__":
    main()

