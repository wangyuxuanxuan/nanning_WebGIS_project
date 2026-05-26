import { useEffect, useMemo, useState } from "react";
import { App as AntApp, Avatar, Badge, Button, Empty, Input, Segmented, Select, Space, Spin, Switch, Tag } from "antd";
import {
  AlertCircle,
  BarChart3,
  Bell,
  BrainCircuit,
  CheckSquare,
  ChevronDown,
  CloudUpload,
  Download,
  FileBarChart,
  Filter,
  Home,
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
import { AuthDemo } from "./components/AuthDemo";
import { GisMap } from "./components/GisMap";
import type { AuthUser } from "./data/mockAuth";
import type { GeoLayerMeta, MapTopic, SelectedGeoPoint, TopicSummary } from "./types/platform";
import { getLayerVisualColor } from "./utils/layerColor";

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
  }
};

const navItems = [
  { label: "总览", icon: Home },
  { label: "综合分析", icon: Map, active: true },
  { label: "指标体系", icon: FileBarChart },
  { label: "数据导入", icon: CloudUpload },
  { label: "主观意愿", icon: MessageSquare },
  { label: "AI意见整理", icon: BrainCircuit },
  { label: "统计导出", icon: Download },
  { label: "系统管理", icon: Settings }
];

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
  return {
    color: [summary.topic === "problem" ? "#2f7df6" : "#00b3a4"],
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
  const keys = ["小区名称", "名称", "社区名称", "所属街道", "城区", "OBJECTID"];
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
  const [activeTopic, setActiveTopic] = useState<MapTopic>("problem");
  const [visibleLayerIds, setVisibleLayerIds] = useState<Set<string>>(new Set());
  const [selectedPoint, setSelectedPoint] = useState<SelectedGeoPoint | undefined>();
  const [layerSearchText, setLayerSearchText] = useState("");
  const [collapsedLayerGroups, setCollapsedLayerGroups] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/geodata/layers.json")
      .then((response) => {
        if (!response.ok) throw new Error("图层索引读取失败");
        return response.json() as Promise<GeoLayerMeta[]>;
      })
      .then((items) => {
        setLayers(items);
        setVisibleLayerIds(new Set(items.map((item) => item.id)));
      })
      .catch(() => {
        message.error("未能读取转换后的图层数据，请确认 public/geodata/layers.json 存在。");
      })
      .finally(() => setLoading(false));
  }, [message]);

  const summaries = useMemo(() => buildTopicSummaries(layers), [layers]);
  const activeSummary = summaries[activeTopic];
  const activeLayers = activeSummary.layers;
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
      [selectedPoint.category === "problem" ? "问题类型" : "需求类型", selectedPoint.layerName],
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
          <div className="breadcrumb">综合分析 / {activeSummary.title}</div>
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
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button className={`nav-item${item.active ? " active" : ""}`} key={item.label}>
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
                    <strong>{activeSummary.layerCount}</strong>
                  </div>
                  <div className="metric-card">
                    <MapPinned size={25} />
                    <span>点位数</span>
                    <strong>{activeSummary.featureCount}</strong>
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
                  点位数量排行
                </div>
                <ReactECharts option={buildLayerChart(activeSummary)} style={{ height: 250 }} />
                <p className="panel-note">统计口径：当前筛选范围内的点位数量</p>
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
                    setSelectedPoint(undefined);
                    setLayerSearchText("");
                    setCollapsedLayerGroups({});
                  }}
                  options={[
                    { label: "问题一张图", value: "problem", icon: <AlertCircle size={15} /> },
                    { label: "需求一张图", value: "demand", icon: <CheckSquare size={15} /> },
                    { label: "综合评分", value: "score", icon: <Star size={15} />, disabled: true },
                    { label: "更新潜力", value: "potential", icon: <TrendingUp size={15} />, disabled: true }
                  ]}
                />
              </div>

              <div className="filter-bar">
                <span>街区</span>
                <Select size="small" value="全部" options={[{ value: "全部", label: "全部" }]} />
                <span>对象类型</span>
                <Select size="small" value="全部" options={[{ value: "全部", label: "全部" }]} />
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
                <div className="legend-title">图例（{activeTopic === "problem" ? "问题类型" : "需求类型"}）</div>
                {activeLayers.map((layer) => (
                  <div className="legend-row" key={layer.id}>
                    <i className="dot" style={{ backgroundColor: layerColorById.get(layer.id) }} />
                    <span>{layer.name.replace("_点", "")}</span>
                  </div>
                ))}
              </div>

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
                          <span>{layer.featureCount} 个</span>
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
                      <Tag color={activeTopic === "problem" ? "error" : "blue"}>{selectedPoint.layerName}</Tag>
                      <h3>{getPointTitle(selectedPoint)}</h3>
                      <p>
                        经度 {selectedPoint.coordinate[0].toFixed(6)}，纬度 {selectedPoint.coordinate[1].toFixed(6)}
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
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="点击地图点位查看详细属性" />
                )}
              </section>
            </aside>
            </main>
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
