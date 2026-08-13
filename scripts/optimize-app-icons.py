from pathlib import Path

from PIL import Image


ASSETS = Path("assets/images")
TARGETS = [
    "icon.png",
    "splash-icon.png",
    "favicon.png",
    "android-icon-foreground.png",
]


def optimize(path: Path) -> None:
    with Image.open(path) as image:
        image = image.convert("RGBA")
        image.thumbnail((512, 512), Image.Resampling.LANCZOS)
        image.save(path, format="PNG", optimize=True, compress_level=9)


for filename in TARGETS:
    optimize(ASSETS / filename)
    print(f"Optimized {filename}")
