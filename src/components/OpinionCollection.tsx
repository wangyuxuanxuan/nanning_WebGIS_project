import { useState } from "react";
import { App as AntApp, Button, Empty, Form, Input, Modal, Progress, Select, Space, Table, Tabs, Tag } from "antd";
import type { TableColumnsType } from "antd";
import { BarChart3, Download, FilePlus2, MapPinned, MousePointer2, Send, Table2 } from "lucide-react";

interface SurveyRow {
  id: string;
  title: string;
  range: string;
  status: string;
  responses: number;
}

const surveyRows: SurveyRow[] = [];

const surveyColumns: TableColumnsType<SurveyRow> = [
  { title: "问卷名称", dataIndex: "title", width: 240 },
  { title: "调研范围", dataIndex: "range", width: 180 },
  {
    title: "状态",
    dataIndex: "status",
    width: 120,
    render: (status: string) => <Tag color={status === "进行中" ? "green" : "default"}>{status}</Tag>
  },
  { title: "回收数量", dataIndex: "responses", width: 120 },
  {
    title: "操作",
    width: 180,
    render: () => (
      <Space>
        <Button size="small" type="link">分析</Button>
        <Button size="small" type="link">下载</Button>
      </Space>
    )
  }
];

const analysisRows = [
  { label: "支持改造", value: 0, color: "#16a34a" },
  { label: "保持观望", value: 0, color: "#f59e0b" },
  { label: "暂不支持", value: 0, color: "#ef4444" }
];

export function OpinionCollection() {
  const { message } = AntApp.useApp();
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [surveyForm] = Form.useForm();

  const publishSurvey = async () => {
    await surveyForm.validateFields();
    surveyForm.resetFields();
    setSurveyOpen(false);
    message.success("问卷发布入口已创建，后续接入地块圈选和发布接口后即可生效。");
  };

  const startSelectParcel = () => {
    message.info("圈选地块入口已就绪，后续接入地图交互后可选择调研范围。");
  };

  const downloadSummary = () => {
    message.info("下载入口已就绪，后续接入导出接口后可生成问卷汇总文件。");
  };

  return (
    <section className="opinion-collection">
      <div className="opinion-head">
        <div>
          <p className="eyebrow">意见收集</p>
          <h2>地块调研与问卷分析</h2>
        </div>
        <Space wrap>
          <Button icon={<MousePointer2 size={15} />} onClick={startSelectParcel}>
            圈选地块
          </Button>
          <Button type="primary" icon={<FilePlus2 size={15} />} onClick={() => setSurveyOpen(true)}>
            发布问卷
          </Button>
          <Button icon={<Download size={15} />} onClick={downloadSummary}>
            下载汇总
          </Button>
        </Space>
      </div>

      <div className="opinion-layout">
        <section className="opinion-panel opinion-publish-panel">
          <div className="section-title">
            <MapPinned size={16} />
            调研范围
          </div>
          <div className="parcel-select-placeholder">
            <MousePointer2 size={34} />
            <h3>圈选地块发布调研</h3>
            <p>后续接入地图圈选后，可将选中的地块、小区或建筑作为问卷投放范围。</p>
            <Button type="primary" icon={<Send size={15} />} onClick={() => setSurveyOpen(true)}>
              创建调研问卷
            </Button>
          </div>
        </section>

        <section className="opinion-panel">
          <div className="section-title">
            <BarChart3 size={16} />
            汇总概览
          </div>
          <div className="opinion-summary-grid">
            <div className="opinion-metric">
              <span>问卷数量</span>
              <strong>0</strong>
            </div>
            <div className="opinion-metric">
              <span>回收份数</span>
              <strong>0</strong>
            </div>
            <div className="opinion-metric">
              <span>覆盖地块</span>
              <strong>0</strong>
            </div>
          </div>
          <div className="opinion-progress-list">
            {analysisRows.map((item) => (
              <div className="opinion-progress-row" key={item.label}>
                <span>{item.label}</span>
                <Progress percent={item.value} strokeColor={item.color} showInfo={false} />
                <strong>{item.value}%</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Tabs
        items={[
          {
            key: "surveys",
            label: (
              <span className="admin-tab-label">
                <Table2 size={16} />
                问卷管理
              </span>
            ),
            children: (
              <Table
                rowKey="id"
                columns={surveyColumns}
                dataSource={surveyRows}
                locale={{ emptyText: <Empty description="问卷列表入口已就绪，具体调研信息待接入后展示" /> }}
                pagination={false}
                scroll={{ x: 840 }}
              />
            )
          },
          {
            key: "analysis",
            label: (
              <span className="admin-tab-label">
                <BarChart3 size={16} />
                汇总分析
              </span>
            ),
            children: (
              <div className="opinion-analysis-empty">
                <Empty description="汇总分析入口已就绪，待问卷数据接入后展示统计图表和AI整理结果" />
              </div>
            )
          }
        ]}
      />

      <Modal
        title="发布调研问卷"
        open={surveyOpen}
        okText="发布"
        cancelText="取消"
        onOk={publishSurvey}
        onCancel={() => setSurveyOpen(false)}
        destroyOnClose
      >
        <Form
          form={surveyForm}
          layout="vertical"
          initialValues={{ targetType: "parcel", publishChannel: "居民端" }}
        >
          <Form.Item name="title" label="问卷名称" rules={[{ required: true, message: "请输入问卷名称" }]}>
            <Input placeholder="例如：老旧小区更新意愿调查" />
          </Form.Item>
          <div className="admin-form-grid">
            <Form.Item name="targetType" label="调研对象">
              <Select
                options={[
                  { value: "parcel", label: "圈选地块" },
                  { value: "community", label: "关联小区" },
                  { value: "building", label: "建筑范围" }
                ]}
              />
            </Form.Item>
            <Form.Item name="publishChannel" label="发布渠道">
              <Select
                options={[
                  { value: "居民端", label: "居民端" },
                  { value: "短信链接", label: "短信链接" },
                  { value: "二维码", label: "二维码" }
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="description" label="问卷说明">
            <Input.TextArea rows={3} placeholder="填写调研背景、填写对象和回收说明" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
