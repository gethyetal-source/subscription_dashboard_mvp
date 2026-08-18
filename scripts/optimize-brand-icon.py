from pathlib import Path

from PIL import Image


PROJECT = Path("/home/ubuntu/subscription_dashboard_mvp")
SOURCE = Path("/home/ubuntu/upload/ChatGPTImageAug18,2026,03_56_30PM.png")
TARGETS = [
    PROJECT / "assets/images/icon.png",
    PROJECT / "assets/images/splash-icon.png",
    PROJECT / "assets/images/favicon.png",
    PROJECT / "assets/images/android-icon-foreground.png",
]


def optimize_icon() -> None:
    with Image.open(SOURCE) as original:
        image = original.convert("RGB")
        image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        optimized = image.quantize(
            colors=256,
            method=Image.Quantize.MEDIANCUT,
            dither=Image.Dither.FLOYDSTEINBERG,
        )
        for target in TARGETS:
            optimized.save(target, format="PNG", optimize=True)


if __name__ == "__main__":
    optimize_icon()
