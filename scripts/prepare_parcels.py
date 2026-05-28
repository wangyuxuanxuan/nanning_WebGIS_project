from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image
from pyproj import Transformer
from shapely.geometry import LineString, MultiLineString, Point, mapping, shape
from shapely.ops import polygonize, snap, transform, unary_union
from shapely.strtree import STRtree


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = (
    ROOT
    / "南宁城市体检数据信息"
    / "要素分图层GeoJson"
    / "地块线-Polyline_FeaturesToJSON.geojson"
)
BUILDING_SOURCE_PATH = (
    ROOT
    / "南宁城市体检数据信息"
    / "要素分图层GeoJson"
    / "建筑图层-Polyline_FeaturesToJSON.geojson"
)
SUPPLEMENTAL_BOUNDARY_PATHS = [
    ROOT
    / "南宁城市体检数据信息"
    / "要素分图层GeoJson"
    / "规划绿线-Polyline_FeaturesToJSON.geojson",
]
POINT_SUPPLEMENTAL_BOUNDARY_PATHS = [
    ROOT
    / "南宁城市体检数据信息"
    / "要素分图层GeoJson"
    / "现状路网-Polyline_FeaturesToJSON.geojson",
]
OUTPUT_DIR = ROOT / "public" / "geodata"
OUTPUT_PATH = OUTPUT_DIR / "parcels.geojson"
COMMUNITIES_OUTPUT_PATH = OUTPUT_DIR / "communities.geojson"
BUILDINGS_OUTPUT_PATH = OUTPUT_DIR / "buildings.geojson"
STRUCTURE_SAFETY_REFERENCE_PATHS = [
    Path("C:/Users/Administrator/Desktop/6d7aec4fc772a9a7444c6ef1308db12e.png"),
    ROOT / "public" / "geodata" / "structure_safety_reference.png",
]
UNMANAGED_COMMUNITY_POINTS_PATH = OUTPUT_DIR / "problem_未实施物业管理的小区_点.geojson"
LAYERS_INDEX_PATH = OUTPUT_DIR / "layers.json"

PARCEL_LAYER_ID = "parcel_parcels"
PARCEL_LAYER_NAME = "地块信息"
COMMUNITY_LAYER_ID = "parcel_communities"
COMMUNITY_LAYER_NAME = "小区物业管理"
COMMUNITY_MANAGEMENT_LAYER_PREFIX = "parcel_communities_management_"
BUILDING_LAYER_ID = "parcel_buildings"
BUILDING_LAYER_NAME = "建筑轮廓"
BUILDING_STRUCTURE_LAYER_ID = "parcel_buildings_structure_safety"
BUILDING_STRUCTURE_LAYER_NAME = "结构安全"
BUILDING_STRUCTURE_LAYER_PREFIX = "parcel_buildings_structure_safety_"
SNAP_TOLERANCE_DEGREES = 1e-8
MAX_SUPPLEMENTAL_AREA_SQM = 200_000
SUPPLEMENTAL_OVERLAP_RATIO = 0.8
MAX_SUPPLEMENTAL_DISTANCE_DEGREES = 0.001
MIN_BUILDING_AREA_SQM = 1
STRUCTURE_SAFETY_IMAGE_BBOX = (144, 2192, 314, 1340)
STRUCTURE_SAFETY_STATUSES = ("质量较差", "质量一般", "质量较好", "危房")
STRUCTURE_SAFETY_LAYER_FILES = {
    "质量较差": "buildings_structure_poor.geojson",
    "质量一般": "buildings_structure_general.geojson",
    "质量较好": "buildings_structure_good.geojson",
    "危房": "buildings_structure_danger.geojson",
}
STRUCTURE_SAFETY_LAYER_IDS = {
    "质量较差": f"{BUILDING_STRUCTURE_LAYER_PREFIX}poor",
    "质量一般": f"{BUILDING_STRUCTURE_LAYER_PREFIX}general",
    "质量较好": f"{BUILDING_STRUCTURE_LAYER_PREFIX}good",
    "危房": f"{BUILDING_STRUCTURE_LAYER_PREFIX}danger",
}
COMMUNITY_MANAGEMENT_STATUSES = ("未实施物业管理", "已实施物业管理")
COMMUNITY_MANAGEMENT_LAYER_FILES = {
    "未实施物业管理": "communities_management_unmanaged.geojson",
    "已实施物业管理": "communities_management_managed.geojson",
}
COMMUNITY_MANAGEMENT_LAYER_IDS = {
    "未实施物业管理": f"{COMMUNITY_MANAGEMENT_LAYER_PREFIX}unmanaged",
    "已实施物业管理": f"{COMMUNITY_MANAGEMENT_LAYER_PREFIX}managed",
}
COMMUNITY_MANAGEMENT_LAYER_NAMES = {
    "未实施物业管理": "未实施物业管理的小区",
    "已实施物业管理": "已实施物业管理的小区",
}


