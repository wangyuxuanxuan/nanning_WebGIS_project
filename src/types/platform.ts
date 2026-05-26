export type MapTopic = "problem" | "demand";

export interface GeoLayerMeta {
  id: string;
  name: string;
  category: MapTopic;
  categoryName: string;
  geometryType: string;
  featureCount: number;
  crs: string;
  file: string;
}

export interface SelectedGeoPoint {
  id: string;
  layerId: string;
  layerName: string;
  category: MapTopic;
  coordinate: [number, number];
  properties: Record<string, unknown>;
}

export interface TopicSummary {
  topic: MapTopic;
  title: string;
  subtitle: string;
  layerCount: number;
  featureCount: number;
  layers: GeoLayerMeta[];
}

export interface BasemapMeta {
  id: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
  sourceCrs: string;
  mapCrs: string;
  webMercatorTransform: [number, number, number, number, number, number];
  extent: [number, number, number, number];
}

export type AnalysisMode = "score" | "potential" | "decision" | "feedback";

export type LayerKey = "parcel" | "community" | "building" | "facility" | "feedback";

export interface IndicatorItem {
  id: string;
  name: string;
  dimension: string;
  unit: string;
  value: string | number;
  score: number;
  status: string;
}

export interface SpatialObject {
  id: string;
  name: string;
  type: string;
  street: string;
  community: string;
  area: string;
  geometry: number[][];
  indicators: IndicatorItem[];
  analysis: {
    score: number;
    potential: number;
    decision: string;
    riskLevel: string;
    issues: string[];
    suggestions: string[];
  };
  feedback: {
    supportRate: number;
    neutralRate: number;
    opposeRate: number;
    submissions: number;
    hotTopics: string[];
    sentiment: string;
    summary: string;
  };
}

export interface FacilityPoint {
  id: string;
  name: string;
  category: string;
  coordinate: [number, number];
  status: string;
}

export interface FeedbackPoint {
  id: string;
  objectId: string;
  title: string;
  coordinate: [number, number];
  attitude: string;
}

export interface IndicatorOption {
  id: string;
  label: string;
  dimension: string;
}
