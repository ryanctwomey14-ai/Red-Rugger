#!/usr/bin/env python3
"""
Generates the Open Graph share card — the image that appears when the site is
texted, posted to LinkedIn, or pasted into Slack.

    python tools/make-og.py

Uses the real logo file rather than a redrawn approximation, so the mark's
proportions and the wordmark's typeface are exactly the client's. The logo's
black elements are recoloured to bone so they read on the ink ground; the red
is left untouched.

Why compose at all instead of just shipping the logo: link previews render at
1.91:1. A square logo dropped into that ratio gets letterboxed with dead space
or cropped. This lays the mark out for the format.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1200, 630
HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, "..", "dist", "assets", "img")
LOGO = os.path.join(HERE, "..", "assets-src", "Red Rugger Logo.webp")

INK   = (11, 11, 12)
RED   = (198, 17, 17)
BONE  = (250, 249, 247)
SLATE = (138, 134, 126)
IRON  = (42, 44, 47)

sans = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 22)

# ---------------------------------------------------------------- background
img = Image.new("RGB", (W, H), INK)

# Warm lift behind the mark. Drawn oversized then blurred, because stepped
# ellipses band badly at this size.
glow = Image.new("L", (W // 2, H // 2), 0)
gd = ImageDraw.Draw(glow)
cx, cy, r = W // 4, 150, 260
for i in range(r, 0, -1):
    gd.ellipse([cx - i, cy - i * 0.74, cx + i, cy + i * 0.74],
               fill=int(46 * (1 - i / r) ** 1.8))
glow = glow.filter(ImageFilter.GaussianBlur(18)).resize((W, H), Image.LANCZOS)
img = Image.composite(Image.new("RGB", (W, H), RED), img, glow)

# ---------------------------------------------------------------- the logo
logo = Image.open(LOGO).convert("RGBA")
px = logo.load()
for y in range(logo.height):
    for x in range(logo.width):
        r_, g_, b_, a_ = px[x, y]
        if a_ == 0:
            continue
        # Anything dark is the base bar and the wordmark — lift it to bone.
        # The red bars are left exactly as the client drew them.
        if r_ < 110 and g_ < 110 and b_ < 110:
            px[x, y] = BONE + (a_,)

target_h = 340
logo = logo.resize((round(logo.width * target_h / logo.height), target_h), Image.LANCZOS)
img.paste(logo, (W // 2 - logo.width // 2, 118), logo)

# ---------------------------------------------------------------- strapline
d = ImageDraw.Draw(img)


def tracked(draw, centre_x, y, text, font, fill, tracking):
    """PIL has no letter-spacing, so each glyph is placed by hand."""
    widths = [draw.textlength(ch, font=font) for ch in text]
    x = centre_x - (sum(widths) + tracking * (len(text) - 1)) / 2
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=font, fill=fill)
        x += w + tracking


d.line([(W / 2 - 160, 516), (W / 2 + 160, 516)], fill=IRON, width=1)
tracked(d, W / 2, 546, "MULTIFAMILY  ·  LENDING  ·  EMERGING U.S. MARKETS",
        sans, SLATE, tracking=3.4)

os.makedirs(OUT, exist_ok=True)
path = os.path.join(OUT, "og-card.png")
img.save(path, "PNG", optimize=True)
print("wrote og-card.png  %dx%d  %d KB" % (W, H, os.path.getsize(path) // 1024))
