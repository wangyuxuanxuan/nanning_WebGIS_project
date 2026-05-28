import { Button, Empty, Form, Input, Modal, Progress, Radio, Space, Tag } from "antd";
import { ClipboardList, Clock3, MapPinned, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { AuthUser } from "../data/mockAuth";

interface ResidentSurveyProps {
  user: AuthUser;
}

const targetedSurveys = [
  {
    id: "survey-renewal-001",
    title: "老旧小区更新意愿调查",
    range: "亭洪路社区、淡村社区定向发放",
    source: "江南区住建局",
    status: "待填写",
    deadline: "2026-06-15",
    description: "面向后台圈选范围内的居民收集公共空间、停车、绿化和基础设施更新需求。",
    progress: 36
  },
  {
    id: "survey-service-002",
    title: "社区公共服务满意度问卷",
    range: "江南中街片区定向发放",
    source: "城市体检工作专班",
    status: "已提交",
    deadline: "2026-06-01",
    description: "用于了解居民对养老、医疗、健身、绿地等服务设施的满意度。",
    progress: 68
  }
];

export function ResidentSurvey({ user }: ResidentSurveyProps) {
  const [activeSurveyId, setActiveSurveyId] = useState<string>();
  const [form] = Form.useForm();
  const activeSurvey = targetedSurveys.find((survey) => survey.id === activeSurveyId);

  const submitSurvey = async () => {
    await form.validateFields();
    form.resetFields();
    setActiveSurveyId(undefined);
  };

  const availableSurveys = targetedSurveys.filter((survey) => {
    if (user.userType === "居民") return true;
    return survey.id === "survey-service-002";
  });

  return (
    <section className="resident-survey">
      <div className="resident-survey-head">
        <div>
          <p className="eyebrow">调查问卷</p>
          <h2>定向调研任务</h2>
          <p>这里展示后台按圈选地块、小区或建筑范围定向发放给您的问卷。</p>
        </div>
        <div className="resident-survey-user">
          <ShieldCheck size={18} />
          <span>{user.userType}</span>
          <strong>{user.name}</strong>
        </div>
      </div>

      <div className="resident-survey-grid">
        {availableSurveys.map((survey) => (
          <article className="resident-survey-card" key={survey.id}>
            <div className="resident-survey-card-head">
              <ClipboardList size={22} />
              <Tag color={survey.status === "待填写" ? "processing" : "success"}>{survey.status}</Tag>
            </div>
            <h3>{survey.title}</h3>
            <p>{survey.description}</p>
            <div className="resident-survey-meta">
              <span>
                <MapPinned size={14} />
                {survey.range}
              </span>
              <span>
                <Clock3 size={14} />
                截止 {survey.deadline}
              </span>
            </div>
            <div className="resident-survey-progress">
              <span>{survey.source}</span>
              <Progress percent={survey.progress} size="small" />
            </div>
            <Button
              type={survey.status === "待填写" ? "primary" : "default"}
              icon={<Send size={15} />}
              onClick={() => setActiveSurveyId(survey.id)}
            >
              {survey.status === "待填写" ? "填写问卷" : "查看提交内容"}
            </Button>
          </article>
        ))}
      </div>

      {availableSurveys.length === 0 && (
        <div className="resident-survey-empty">
          <Empty description="当前暂无面向您的调研问卷" />
        </div>
      )}

      <Modal
        title={activeSurvey?.title ?? "填写问卷"}
        open={Boolean(activeSurvey)}
        okText="提交"
        cancelText="取消"
        onOk={submitSurvey}
        onCancel={() => setActiveSurveyId(undefined)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="您是否支持本次更新改造？" name="support" rules={[{ required: true, message: "请选择意见" }]}>
            <Radio.Group
              options={[
                { label: "支持", value: "support" },
                { label: "保持观望", value: "neutral" },
                { label: "暂不支持", value: "oppose" }
              ]}
            />
          </Form.Item>
          <Form.Item label="最希望优先改善的内容" name="priority" rules={[{ required: true, message: "请选择优先项" }]}>
            <Radio.Group
              options={[
                { label: "停车与道路", value: "traffic" },
                { label: "绿化与活动场地", value: "green" },
                { label: "养老医疗服务", value: "service" },
                { label: "排水与基础设施", value: "infrastructure" }
              ]}
            />
          </Form.Item>
          <Form.Item label="补充意见" name="comment">
            <Input.TextArea rows={4} placeholder="可填写您对所在小区、地块或周边环境的具体建议" />
          </Form.Item>
          <Space className="resident-survey-range">
            <MapPinned size={15} />
            <span>{activeSurvey?.range}</span>
          </Space>
        </Form>
      </Modal>
    </section>
  );
}
