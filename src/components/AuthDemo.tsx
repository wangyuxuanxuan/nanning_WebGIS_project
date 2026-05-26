import { useMemo, useState } from "react";
import {
  Alert,
  App as AntApp,
  Button,
  Divider,
  Form,
  Input,
  Result,
  Segmented,
  Select,
  Space,
  Tag,
  Upload
} from "antd";
import {
  CheckCircle2,
  HelpCircle,
  Landmark,
  LockKeyhole,
  MessageCircle,
  Phone,
  UploadCloud,
  UserPlus,
  UsersRound
} from "lucide-react";
import type { AuthUser, RegisterPayload, WhitelistUser } from "../data/mockAuth";
import {
  findWhitelistUser,
  loginWithPassword,
  loginWithSmsCode,
  sendMockSmsCode,
  submitMockRegistration,
  whitelistUsers
} from "../data/mockAuth";
import { publicUrl } from "../utils/publicPath";

interface AuthDemoProps {
  onLogin: (user: AuthUser) => void;
}

type AuthPanel = "login" | "register";
type LoginMethod = "sms" | "password" | "wechat";

const statusColor: Record<WhitelistUser["status"], string> = {
  unregistered: "blue",
  pending: "gold",
  approved: "green",
  disabled: "red",
  rejected: "volcano",
  supplement: "orange"
};

const statusText: Record<WhitelistUser["status"], string> = {
  unregistered: "未注册",
  pending: "待审核",
  approved: "已通过",
  disabled: "已禁用",
  rejected: "审核驳回",
  supplement: "需补充材料"
};

const demoPhones = [
  ["13800138000", "审核通过，可验证码登录"],
  ["13800138001", "待审核，登录会提示审核中"],
  ["13800138002", "已禁用，登录会被拦截"],
  ["13800138003", "白名单未注册，可走注册流程"],
  ["13800138004", "需补充材料，可重新提交"]
];

