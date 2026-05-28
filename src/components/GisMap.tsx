import { useEffect, useMemo, useRef } from "react";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import OlMap from "ol/Map";
import Overlay from "ol/Overlay";
import View from "ol/View";
import ImageLayer from "ol/layer/Image";
import VectorLayer from "ol/layer/Vector";
import ImageCanvasSource from "ol/source/ImageCanvas";
import VectorSource from "ol/source/Vector";
import { Circle, Fill, Stroke, Style, Text } from "ol/style";
import { fromLonLat, toLonLat } from "ol/proj";
import type { BasemapMeta, GeoLayerMeta, MapTopic, SelectedGeoPoint } from "../types/platform";
import { getLayerVisualColor } from "../utils/layerColor";
import { publicUrl } from "../utils/publicPath";

interface GisMapProps {
  topic: MapTopic;
  layers: GeoLayerMeta[];
  visibleLayerIds: Set<string>;
  selectedPointId?: string;
  onSelectPoint: (point: SelectedGeoPoint) => void;
}

function getPrimaryName(properties: Record<string, unknown>, fallback = "点位信息") {
  const keys = [
    "buildingName",
    "buildingId",
    "communityName",
    "communityId",
    "parcelName",
    "parcelId",
    "小区名称",
    "名称",
    "社区名称",
    "所属街道",
    "城区",
    "OBJECTID"
  ];
  for (const key of keys) {
    const value = properties[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }
  return fallback;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return map[char];
  });
}

function buildPopupHtml(point: SelectedGeoPoint) {
  const propertyRows = Object.entries(point.properties)
    .filter(([, value]) => value !== null && value !== undefined && String(value) !== "")
    .slice(0, 7);
  const rows = (propertyRows.length > 0
    ? propertyRows
    : [
        [point.category === "problem" ? "问题类型" : point.category === "parcel" ? "对象类型" : "需求类型", point.layerName],
        ["经度", point.coordinate[0].toFixed(6)],
        ["纬度", point.coordinate[1].toFixed(6)],
        ["属性说明", "原始图层未提供更多属性字段"]
      ])
    .map(
      ([key, value]) =>
        `<div class="popup-row"><span>${escapeHtml(key)}</span><strong>${escapeHtml(String(value))}</strong></div>`
    )
    .join("");

  return `
    <div class="map-popup-card">
      <p>${escapeHtml(point.layerName)}</p>
      <h3>${escapeHtml(getPrimaryName(point.properties, point.layerName.replace("_点", "")))}</h3>
      <div>${rows}</div>
    </div>
  `;
}

function getMapCoordinate(geometry: any) {
  if (!geometry) return undefined;
  const type = geometry.getType?.();

  if (type === "Point") return geometry.getCoordinates();
  if (type === "MultiPoint") return geometry.getCoordinates()[0];
  if (type === "Polygon") return geometry.getInteriorPoint().getCoordinates().slice(0, 2);
  if (type === "MultiPolygon") return geometry.getInteriorPoints().getCoordinates()[0]?.slice(0, 2);

  const extent = geometry.getExtent?.();
  return extent && extent.every(Number.isFinite)
    ? [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2]
    : undefined;
}

function getLonLatCoordinate(geometry: any, properties: Record<string, unknown>): [number, number] {
  const centroidLon = Number(properties.centroidLon);
  const centroidLat = Number(properties.centroidLat);
  if (Number.isFinite(centroidLon) && Number.isFinite(centroidLat)) {
    return [centroidLon, centroidLat];
  }

  const coordinate = getMapCoordinate(geometry);
  return coordinate ? (toLonLat(coordinate).slice(0, 2) as [number, number]) : [0, 0];
}

