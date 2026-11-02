"""Regenerates the app icons in public/icons. Run: python3 scripts/make-icons.py (needs Pillow)."""
from PIL import Image, ImageDraw
import math

BLUE = (27, 95, 168, 255)
WHITE = (255, 255, 255, 255)
SOFT = (107, 151, 198, 255)  # white at 35% over the blue, as an opaque color so it is not left see-through
SS = 4  # supersampling for smooth edges


def glyph(d, size, scale):
    """A gauge: a faint ring with a bright arc for what is left, and a hub."""
    c = size / 2
    r = size * 0.30 * scale
    w = max(2, int(size * 0.075 * scale))
    # PIL draws an arc's stroke inward from its box, so grow the box by half a stroke to center the stroke on radius r
    box = [c - r - w / 2, c - r - w / 2, c + r + w / 2, c + r + w / 2]
    d.arc(box, 0, 360, fill=SOFT, width=w)
    d.arc(box, -90, 160, fill=WHITE, width=w)
    # round the arc's ends
    for ang in (-90, 160):
        x = c + r * math.cos(math.radians(ang))
        y = c + r * math.sin(math.radians(ang))
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=WHITE)
    hub = size * 0.045 * scale
    d.ellipse([c - hub, c - hub, c + hub, c + hub], fill=WHITE)
    # hand toward the end of the arc
    hx = c + r * 0.62 * math.cos(math.radians(160))
    hy = c + r * 0.62 * math.sin(math.radians(160))
    d.line([c, c, hx, hy], fill=WHITE, width=max(2, int(w * 0.6)))


def icon(size, rounded=True, glyph_scale=1.0):
    s = size * SS
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=BLUE)
    else:
        d.rectangle([0, 0, s, s], fill=BLUE)
    glyph(d, s, glyph_scale)
    return img.resize((size, size), Image.LANCZOS)


out = 'public/icons/'
icon(192).save(out + 'icon-192.png')
icon(512).save(out + 'icon-512.png')
# Maskable icons are cropped to a shape by the phone, so fill the square and keep the glyph in the central 60%.
icon(512, rounded=False, glyph_scale=0.8).save(out + 'maskable-512.png')
icon(180, rounded=False, glyph_scale=0.9).convert('RGB').save(out + 'apple-touch-icon.png')
icon(48).save(out + 'favicon-48.png')
print('icons written')