export function AuthDemo({ onLogin }: AuthDemoProps) {
  const { message } = AntApp.useApp();
  const [panel, setPanel] = useState<AuthPanel>("login");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("sms");
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<WhitelistUser | undefined>();
  const [registerDone, setRegisterDone] = useState(false);
  const [phoneForm] = Form.useForm<{ phone: string; code: string }>();
  const [registerForm] = Form.useForm<RegisterPayload>();

  const streetOptions = useMemo(
    () =>
      Array.from(new Set(whitelistUsers.map((item) => item.street))).map((street) => ({
        label: street,
        value: street
      })),
    []
  );

  const parcelOptions = useMemo(
    () =>
      Array.from(new Set(whitelistUsers.map((item) => item.parcel))).map((parcel) => ({
        label: parcel,
        value: parcel
      })),
    []
  );

  const addressOptions = useMemo(
    () =>
      Array.from(new Set(whitelistUsers.map((item) => item.address))).map((address) => ({
        label: address,
        value: address
      })),
    []
  );

  const sendCode = async () => {
    try {
      const { phone } = await phoneForm.validateFields(["phone"]);
      setSendingCode(true);
      const result = await sendMockSmsCode(phone);
      if (result.ok) message.success(result.message);
      else message.warning(result.message);
    } finally {
      setSendingCode(false);
    }
  };

  const submitSmsLogin = async (values: { phone: string; code: string }) => {
    setSubmitting(true);
    const result = await loginWithSmsCode(values.phone, values.code);
    setSubmitting(false);
    if (!result.ok) {
      message.warning(result.message);
      return;
    }
    message.success(result.message);
    onLogin(result.user);
  };

  const submitPasswordLogin = async (values: { username: string; password: string }) => {
    setSubmitting(true);
    const result = await loginWithPassword(values.username, values.password);
    setSubmitting(false);
    if (!result.ok) {
      message.warning(result.message);
      return;
    }
    message.success(result.message);
    onLogin(result.user);
  };

  const checkRegisterPhone = async ({ phone }: { phone: string }) => {
    setCheckingPhone(true);
    await new Promise((resolve) => window.setTimeout(resolve, 260));
    const user = findWhitelistUser(phone);
    setCheckingPhone(false);

    if (!user) {
      message.warning("该手机号不在白名单中，请联系管理员录入后再注册。");
      setVerifiedUser(undefined);
      return;
    }
    if (user.status === "disabled") {
      message.error("该账号已禁用，无法提交注册。");
      setVerifiedUser(undefined);
      return;
    }

    setVerifiedUser(user);
    setRegisterDone(false);
    registerForm.setFieldsValue({
      phone: user.phone,
      name: user.name,
      userType: user.userType,
      contact: user.phone,
      street: user.street,
      parcel: user.parcel,
      address: user.address
    });
    message.success("白名单校验通过，请补充注册信息。");
  };

  const submitRegistration = async (values: RegisterPayload) => {
    setSubmitting(true);
    const result = await submitMockRegistration(values);
    setSubmitting(false);
    if (!result.ok) {
      message.warning(result.message);
      return;
    }
    setRegisterDone(true);
    message.success(result.message);
  };

  return (
    <div className="auth-page" style={{ "--auth-hero-bg": `url("${publicUrl("auth-left-bg.png")}")` } as React.CSSProperties}>
      <section className="auth-hero" aria-label="南宁城市体检平台展示区">
        <div className="auth-hero-title">
          <span className="auth-hero-icon">
            <Landmark size={34} />
          </span>
          <h1>南宁城市体检信息平台</h1>
        </div>
      </section>

      <section className="auth-card">
        <Segmented
          className="auth-mode-switch"
          block
          size="large"
          value={panel}
          onChange={(value) => {
            setPanel(value as AuthPanel);
            setRegisterDone(false);
          }}
          options={[
            { label: "登录", value: "login", icon: <LockKeyhole size={15} /> },
            { label: "注册", value: "register", icon: <UserPlus size={15} /> }
          ]}
        />

        {panel === "login" ? (
          <div className="auth-form-stack">
            <div className="auth-card-head">
              <span>登录方式</span>
              <Button size="small" icon={<HelpCircle size={14} />}>
                登录帮助
              </Button>
            </div>
            <Segmented
              className="auth-method-switch"
              block
              value={loginMethod}
              onChange={(value) => setLoginMethod(value as LoginMethod)}
              options={[
                { label: "验证码登录", value: "sms", icon: <Phone size={14} /> },
                { label: "账号密码登录", value: "password", icon: <LockKeyhole size={14} /> },
                { label: "微信登录", value: "wechat", icon: <MessageCircle size={14} /> }
              ]}
            />

            {loginMethod === "sms" && (
              <Form form={phoneForm} layout="vertical" onFinish={submitSmsLogin} requiredMark={false}>
                <Form.Item
                  label="手机号"
                  name="phone"
                  rules={[
                    { required: true, message: "请输入手机号" },
                    { pattern: /^1\d{10}$/, message: "请输入 11 位手机号" }
                  ]}
                >
                  <Input size="large" prefix={<Phone size={16} />} placeholder="示例：13800138000" />
                </Form.Item>
                <Form.Item label="验证码" required>
                  <Space.Compact className="auth-code-row">
                    <Form.Item name="code" noStyle rules={[{ required: true, message: "请输入验证码" }]}>
                      <Input size="large" placeholder="123456" />
                    </Form.Item>
                    <Button size="large" loading={sendingCode} onClick={sendCode}>
                      发送验证码
                    </Button>
                  </Space.Compact>
                </Form.Item>
                <Button type="primary" size="large" htmlType="submit" loading={submitting} block>
                  登录平台
                </Button>
              </Form>
            )}

            {loginMethod === "password" && (
              <Form layout="vertical" onFinish={submitPasswordLogin} requiredMark={false}>
                <Alert
                  type="info"
                  showIcon
                  message="demo 管理员账号：admin / admin123"
                  className="auth-inline-alert"
                />
                <Form.Item label="账号" name="username" rules={[{ required: true, message: "请输入账号" }]}>
                  <Input size="large" prefix={<UsersRound size={16} />} placeholder="admin" />
                </Form.Item>
                <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}>
                  <Input.Password size="large" placeholder="admin123" />
                </Form.Item>
                <Button type="primary" size="large" htmlType="submit" loading={submitting} block>
                  管理员登录
                </Button>
              </Form>
            )}

            {loginMethod === "wechat" && (
              <div className="wechat-placeholder">
                <MessageCircle size={44} />
                <h3>微信绑定登录</h3>
                <p>正式版将跳转微信授权并完成账号绑定。当前 demo 只展示入口，不发起真实 OAuth。</p>
                <Button size="large" disabled block>
                  等待后端接入
                </Button>
              </div>
            )}

            <Divider plain>其他登录方式与测试账号</Divider>
            <div className="demo-account-list">
              <p>可测试手机号</p>
              {demoPhones.map(([phone, desc]) => (
                <button
                  type="button"
                  key={phone}
                  onClick={() => {
                    setLoginMethod("sms");
                    phoneForm.setFieldsValue({ phone, code: "123456" });
                  }}
                >
                  <span>{phone}</span>
                  <small>{desc}</small>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="auth-form-stack">
            <Form layout="vertical" onFinish={checkRegisterPhone} requiredMark={false}>
              <Form.Item
                label="先校验白名单手机号"
                name="phone"
                rules={[
                  { required: true, message: "请输入手机号" },
                  { pattern: /^1\d{10}$/, message: "请输入 11 位手机号" }
                ]}
              >
                <Input size="large" prefix={<Phone size={16} />} placeholder="示例：13800138003" />
              </Form.Item>
              <Button size="large" htmlType="submit" loading={checkingPhone} block>
                校验并进入注册
              </Button>
            </Form>

            {verifiedUser && (
              <Alert
                type={verifiedUser.status === "approved" ? "success" : "info"}
                showIcon
                message={
                  <Space wrap>
                    <span>白名单状态：</span>
                    <Tag color={statusColor[verifiedUser.status]}>{statusText[verifiedUser.status]}</Tag>
                    <span>{verifiedUser.accessScope}</span>
                  </Space>
                }
              />
            )}

            {verifiedUser && !registerDone && (
              <Form form={registerForm} layout="vertical" onFinish={submitRegistration} requiredMark={false}>
                <Form.Item name="phone" label="手机号">
                  <Input size="large" disabled />
                </Form.Item>
                <div className="auth-two-col">
                  <Form.Item name="name" label="姓名" rules={[{ required: true, message: "请输入姓名" }]}>
                    <Input size="large" />
                  </Form.Item>
                  <Form.Item name="contact" label="联系方式" rules={[{ required: true, message: "请输入联系方式" }]}>
                    <Input size="large" />
                  </Form.Item>
                </div>
                <div className="auth-two-col">
                  <Form.Item name="userType" label="用户类型" rules={[{ required: true, message: "请选择用户类型" }]}>
                    <Select
                      size="large"
                      options={["居民", "政府管理者", "市场主体", "系统管理员"].map((value) => ({ label: value, value }))}
                    />
                  </Form.Item>
                  <Form.Item name="email" label="邮箱（可选）">
                    <Input size="large" placeholder="用于接收审核通知" />
                  </Form.Item>
                </div>
                <div className="auth-two-col">
                  <Form.Item name="street" label="关联街区" rules={[{ required: true, message: "请选择街区" }]}>
                    <Select size="large" options={streetOptions} />
                  </Form.Item>
                  <Form.Item name="parcel" label="关联地块" rules={[{ required: true, message: "请选择地块" }]}>
                    <Select size="large" options={parcelOptions} />
                  </Form.Item>
                </div>
                <Form.Item name="address" label="关联住址/对象" rules={[{ required: true, message: "请选择住址或对象" }]}>
                  <Select size="large" options={addressOptions} />
                </Form.Item>
                <Form.Item name="password" label="登录密码（可选）">
                  <Input.Password size="large" placeholder="后续可作为备用登录方式" />
                </Form.Item>
                <Form.Item label="认证材料（可选）">
                  <Upload.Dragger beforeUpload={() => false} maxCount={3} multiple>
                    <p className="ant-upload-drag-icon">
                      <UploadCloud size={28} />
                    </p>
                    <p className="ant-upload-text">点击或拖拽上传产权证明、居住证明、单位证明等材料</p>
                  </Upload.Dragger>
                </Form.Item>
                <Button type="primary" size="large" htmlType="submit" loading={submitting} block>
                  提交后台审核
                </Button>
              </Form>
            )}

            {registerDone && (
              <Result
                status="success"
                icon={<CheckCircle2 />}
                title="注册信息已提交"
                subTitle="当前状态为待审核。管理员审核通过后，会按白名单范围开通地图、指标和反馈权限。"
                extra={
                  <Button type="primary" onClick={() => setPanel("login")}>
                    返回登录
                  </Button>
                }
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