def strip_z(coordinates: Any) -> Any:
    if isinstance(coordinates, list):
        if coordinates and all(isinstance(item, (int, float)) for item in coordinates):
            return coordinates[:2]
        return [strip_z(item) for item in coordinates]
    return coordinates


def collect_lines(geometry: dict[str, Any]) -> list[LineString]:
    geom_type = geometry.get("type")
    coordinates = strip_z(geometry.get("coordinates", []))

    if geom_type == "LineString":
        return [LineString(coordinates)] if len(coordinates) >= 2 else []

    if geom_type == "MultiLineString":
        return [LineString(part) for part in coordinates if len(part) >= 2]

    geom = shape({"type": geom_type, "coordinates": coordinates})
    if isinstance(geom, LineString):
        return [geom]
    if isinstance(geom, MultiLineString):
        return [LineString(line.coords) for line in geom.geoms]
    return []


def read_lines(path: Path) -> list[LineString]:
    with path.open("r", encoding="utf-8") as file:
        source = json.load(file)

    lines: list[LineString] = []
    for feature in source.get("features", []):
        geometry = feature.get("geometry")
        if geometry:
            lines.extend(collect_lines(geometry))
    return lines


def polygonize_lines(lines: list[LineString]) -> list[Any]:
    linework = MultiLineString(lines)
    snapped_linework = snap(linework, linework, SNAP_TOLERANCE_DEGREES)
    return list(polygonize(unary_union(snapped_linework)))


def read_reference_points() -> list[Point]:
    points: list[Point] = []
    for path in OUTPUT_DIR.glob("*小区*.geojson"):
        with path.open("r", encoding="utf-8") as file:
            source = json.load(file)

        for feature in source.get("features", []):
            geometry = feature.get("geometry") or {}
            coordinates = geometry.get("coordinates") or []
            if geometry.get("type") == "Point" and len(coordinates) >= 2:
                points.append(Point(coordinates[:2]))
    return points


def append_polygon(
    polygons: list[dict[str, Any]],
    polygon: Any,
    projected: Any,
    area_sqm: float,
) -> None:
    centroid = polygon.centroid
    polygons.append(
        {
            "geometry": polygon,
            "projected": projected,
            "areaSqm": area_sqm,
            "centroidLon": centroid.x,
            "centroidLat": centroid.y,
        }
    )


