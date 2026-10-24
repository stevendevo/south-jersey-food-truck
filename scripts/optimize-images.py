#!/usr/bin/env python3
"""Rebuild web encodings of local article covers and displayed truck images.

Requires Python 3 and Pillow with WebP support (validated with Pillow 12.3.0).
Run from any directory: python scripts/optimize-images.py
Original assets and content records are never modified. Commit generated assets
with the manifest so production does not need Python or an image encoder.
"""

import hashlib
import io
import json
from pathlib import Path

from PIL import Image, ImageOps, features


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
OUTPUT = PUBLIC / "optimized"
MAX_WIDTH = 1200
QUALITY = 82


def source_urls():
    posts = json.loads((ROOT / "data/posts.json").read_text())
    trucks = json.loads((ROOT / "data/trucks.json").read_text())
    covers = {post.get("cover_image_url") for post in posts}
    # Match hasVerifiedTruckImage in utils.js: category art is not a truck photo.
    photos = {
        truck.get("image_url")
        for truck in trucks
        if not (truck.get("image_url") or "").startswith("/seed/cat_")
    }
    return sorted(url for url in covers | photos if url and url.startswith("/"))


def main():
    if not features.check("webp"):
        raise RuntimeError("Pillow must include WebP encoding support")
    manifest = {}
    for url in source_urls():
        source = (PUBLIC / url.lstrip("/")).resolve()
        if not source.is_relative_to(PUBLIC.resolve()):
            raise ValueError(f"Image path escapes public directory: {url}")
        relative = Path(url.lstrip("/"))
        # Keep the original extension in the output name to avoid collisions
        # between e.g. cover.jpg and cover.png.
        optimized_relative = relative.with_name(relative.name + ".webp")
        destination = OUTPUT / optimized_relative
        raw = source.read_bytes()
        with Image.open(io.BytesIO(raw)) as original:
            image = ImageOps.exif_transpose(original)
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGBA" if "transparency" in image.info else "RGB")
            if image.width > MAX_WIDTH:
                height = max(1, round(image.height * MAX_WIDTH / image.width))
                image = image.resize((MAX_WIDTH, height), Image.Resampling.LANCZOS)
            destination.parent.mkdir(parents=True, exist_ok=True)
            image.save(destination, "WEBP", quality=QUALITY, method=6)
            manifest[url] = {
                "url": "/optimized/" + optimized_relative.as_posix(),
                "width": image.width,
                "height": image.height,
                "bytes": destination.stat().st_size,
                "sourceBytes": len(raw),
                "sourceSha256": hashlib.sha256(raw).hexdigest(),
            }
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    before = sum(entry["sourceBytes"] for entry in manifest.values())
    after = sum(entry["bytes"] for entry in manifest.values())
    print(f"Encoded {len(manifest)} assets: {before:,} -> {after:,} bytes "
          f"({(1 - after / before) * 100:.1f}% smaller). Originals retained.")


if __name__ == "__main__":
    main()
