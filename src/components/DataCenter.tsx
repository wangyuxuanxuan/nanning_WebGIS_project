import { useEffect, useMemo, useState } from "react";
import { App as AntApp, Button, Empty, Form, Input, Modal, Select, Space, Spin, Table, Tabs, Upload } from "antd";
import type { TableColumnsType } from "antd";
import { Download, FilePlus2, Table2, UploadCloud } from "lucide-react";
import { publicUrl } from "../utils/publicPath";

type DataDimension = "parcel" | "building";

interface DataRow {
  id: string;
  name: string;
  [key: string]: string | number;
}

type ExportHeader = [string, string];

function splitList(value: unknown) {
  return String(value ?? "")
    .split("；")
    .map((item) => item.trim())
    .filter((item) => item && item !== "无");
}

function parseDetailMap(value: unknown) {
  const result: Record<string, string> = {};
  splitList(value).forEach((item) => {
    const separatorIndex = item.indexOf("：");
    if (separatorIndex > -1) {
      const key = item.slice(0, separatorIndex).trim();
      const detail = item.slice(separatorIndex + 1).trim();
      if (key) result[key] = detail || "有";
    } else {
      result[item] = "有";
    }
  });
  return result;
}

function uniqueValues(rows: DataRow[], key: string) {
  const result: string[] = [];
  rows.forEach((row) => {
    splitList(row[key]).forEach((item) => {
      if (!result.includes(item)) result.push(item);
    });
  });
  return result;
}

const baseParcelColumns: TableColumnsType<DataRow> = [
  { title: "地块编号", dataIndex: "id", width: 160 },
  { title: "地块名称", dataIndex: "name", width: 180 },
  { title: "面积(㎡)", dataIndex: "areaSqm", width: 120 },
  { title: "周长(m)", dataIndex: "perimeterM", width: 120 },
  { title: "中心经度", dataIndex: "centroidLon", width: 130 },
  { title: "中心纬度", dataIndex: "centroidLat", width: 130 },
  { title: "问题数量", dataIndex: "问题数量", width: 110 },
  { title: "需求数量", dataIndex: "需求数量", width: 110 },
  { title: "建筑数", dataIndex: "buildingCount", width: 100 },
  { title: "质量较差建筑数", dataIndex: "质量较差建筑数", width: 140 },
  { title: "质量一般建筑数", dataIndex: "质量一般建筑数", width: 140 },
  { title: "质量较好建筑数", dataIndex: "质量较好建筑数", width: 140 },
  { title: "危房建筑数", dataIndex: "危房建筑数", width: 120 }
];

const buildingColumns: TableColumnsType<DataRow> = [
  { title: "建筑编号", dataIndex: "id", width: 160 },
  { title: "建筑名称", dataIndex: "name", width: 180 },
  { title: "对象类型", dataIndex: "objectType", width: 120 },
  { title: "建筑面积(㎡)", dataIndex: "areaSqm", width: 130 },
  { title: "周长(m)", dataIndex: "perimeterM", width: 120 },
  { title: "中心经度", dataIndex: "centroidLon", width: 130 },
  { title: "中心纬度", dataIndex: "centroidLat", width: 130 },
  { title: "所属地块编号", dataIndex: "sourceParcelId", width: 150 },
  { title: "所属地块名称", dataIndex: "sourceParcelName", width: 180 },
  { title: "所属小区编号", dataIndex: "communityId", width: 150 },
  { title: "所属小区名称", dataIndex: "communityName", width: 180 },
  { title: "物业管理状态", dataIndex: "managementStatus", width: 170 },
  { title: "结构安全", dataIndex: "structureSafety", width: 140 },
  { title: "结构安全来源", dataIndex: "structureSafetySource", width: 160 },
  { title: "关联说明", dataIndex: "relationSummary", width: 260 }
];

