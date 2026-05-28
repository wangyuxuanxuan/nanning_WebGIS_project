import { loginByPassword, loginBySms, sendSmsCode, submitRegistration } from "../services/api";

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
  street?: string;
  parcel?: string;
  address?: string;
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
    phone: "13800138005",
    name: "林小雅",
    userType: "居民",
    street: "亭洪街道",
    parcel: "TH-02-06",
    address: "亭洪路社区 6 栋",
    accessScope: "本人住址及周边社区体检结果",
    allowFeedback: true,
    allowManage: false,
    status: "approved"
  },
  {
    phone: "13800138006",
    name: "南宁乐创园区",
    userType: "市场主体",
    street: "白沙街道",
    parcel: "BS-05-09",
    address: "白沙商业街 20 号",
    accessScope: "绑定地块与综合分析结果",
    allowFeedback: true,
    allowManage: false,
    status: "approved"
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

function backendUnavailable(error: unknown) {
  const detail = error instanceof Error ? error.message : "未知错误";
  return { ok: false as const, message: `无法连接本地后端服务：${detail}` };
}

export async function sendMockSmsCode(phone: string) {
  try {
    return await sendSmsCode(phone);
  } catch (error) {
    return backendUnavailable(error);
  }
}

export async function loginWithSmsCode(phone: string, code: string) {
  try {
    return await loginBySms(phone, code);
  } catch (error) {
    return backendUnavailable(error);
  }
}

export async function loginWithPassword(username: string, password: string) {
  try {
    return await loginByPassword(username, password);
  } catch (error) {
    return backendUnavailable(error);
  }
}

export async function submitMockRegistration(payload: RegisterPayload) {
  try {
    return await submitRegistration(payload);
  } catch (error) {
    return backendUnavailable(error);
  }
}