def build_parcel_features() -> list[dict[str, Any]]:
    lines = read_lines(SOURCE_PATH)
    if not lines:
        raise ValueError(f"No line geometry found in {SOURCE_PATH}")

    to_meter = Transformer.from_crs("EPSG:4326", "EPSG:4524", always_xy=True).transform
    parcel_polygons = polygonize_lines(lines)
    polygons = []

    for polygon in parcel_polygons:
        projected = transform(to_meter, polygon)
        area_sqm = projected.area
        append_polygon(polygons, polygon, projected, area_sqm)

    parcel_union = unary_union(parcel_polygons)
    supplemental_lines = []
    for path in SUPPLEMENTAL_BOUNDARY_PATHS:
        if path.exists():
            supplemental_lines.extend(read_lines(path))

    if supplemental_lines:
        for polygon in polygonize_lines([*lines, *supplemental_lines]):
            projected = transform(to_meter, polygon)
            area_sqm = projected.area
            if area_sqm > MAX_SUPPLEMENTAL_AREA_SQM:
                continue
            if polygon.distance(parcel_union) > MAX_SUPPLEMENTAL_DISTANCE_DEGREES:
                continue
            if polygon.area and polygon.intersection(parcel_union).area / polygon.area >= SUPPLEMENTAL_OVERLAP_RATIO:
                continue

            append_polygon(polygons, polygon, projected, area_sqm)

    current_union = unary_union([item["geometry"] for item in polygons])
    uncovered_points = [point for point in read_reference_points() if not current_union.covers(point)]
    point_supplemental_lines = []
    for path in POINT_SUPPLEMENTAL_BOUNDARY_PATHS:
        if path.exists():
            point_supplemental_lines.extend(read_lines(path))

    if uncovered_points and point_supplemental_lines:
        candidate_polygons = polygonize_lines([*lines, *supplemental_lines, *point_supplemental_lines])
        candidate_tree = STRtree(candidate_polygons)
        added_keys = {item["geometry"].wkb_hex for item in polygons}

        for point in uncovered_points:
            candidates = []
            for index in candidate_tree.query(point):
                polygon = candidate_polygons[int(index)]
                if not polygon.covers(point):
                    continue

                projected = transform(to_meter, polygon)
                area_sqm = projected.area
                if area_sqm > MAX_SUPPLEMENTAL_AREA_SQM:
                    continue
                if polygon.area and polygon.intersection(current_union).area / polygon.area >= SUPPLEMENTAL_OVERLAP_RATIO:
                    continue

                candidates.append((area_sqm, polygon, projected))

            if not candidates:
                continue

            area_sqm, polygon, projected = min(candidates, key=lambda item: item[0])
            key = polygon.wkb_hex
            if key in added_keys:
                continue

            append_polygon(polygons, polygon, projected, area_sqm)
            added_keys.add(key)
            current_union = unary_union([current_union, polygon])

    polygons.sort(key=lambda item: (-item["centroidLat"], item["centroidLon"]))

    features: list[dict[str, Any]] = []
    for index, item in enumerate(polygons, start=1):
        parcel_id = f"DK-{index:03d}"
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "parcelId": parcel_id,
                    "parcelName": f"地块 {parcel_id}",
                    "areaSqm": round(item["areaSqm"], 2),
                    "perimeterM": round(item["projected"].length, 2),
                    "centroidLon": round(item["centroidLon"], 8),
                    "centroidLat": round(item["centroidLat"], 8),
                },
                "geometry": mapping(item["geometry"]),
            }
        )

    return features


def write_parcels(features: list[dict[str, Any]]) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    collection = {
        "type": "FeatureCollection",
        "name": PARCEL_LAYER_NAME,
        "features": features,
    }
    with OUTPUT_PATH.open("w", encoding="utf-8") as file:
        json.dump(collection, file, ensure_ascii=False, separators=(",", ":"))


def get_feature_label(properties: dict[str, Any], fallback: str) -> str:
    return get_property_text(
        properties,
        ["小区名称", "小区名", "名称", "问题", "地址", "所在社区", "编号", "ORIG_FID"],
    ) or fallback


def summarize_layer_name(name: str) -> str:
    return name.replace("_点", "").replace("problem_", "").replace("demand_", "")


