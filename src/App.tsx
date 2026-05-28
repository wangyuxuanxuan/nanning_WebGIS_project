import { useCallback, useEffect, useMemo, useState } from "react";
import { App as AntApp, Avatar, Badge, Button, Empty, Input, Segmented, Select, Space, Spin, Switch, Tag } from "antd";
import {
  AlertCircle,
  BarChart3,
  Bell,
  CheckSquare,
  ChevronDown,
  Database,
  Download,
  FileBarChart,
  Filter,
  Layers,
  LocateFixed,
  Map,
  MapPinned,
  Maximize,
  Menu,
  MessageSquare,
  LogOut,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Star,
  TrendingUp,
  UserRound
} from "lucide-react";
import ReactECharts from "echarts-for-react";
import { AdminConsole } from "./components/AdminConsole";
import { AuthDemo } from "./components/AuthDemo";
import { DataCenter } from "./components/DataCenter";
import { GisMap } from "./components/GisMap";
import { IndicatorSystem } from "./components/IndicatorSystem";
import { OpinionCollection } from "./components/OpinionCollection";
import { ResidentSurvey } from "./components/ResidentSurvey";
import type { AuthUser } from "./data/mockAuth";
import { getAdminLayers } from "./services/api";
import type { GeoLayerMeta, MapTopic, SelectedGeoPoint, TopicSummary } from "./types/platform";
import { getLayerVisualColor } from "./utils/layerColor";
import { publicUrl } from "./utils/publicPath";

type ParcelDimension = "地块维度" | "建筑维度";
type DiagnosisDimension = "全部" | "物业管理" | "结构安全";
type AppSection = "analysis" | "indicatorSystem" | "residentSurvey" | "dataCenter" | "opinionCollection" | "admin";

const structureSafetyOrder = ["质量较差", "质量一般", "质量较好", "危房"];
const propertyManagementOrder = ["未实施物业管理的小区", "已实施物业管理的小区"];

const topicText: Record<MapTopic, { title: string; subtitle: string; tag: string }> = {
  problem: {
    title: "问题一张图",
    subtitle: "集中呈现城市体检发现的短板、风险和服务覆盖不足点位。",
    tag: "问题点"
  },
  demand: {
    title: "需求一张图",
    subtitle: "集中呈现小区更新、设施完善和改造提升类需求点位。",
    tag: "需求点"
  },
  parcel: {
    title: "地块信息",
    subtitle: "展示由地块线围合生成的地块范围，支持编号查看和属性查询。",
    tag: "地块"
  }
};

const navItems = [
  { label: "综合分析", icon: Map, section: "analysis" },
  { label: "指标体系", icon: FileBarChart, section: "indicatorSystem" },
  { label: "数据中心", icon: Database, section: "dataCenter" },
  { label: "意见收集", icon: MessageSquare, section: "opinionCollection" },
  { label: "系统管理", icon: Settings, section: "admin" }
] as Array<{ label: string; icon: typeof Map; section: AppSection }>;

const frontNavItems = [
  { label: "综合分析", icon: Map, section: "analysis" },
  { label: "调查问卷", icon: MessageSquare, section: "residentSurvey" }
] as Array<{ label: string; icon: typeof Map; section: AppSection }>;

function canAccessAllFeatures(user: AuthUser) {
  return user.userType === "系统管理员" || user.userType === "政府管理者";
}

const groupRules = [
  { name: "公共服务设施", keywords: ["公园", "幼儿园", "养老"] },
  { name: "住房与交通", keywords: ["停车", "物业", "一户一表", "道路"] },
  { name: "医疗与健康", keywords: ["医疗", "健身"] },
  { name: "绿色与开放空间", keywords: ["绿地", "活动场地"] },
  { name: "基础设施更新", keywords: ["雨污", "易涝", "供水", "消防", "屋顶", "外墙", "电梯"] }
];

