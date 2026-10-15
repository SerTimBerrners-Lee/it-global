"""Rebuild lighter website assets from the retained PNG originals.

Requires Pillow with WebP support. Run from any directory:
    python scripts/optimize-images.py

The source artwork and logos are left unchanged. The command prints a JSON
manifest with dimensions and file sizes for reviewing the generated variants.
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, features


ASSET_ROOT = Path(__file__).resolve().parents[1] / "dist" / "assets"


def convert_image(
    relative_source: str,
    width: int | None = None,
    suffix: str = "",
    lossless: bool = False,
    quality: int = 86,
) -> dict[str, str | int | bool]:
    source = ASSET_ROOT / relative_source
    output = source.with_name(f"{source.stem}{suffix}.webp")

    with Image.open(source) as original:
        image = original.convert("RGBA" if "A" in original.getbands() else "RGB")

        if width is not None and width < image.width:
            height = round(image.height * width / image.width)
            image = image.resize((width, height), Image.Resampling.LANCZOS)

        image.save(
            output,
            format="WEBP",
            quality=90 if lossless else quality,
            method=6,
            lossless=lossless,
            exact=True,
        )

        dimensions = image.size

    with Image.open(output) as verified:
        verified.load()

        if verified.size != dimensions:
            raise ValueError(f"Unexpected output dimensions: {output}")

    return {
        "source": source.relative_to(ASSET_ROOT).as_posix(),
        "output": output.relative_to(ASSET_ROOT).as_posix(),
        "width": dimensions[0],
        "height": dimensions[1],
        "source_bytes": source.stat().st_size,
        "output_bytes": output.stat().st_size,
        "lossless": lossless,
    }


def main() -> None:
    if not features.check("webp"):
        raise RuntimeError("Pillow needs WebP support to rebuild these assets.")

    manifest = [
        convert_image("hero-open-source.png", quality=94),
        convert_image("hero-open-source.png", width=960, suffix="-960", quality=94),
    ]

    for name in ("data-control", "open-software", "tailored-services"):
        manifest.append(convert_image(f"features/{name}.png"))
        manifest.append(convert_image(f"features/{name}.png", width=720, suffix="-720"))

    for name in ("backup", "access", "connection", "audit"):
        manifest.append(convert_image(f"security/{name}.png", width=600))

    for name in ("espo-crm", "nextcloud-files"):
        manifest.append(convert_image(f"business/{name}.png", lossless=True))

    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