def attach_diagnostics_to_parcels(features: list[dict[str, Any]]) -> None:
    if not LAYERS_INDEX_PATH.exists():
        return

    with LAYERS_INDEX_PATH.open("r", encoding="utf-8") as file:
        layers = json.load(file)

    parcel_geometries = [shape(feature["geometry"]) for feature in features]
    parcel_tree = STRtree(parcel_geometries)
    diagnostics: list[dict[str, list[dict[str, str]]]] = [
        {"problem": [], "demand": []} for _ in features
    ]

    for layer in layers:
        category = layer.get("category")
        if category not in {"problem", "demand"}:
            continue

        layer_file = str(layer.get("file", "")).lstrip("/")
        if layer_file.startswith("geodata/"):
            layer_file = layer_file.removeprefix("geodata/")
        layer_path = OUTPUT_DIR / layer_file
        if not layer_path.exists():
            continue

        with layer_path.open("r", encoding="utf-8") as file:
            source = json.load(file)

        layer_name = summarize_layer_name(str(layer.get("name") or layer_path.stem))
        for index, point_feature in enumerate(source.get("features", []), start=1):
            geometry = point_feature.get("geometry") or {}
            coordinates = geometry.get("coordinates") or []
            if geometry.get("type") != "Point" or len(coordinates) < 2:
                continue

            point = Point(coordinates[:2])
            for parcel_index in parcel_tree.query(point):
                parcel_index = int(parcel_index)
                if not parcel_geometries[parcel_index].covers(point):
                    continue

                properties = point_feature.get("properties") or {}
                diagnostics[parcel_index][category].append(
                    {
                        "type": layer_name,
                        "name": get_feature_label(properties, f"{layer_name}-{index}"),
                    }
                )
                break

    for feature, item in zip(features, diagnostics):
        properties = feature["properties"]
        problems = item["problem"]
        demands = item["demand"]
        problem_types = list(dict.fromkeys(entry["type"] for entry in problems))
        demand_types = list(dict.fromkeys(entry["type"] for entry in demands))
        problem_details = [f"{entry['type']}：{entry['name']}" for entry in problems]
        demand_details = [f"{entry['type']}：{entry['name']}" for entry in demands]

        properties["问题数量"] = len(problems)
        properties["需求数量"] = len(demands)
        properties["问题类型"] = "；".join(problem_types) if problem_types else "无"
        properties["需求类型"] = "；".join(demand_types) if demand_types else "无"
        properties["问题明细"] = "；".join(problem_details) if problem_details else "无"
        properties["需求明细"] = "；".join(demand_details) if demand_details else "无"
        properties["诊断信息"] = f"问题 {len(problems)} 项，需求 {len(demands)} 项"


def get_property_text(properties: dict[str, Any], keys: list[str]) -> str:
    for key in keys:
        value = properties.get(key)
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""


def read_unmanaged_community_points() -> list[dict[str, Any]]:
    if not UNMANAGED_COMMUNITY_POINTS_PATH.exists():
        return []

    with UNMANAGED_COMMUNITY_POINTS_PATH.open("r", encoding="utf-8") as file:
        source = json.load(file)

    points = []
    for feature in source.get("features", []):
        geometry = feature.get("geometry") or {}
        coordinates = geometry.get("coordinates") or []
        if geometry.get("type") == "Point" and len(coordinates) >= 2:
            points.append(
                {
                    "point": Point(coordinates[:2]),
                    "properties": feature.get("properties") or {},
                }
            )
    return points


def read_community_evidence_points() -> list[dict[str, Any]]:
    points: list[dict[str, Any]] = []
    for path in OUTPUT_DIR.glob("*小区*.geojson"):
        with path.open("r", encoding="utf-8") as file:
            source = json.load(file)

        for feature in source.get("features", []):
            geometry = feature.get("geometry") or {}
            coordinates = geometry.get("coordinates") or []
            if geometry.get("type") == "Point" and len(coordinates) >= 2:
                points.append(
                    {
                        "point": Point(coordinates[:2]),
                        "properties": feature.get("properties") or {},
                    }
                )
    return points


