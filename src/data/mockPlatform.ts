import type { FeedbackPoint, FacilityPoint, IndicatorOption, SpatialObject } from "../types/platform";

export const indicatorOptions: IndicatorOption[] = [
  { id: "parking", label: "停车泊位缺口数", dimension: "小区 / 配套设施" },
  { id: "elevator", label: "加装电梯需求", dimension: "建筑 / 配套设施" },
  { id: "drainage", label: "雨污分流改造需求", dimension: "小区 / 市政设施" },
  { id: "safety", label: "结构安全隐患", dimension: "建筑 / 安全耐久" },
  { id: "service", label: "公共服务设施覆盖率", dimension: "社区 / 公共配套" }
];

export const spatialObjects: SpatialObject[] = [
  {
    id: "PX-001",
    name: "园湖南路更新片区",
    type: "地块",
    street: "新竹街道",
    community: "园湖社区",
    area: "18.6 公顷",
    geometry: [
      [108.338, 22.815],
      [108.346, 22.816],
      [108.347, 22.821],
      [108.339, 22.824],
      [108.334, 22.821]
    ],
    indicators: [
      { id: "parking", name: "停车泊位缺口数", dimension: "配套设施", unit: "个", value: 1260, score: 42, status: "严重" },
      { id: "elevator", name: "需要加装电梯的小区数量", dimension: "配套设施", unit: "个", value: 8, score: 58, status: "预警" },
      { id: "safety", name: "存在结构安全隐患住宅数量", dimension: "安全耐久", unit: "栋", value: 9, score: 51, status: "预警" }
    ],
    analysis: {
      score: 56,
      potential: 86,
      decision: "改造提升",
      riskLevel: "高",
      issues: ["停车缺口集中", "老旧楼栋电梯需求高", "部分建筑存在安全隐患"],
      suggestions: ["优先推进停车综合整治", "分批评估加装电梯条件", "对高风险楼栋开展结构复核"]
    },
    feedback: {
      supportRate: 68,
      neutralRate: 21,
      opposeRate: 11,
      submissions: 386,
      hotTopics: ["停车", "电梯", "消防通道"],
      sentiment: "支持为主",
      summary: "多数居民支持微更新和配套补短板，关注施工扰民和停车替代方案。"
    }
  },
  {
    id: "PX-002",
    name: "古城路历史风貌片区",
    type: "地块",
    street: "民生街道",
    community: "古城社区",
    area: "12.4 公顷",
    geometry: [
      [108.326, 22.812],
      [108.334, 22.813],
      [108.334, 22.821],
      [108.327, 22.819],
      [108.322, 22.815]
    ],
    indicators: [
      { id: "service", name: "社区便民设施覆盖率", dimension: "公共配套", unit: "%", value: 86, score: 78, status: "良好" },
      { id: "safety", name: "街区安全隐患点位", dimension: "安全隐患", unit: "处", value: 5, score: 66, status: "关注" },
      { id: "drainage", name: "雨污合流管线覆盖率", dimension: "市政设施", unit: "%", value: 74, score: 62, status: "关注" }
    ],
    analysis: {
      score: 71,
      potential: 63,
      decision: "保留维护",
      riskLevel: "中",
      issues: ["历史风貌保护要求高", "市政管线更新空间受限", "慢行空间连续性不足"],
      suggestions: ["以保护修缮和功能织补为主", "结合道路整治同步更新管线", "完善步行连廊和公共休憩点"]
    },
    feedback: {
      supportRate: 54,
      neutralRate: 31,
      opposeRate: 15,
      submissions: 214,
      hotTopics: ["风貌保护", "商业活力", "慢行环境"],
      sentiment: "意见分化",
      summary: "居民支持改善环境，商户更关注客流恢复和施工周期控制。"
    }
  },
  {
    id: "PX-003",
    name: "星湖路老旧小区组团",
    type: "小区",
    street: "津头街道",
    community: "星湖社区",
    area: "9.8 公顷",
    geometry: [
      [108.347, 22.806],
      [108.356, 22.807],
      [108.357, 22.814],
      [108.349, 22.816],
      [108.344, 22.811]
    ],
    indicators: [
      { id: "parking", name: "停车泊位缺口数", dimension: "配套设施", unit: "个", value: 780, score: 49, status: "预警" },
      { id: "drainage", name: "需要雨污分流改造的小区数量", dimension: "市政设施", unit: "个", value: 11, score: 46, status: "严重" },
      { id: "service", name: "养老服务设施覆盖率", dimension: "公共配套", unit: "%", value: 76, score: 72, status: "关注" }
    ],
    analysis: {
      score: 61,
      potential: 79,
      decision: "综合整治",
      riskLevel: "高",
      issues: ["雨污分流短板明显", "地面停车挤占公共空间", "老年服务设施覆盖不足"],
      suggestions: ["优先排定排水改造工程", "结合边角地设置共享停车", "补充日间照料和便民服务点"]
    },
    feedback: {
      supportRate: 73,
      neutralRate: 18,
      opposeRate: 9,
      submissions: 452,
      hotTopics: ["排水", "停车", "养老服务"],
      sentiment: "支持为主",
      summary: "居民对综合整治接受度较高，希望明确施工时序和临时交通组织。"
    }
  },
  {
    id: "PX-004",
    name: "七星路商业活力片区",
    type: "地块",
    street: "中山街道",
    community: "七星社区",
    area: "15.2 公顷",
    geometry: [
      [108.319, 22.803],
      [108.329, 22.804],
      [108.331, 22.811],
      [108.323, 22.813],
      [108.316, 22.808]
    ],
    indicators: [
      { id: "service", name: "商业网点密度", dimension: "业态活力", unit: "个/万平方米", value: 94, score: 82, status: "良好" },
      { id: "safety", name: "存在安全隐患楼栋面积比例", dimension: "安全隐患", unit: "%", value: 2.4, score: 74, status: "关注" },
      { id: "parking", name: "停车泊位缺口数", dimension: "交通设施", unit: "个", value: 420, score: 64, status: "关注" }
    ],
    analysis: {
      score: 76,
      potential: 58,
      decision: "保留维护",
      riskLevel: "低",
      issues: ["停车供需局部紧张", "夜间消费配套不足", "沿街界面品质不均"],
      suggestions: ["优化路内外停车组织", "引导夜间业态和公共活动", "提升重点街角和立面风貌"]
    },
    feedback: {
      supportRate: 61,
      neutralRate: 26,
      opposeRate: 13,
      submissions: 289,
      hotTopics: ["商业活力", "停车", "街面环境"],
      sentiment: "支持为主",
      summary: "市场主体更支持功能提升，居民关注噪声、停车和街面秩序。"
    }
  },
  {
    id: "PX-005",
    name: "民族大道基础设施走廊",
    type: "基础设施",
    street: "南湖街道",
    community: "金湖社区",
    area: "6.1 公里",
    geometry: [
      [108.331, 22.797],
      [108.343, 22.799],
      [108.354, 22.801],
      [108.363, 22.804],
      [108.366, 22.809],
      [108.358, 22.811],
      [108.346, 22.807],
      [108.334, 22.805]
    ],
    indicators: [
      { id: "drainage", name: "老旧排水管网长度", dimension: "市政设施", unit: "米", value: 225, score: 69, status: "关注" },
      { id: "service", name: "公交站点覆盖率", dimension: "道路交通", unit: "%", value: 100, score: 95, status: "良好" },
      { id: "safety", name: "过街安全岛设置率", dimension: "道路交通", unit: "%", value: 85.7, score: 83, status: "良好" }
    ],
    analysis: {
      score: 82,
      potential: 45,
      decision: "保留维护",
      riskLevel: "低",
      issues: ["局部排水管网年限较长", "高峰期交通压力大", "慢行过街舒适度需提升"],
      suggestions: ["结合道路养护滚动更新管网", "优化公交站点接驳空间", "提升过街等待区遮阴和安全提示"]
    },
    feedback: {
      supportRate: 49,
      neutralRate: 37,
      opposeRate: 14,
      submissions: 168,
      hotTopics: ["拥堵", "排水", "慢行安全"],
      sentiment: "意见分化",
      summary: "反馈集中在通勤拥堵和慢行安全，更新诉求较为温和。"
    }
  }
];

