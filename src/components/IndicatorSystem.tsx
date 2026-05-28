import { Button, Empty, Form, Input, Modal, Select, Space, Table, Tag } from "antd";
import type { TableColumnsType } from "antd";
import { Calculator, FilePlus2, FunctionSquare, Table2 } from "lucide-react";
import { useState } from "react";

interface IndicatorRow {
  id: string;
  category: string;
  name: string;
  dimension: string;
  value: string;
  unit: string;
  weight: string;
  scoreMethod: string;
  dataSource: string;
  status: string;
}

const indicatorRows: IndicatorRow[] = [
  {
    id: "IND-001",
    category: "公共服务",
    name: "社区养老设施覆盖率",
    dimension: "小区维度",
    value: "-",
    unit: "%",
    weight: "-",
    scoreMethod: "待录入",
    dataSource: "待接入",
    status: "待录入"
  },
  {
    id: "IND-002",
    category: "住房安全",
    name: "质量较差建筑占比",
    dimension: "建筑维度",
    value: "-",
    unit: "%",
    weight: "-",
    scoreMethod: "待录入",
    dataSource: "建筑结构安全图层",
    status: "待录入"
  },
  {
    id: "IND-003",
    category: "基础设施",
    name: "雨污分流改造需求数量",
    dimension: "地块维度",
    value: "-",
    unit: "处",
    weight: "-",
    scoreMethod: "待录入",
    dataSource: "问题需求诊断",
    status: "待录入"
  }
];

const indicatorColumns: TableColumnsType<IndicatorRow> = [
  { title: "指标编号", dataIndex: "id", width: 120 },
  { title: "指标分类", dataIndex: "category", width: 130 },
  { title: "指标名称", dataIndex: "name", width: 220 },
  { title: "统计维度", dataIndex: "dimension", width: 120 },
  { title: "体检指标值", dataIndex: "value", width: 130 },
  { title: "单位", dataIndex: "unit", width: 90 },
  { title: "权重", dataIndex: "weight", width: 90 },
  { title: "体检总分计算方法", dataIndex: "scoreMethod", width: 220 },
  { title: "数据来源", dataIndex: "dataSource", width: 180 },
  {
    title: "状态",
    dataIndex: "status",
    width: 110,
    render: (status: string) => <Tag color={status === "已录入" ? "green" : "gold"}>{status}</Tag>
  }
];

export function IndicatorSystem() {
  const [indicatorOpen, setIndicatorOpen] = useState(false);
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [indicatorForm] = Form.useForm();
  const [formulaForm] = Form.useForm();

  const closeIndicatorModal = async () => {
    await indicatorForm.validateFields();
    indicatorForm.resetFields();
    setIndicatorOpen(false);
  };

  const closeFormulaModal = async () => {
    await formulaForm.validateFields();
    formulaForm.resetFields();
    setFormulaOpen(false);
  };

  return (
    <section className="indicator-system">
      <div className="indicator-head">
        <div>
          <p className="eyebrow">指标体系</p>
          <h2>体检指标与总分计算</h2>
          <p>后续可在这里录入各项体检指标值、权重和体检总分计算方法。</p>
        </div>
        <Space wrap>
          <Button icon={<FunctionSquare size={15} />} onClick={() => setFormulaOpen(true)}>
            总分计算方法
          </Button>
          <Button type="primary" icon={<FilePlus2 size={15} />} onClick={() => setIndicatorOpen(true)}>
            新增指标
          </Button>
        </Space>
      </div>

      <div className="indicator-summary-grid">
        <div className="indicator-summary-card">
          <Table2 size={22} />
          <span>指标数量</span>
          <strong>{indicatorRows.length}</strong>
        </div>
        <div className="indicator-summary-card">
          <Calculator size={22} />
          <span>体检总分</span>
          <strong>-</strong>
        </div>
        <div className="indicator-summary-card">
          <FunctionSquare size={22} />
          <span>计算方法</span>
          <strong>待录入</strong>
        </div>
      </div>

      <Table
        rowKey="id"
        columns={indicatorColumns}
        dataSource={indicatorRows}
        locale={{ emptyText: <Empty description="暂无指标数据" /> }}
        pagination={false}
        scroll={{ x: 1420 }}
      />

      <Modal
        title="新增体检指标"
        open={indicatorOpen}
        okText="保存"
        cancelText="取消"
        onOk={closeIndicatorModal}
        onCancel={() => setIndicatorOpen(false)}
        destroyOnClose
      >
        <Form form={indicatorForm} layout="vertical" initialValues={{ dimension: "地块维度", status: "待录入" }}>
          <Form.Item name="name" label="指标名称" rules={[{ required: true, message: "请输入指标名称" }]}>
            <Input placeholder="例如：15分钟生活圈服务覆盖率" />
          </Form.Item>
          <div className="admin-form-grid">
            <Form.Item name="category" label="指标分类" rules={[{ required: true, message: "请输入指标分类" }]}>
              <Input placeholder="例如：公共服务" />
            </Form.Item>
            <Form.Item name="dimension" label="统计维度">
              <Select
                options={[
                  { value: "地块维度", label: "地块维度" },
                  { value: "建筑维度", label: "建筑维度" },
                  { value: "小区维度", label: "小区维度" }
                ]}
              />
            </Form.Item>
          </div>
          <div className="admin-form-grid">
            <Form.Item name="value" label="体检指标值">
              <Input placeholder="后续录入具体数值" />
            </Form.Item>
            <Form.Item name="unit" label="单位">
              <Input placeholder="例如：%、处、栋" />
            </Form.Item>
          </div>
          <Form.Item name="scoreMethod" label="计分方法">
            <Input.TextArea rows={3} placeholder="填写该指标如何折算为体检得分" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="体检总分计算方法"
        open={formulaOpen}
        okText="保存"
        cancelText="取消"
        onOk={closeFormulaModal}
        onCancel={() => setFormulaOpen(false)}
        destroyOnClose
      >
        <Form form={formulaForm} layout="vertical">
          <Form.Item name="formula" label="总分公式" rules={[{ required: true, message: "请输入总分公式或说明" }]}>
            <Input.TextArea rows={5} placeholder="例如：体检总分 = 各指标标准化得分 × 指标权重后求和" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