def build_community_features(parcel_features: list[dict[str, Any]]) -> list[dict[str, Any]]:
    unmanaged_points = read_unmanaged_community_points()
    evidence_points = read_community_evidence_points()
    community_features = []

    for index, feature in enumerate(parcel_features, start=1):
        geometry = shape(feature["geometry"])
        matched_evidence_points = [item for item in evidence_points if geometry.covers(item["point"])]
        if not matched_evidence_points:
            continue

        matched_points = [item for item in unmanaged_points if geometry.covers(item["point"])]
        status = "未实施物业管理" if matched_points else "已实施物业管理"
        community_id = f"XQ-{index:03d}"
        source_properties = feature["properties"]

        names = [
            get_property_text(item["properties"], ["小区名", "小区名称", "名称", "编号"])
            for item in (matched_points if matched_points else matched_evidence_points)
        ]
        names = [name for name in names if name]
        community_name = "、".join(dict.fromkeys(names)) if names else f"小区 {community_id}"

        properties = {
            "communityId": community_id,
            "communityName": community_name,
            "objectType": "小区",
            "managementStatus": status,
            "propertyManagement": status,
            "sourceParcelId": source_properties.get("parcelId"),
            "areaSqm": source_properties.get("areaSqm"),
            "perimeterM": source_properties.get("perimeterM"),
            "centroidLon": source_properties.get("centroidLon"),
            "centroidLat": source_properties.get("centroidLat"),
            "unmanagedPointCount": len(matched_points),
            "communityPointCount": len(matched_evidence_points),
        }

        community_features.append(
            {
                "type": "Feature",
                "properties": properties,
                "geometry": feature["geometry"],
            }
        )

    return community_features


def find_containing_feature(
    point: Point,
    features: list[dict[str, Any]],
    geometries: list[Any],
    tree: STRtree,
) -> dict[str, Any] | None:
    for index in tree.query(point):
        geometry = geometries[int(index)]
        if geometry.covers(point):
            return features[int(index)]
    return None


def find_overlapping_feature(
    polygon: Any,
    features: list[dict[str, Any]],
    geometries: list[Any],
    tree: STRtree,
) -> dict[str, Any] | None:
    best_index = None
    best_area = 0.0
    for index in tree.query(polygon):
        geometry = geometries[int(index)]
        overlap_area = polygon.intersection(geometry).area
        if overlap_area > best_area:
            best_index = int(index)
            best_area = overlap_area

    return features[best_index] if best_index is not None and best_area > 0 else None


def get_structure_safety_reference_image() -> Image.Image | None:
    for path in STRUCTURE_SAFETY_REFERENCE_PATHS:
        if path.exists():
            return Image.open(path).convert("RGB")
    return None


def get_structure_safety_color_name(red: int, green: int, blue: int) -> str | None:
    if green > 90 and red < 110 and blue < 110 and green > red * 1.25 and green > blue * 1.25:
        return "质量较差"
    if 120 < red < 220 and 150 < green < 255 and blue < 120 and green >= red * 0.95 and green > blue * 1.4:
        return "质量一般"
    if red > 190 and 90 < green < 220 and blue < 120 and red >= green * 1.05:
        return "质量较好"
    if red > 160 and green < 120 and blue < 120 and red > green * 1.45 and red > blue * 1.45:
        return "危房"
    return None


def classify_structure_safety(
    lon: float,
    lat: float,
    lon_range: tuple[float, float],
    lat_range: tuple[float, float],
    image: Image.Image | None,
) -> str:
    if image is None:
        return "未识别"

    min_lon, max_lon = lon_range
    min_lat, max_lat = lat_range
    if min_lon == max_lon or min_lat == max_lat:
        return "未识别"

    x0, x1, y0, y1 = STRUCTURE_SAFETY_IMAGE_BBOX
    pixel_x = round(x0 + (lon - min_lon) / (max_lon - min_lon) * (x1 - x0))
    pixel_y = round(y1 - (lat - min_lat) / (max_lat - min_lat) * (y1 - y0))
    width, height = image.size

    for radius in (0, 2, 4, 7, 10, 14, 18, 24):
        counts = {status: 0 for status in STRUCTURE_SAFETY_STATUSES}
        for y in range(max(0, pixel_y - radius), min(height, pixel_y + radius + 1)):
            for x in range(max(0, pixel_x - radius), min(width, pixel_x + radius + 1)):
                if radius and (x - pixel_x) ** 2 + (y - pixel_y) ** 2 > radius**2:
                    continue

                status = get_structure_safety_color_name(*image.getpixel((x, y)))
                if status:
                    counts[status] += 1

        status, count = max(counts.items(), key=lambda item: item[1])
        if count > 0:
            return status

    return "未识别"


