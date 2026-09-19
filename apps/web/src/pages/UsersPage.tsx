import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUser,
  listUsers,
  updateUser,
  type ManagedUser,
  type Role,
} from '../api/client';

const { Title, Text } = Typography;

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Manager', value: 'MANAGEMENT' },
  { label: 'Logistics User', value: 'LOGISTICS' },
  { label: 'Documentation', value: 'DOCUMENTATION' },
];
const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGEMENT: 'Manager',
  LOGISTICS: 'Logistics User',
  DOCUMENTATION: 'Documentation',
};
const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'red',
  MANAGEMENT: 'blue',
  LOGISTICS: 'green',
  DOCUMENTATION: 'default',
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [open, setOpen] = useState(false);

  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: listUsers });

  const done = (msg: string) => {
    message.success(msg);
    setOpen(false);
    setEditing(null);
    form.resetFields();
    qc.invalidateQueries({ queryKey: ['users'] });
  };
  const fail = (err: unknown) =>
    message.error(
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Save failed',
    );

  const createMut = useMutation({
    mutationFn: (v: { name: string; email: string; role: Role; password: string }) => createUser(v),
    onSuccess: () => done('User created'),
    onError: fail,
  });
  const updateMut = useMutation({
    mutationFn: (v: { id: string; name?: string; role?: Role; password?: string }) =>
      updateUser(v.id, { name: v.name, role: v.role, password: v.password || undefined }),
    onSuccess: () => done('User updated'),
    onError: fail,
  });
  const toggleMut = useMutation({
    mutationFn: (u: ManagedUser) => updateUser(u.id, { isActive: !u.isActive }),
    onSuccess: () => {
      message.success('User updated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: fail,
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ role: 'LOGISTICS' });
    setOpen(true);
  };
  const openEdit = (u: ManagedUser) => {
    setEditing(u);
    form.setFieldsValue({ name: u.name, email: u.email, role: u.role, password: '' });
    setOpen(true);
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start" wrap>
        <div>
          <Title level={3} style={{ margin: 0 }}>Users &amp; Roles</Title>
          <Text type="secondary">Create users and assign roles. Admin only.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New user</Button>
      </Space>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<ManagedUser>
          rowKey="id"
          loading={isLoading}
          dataSource={users ?? []}
          pagination={false}
          columns={[
            { title: 'Name', dataIndex: 'name' },
            { title: 'Email', dataIndex: 'email' },
            {
              title: 'Role',
              dataIndex: 'role',
              render: (r: string) => <Tag color={ROLE_COLOR[r]}>{ROLE_LABEL[r] ?? r}</Tag>,
            },
            {
              title: 'Active',
              dataIndex: 'isActive',
              render: (_: boolean, u) => (
                <Switch checked={u.isActive} onChange={() => toggleMut.mutate(u)} size="small" />
              ),
            },
            {
              title: '',
              key: 'actions',
              align: 'right',
              render: (_, u) => (
                <Button size="small" onClick={() => openEdit(u)}>Edit</Button>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editing ? `Edit ${editing.name}` : 'New user'}
        open={open}
        onCancel={() => { setOpen(false); setEditing(null); }}
        onOk={() => form.submit()}
        confirmLoading={createMut.isPending || updateMut.isPending}
        okText={editing ? 'Save' : 'Create user'}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => {
            if (editing) updateMut.mutate({ id: editing.id, ...v });
            else createMut.mutate(v);
          }}
        >
          <Form.Item label="Full name" name="name" rules={[{ required: true }]}>
            <Input placeholder="Jane Doe" />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="jane@ddecor.com" disabled={!!editing} />
          </Form.Item>
          <Form.Item label="Role" name="role" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
          <Form.Item
            label={editing ? 'Reset password (optional)' : 'Password'}
            name="password"
            rules={editing ? [] : [{ required: true, min: 6, message: 'At least 6 characters' }]}
          >
            <Input.Password placeholder={editing ? 'Leave blank to keep current' : 'Min 6 characters'} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