function buildTopicSummaries(layers: GeoLayerMeta[]): Record<MapTopic, TopicSummary> {
  const result: Record<MapTopic, TopicSummary> = {
    problem: {
      topic: "problem",
      title: topicText.problem.title,
      subtitle: topicText.problem.subtitle,
      layerCount: 0,
      featureCount: 0,
      layers: []
    },
    demand: {
      topic: "demand",
      title: topicText.demand.title,
      subtitle: topicText.demand.subtitle,
      layerCount: 0,
      featureCount: 0,
      layers: []
    },
    parcel: {
      topic: "parcel",
      title: topicText.parcel.title,
      subtitle: topicText.parcel.subtitle,
      layerCount: 0,
      featureCount: 0,
      layers: []
    }
  };

  layers.forEach((layer) => {
    result[layer.category].layers.push(layer);
    result[layer.category].layerCount += 1;
    result[layer.category].featureCount += layer.featureCount;
  });

  return result;
}

function buildLayerChart(summary: TopicSummary) {
  const layers = [...summary.layers].sort((a, b) => b.featureCount - a.featureCount).slice(0, 8);
  const color = summary.topic === "problem" ? "#2f7df6" : summary.topic === "parcel" ? "#16a34a" : "#00b3a4";
  return {
    color: [color],
    grid: { top: 12, right: 20, bottom: 22, left: 150 },
    tooltip: { trigger: "axis", confine: true },
    xAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: "#edf2f8" } },
      axisLabel: { color: "#8b97aa" }
    },
    yAxis: {
      type: "category",
      data: layers.map((layer) => layer.name.replace("_点", "")),
      axisLabel: { color: "#475569", width: 140, overflow: "truncate" },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [
      {
        type: "bar",
        barWidth: 7,
        itemStyle: { borderRadius: 8 },
        data: layers.map((layer) => layer.featureCount)
      }
    ]
  };
}

function getPointTitle(point?: SelectedGeoPoint) {
  if (!point) return "";
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
    const value = point.properties[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }
  return point.layerName.replace("_点", "");
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return String(value);
}

function groupLayers(layers: GeoLayerMeta[]) {
  if (layers.length > 0 && layers.every((layer) => layer.category === "parcel")) {
    const objectType = layers[0].objectType ?? "地块";
    return [{ name: objectType === "小区" ? "小区图层" : objectType === "建筑" ? "建筑图层" : "地块图层", layers }];
  }

  const usedIds = new Set<string>();
  const groups = groupRules.map((rule) => {
    const matchedLayers = layers.filter((layer) => {
      if (usedIds.has(layer.id)) return false;
      return rule.keywords.some((keyword) => layer.name.includes(keyword));
    });

    matchedLayers.forEach((layer) => usedIds.add(layer.id));

    return {
      name: rule.name,
      layers: matchedLayers
    };
  });
  const otherLayers = layers.filter((layer) => !usedIds.has(layer.id));
  const visibleGroups = groups.filter((group) => group.layers.length > 0);
  return otherLayers.length > 0 ? [...visibleGroups, { name: "其他图层", layers: otherLayers }] : visibleGroups;
}

function filterLayerGroups(groups: ReturnType<typeof groupLayers>, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return groups;

  return groups
    .map((group) => ({
      ...group,
      layers: group.layers.filter((layer) => layer.name.toLowerCase().includes(normalizedKeyword))
    }))
    .filter((group) => group.layers.length > 0);
}

interface PlatformAppProps {
  user: AuthUser;
  onLogout: () => void;
}

