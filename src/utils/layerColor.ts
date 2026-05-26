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

export function getLayerVisualColor(_layerName: string, _topic: MapTopic, layerIndex = 0) {
  return layerPalette[layerIndex % layerPalette.length];
}
