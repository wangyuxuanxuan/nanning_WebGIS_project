from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image
from pyproj import Transformer


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "南宁城市体检数据信息" / "100图片"
OUTPUT_DIR = ROOT / "public" / "geodata" / "basemaps"

SOURCE_IMAGE = SOURCE_DIR / "底图4.jpg"
SOURCE_WORLD_FILE = SOURCE_DIR / "底图4.jgwx"
SOURCE_AUX = SOURCE_DIR / "底图4.jpg.aux.xml"
OUTPUT_IMAGE_NAME = "ditu4.jpg"


def read_world_file(path: Path) -> tuple[float, float, float, float, float, float]:
    values = [float(line.strip()) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if len(values) != 6:
        raise ValueError(f"World file must contain 6 values: {path}")
    return tuple(values)  # type: ignore[return-value]


def main() -> None:
    if not SOURCE_IMAGE.exists():
        raise FileNotFoundError(SOURCE_IMAGE)
    if not SOURCE_WORLD_FILE.exists():
        raise FileNotFoundError(SOURCE_WORLD_FILE)
    if not SOURCE_AUX.exists():
        raise FileNotFoundError(SOURCE_AUX)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SOURCE_IMAGE, OUTPUT_DIR / OUTPUT_IMAGE_NAME)

    width, height = Image.open(SOURCE_IMAGE).size

    # JGW/JGWX values: A, D, B, E, C, F. C/F are the center of the upper-left pixel.
    a, d, b, e, c, f = read_world_file(SOURCE_WORLD_FILE)
    corner_c = c - (a + b) / 2
    corner_f = f - (d + e) / 2

    def source_xy(px: float, py: float) -> tuple[float, float]:
        return (a * px + b * py + corner_c, d * px + e * py + corner_f)

    source_corners = {
        "topLeft": source_xy(0, 0),
        "topRight": source_xy(width, 0),
        "bottomRight": source_xy(width, height),
        "bottomLeft": source_xy(0, height),
    }

    transformer = Transformer.from_crs("EPSG:4524", "EPSG:3857", always_xy=True)
    web_corners = {name: transformer.transform(*point) for name, point in source_corners.items()}

    top_left = web_corners["topLeft"]
    top_right = web_corners["topRight"]
    bottom_left = web_corners["bottomLeft"]

    # Affine transform for browser drawing: mapX = a*x + c*y + e, mapY = b*x + d*y + f.
    web_transform = [
        (top_right[0] - top_left[0]) / width,
        (top_right[1] - top_left[1]) / width,
        (bottom_left[0] - top_left[0]) / height,
        (bottom_left[1] - top_left[1]) / height,
        top_left[0],
        top_left[1],
    ]

    xs = [point[0] for point in web_corners.values()]
    ys = [point[1] for point in web_corners.values()]

    metadata = {
        "id": "ditu4",
        "name": "底图4",
        "imageUrl": f"/geodata/basemaps/{OUTPUT_IMAGE_NAME}",
        "width": width,
        "height": height,
        "sourceCrs": "EPSG:4524",
        "mapCrs": "EPSG:3857",
        "worldFile": {
            "a": a,
            "d": d,
            "b": b,
            "e": e,
            "c": c,
            "f": f,
            "cornerC": corner_c,
            "cornerF": corner_f,
        },
        "sourceCorners": {name: list(point) for name, point in source_corners.items()},
        "webMercatorCorners": {name: list(point) for name, point in web_corners.items()},
        "webMercatorTransform": web_transform,
        "extent": [min(xs), min(ys), max(xs), max(ys)],
    }

    (OUTPUT_DIR / "basemap.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Prepared basemap: {OUTPUT_DIR / 'basemap.json'}")


if __name__ == "__main__":
    main()
