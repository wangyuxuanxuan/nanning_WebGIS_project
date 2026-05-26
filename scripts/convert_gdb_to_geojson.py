from __future__ import annotations

import json
import re
from pathlib import Path

import pyogrio


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "南宁城市体检数据信息"
OUTPUT_DIR = ROOT / "public" / "geodata"

SOURCES = [
    {
        "kind": "problem",
        "label": "问题图层",
        "path": SOURCE_DIR / "问题一张图数据库20260511整理_点.gdb",
    },
    {
        "kind": "demand",
        "label": "需求图层",
        "path": SOURCE_DIR / "需求一张图数据库20260512整理.gdb",
    },
]


def slugify(value: str) -> str:
    value = re.sub(r"[^\w\u4e00-\u9fff]+", "_", value, flags=re.UNICODE).strip("_")
    return value or "layer"


def normalize_geometry(geojson_path: Path) -> int:
    with geojson_path.open("r", encoding="utf-8") as file:
        data = json.load(file)

    count = 0
    for feature in data.get("features", []):
        count += 1
        geometry = feature.get("geometry")
        if not geometry:
            continue
        geometry["coordinates"] = strip_z(geometry.get("coordinates"))

    with geojson_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, separators=(",", ":"))
    return count


def strip_z(coordinates):
    if isinstance(coordinates, list):
        if coordinates and all(isinstance(item, (int, float)) for item in coordinates):
            return coordinates[:2]
        return [strip_z(item) for item in coordinates]
    return coordinates


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    layers_index = []

    for source in SOURCES:
        layers = pyogrio.list_layers(source["path"])
        for layer_name, geometry_type in layers:
            file_name = f"{source['kind']}_{slugify(layer_name)}.geojson"
            target = OUTPUT_DIR / file_name

            pyogrio.write_dataframe(
                pyogrio.read_dataframe(source["path"], layer=layer_name).to_crs("EPSG:4326"),
                target,
                driver="GeoJSON",
            )
            feature_count = normalize_geometry(target)

            layers_index.append(
                {
                    "id": target.stem,
                    "name": layer_name,
                    "category": source["kind"],
                    "categoryName": source["label"],
                    "geometryType": str(geometry_type).replace(" Z", ""),
                    "featureCount": feature_count,
                    "crs": "EPSG:4326",
                    "file": f"/geodata/{file_name}",
                }
            )

    layers_index.sort(key=lambda item: (item["category"], item["name"]))
    with (OUTPUT_DIR / "layers.json").open("w", encoding="utf-8") as file:
        json.dump(layers_index, file, ensure_ascii=False, indent=2)

    print(f"Converted {len(layers_index)} layers to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