def build_building_features(
    parcel_features: list[dict[str, Any]],
    community_features: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if not BUILDING_SOURCE_PATH.exists():
        return []

    lines = read_lines(BUILDING_SOURCE_PATH)
    if not lines:
        return []

    to_meter = Transformer.from_crs("EPSG:4326", "EPSG:4524", always_xy=True).transform
    reference_image = get_structure_safety_reference_image()
    building_polygons = []
    for polygon in polygonize_lines(lines):
        projected = transform(to_meter, polygon)
        area_sqm = projected.area
        if area_sqm < MIN_BUILDING_AREA_SQM:
            continue

        centroid = polygon.centroid
        building_polygons.append(
            {
                "geometry": polygon,
                "projected": projected,
                "areaSqm": area_sqm,
                "centroidLon": centroid.x,
                "centroidLat": centroid.y,
                "representativePoint": polygon.representative_point(),
            }
        )

    building_polygons.sort(key=lambda item: (-item["centroidLat"], item["centroidLon"]))
    lon_range = (
        min(item["centroidLon"] for item in building_polygons),
        max(item["centroidLon"] for item in building_polygons),
    )
    lat_range = (
        min(item["centroidLat"] for item in building_polygons),
        max(item["centroidLat"] for item in building_polygons),
    )

    parcel_geometries = [shape(feature["geometry"]) for feature in parcel_features]
    community_geometries = [shape(feature["geometry"]) for feature in community_features]
    parcel_tree = STRtree(parcel_geometries)
    community_tree = STRtree(community_geometries) if community_geometries else None
    parcel_building_counts: dict[str, int] = {}
    community_building_counts: dict[str, int] = {}
    parcel_structure_counts: dict[str, dict[str, int]] = {}
    community_structure_counts: dict[str, dict[str, int]] = {}
    building_features = []

    for index, item in enumerate(building_polygons, start=1):
        building_id = f"JZ-{index:04d}"
        point = item["representativePoint"]
        parcel_feature = find_containing_feature(point, parcel_features, parcel_geometries, parcel_tree)
        if parcel_feature is None:
            parcel_feature = find_overlapping_feature(item["geometry"], parcel_features, parcel_geometries, parcel_tree)

        community_feature = (
            find_containing_feature(point, community_features, community_geometries, community_tree)
            if community_tree
            else None
        )
        if community_feature is None and community_tree:
            community_feature = find_overlapping_feature(
                item["geometry"],
                community_features,
                community_geometries,
                community_tree,
            )

        parcel_properties = parcel_feature["properties"] if parcel_feature else {}
        community_properties = community_feature["properties"] if community_feature else {}
        parcel_id = parcel_properties.get("parcelId", "未匹配")
        community_id = community_properties.get("communityId", "未匹配")
        structure_safety = classify_structure_safety(
            item["centroidLon"],
            item["centroidLat"],
            lon_range,
            lat_range,
            reference_image,
        )

        if parcel_id != "未匹配":
            parcel_id_text = str(parcel_id)
            parcel_building_counts[parcel_id_text] = parcel_building_counts.get(parcel_id_text, 0) + 1
            parcel_structure_counts.setdefault(parcel_id_text, {status: 0 for status in STRUCTURE_SAFETY_STATUSES})
            if structure_safety in STRUCTURE_SAFETY_STATUSES:
                parcel_structure_counts[parcel_id_text][structure_safety] += 1
        if community_id != "未匹配":
            community_id_text = str(community_id)
            community_building_counts[community_id_text] = community_building_counts.get(community_id_text, 0) + 1
            community_structure_counts.setdefault(community_id_text, {status: 0 for status in STRUCTURE_SAFETY_STATUSES})
            if structure_safety in STRUCTURE_SAFETY_STATUSES:
                community_structure_counts[community_id_text][structure_safety] += 1

        properties = {
            "buildingId": building_id,
            "buildingName": f"建筑 {building_id}",
            "objectType": "建筑",
            "areaSqm": round(item["areaSqm"], 2),
            "perimeterM": round(item["projected"].length, 2),
            "centroidLon": round(item["centroidLon"], 8),
            "centroidLat": round(item["centroidLat"], 8),
            "sourceParcelId": parcel_id,
            "sourceParcelName": parcel_properties.get("parcelName", "未匹配地块"),
            "communityId": community_id,
            "communityName": community_properties.get("communityName", "未匹配小区"),
            "managementStatus": community_properties.get("managementStatus", "未匹配物业管理状态"),
            "structureSafety": structure_safety,
            "structureSafetySource": "参考图颜色识别",
            "relationSummary": f"所属地块：{parcel_id}；所属小区：{community_id}",
        }

        building_features.append(
            {
                "type": "Feature",
                "properties": properties,
                "geometry": mapping(item["geometry"]),
            }
        )

    for feature in parcel_features:
        parcel_id = str(feature["properties"].get("parcelId"))
        feature["properties"]["buildingCount"] = parcel_building_counts.get(parcel_id, 0)
        counts = parcel_structure_counts.get(parcel_id, {status: 0 for status in STRUCTURE_SAFETY_STATUSES})
        feature["properties"]["质量较差建筑数"] = counts["质量较差"]
        feature["properties"]["质量一般建筑数"] = counts["质量一般"]
        feature["properties"]["质量较好建筑数"] = counts["质量较好"]
        feature["properties"]["危房建筑数"] = counts["危房"]

    for feature in community_features:
        community_id = str(feature["properties"].get("communityId"))
        feature["properties"]["buildingCount"] = community_building_counts.get(community_id, 0)
        counts = community_structure_counts.get(community_id, {status: 0 for status in STRUCTURE_SAFETY_STATUSES})
        feature["properties"]["质量较差建筑数"] = counts["质量较差"]
        feature["properties"]["质量一般建筑数"] = counts["质量一般"]
        feature["properties"]["质量较好建筑数"] = counts["质量较好"]
        feature["properties"]["危房建筑数"] = counts["危房"]

    return building_features


def write_communities(features: list[dict[str, Any]]) -> None:
    collection = {
        "type": "FeatureCollection",
        "name": COMMUNITY_LAYER_NAME,
        "features": features,
    }
    with COMMUNITIES_OUTPUT_PATH.open("w", encoding="utf-8") as file:
        json.dump(collection, file, ensure_ascii=False, separators=(",", ":"))


def write_management_communities(features: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for status in COMMUNITY_MANAGEMENT_STATUSES:
        status_features = [
            feature
            for feature in features
            if feature.get("properties", {}).get("managementStatus") == status
        ]
        counts[status] = len(status_features)
        collection = {
            "type": "FeatureCollection",
            "name": COMMUNITY_MANAGEMENT_LAYER_NAMES[status],
            "features": status_features,
        }
        with (OUTPUT_DIR / COMMUNITY_MANAGEMENT_LAYER_FILES[status]).open("w", encoding="utf-8") as file:
            json.dump(collection, file, ensure_ascii=False, separators=(",", ":"))

    return counts


def write_buildings(features: list[dict[str, Any]]) -> None:
    collection = {
        "type": "FeatureCollection",
        "name": BUILDING_LAYER_NAME,
        "features": features,
    }
    with BUILDINGS_OUTPUT_PATH.open("w", encoding="utf-8") as file:
        json.dump(collection, file, ensure_ascii=False, separators=(",", ":"))


def write_structure_safety_buildings(features: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for status in STRUCTURE_SAFETY_STATUSES:
        status_features = [
            feature
            for feature in features
            if feature.get("properties", {}).get("structureSafety") == status
        ]
        counts[status] = len(status_features)
        collection = {
            "type": "FeatureCollection",
            "name": f"结构安全-{status}",
            "features": status_features,
        }
        with (OUTPUT_DIR / STRUCTURE_SAFETY_LAYER_FILES[status]).open("w", encoding="utf-8") as file:
            json.dump(collection, file, ensure_ascii=False, separators=(",", ":"))

    return counts


def update_layers_index(
    parcel_count: int,
    community_count: int,
    building_count: int,
    community_management_counts: dict[str, int],
    structure_safety_counts: dict[str, int],
) -> None:
    if LAYERS_INDEX_PATH.exists():
        with LAYERS_INDEX_PATH.open("r", encoding="utf-8") as file:
            layers = json.load(file)
    else:
        layers = []

    layers = [
        layer
        for layer in layers
        if layer.get("id")
        not in {
            PARCEL_LAYER_ID,
            COMMUNITY_LAYER_ID,
            BUILDING_LAYER_ID,
            BUILDING_STRUCTURE_LAYER_ID,
            *STRUCTURE_SAFETY_LAYER_IDS.values(),
            *COMMUNITY_MANAGEMENT_LAYER_IDS.values(),
        }
    ]
    layers.append(
        {
            "id": PARCEL_LAYER_ID,
            "name": PARCEL_LAYER_NAME,
            "category": "parcel",
            "categoryName": "地块图层",
            "geometryType": "Polygon",
            "featureCount": parcel_count,
            "crs": "EPSG:4326",
            "file": "/geodata/parcels.geojson",
            "objectType": "地块",
        }
    )
    for status in COMMUNITY_MANAGEMENT_STATUSES:
        layers.append(
            {
                "id": COMMUNITY_MANAGEMENT_LAYER_IDS[status],
                "name": COMMUNITY_MANAGEMENT_LAYER_NAMES[status],
                "category": "parcel",
                "categoryName": "小区图层",
                "geometryType": "Polygon",
                "featureCount": community_management_counts.get(status, 0),
                "crs": "EPSG:4326",
                "file": f"/geodata/{COMMUNITY_MANAGEMENT_LAYER_FILES[status]}",
                "objectType": "小区",
                "diagnosisDimension": "物业管理",
            }
        )
    layers.append(
        {
            "id": BUILDING_LAYER_ID,
            "name": BUILDING_LAYER_NAME,
            "category": "parcel",
            "categoryName": "建筑图层",
            "geometryType": "Polygon",
            "featureCount": building_count,
            "crs": "EPSG:4326",
            "file": "/geodata/buildings.geojson",
            "objectType": "建筑",
        }
    )
    for status in STRUCTURE_SAFETY_STATUSES:
        layers.append(
            {
                "id": STRUCTURE_SAFETY_LAYER_IDS[status],
                "name": status,
                "category": "parcel",
                "categoryName": "建筑诊断图层",
                "geometryType": "Polygon",
                "featureCount": structure_safety_counts.get(status, 0),
                "crs": "EPSG:4326",
                "file": f"/geodata/{STRUCTURE_SAFETY_LAYER_FILES[status]}",
                "objectType": "建筑",
                "diagnosisDimension": "结构安全",
            }
        )

    layers.sort(key=lambda item: (item.get("category", ""), item.get("name", "")))
    with LAYERS_INDEX_PATH.open("w", encoding="utf-8") as file:
        json.dump(layers, file, ensure_ascii=False, indent=2)


def main() -> None:
    if not SOURCE_PATH.exists():
        raise FileNotFoundError(SOURCE_PATH)

    features = build_parcel_features()
    attach_diagnostics_to_parcels(features)
    community_features = build_community_features(features)
    building_features = build_building_features(features, community_features)
    write_parcels(features)
    write_communities(community_features)
    community_management_counts = write_management_communities(community_features)
    write_buildings(building_features)
    structure_safety_counts = write_structure_safety_buildings(building_features)
    update_layers_index(
        len(features),
        len(community_features),
        len(building_features),
        community_management_counts,
        structure_safety_counts,
    )
    print(f"Prepared {len(features)} parcel features: {OUTPUT_PATH}")
    print(f"Prepared {len(community_features)} community features: {COMMUNITIES_OUTPUT_PATH}")
    print(f"Prepared {len(building_features)} building features: {BUILDINGS_OUTPUT_PATH}")


if __name__ == "__main__":
    main()
