export type AuthStatus = "unregistered" | "pending" | "approved" | "disabled" | "rejected" | "supplement";

export interface WhitelistUser {
  phone: string;
  name: string;
  userType: "系统管理员" | "居民" | "政府管理者" | "市场主体";
  street: string;
  parcel: string;
  address: string;
  accessScope: string;
  allowFeedback: boolean;
  allowManage: boolean;
  status: AuthStatus;
}

export interface AuthUser {
  phone: string;
  name: string;
  userType: WhitelistUser["userType"];
  accessScope: string;
  allowFeedback: boolean;
  allowManage: boolean;
}

export interface RegisterPayload {
  phone: string;
  name: string;
  userType: WhitelistUser["userType"];
  contact: string;
  email?: string;
  password?: string;
  street: string;
  parcel: string;
  address: string;
}

export const MOCK_SMS_CODE = "123456";

export const whitelistUsers: WhitelistUser[] = [
  {
    phone: "13800138000",
    name: "张晓明",
    userType: "政府管理者",
    street: "福建园街道",
    parcel: "JNY-02-08",
    address: "江南中街片区",
    accessScope: "江南区城市体检综合分析、问题一张图、需求一张图",
    allowFeedback: true,
    allowManage: true,
    status: "approved"
  },
  {
    phone: "13800138001",
    name: "李雨",
    userType: "居民",
    street: "亭洪街道",
    parcel: "TH-01-03",
    address: "亭洪路社区 3 栋",
    accessScope: "本人住址及周边社区体检结果",
    allowFeedback: true,
    allowManage: false,
    status: "pending"
  },
  {
    phone: "13800138002",
    name: "周伟",
    userType: "市场主体",
    street: "白沙街道",
    parcel: "BS-04-11",
    address: "白沙商业街 12 号",
    accessScope: "绑定地块与反馈统计",
    allowFeedback: true,
    allowManage: false,
    status: "disabled"
  },
  {
    phone: "13800138003",
    name: "黄静",
    userType: "居民",
    street: "江南街道",
    parcel: "JN-07-02",
    address: "淡村社区",
    accessScope: "注册审核通过后开通",
    allowFeedback: true,
    allowManage: false,
    status: "unregistered"
  },
  {
    phone: "13800138004",
    name: "陈启",
    userType: "政府管理者",
    street: "沙井街道",
    parcel: "SJ-06-05",
    address: "沙井片区",
    accessScope: "需补充材料后开通",
    allowFeedback: false,
    allowManage: true,
    status: "supplement"
  }
];

const adminAccount = {
  username: "admin",
  password: "admin123",
  user: {
    phone: "0771000000",
    name: "系统管理员",
    userType: "系统管理员" as const,
    accessScope: "全市空间范围、指标体系、白名单与后台管理",
    allowFeedback: true,
    allowManage: true
  }
};

function wait() {
  return new Promise((resolve) => window.setTimeout(resolve, 360));
}

function toAuthUser(user: WhitelistUser): AuthUser {
  return {
    phone: user.phone,
    name: user.name,
    userType: user.userType,
    accessScope: user.accessScope,
    allowFeedback: user.allowFeedback,
    allowManage: user.allowManage
  };
}

export function findWhitelistUser(phone: string) {
  return whitelistUsers.find((user) => user.phone === phone.trim());
}

export async function sendMockSmsCode(phone: string) {
  await wait();
  const user = findWhitelistUser(phone);
  if (!user) {
    return { ok: false, message: "该手机号不在白名单中，请联系管理员录入。" };
  }
  if (user.status === "disabled") {
    return { ok: false, message: "该账号已禁用，请联系平台管理员。" };
  }
  return { ok: true, message: `验证码已发送，demo 验证码为 ${MOCK_SMS_CODE}。` };
}

export async function loginWithSmsCode(phone: string, code: string) {
  await wait();
  const user = findWhitelistUser(phone);
  if (!user) return { ok: false as const, message: "该手机号不在白名单中，请联系管理员录入。" };
  if (code !== MOCK_SMS_CODE) return { ok: false as const, message: "验证码不正确，请输入 demo 验证码 123456。" };
  if (user.status === "pending") return { ok: false as const, message: "注册信息正在审核中，审核通过后将开通账号。" };
  if (user.status === "disabled") return { ok: false as const, message: "该账号已禁用，请联系平台管理员。" };
  if (user.status === "unregistered") return { ok: false as const, message: "该手机号尚未完成注册，请先提交注册信息。" };
  if (user.status === "supplement") return { ok: false as const, message: "注册信息需补充认证材料，请在注册页完善后提交。" };
  if (user.status === "rejected") return { ok: false as const, message: "注册申请已被驳回，请联系管理员确认原因。" };
  return { ok: true as const, user: toAuthUser(user), message: "登录成功，正在进入平台。" };
}

export async function loginWithPassword(username: string, password: string) {
  await wait();
  if (username.trim() === adminAccount.username && password === adminAccount.password) {
    return { ok: true as const, user: adminAccount.user, message: "管理员登录成功。" };
  }
  return { ok: false as const, message: "账号或密码不正确。demo 管理员账号：admin / admin123。" };
}

export async function submitMockRegistration(payload: RegisterPayload) {
  await wait();
  const user = findWhitelistUser(payload.phone);
  if (!user) return { ok: false as const, message: "该手机号不在白名单中，暂不能提交注册。" };
  if (user.status === "disabled") return { ok: false as const, message: "该账号已禁用，无法提交注册。" };
  if (user.status === "approved") return { ok: false as const, message: "该手机号已开通账号，可直接登录。" };
  return {
    ok: true as const,
    message: "注册信息已提交，当前状态为待审核。审核通过后会按白名单权限开通账号。",
    status: "pending" as AuthStatus
  };
}