function createFeatureStyle(feature: Feature, selected: boolean) {
  const geometryType = feature.getGeometry()?.getType();
  const layerColor = (feature.get("layerColor") as string) || "#2f7df6";

  if (geometryType === "Polygon" || geometryType === "MultiPolygon") {
    const pointData = feature.get("pointData") as SelectedGeoPoint | undefined;
    const label = pointData ? getPrimaryName(pointData.properties, pointData.layerName) : "";
    const managementStatus = pointData?.properties.managementStatus;
    const isCommunity = pointData?.properties.objectType === "小区";
    const isBuilding = pointData?.properties.objectType === "建筑";
    const isStructureSafety = feature.get("diagnosisDimension") === "结构安全";
    const isUnmanaged = managementStatus === "未实施物业管理";
    const safetyColors: Record<string, { fill: string; selectedFill: string; stroke: string }> = {
      质量较差: { fill: "rgba(45, 166, 20, 0.72)", selectedFill: "rgba(45, 166, 20, 0.9)", stroke: "#1f8f0c" },
      质量一般: { fill: "rgba(178, 223, 13, 0.72)", selectedFill: "rgba(178, 223, 13, 0.9)", stroke: "#8fba00" },
      质量较好: { fill: "rgba(255, 166, 13, 0.72)", selectedFill: "rgba(255, 166, 13, 0.9)", stroke: "#d97706" },
      危房: { fill: "rgba(239, 20, 20, 0.78)", selectedFill: "rgba(239, 20, 20, 0.92)", stroke: "#dc2626" }
    };
    const safetyStyle = safetyColors[String(pointData?.properties.structureSafety ?? "")];
    const fillColor = isCommunity
      ? isUnmanaged
        ? selected
          ? "rgba(196, 69, 131, 0.78)"
          : "rgba(196, 69, 131, 0.62)"
        : selected
          ? "rgba(255, 231, 174, 0.88)"
          : "rgba(255, 231, 174, 0.72)"
      : isBuilding && isStructureSafety && safetyStyle
        ? selected
          ? safetyStyle.selectedFill
          : safetyStyle.fill
      : isBuilding
        ? selected
          ? "rgba(47, 125, 246, 0.36)"
          : "rgba(47, 125, 246, 0.2)"
      : selected
        ? "rgba(22, 163, 74, 0.28)"
        : "rgba(22, 163, 74, 0.16)";
    const strokeColor = isCommunity
      ? isUnmanaged
        ? "#ad3f78"
        : "#c99d39"
      : isBuilding && isStructureSafety && safetyStyle
        ? safetyStyle.stroke
      : isBuilding
        ? selected
          ? "#1d4ed8"
          : "#2f7df6"
        : selected
          ? "#15803d"
          : "#16a34a";
    return new Style({
      fill: new Fill({ color: fillColor }),
      stroke: new Stroke({ color: strokeColor, width: selected ? 3 : isCommunity || isBuilding ? 1 : 1.4 }),
      text: selected
        ? new Text({
            text: label,
            font: "700 13px Microsoft YaHei, sans-serif",
            fill: new Fill({ color: "#14532d" }),
            stroke: new Stroke({ color: "rgba(255,255,255,0.95)", width: 4 })
          })
        : undefined
    });
  }

  return new Style({
    image: new Circle({
      radius: selected ? 8 : 5.5,
      fill: new Fill({ color: selected ? "#ffffff" : layerColor }),
      stroke: new Stroke({ color: layerColor, width: selected ? 3 : 1.8 })
    }),
    text: selected
      ? new Text({
          text: String(feature.get("layerName") ?? ""),
          offsetY: -18,
          font: "600 12px Microsoft YaHei, sans-serif",
          fill: new Fill({ color: "#1f2937" }),
          stroke: new Stroke({ color: "rgba(255,255,255,0.92)", width: 4 })
        })
      : undefined
  });
}

function createBasemapLayer(meta: BasemapMeta, image: HTMLImageElement) {
  const [a, b, c, d, e, f] = meta.webMercatorTransform;
  const source = new ImageCanvasSource({
    projection: meta.mapCrs,
    ratio: 1,
    canvasFunction: (extent, resolution, pixelRatio, size) => {
      const canvas = document.createElement("canvas");
      const width = Math.round(size[0] * pixelRatio);
      const height = Math.round(size[1] * pixelRatio);
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) return canvas;

      context.clearRect(0, 0, width, height);
      context.imageSmoothingEnabled = true;
      context.globalAlpha = 0.96;
      context.setTransform(
        (a / resolution) * pixelRatio,
        (-b / resolution) * pixelRatio,
        (c / resolution) * pixelRatio,
        (-d / resolution) * pixelRatio,
        ((e - extent[0]) / resolution) * pixelRatio,
        ((extent[3] - f) / resolution) * pixelRatio
      );
      context.drawImage(image, 0, 0, meta.width, meta.height);
      context.setTransform(1, 0, 0, 1, 0, 0);

      return canvas;
    }
  });

  const layer = new ImageLayer({ source, extent: meta.extent });
  layer.setZIndex(0);
  return layer;
}