export const facilities: FacilityPoint[] = [
  { id: "F-001", name: "星湖社区卫生服务站", category: "卫生服务", coordinate: [108.352, 22.812], status: "正常" },
  { id: "F-002", name: "园湖南路应急避难点", category: "应急安全", coordinate: [108.341, 22.82], status: "待更新" },
  { id: "F-003", name: "七星便民服务中心", category: "公共服务", coordinate: [108.324, 22.809], status: "正常" },
  { id: "F-004", name: "古城路排水泵站", category: "市政设施", coordinate: [108.329, 22.817], status: "需维护" }
];

export const feedbackPoints: FeedbackPoint[] = [
  { id: "FB-001", objectId: "PX-001", title: "希望增加共享停车位", coordinate: [108.342, 22.821], attitude: "支持" },
  { id: "FB-002", objectId: "PX-001", title: "担心加装电梯费用", coordinate: [108.338, 22.819], attitude: "中立" },
  { id: "FB-003", objectId: "PX-003", title: "雨天积水影响出行", coordinate: [108.352, 22.811], attitude: "支持" },
  { id: "FB-004", objectId: "PX-004", title: "夜间噪声需要控制", coordinate: [108.323, 22.807], attitude: "反对" },
  { id: "FB-005", objectId: "PX-002", title: "保留历史街巷肌理", coordinate: [108.328, 22.816], attitude: "支持" }
];
