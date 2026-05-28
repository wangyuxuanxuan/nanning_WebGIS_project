import { useCallback, useEffect, useState } from "react";
import type { FocusEvent } from "react";
import { Alert, App as AntApp, Button, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tabs, Tag, Upload } from "antd";
import type { TableColumnsType } from "antd";
import { Layers, RefreshCcw, ShieldCheck, UploadCloud, UserPlus, UsersRound } from "lucide-react";
import { whitelistUsers, type AuthStatus, type AuthUser } from "../data/mockAuth";
import {
  createAdminUser,
  getAdminLayers,
  getAdminUsers,
  importAdminUsers,
  updateAdminLayer,
  updateAdminUserStatus,
  type AdminLayer,
  type AdminUser
} from "../services/api";
import { publicUrl } from "../utils/publicPath";

interface AdminConsoleProps {
  user: AuthUser;
  onLayersChanged: () => void;
}

const statusColor: Record<AuthStatus, string> = {
  unregistered: "blue",
  pending: "gold",
  approved: "green",
  disabled: "red",
  rejected: "volcano",
  supplement: "orange"
};

const statusText: Record<AuthStatus, string> = {
  unregistered: "未注册",
  pending: "待审核",
  approved: "已通过",
  disabled: "已禁用",
  rejected: "审核驳回",
  supplement: "需补充材料"
};

const statusOptions = Object.entries(statusText).map(([value, label]) => ({ value, label }));

function changedText(event: FocusEvent<HTMLInputElement>, currentValue?: string) {
  const nextValue = event.target.value.trim();
  return nextValue === (currentValue ?? "") ? undefined : nextValue;
}

function demoAdminUsers(): AdminUser[] {
  return whitelistUsers.map((item, index) => ({
    ...item,
    id: index + 1,
    contact: item.phone,
    createdAt: "demo"
  }));
}

async function demoAdminLayers(): Promise<AdminLayer[]> {
  const response = await fetch(publicUrl("geodata/layers.json"));
  if (!response.ok) throw new Error("演示图层文件读取失败。");
  const layers = (await response.json()) as AdminLayer[];

  return layers.map((layer, index) => ({
    ...layer,
    enabled: layer.enabled ?? true,
    sortOrder: layer.sortOrder ?? index + 1,
    note: layer.note ?? "演示模式图层"
  }));
}