function PlatformApp({ user, onLogout }: PlatformAppProps) {
  const { message } = AntApp.useApp();
  const [layers, setLayers] = useState<GeoLayerMeta[]>([]);
  const [activeSection, setActiveSection] = useState<AppSection>("analysis");
  const [activeNavLabel, setActiveNavLabel] = useState("综合分析");
  const [activeTopic, setActiveTopic] = useState<MapTopic>("problem");
  const [visibleLayerIds, setVisibleLayerIds] = useState<Set<string>>(new Set());
  const [selectedPoint, setSelectedPoint] = useState<SelectedGeoPoint | undefined>();
  const [parcelDimension, setParcelDimension] = useState<ParcelDimension>("地块维度");
  const [diagnosisDimension, setDiagnosisDimension] = useState<DiagnosisDimension>("全部");
  const [layerSearchText, setLayerSearchText] = useState("");
  const [collapsedLayerGroups, setCollapsedLayerGroups] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const hasFullAccess = canAccessAllFeatures(user);
  const visibleNavItems = hasFullAccess ? navItems : frontNavItems;

  const loadLayers = useCallback(() => {
    setLoading(true);
    getAdminLayers({ enabledOnly: true })
      .catch(() =>
        fetch(publicUrl("geodata/layers.json"))
          .then((response) => {
            if (!response.ok) throw new Error("图层索引读取失败");
            return response.json() as Promise<GeoLayerMeta[]>;
          })
      )
      .then((response) => {
        const items = response.filter((item) => item.enabled !== false);
        setLayers(items);
        setVisibleLayerIds((current) => {
          if (current.size === 0) return new Set(items.map((item) => item.id));
          return new Set(items.filter((item) => current.has(item.id)).map((item) => item.id));
        });
      })
      .catch(() => {
        message.error("未能读取图层数据，请确认本地后端已启动或 public/geodata/layers.json 存在。");
      })
      .finally(() => setLoading(false));
  }, [message]);

  useEffect(() => {
    loadLayers();
  }, [loadLayers]);

  useEffect(() => {
    if (!hasFullAccess && !frontNavItems.some((item) => item.section === activeSection)) {
      setActiveSection("analysis");
      setActiveNavLabel("综合分析");
    }
  }, [activeSection, hasFullAccess]);

  const summaries = useMemo(() => buildTopicSummaries(layers), [layers]);
  const activeSummary = summaries[activeTopic];
  const activeLayers = useMemo(
    () =>
      activeTopic === "parcel"
        ? parcelDimension === "地块维度"
          ? activeSummary.layers.filter((layer) =>
              diagnosisDimension === "物业管理"
                ? layer.diagnosisDimension === "物业管理"
                : (layer.objectType ?? "地块") === "地块"
            ).sort((a, b) => propertyManagementOrder.indexOf(a.name) - propertyManagementOrder.indexOf(b.name))
          : activeSummary.layers.filter((layer) =>
              diagnosisDimension === "结构安全"
                ? layer.diagnosisDimension === "结构安全"
                : layer.objectType === "建筑" && !layer.diagnosisDimension
            ).sort((a, b) => structureSafetyOrder.indexOf(a.name) - structureSafetyOrder.indexOf(b.name))
        : activeSummary.layers,
    [activeSummary.layers, activeTopic, diagnosisDimension, parcelDimension]
  );
  const activeDisplaySummary = useMemo(
    () => ({
      ...activeSummary,
      layerCount: activeLayers.length,
      featureCount: activeLayers.reduce((sum, layer) => sum + layer.featureCount, 0),
      layers: activeLayers
    }),
    [activeLayers, activeSummary]
  );
  const activeObjectLabel =
    activeTopic === "parcel"
      ? diagnosisDimension === "物业管理"
        ? "小区数"
        : parcelDimension === "建筑维度"
          ? "建筑数"
          : "地块数"
      : "点位数";
  const activeRankingTitle = activeTopic === "parcel" ? `${activeObjectLabel.replace("数", "")}数量统计` : "点位数量排行";
  const activeLegendTitle =
    activeTopic === "problem"
      ? "问题类型"
      : activeTopic === "parcel" && diagnosisDimension === "物业管理"
        ? "物业管理状态"
        : activeTopic === "parcel" && diagnosisDimension === "结构安全"
          ? "结构安全"
        : activeTopic === "parcel" && parcelDimension === "建筑维度"
          ? "建筑轮廓"
        : activeTopic === "parcel"
          ? "地块范围"
          : "需求类型";
  const visibleActiveCount = activeLayers.filter((layer) => visibleLayerIds.has(layer.id)).length;
  const allCurrentLayersVisible = activeLayers.length > 0 && visibleActiveCount === activeLayers.length;
  const layerGroups = useMemo(() => groupLayers(activeLayers), [activeLayers]);
  const filteredLayerGroups = useMemo(
    () => filterLayerGroups(layerGroups, layerSearchText),
    [layerGroups, layerSearchText]
  );
  const searchedLayerCount = filteredLayerGroups.reduce((sum, group) => sum + group.layers.length, 0);
  const layerColorById = useMemo(
    () =>
      new globalThis.Map(
        activeLayers.map((layer, index) => [layer.id, getLayerVisualColor(layer.name, activeTopic, index)])
      ),
    [activeLayers, activeTopic]
  );
  const rankedLayers = useMemo(
    () => [...activeLayers].sort((a, b) => b.featureCount - a.featureCount).slice(0, 7),
    [activeLayers]
  );
  const hotLayers = rankedLayers.slice(0, 3);
  const riskLayers = rankedLayers.slice(0, 5);
  const selectedPointRows = useMemo(
    () =>
      selectedPoint
        ? Object.entries(selectedPoint.properties).filter(([, value]) => value !== null && value !== undefined && String(value) !== "")
        : [],
    [selectedPoint]
  );
  const displayPointRows = useMemo(() => {
    if (!selectedPoint) return [];
    if (selectedPointRows.length > 0) return selectedPointRows;
    return [
      [selectedPoint.category === "problem" ? "问题类型" : selectedPoint.category === "parcel" ? "对象类型" : "需求类型", selectedPoint.layerName],
      ["经度", selectedPoint.coordinate[0].toFixed(6)],
      ["纬度", selectedPoint.coordinate[1].toFixed(6)],
      ["属性说明", "原始图层未提供更多属性字段"]
    ] as Array<[string, unknown]>;
  }, [selectedPoint, selectedPointRows]);

  const toggleLayer = (layerId: string, checked: boolean) => {
    setVisibleLayerIds((current) => {
      const next = new Set(current);
      if (checked) next.add(layerId);
      else next.delete(layerId);
      return next;
    });
  };

  const showAllCurrentLayers = () => {
    setVisibleLayerIds((current) => new Set([...current, ...activeLayers.map((layer) => layer.id)]));
  };

  const hideAllCurrentLayers = () => {
    setVisibleLayerIds((current) => {
      const next = new Set(current);
      activeLayers.forEach((layer) => next.delete(layer.id));
      return next;
    });
  };

  const setAllCurrentLayersVisible = (checked: boolean) => {
    if (checked) showAllCurrentLayers();
    else hideAllCurrentLayers();
  };

  const toggleLayerGroup = (groupName: string) => {
    setCollapsedLayerGroups((current) => ({ ...current, [groupName]: !current[groupName] }));
  };

  const objectTypeOptions =
    activeTopic === "parcel"
      ? parcelDimension === "地块维度"
        ? [
            { value: "全部", label: "全部" },
            { value: "物业管理", label: "物业管理" }
          ]
        : [
            { value: "全部", label: "全部" },
            { value: "结构安全", label: "结构安全" }
          ]
      : [{ value: "全部", label: "全部" }];
  const dimensionOptions =
    activeTopic === "parcel"
      ? [
          { value: "地块维度", label: "地块维度" },
          { value: "建筑维度", label: "建筑维度" }
        ]
      : [{ value: "全部", label: "全部" }];

  return (
    <AntApp>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">
              <MapPinned size={22} />
            </span>
            <div>
              <h1>南宁城市体检信息平台</h1>
            </div>
          </div>
          <div className="breadcrumb">
            {activeSection === "admin"
              ? "系统管理 / 后台配置"
              : activeSection === "dataCenter"
                ? "数据中心 / 地块与建筑数据"
              : activeSection === "opinionCollection"
                ? "意见收集 / 调研问卷"
                : activeSection === "indicatorSystem"
                  ? "指标体系 / 体检指标与总分计算"
                : activeSection === "residentSurvey"
                  ? "前台服务 / 调查问卷"
                  : `${activeNavLabel} / ${activeSummary.title}`}
          </div>
          <Input className="global-search" prefix={<Search size={17} />} placeholder="搜索街区、地点、图层或指标" allowClear />
          <Space className="top-actions">
            <Badge count={12} size="small">
              <Button className="icon-btn" icon={<Bell size={18} />} />
            </Badge>
            <Button icon={<Download size={17} />}>导出</Button>
            <div className="user-chip">
              <Avatar size={34} icon={<UserRound size={18} />} />
              <span>{user.name}</span>
              <ChevronDown size={14} />
            </div>
            <Button icon={<LogOut size={16} />} onClick={onLogout}>
              退出
            </Button>
          </Space>
        </header>

        {loading ? (
          <div className="loading-view">
            <Spin />
            <span>正在加载城市体检图层</span>
          </div>
        ) : (
          <div className="body-grid">
            <nav className="side-nav">
              <div className="nav-list">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      className={`nav-item${activeNavLabel === item.label ? " active" : ""}`}
                      key={item.label}
                      onClick={() => {
                        setActiveNavLabel(item.label);
                        setActiveSection(item.section);
                      }}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <Button className="collapse-btn" icon={<Menu size={16} />}>
                收起菜单
              </Button>
            </nav>

            {activeSection === "admin" ? (
              <AdminConsole user={user} onLayersChanged={loadLayers} />
            ) : activeSection === "dataCenter" ? (
              <DataCenter />
            ) : activeSection === "opinionCollection" ? (
              <OpinionCollection />
            ) : activeSection === "indicatorSystem" ? (
              <IndicatorSystem />
            ) : activeSection === "residentSurvey" ? (
              <ResidentSurvey user={user} />
            ) : (
            <main className="workspace">
              <aside className="analysis-panel">
              <section className="summary-block">
                <p className="eyebrow">综合分析维度</p>
                <h2>{activeSummary.title}</h2>
                <p>{activeSummary.subtitle}</p>
                <div className="metric-grid">
                  <div className="metric-card">
                    <Layers size={25} />
                    <span>图层数</span>
                    <strong>{activeDisplaySummary.layerCount}</strong>
                  </div>
                  <div className="metric-card">
                    <MapPinned size={25} />
                    <span>{activeObjectLabel}</span>
                    <strong>{activeDisplaySummary.featureCount}</strong>
                  </div>
                  <div className="metric-card metric-wide">
                    <FileBarChart size={25} />
                    <span>覆盖街区</span>
                    <strong>58</strong>
                  </div>
                </div>
              </section>

              <section className="panel-section">
                <div className="section-title">
                  <BarChart3 size={16} />
                  {activeRankingTitle}
                </div>
                <ReactECharts option={buildLayerChart(activeDisplaySummary)} style={{ height: 250 }} />
                <p className="panel-note">统计口径：当前筛选范围内的{activeTopic === "parcel" ? activeObjectLabel : "点位数量"}</p>
              </section>
            </aside>

            <section className="map-stage">
              <div className="map-toolbar">
                <div className="map-titlebar">
                  <p className="eyebrow">当前图纸</p>
                  <h2>{activeSummary.title}</h2>
                </div>
                <Segmented
                  className="topic-switch"
                  value={activeTopic}
                  onChange={(value) => {
                    setActiveTopic(value as MapTopic);
                    if (value !== "parcel") {
                      setParcelDimension("地块维度");
                      setDiagnosisDimension("全部");
                    }
                    setSelectedPoint(undefined);
                    setLayerSearchText("");
                    setCollapsedLayerGroups({});
                  }}
                  options={[
                    { label: "问题一张图", value: "problem", icon: <AlertCircle size={15} /> },
                    { label: "需求一张图", value: "demand", icon: <CheckSquare size={15} /> },
                    { label: "地块信息", value: "parcel", icon: <MapPinned size={15} /> },
                    { label: "综合评分", value: "score", icon: <Star size={15} />, disabled: true },
                    { label: "更新潜力", value: "potential", icon: <TrendingUp size={15} />, disabled: true }
                  ]}
                />
              </div>

              <div className="filter-bar">
                <span>{activeTopic === "parcel" ? "维度" : "街区"}</span>
                <Select
                  size="small"
                  value={activeTopic === "parcel" ? parcelDimension : "全部"}
                  options={dimensionOptions}
                  onChange={(value) => {
                    if (activeTopic === "parcel") {
                      setParcelDimension(value as ParcelDimension);
                      setDiagnosisDimension("全部");
                      setSelectedPoint(undefined);
                      setLayerSearchText("");
                    }
                  }}
                />
                <span>{activeTopic === "parcel" ? "诊断维度" : "对象类型"}</span>
                <Select
                  size="small"
                  value={activeTopic === "parcel" ? diagnosisDimension : "全部"}
                  options={objectTypeOptions}
                  onChange={(value) => {
                    if (activeTopic === "parcel") {
                      setDiagnosisDimension(value as DiagnosisDimension);
                      setSelectedPoint(undefined);
                      setLayerSearchText("");
                    }
                  }}
                />
                <span>风险等级</span>
                <Select size="small" value="全部" options={[{ value: "全部", label: "全部" }]} />
                <span>时间</span>
                <Select size="small" value="2024年度" options={[{ value: "2024年度", label: "2024年度" }]} />
                <Button type="link" icon={<RotateCcw size={14} />}>
                  重置
                </Button>
                <Button type="link" icon={<SlidersHorizontal size={14} />}>
                  收起筛选
                </Button>
              </div>

              <GisMap
                topic={activeTopic}
                layers={activeLayers}
                visibleLayerIds={visibleLayerIds}
                selectedPointId={selectedPoint?.category === activeTopic ? selectedPoint.id : undefined}
                onSelectPoint={setSelectedPoint}
              />

              <div className="map-tool-stack">
                <button title="搜索点位">
                  <Search size={18} />
                </button>
                <button title="图层叠加">
                  <Layers size={18} />
                </button>
                <button title="全屏查看">
                  <Maximize size={18} />
                </button>
              </div>

              <div className="map-legend">
                <div className="legend-title">图例（{activeLegendTitle}）</div>
                {activeTopic === "parcel" && diagnosisDimension === "物业管理" ? (
                  <>
                    <div className="legend-row">
                      <i className="legend-swatch unmanaged" />
                      <span>未实施物业管理的小区</span>
                    </div>
                    <div className="legend-row">
                      <i className="legend-swatch managed" />
                      <span>已实施物业管理的小区</span>
                    </div>
                  </>
                ) : activeTopic === "parcel" && diagnosisDimension === "结构安全" ? (
                  <>
                    <div className="legend-row">
                      <i className="legend-swatch safety-poor" />
                      <span>质量较差</span>
                    </div>
                    <div className="legend-row">
                      <i className="legend-swatch safety-general" />
                      <span>质量一般</span>
                    </div>
                    <div className="legend-row">
                      <i className="legend-swatch safety-good" />
                      <span>质量较好</span>
                    </div>
                    <div className="legend-row">
                      <i className="legend-swatch safety-danger" />
                      <span>危房</span>
                    </div>
                  </>
                ) : (
                  activeLayers.map((layer) => (
                    <div className="legend-row" key={layer.id}>
                      <i className="dot" style={{ backgroundColor: layerColorById.get(layer.id) }} />
                      <span>{layer.name.replace("_点", "")}</span>
                    </div>
                  ))
                )}
              </div>

              {activeTopic !== "parcel" && (
              <div className="float-card hot-card">
                <h3>高频问题 <span>TOP3</span></h3>
                {hotLayers.map((layer) => (
                  <div className="float-row" key={layer.id}>
                    <span>{layer.name.replace("_点", "")}</span>
                    <strong>{layer.featureCount}</strong>
                  </div>
                ))}
                <button>查看全部 {activeLayers.length} 项</button>
              </div>
              )}

              {activeTopic !== "parcel" && (
              <div className="float-card risk-card">
                <h3>风险热区 <span>TOP5 街区</span></h3>
                {riskLayers.map((layer, index) => (
                  <div className="float-row" key={layer.id}>
                    <span>{["白沙大道街区", "亭洪街区", "江南中街区", "福建园街区", "淡村街区"][index] ?? layer.name}</span>
                    <strong>{Math.max(18, Math.round(layer.featureCount * 0.6))}</strong>
                  </div>
                ))}
                <button>查看热区分布</button>
              </div>
              )}
            </section>

            <aside className="layer-panel">
              <section className="panel-section layer-control">
                <div className="section-title">
                  <Layers size={16} />
                  图层控制
                </div>
                <div className="layer-search-row">
                  <Input
                    className="layer-search"
                    prefix={<Search size={15} />}
                    placeholder="搜索图层名称"
                    allowClear
                    value={layerSearchText}
                    onChange={(event) => setLayerSearchText(event.target.value)}
                  />
                  <Button className="icon-btn" icon={<Filter size={16} />} />
                </div>
                <Space className="layer-actions">
                  <span>
                    已选图层 ({visibleActiveCount})
                    {layerSearchText.trim() ? ` / 搜索结果 ${searchedLayerCount}` : ""}
                  </span>
                  <span className="layer-all-toggle-label">全选</span>
                  <Switch checked={allCurrentLayersVisible} size="small" onChange={setAllCurrentLayersVisible} />
                </Space>
                <div className="layer-list">
                  {filteredLayerGroups.map((group) => {
                    const isCollapsed = !layerSearchText.trim() && collapsedLayerGroups[group.name];
                    return (
                    <div className="layer-group" key={group.name}>
                      <button className="layer-group-title" onClick={() => toggleLayerGroup(group.name)}>
                        <strong>{group.name}</strong>
                        <ChevronDown className={isCollapsed ? "is-collapsed" : ""} size={15} />
                      </button>
                      {!isCollapsed && group.layers.map((layer) => (
                        <div className="layer-row" key={layer.id}>
                          <i className="dot" style={{ backgroundColor: layerColorById.get(layer.id) }} />
                          <div>
                            <strong>{layer.name.replace("_点", "")}</strong>
                          </div>
                          <span>
                            {layer.featureCount}{" "}
                            {layer.objectType === "小区"
                              ? "个"
                              : layer.objectType === "建筑"
                                ? "栋"
                                : layer.category === "parcel"
                                  ? "块"
                                  : "个"}
                          </span>
                          <Switch
                            checked={visibleLayerIds.has(layer.id)}
                            size="small"
                            onChange={(checked) => toggleLayer(layer.id, checked)}
                          />
                        </div>
                      ))}
                    </div>
                    );
                  })}
                  {filteredLayerGroups.length === 0 && (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到匹配图层" />
                  )}
                </div>
                <Button className="layer-manage" icon={<Settings size={15} />} onClick={showAllCurrentLayers}>
                  图层管理
                </Button>
              </section>

              <section className="panel-section point-detail">
                <div className="section-title">
                  <MapPinned size={16} />
                  点击信息
                </div>
                {selectedPoint && selectedPoint.category === activeTopic ? (
                  <>
                    <div className="selected-heading">
                      <Tag color={activeTopic === "problem" ? "error" : activeTopic === "parcel" ? "green" : "blue"}>{selectedPoint.layerName}</Tag>
                      <h3>{getPointTitle(selectedPoint)}</h3>
                      <p>
                        {activeTopic === "parcel" ? "中心点" : "经纬度"} {selectedPoint.coordinate[0].toFixed(6)}，{selectedPoint.coordinate[1].toFixed(6)}
                      </p>
                    </div>
                    <div className="property-list">
                      {displayPointRows.map(([key, value]) => (
                        <div className="property-row" key={key}>
                          <span>{key}</span>
                          <strong>{formatValue(value)}</strong>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      activeTopic === "parcel"
                        ? diagnosisDimension === "物业管理"
                          ? "点击地图小区查看详细属性"
                          : parcelDimension === "建筑维度"
                            ? "点击地图建筑查看详细属性"
                          : "点击地图地块查看详细属性"
                        : "点击地图点位查看详细属性"
                    }
                  />
                )}
              </section>
            </aside>
            </main>
            )}
          </div>
        )}
      </div>
    </AntApp>
  );
}

export function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | undefined>();

  return (
    <AntApp>
      {currentUser ? (
        <PlatformApp user={currentUser} onLogout={() => setCurrentUser(undefined)} />
      ) : (
        <AuthDemo onLogin={setCurrentUser} />
      )}
    </AntApp>
  );
}