const baseParcelExportHeaders: ExportHeader[] = [
  ["id", "地块编号"],
  ["name", "地块名称"],
  ["areaSqm", "面积(㎡)"],
  ["perimeterM", "周长(m)"],
  ["centroidLon", "中心经度"],
  ["centroidLat", "中心纬度"],
  ["问题数量", "问题数量"],
  ["需求数量", "需求数量"],
  ["buildingCount", "建筑数"],
  ["质量较差建筑数", "质量较差建筑数"],
  ["质量一般建筑数", "质量一般建筑数"],
  ["质量较好建筑数", "质量较好建筑数"],
  ["危房建筑数", "危房建筑数"]
];

const buildingExportHeaders: ExportHeader[] = [
  ["id", "建筑编号"],
  ["name", "建筑名称"],
  ["objectType", "对象类型"],
  ["areaSqm", "建筑面积(㎡)"],
  ["perimeterM", "周长(m)"],
  ["centroidLon", "中心经度"],
  ["centroidLat", "中心纬度"],
  ["sourceParcelId", "所属地块编号"],
  ["sourceParcelName", "所属地块名称"],
  ["communityId", "所属小区编号"],
  ["communityName", "所属小区名称"],
  ["managementStatus", "物业管理状态"],
  ["structureSafety", "结构安全"],
  ["structureSafetySource", "结构安全来源"],
  ["relationSummary", "关联说明"]
];

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadExcel(filename: string, headers: string[][], rows: DataRow[]) {
  const tableRows = [
    `<tr>${headers.map(([, title]) => `<th>${escapeHtml(title)}</th>`).join("")}</tr>`,
    ...rows.map((row) => `<tr>${headers.map(([key]) => `<td>${escapeHtml(row[key] ?? "-")}</td>`).join("")}</tr>`)
  ].join("");
  const html = `<!doctype html><html><head><meta charset="UTF-8"></head><body><table>${tableRows}</table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function DataCenter() {
  const { message } = AntApp.useApp();
  const [activeDimension, setActiveDimension] = useState<DataDimension>("parcel");
  const [indicatorOpen, setIndicatorOpen] = useState(false);
  const [parcelRows, setParcelRows] = useState<DataRow[]>([]);
  const [buildingRows, setBuildingRows] = useState<DataRow[]>([]);
  const [loadingParcels, setLoadingParcels] = useState(false);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [indicatorForm] = Form.useForm();

  useEffect(() => {
    setLoadingParcels(true);
    fetch(publicUrl("geodata/parcels.geojson"))
      .then((response) => {
        if (!response.ok) throw new Error("地块 GeoJSON 读取失败");
        return response.json();
      })
      .then((data) => {
        const rows = (data.features ?? []).map((feature: { properties?: Record<string, unknown> }, index: number) => {
          const properties = feature.properties ?? {};
          const problemDetails = parseDetailMap(properties.问题明细);
          const demandDetails = parseDetailMap(properties.需求明细);
          const problemColumns = Object.fromEntries(
            splitList(properties.问题类型).map((type) => [`问题_${type}`, problemDetails[type] ?? "有"])
          );
          const demandColumns = Object.fromEntries(
            splitList(properties.需求类型).map((type) => [`需求_${type}`, demandDetails[type] ?? "有"])
          );
          return {
            ...properties,
            ...problemColumns,
            ...demandColumns,
            id: String(properties.parcelId ?? `DK-${index + 1}`),
            name: String(properties.parcelName ?? properties.parcelId ?? `地块 ${index + 1}`)
          } as DataRow;
        });
        setParcelRows(rows);
      })
      .catch((error) => {
        const detail = error instanceof Error ? error.message : "未知错误";
        message.error(`地块数据读取失败：${detail}`);
      })
      .finally(() => setLoadingParcels(false));
  }, [message]);

  useEffect(() => {
    setLoadingBuildings(true);
    fetch(publicUrl("geodata/buildings.geojson"))
      .then((response) => {
        if (!response.ok) throw new Error("建筑 GeoJSON 读取失败");
        return response.json();
      })
      .then((data) => {
        const rows = (data.features ?? []).map((feature: { properties?: Record<string, unknown> }, index: number) => {
          const properties = feature.properties ?? {};
          return {
            ...properties,
            id: String(properties.buildingId ?? `JZ-${index + 1}`),
            name: String(properties.buildingName ?? properties.buildingId ?? `建筑 ${index + 1}`),
            objectType: String(properties.objectType ?? "-"),
            sourceParcelId: String(properties.sourceParcelId ?? "-"),
            sourceParcelName: String(properties.sourceParcelName ?? "-"),
            communityId: String(properties.communityId ?? "-"),
            communityName: String(properties.communityName ?? "-"),
            managementStatus: String(properties.managementStatus ?? "-"),
            structureSafety: String(properties.structureSafety ?? "-"),
            structureSafetySource: String(properties.structureSafetySource ?? "-"),
            relationSummary: String(properties.relationSummary ?? "-")
          } as DataRow;
        });
        setBuildingRows(rows);
      })
      .catch((error) => {
        const detail = error instanceof Error ? error.message : "未知错误";
        message.error(`建筑数据读取失败：${detail}`);
      })
      .finally(() => setLoadingBuildings(false));
  }, [message]);

  const problemTypes = useMemo(() => uniqueValues(parcelRows, "问题类型"), [parcelRows]);
  const demandTypes = useMemo(() => uniqueValues(parcelRows, "需求类型"), [parcelRows]);
  const parcelColumns = useMemo<TableColumnsType<DataRow>>(
    () => [
      ...baseParcelColumns,
      ...problemTypes.map((type) => ({
        title: `问题-${type}`,
        dataIndex: `问题_${type}`,
        width: 240,
        render: (value: unknown) => String(value ?? "-")
      })),
      ...demandTypes.map((type) => ({
        title: `需求-${type}`,
        dataIndex: `需求_${type}`,
        width: 240,
        render: (value: unknown) => String(value ?? "-")
      }))
    ],
    [demandTypes, problemTypes]
  );
  const parcelExportHeaders = useMemo<ExportHeader[]>(
    () => [
      ...baseParcelExportHeaders,
      ...problemTypes.map((type): ExportHeader => [`问题_${type}`, `问题-${type}`]),
      ...demandTypes.map((type): ExportHeader => [`需求_${type}`, `需求-${type}`])
    ],
    [demandTypes, problemTypes]
  );
  const parcelTableWidth = 1280 + (problemTypes.length + demandTypes.length) * 240;

  const filteredParcelRows = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return parcelRows;
    return parcelRows.filter((row) =>
      ["id", "name", "问题类型", "需求类型", "问题明细", "需求明细"].some((key) => String(row[key] ?? "").toLowerCase().includes(keyword))
    );
  }, [parcelRows, searchText]);

  const filteredBuildingRows = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return buildingRows;
    return buildingRows.filter((row) =>
      [
        "id",
        "name",
        "objectType",
        "sourceParcelId",
        "sourceParcelName",
        "communityId",
        "communityName",
        "managementStatus",
        "structureSafety",
        "structureSafetySource",
        "relationSummary"
      ].some((key) => String(row[key] ?? "").toLowerCase().includes(keyword))
    );
  }, [buildingRows, searchText]);

  const submitIndicator = async () => {
    await indicatorForm.validateFields();
    indicatorForm.resetFields();
    setIndicatorOpen(false);
    message.success("指标入口已创建，后续接入保存接口后可写入数据库。");
  };

  const beforeUpload = () => {
    message.info("导入入口已就绪，后续接入解析接口后可写入地块/建筑数据。");
    return false;
  };

  const exportData = () => {
    if (activeDimension === "building") {
      if (buildingRows.length === 0) {
        message.warning("当前没有可导出的建筑数据。");
        return;
      }
      downloadExcel("南宁城市体检建筑数据.xls", buildingExportHeaders, filteredBuildingRows);
      message.success(`已导出 ${filteredBuildingRows.length} 条建筑数据。`);
      return;
    }
    if (parcelRows.length === 0) {
      message.warning("当前没有可导出的地块数据。");
      return;
    }
    downloadExcel("南宁城市体检地块数据.xls", parcelExportHeaders, filteredParcelRows);
    message.success(`已导出 ${filteredParcelRows.length} 条地块数据。`);
  };

  return (
    <section className="data-center">
      <div className="data-center-head">
        <div>
          <p className="eyebrow">数据中心</p>
          <h2>地块与建筑数据管理</h2>
        </div>
        <Space wrap>
          <Button type="primary" icon={<FilePlus2 size={15} />} onClick={() => setIndicatorOpen(true)}>
            新增指标
          </Button>
          <Upload accept=".xlsx,.xls,.csv" showUploadList={false} beforeUpload={beforeUpload}>
            <Button icon={<UploadCloud size={15} />}>导入数据</Button>
          </Upload>
          <Button icon={<Download size={15} />} onClick={exportData}>
            导出数据
          </Button>
        </Space>
      </div>

      <div className="data-center-toolbar">
        <Input.Search
          className="data-center-search"
          placeholder={
            activeDimension === "parcel"
              ? "搜索地块编号、名称、问题或需求类型"
              : "搜索建筑编号、名称、所属地块、小区或结构安全状态"
          }
          allowClear
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <Select
          value="all"
          options={[{ value: "all", label: "全部状态" }]}
          className="data-center-filter"
        />
        <Select
          value="2024"
          options={[{ value: "2024", label: "2024年度" }]}
          className="data-center-filter"
        />
      </div>

      <Tabs
        activeKey={activeDimension}
        onChange={(key) => {
          setActiveDimension(key as DataDimension);
          setSearchText("");
        }}
        items={[
          {
            key: "parcel",
            label: (
              <span className="admin-tab-label">
                <Table2 size={16} />
                地块维度
              </span>
            ),
            children: (
              <Spin spinning={loadingParcels}>
                <div className="data-table-summary">
                  已读取 <strong>{parcelRows.length}</strong> 个地块
                  {searchText.trim() ? `，当前筛选 ${filteredParcelRows.length} 条` : ""}
                </div>
              <Table
                rowKey="id"
                columns={parcelColumns}
                dataSource={filteredParcelRows}
                locale={{ emptyText: <Empty description="未读取到地块数据" /> }}
                pagination={{ pageSize: 12, showSizeChanger: true }}
                scroll={{ x: parcelTableWidth }}
              />
              </Spin>
            )
          },
          {
            key: "building",
            label: (
              <span className="admin-tab-label">
                <Table2 size={16} />
                建筑维度
              </span>
            ),
            children: (
              <Spin spinning={loadingBuildings}>
                <div className="data-table-summary">
                  已读取 <strong>{buildingRows.length}</strong> 栋建筑
                  {searchText.trim() ? `，当前筛选 ${filteredBuildingRows.length} 条` : ""}
                </div>
                <Table
                  rowKey="id"
                  columns={buildingColumns}
                  dataSource={filteredBuildingRows}
                  locale={{ emptyText: <Empty description="未读取到建筑数据" /> }}
                  pagination={{ pageSize: 12, showSizeChanger: true }}
                  scroll={{ x: 2200 }}
                />
              </Spin>
            )
          }
        ]}
      />

      <Modal
        title="新增指标"
        open={indicatorOpen}
        okText="保存"
        cancelText="取消"
        onOk={submitIndicator}
        onCancel={() => setIndicatorOpen(false)}
        destroyOnClose
      >
        <Form
          form={indicatorForm}
          layout="vertical"
          initialValues={{ dimension: activeDimension, valueType: "number" }}
        >
          <Form.Item name="name" label="指标名称" rules={[{ required: true, message: "请输入指标名称" }]}>
            <Input placeholder="例如：建筑安全等级" />
          </Form.Item>
          <div className="admin-form-grid">
            <Form.Item name="dimension" label="适用维度">
              <Select
                options={[
                  { value: "parcel", label: "地块维度" },
                  { value: "building", label: "建筑维度" }
                ]}
              />
            </Form.Item>
            <Form.Item name="valueType" label="数据类型">
              <Select
                options={[
                  { value: "number", label: "数值" },
                  { value: "text", label: "文本" },
                  { value: "status", label: "状态" }
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="description" label="指标说明">
            <Input.TextArea rows={3} placeholder="用于说明指标口径、来源或计算方式" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