export function AdminConsole({ user, onLayersChanged }: AdminConsoleProps) {
  const { message } = AntApp.useApp();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [layers, setLayers] = useState<AdminLayer[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingLayers, setLoadingLayers] = useState(false);
  const [savingKey, setSavingKey] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [importingUsers, setImportingUsers] = useState(false);
  const [createForm] = Form.useForm();

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      setUsers(await getAdminUsers());
    } catch (error) {
      console.info("Using frontend demo users because the backend is unavailable.", error);
      setUsers(demoAdminUsers());
      message.info("演示模式：已加载本地白名单数据。");
    } finally {
      setLoadingUsers(false);
    }
  }, [message]);

  const loadLayers = useCallback(async () => {
    setLoadingLayers(true);
    try {
      setLayers(await getAdminLayers());
    } catch (error) {
      console.info("Using frontend demo layers because the backend is unavailable.", error);
      try {
        setLayers(await demoAdminLayers());
        message.info("演示模式：已加载本地静态图层。");
      } catch (demoError) {
        const detail = demoError instanceof Error ? demoError.message : "未知错误";
        message.error(`图层列表读取失败：${detail}`);
      }
    } finally {
      setLoadingLayers(false);
    }
  }, [message]);

  useEffect(() => {
    loadUsers();
    loadLayers();
  }, [loadLayers, loadUsers]);

  const saveUserStatus = async (record: AdminUser, status: AuthStatus) => {
    setSavingKey(`user-${record.id}`);
    try {
      const updated = await updateAdminUserStatus(record.id, status);
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      message.success("账号状态已更新。");
    } catch (error) {
      console.info("Using frontend demo user status update because the backend is unavailable.", error);
      setUsers((current) => current.map((item) => (item.id === record.id ? { ...item, status } : item)));
      message.success("演示模式：账号状态已在当前页面临时更新。");
    } finally {
      setSavingKey(undefined);
    }
  };

  const submitCreateUser = async () => {
    const values = await createForm.validateFields();
    setCreatingUser(true);
    try {
      const result = await createAdminUser({
        ...values,
        allowFeedback: values.allowFeedback ?? true,
        allowManage: values.allowManage ?? false,
        status: values.status ?? "unregistered"
      });
      await loadUsers();
      setCreateOpen(false);
      createForm.resetFields();
      message.success(result.message);
    } catch (error) {
      console.info("Using frontend demo user creation because the backend is unavailable.", error);
      const nextUser: AdminUser = {
        ...values,
        id: Date.now(),
        allowFeedback: values.allowFeedback ?? true,
        allowManage: values.allowManage ?? false,
        status: values.status ?? "unregistered",
        accessScope: values.accessScope || "演示模式临时用户",
        contact: values.contact || values.phone
      };
      setUsers((current) => [nextUser, ...current]);
      setCreateOpen(false);
      createForm.resetFields();
      message.success("演示模式：白名单用户已在当前页面临时新增。");
    } finally {
      setCreatingUser(false);
    }
  };

  const uploadWhitelist = async (file: File) => {
    setImportingUsers(true);
    try {
      const result = await importAdminUsers(file);
      await loadUsers();
      if (result.skipped.length > 0) {
        message.warning(`${result.message} 请检查被跳过的行。`);
      } else {
        message.success(result.message);
      }
    } catch (error) {
      console.info("Using frontend demo import because the backend is unavailable.", error);
      message.info("演示模式：已模拟导入文件，不会写入数据库。");
    } finally {
      setImportingUsers(false);
    }
    return false;
  };

  const saveLayer = async (
    record: AdminLayer,
    payload: Partial<Pick<AdminLayer, "name" | "categoryName" | "enabled" | "sortOrder" | "note">>
  ) => {
    setSavingKey(`layer-${record.id}`);
    try {
      const updated = await updateAdminLayer(record.id, payload);
      setLayers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      onLayersChanged();
      message.success("图层配置已更新。");
    } catch (error) {
      console.info("Using frontend demo layer update because the backend is unavailable.", error);
      setLayers((current) => current.map((item) => (item.id === record.id ? { ...item, ...payload } : item)));
      message.success("演示模式：图层配置已在当前页面临时更新。");
    } finally {
      setSavingKey(undefined);
    }
  };

  if (!user.allowManage) {
    return (
      <section className="admin-console">
        <Alert type="warning" showIcon message="当前账号没有后台管理权限。" />
      </section>
    );
  }

  const userColumns: TableColumnsType<AdminUser> = [
    {
      title: "姓名",
      dataIndex: "name",
      fixed: "left",
      width: 120
    },
    {
      title: "手机号",
      dataIndex: "phone",
      width: 132
    },
    {
      title: "用户类型",
      dataIndex: "userType",
      width: 120
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 120,
      render: (status: AuthStatus) => <Tag color={statusColor[status]}>{statusText[status]}</Tag>
    },
    {
      title: "审核处理",
      width: 170,
      render: (_, record) => (
        <Select
          size="small"
          value={record.status}
          options={statusOptions}
          loading={savingKey === `user-${record.id}`}
          onChange={(status) => saveUserStatus(record, status)}
        />
      )
    },
    {
      title: "权限范围",
      dataIndex: "accessScope",
      ellipsis: true
    }
  ];

  const layerColumns: TableColumnsType<AdminLayer> = [
    {
      title: "启用",
      dataIndex: "enabled",
      width: 82,
      fixed: "left",
      render: (enabled: boolean, record) => (
        <Switch
          checked={enabled}
          loading={savingKey === `layer-${record.id}`}
          onChange={(checked) => saveLayer(record, { enabled: checked })}
        />
      )
    },
    {
      title: "图层名称",
      dataIndex: "name",
      width: 260,
      render: (name: string, record) => (
        <Input
          defaultValue={name}
          onBlur={(event) => {
            const nextName = changedText(event, record.name);
            if (nextName) saveLayer(record, { name: nextName });
          }}
        />
      )
    },
    {
      title: "分类",
      dataIndex: "categoryName",
      width: 150,
      render: (categoryName: string, record) => (
        <Input
          defaultValue={categoryName}
          onBlur={(event) => {
            const nextCategoryName = changedText(event, record.categoryName);
            if (nextCategoryName) saveLayer(record, { categoryName: nextCategoryName });
          }}
        />
      )
    },
    {
      title: "对象",
      dataIndex: "objectType",
      width: 90,
      render: (objectType?: string) => objectType || "-"
    },
    {
      title: "数量",
      dataIndex: "featureCount",
      width: 90
    },
    {
      title: "排序",
      dataIndex: "sortOrder",
      width: 110,
      render: (sortOrder: number, record) => (
        <InputNumber
          value={sortOrder}
          min={0}
          onChange={(value) => {
            if (typeof value === "number" && value !== record.sortOrder) saveLayer(record, { sortOrder: value });
          }}
        />
      )
    },
    {
      title: "备注",
      dataIndex: "note",
      width: 220,
      render: (note: string | undefined, record) => (
        <Input
          defaultValue={note}
          placeholder="可填写管理说明"
          onBlur={(event) => {
            const nextNote = changedText(event, record.note);
            if (nextNote !== undefined) saveLayer(record, { note: nextNote });
          }}
        />
      )
    }
  ];

  return (
    <section className="admin-console">
      <div className="admin-head">
        <div>
          <p className="eyebrow">后台管理</p>
          <h2>系统管理</h2>
        </div>
        <Space>
          <Button icon={<UserPlus size={15} />} type="primary" onClick={() => setCreateOpen(true)}>
            新增白名单
          </Button>
          <Upload accept=".xlsx" showUploadList={false} beforeUpload={uploadWhitelist}>
            <Button icon={<UploadCloud size={15} />} loading={importingUsers}>
              导入 Excel
            </Button>
          </Upload>
          <Button icon={<RefreshCcw size={15} />} onClick={() => { loadUsers(); loadLayers(); }}>
            刷新
          </Button>
        </Space>
      </div>

      <Tabs
        items={[
          {
            key: "users",
            label: (
              <span className="admin-tab-label">
                <UsersRound size={16} />
                账号审核
              </span>
            ),
            children: (
              <div className="admin-table-wrap">
                <Alert
                  type="info"
                  showIcon
                  message="这里管理白名单账号、注册审核状态和账号启停。"
                  className="admin-alert"
                />
                <Table
                  rowKey="id"
                  size="small"
                  loading={loadingUsers}
                  columns={userColumns}
                  dataSource={users}
                  pagination={{ pageSize: 8 }}
                  scroll={{ x: 920 }}
                />
              </div>
            )
          },
          {
            key: "layers",
            label: (
              <span className="admin-tab-label">
                <Layers size={16} />
                图层管理
              </span>
            ),
            children: (
              <div className="admin-table-wrap">
                <Alert
                  type="info"
                  showIcon
                  message="这里只管理图层元数据和启用状态，不修改 GeoJSON 空间数据。"
                  className="admin-alert"
                />
                <Table
                  rowKey="id"
                  size="small"
                  loading={loadingLayers}
                  columns={layerColumns}
                  dataSource={layers}
                  pagination={{ pageSize: 8 }}
                  scroll={{ x: 1100 }}
                />
              </div>
            )
          }
        ]}
      />

      <div className="admin-footnote">
        <ShieldCheck size={16} />
        本机后端使用 SQLite 保存管理数据，默认数据库文件在 backend/data/app.db。
      </div>

      <Modal
        title="新增白名单用户"
        open={createOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={creatingUser}
        onOk={submitCreateUser}
        onCancel={() => setCreateOpen(false)}
        destroyOnClose
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{
            userType: "居民",
            status: "unregistered",
            allowFeedback: true,
            allowManage: false
          }}
        >
          <div className="admin-form-grid">
            <Form.Item name="phone" label="手机号" rules={[{ required: true, message: "请输入手机号" }]}>
              <Input placeholder="例如：13800138005" />
            </Form.Item>
            <Form.Item name="name" label="姓名" rules={[{ required: true, message: "请输入姓名" }]}>
              <Input placeholder="请输入姓名" />
            </Form.Item>
          </div>
          <div className="admin-form-grid">
            <Form.Item name="userType" label="用户类型" rules={[{ required: true, message: "请选择用户类型" }]}>
              <Select options={["居民", "政府管理者", "市场主体", "系统管理员"].map((value) => ({ value, label: value }))} />
            </Form.Item>
            <Form.Item name="status" label="初始状态">
              <Select options={statusOptions} />
            </Form.Item>
          </div>
          <div className="admin-form-grid">
            <Form.Item name="street" label="关联街区">
              <Input />
            </Form.Item>
            <Form.Item name="parcel" label="关联地块">
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="address" label="关联住址/对象">
            <Input />
          </Form.Item>
          <Form.Item name="accessScope" label="权限范围">
            <Input.TextArea rows={2} placeholder="不填则默认：注册审核通过后开通" />
          </Form.Item>
          <div className="admin-form-grid">
            <Form.Item name="contact" label="联系方式">
              <Input />
            </Form.Item>
            <Form.Item name="email" label="邮箱">
              <Input />
            </Form.Item>
          </div>
          <div className="admin-form-grid">
            <Form.Item name="allowFeedback" label="允许反馈">
              <Switch />
            </Form.Item>
            <Form.Item name="allowManage" label="允许后台管理">
              <Switch />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </section>
  );
}