export function GisMap({ topic, layers, visibleLayerIds, selectedPointId, onSelectPoint }: GisMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<OlMap | null>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const basemapLayerRef = useRef<ImageLayer<ImageCanvasSource> | null>(null);
  const vectorLayersRef = useRef<Array<VectorLayer<VectorSource>>>([]);
  const featureLookupRef = useRef(new globalThis.Map<string, Feature>());
  const selectedPointIdRef = useRef<string | undefined>(selectedPointId);
  const onSelectPointRef = useRef(onSelectPoint);

  selectedPointIdRef.current = selectedPointId;
  onSelectPointRef.current = onSelectPoint;

  const layerKey = useMemo(() => layers.map((layer) => layer.id).join("|"), [layers]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const overlay = new Overlay({
      element: popupRef.current ?? undefined,
      positioning: "bottom-center",
      offset: [0, -14],
      stopEvent: false
    });

    const map = new OlMap({
      target: containerRef.current,
      layers: [],
      overlays: [overlay],
      view: new View({
        center: fromLonLat([108.34, 22.81]),
        zoom: 12.5,
        minZoom: 10,
        maxZoom: 18
      }),
      controls: []
    });

    map.on("singleclick", (event) => {
      let handled = false;
      map.forEachFeatureAtPixel(
        event.pixel,
        (featureLike) => {
          const feature = featureLike as Feature;
          const point = feature.get("pointData") as SelectedGeoPoint | undefined;
          if (!point) return false;

          onSelectPointRef.current(point);
          overlay.setPosition(event.coordinate);
          if (popupRef.current) popupRef.current.innerHTML = buildPopupHtml(point);
          handled = true;
          return true;
        },
        { hitTolerance: 8 }
      );

      if (!handled) {
        overlay.setPosition(undefined);
      }
    });

    map.on("pointermove", (event) => {
      map.getTargetElement().style.cursor = map.hasFeatureAtPixel(event.pixel, { hitTolerance: 8 }) ? "pointer" : "";
    });

    mapRef.current = map;
    overlayRef.current = overlay;

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      overlayRef.current = null;
      basemapLayerRef.current = null;
      vectorLayersRef.current = [];
      featureLookupRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || basemapLayerRef.current) return;

    let cancelled = false;
    fetch(publicUrl("geodata/basemaps/basemap.json"))
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load basemap metadata");
        return response.json() as Promise<BasemapMeta>;
      })
      .then(
        (meta) =>
          new Promise<{ meta: BasemapMeta; image: HTMLImageElement }>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve({ meta, image });
            image.onerror = () => reject(new Error("Unable to load basemap image"));
            image.src = publicUrl(meta.imageUrl);
          })
      )
      .then(({ meta, image }) => {
        if (cancelled || basemapLayerRef.current) return;
        const layer = createBasemapLayer(meta, image);
        basemapLayerRef.current = layer;
        map.addLayer(layer);
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let cancelled = false;
    vectorLayersRef.current.forEach((layer) => map.removeLayer(layer));
    vectorLayersRef.current = [];
    featureLookupRef.current.clear();
    overlayRef.current?.setPosition(undefined);

    Promise.all(
      layers.map(async (layerMeta, layerIndex) => {
        const response = await fetch(publicUrl(layerMeta.file));
        if (!response.ok) throw new Error(`无法读取图层：${layerMeta.name}`);
        const data = await response.json();
        const features = new GeoJSON().readFeatures(data, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857"
        }) as Feature[];

        const color = getLayerVisualColor(layerMeta.name, topic, layerIndex);
        features.forEach((feature, index) => {
          const properties = { ...feature.getProperties() };
          delete properties.geometry;
          const geometry = feature.getGeometry();
          const coordinate = getLonLatCoordinate(geometry, properties);
          const id = `${layerMeta.id}-${index}`;
          const pointData: SelectedGeoPoint = {
            id,
            layerId: layerMeta.id,
            layerName: layerMeta.name,
            category: layerMeta.category,
            geometryType: geometry?.getType(),
            coordinate,
            properties
          };
          feature.setId(id);
          feature.set("pointData", pointData);
          feature.set("layerName", layerMeta.name);
          feature.set("layerColor", color);
          feature.set("objectType", layerMeta.objectType);
          feature.set("diagnosisDimension", layerMeta.diagnosisDimension);
          featureLookupRef.current.set(id, feature);
        });

        const source = new VectorSource({ features });
        const vectorLayer = new VectorLayer({
          source,
          visible: visibleLayerIds.has(layerMeta.id),
          style: (feature) => {
            const selected = feature.getId() === selectedPointIdRef.current;
            return createFeatureStyle(feature as Feature, selected);
          }
        });
        vectorLayer.setZIndex(layerMeta.category === "parcel" ? 8 : 10);

        return vectorLayer;
      })
    )
      .then((vectorLayers) => {
        if (cancelled) return;
        vectorLayersRef.current = vectorLayers;
        vectorLayers.forEach((layer) => map.addLayer(layer));

        const extent = new VectorSource({
          features: vectorLayers.flatMap((layer) => layer.getSource()?.getFeatures() ?? [])
        }).getExtent();

        if (extent && extent.every(Number.isFinite)) {
          map.getView().fit(extent, {
            padding: [54, 54, 54, 54],
            maxZoom: 15,
            duration: 300
          });
        }
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      cancelled = true;
    };
  }, [layerKey, topic]);

  useEffect(() => {
    vectorLayersRef.current.forEach((layer) => {
      const firstFeature = layer.getSource()?.getFeatures()[0];
      const layerId = (firstFeature?.get("pointData") as SelectedGeoPoint | undefined)?.layerId;
      layer.setVisible(layerId ? visibleLayerIds.has(layerId) : true);
    });
  }, [visibleLayerIds]);

  useEffect(() => {
    vectorLayersRef.current.forEach((layer) => layer.changed());
    const feature = selectedPointId ? featureLookupRef.current.get(selectedPointId) : undefined;
    const geometry = feature?.getGeometry();
    const point = feature?.get("pointData") as SelectedGeoPoint | undefined;
    if (!geometry || !point) return;

    const coordinate = getMapCoordinate(geometry);
    if (!coordinate) return;

    overlayRef.current?.setPosition(coordinate);
    if (popupRef.current) popupRef.current.innerHTML = buildPopupHtml(point);
  }, [selectedPointId]);

  return (
    <>
      <div className="gis-map" ref={containerRef} />
      <div className="map-popup" ref={popupRef} />
    </>
  );
}
