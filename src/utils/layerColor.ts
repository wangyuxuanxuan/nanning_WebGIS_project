import type { MapTopic } from "../types/platform";

export const layerPalette = [
  "#2f7df6",
  "#00b3a4",
  "#ff8a1f",
  "#8b5cf6",
  "#16a34a",
  "#f45d67",
  "#0ea5e9",
  "#f59e0b",
  "#14b8a6",
  "#6366f1",
  "#ef4444",
  "#84cc16",
  "#06b6d4",
  "#a855f7",
  "#22c55e",
  "#f97316"
];

export function getLayerVisualColor(layerName: string, topic: MapTopic, layerIndex = 0) {
  if (topic === "parcel") {
    const safetyColors: Record<string, string> = {
      质量较差: "#2da614",
      质量一般: "#b2df0d",
      质量较好: "#ffa60d",
      危房: "#ef1414"
    };
    const managementColors: Record<string, string> = {
      未实施物业管理的小区: "#c44583",
      已实施物业管理的小区: "#c99d39"
    };
    if (safetyColors[layerName]) return safetyColors[layerName];
    if (managementColors[layerName]) return managementColors[layerName];
  }

  return layerPalette[layerIndex % layerPalette.length];
}
