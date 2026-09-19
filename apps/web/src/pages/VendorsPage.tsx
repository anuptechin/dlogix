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
import { PlusOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShipmentMode } from '@lprms/shared';
import {
  createVendor,
  listVendors,
  updateVendor,
  type Vendor,
  type VendorInput,
} from '../api/client';

const { Title } = Typography;

const MODE_OPTIONS = [
  { label: 'Air Freight', value: ShipmentMode.AIR },
  { label: 'Sea LCL', value: ShipmentMode.LCL },
  { label: 'Sea FCL', value: ShipmentMode.FCL },
  { label: 'Courier', value: ShipmentMode.COURIER },
];

const MODE_LABEL: Record<string, string> = {
  AIR: 'Air',
  LCL: 'LCL',
  FCL: 'FCL',
  COURIER: 'Courier',
};

export default function VendorsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form] = Form.useForm<VendorInput>();

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors', search],
    queryFn: () => listVendors({ q: search || undefined }),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: VendorInput) => {
      if (editing) return updateVendor(editing.id, values);
      return createVendor(values);
    },
    onSuccess: () => {
      message.success(editing ? 'Vendor updated' : 'Vendor created');
      qc.invalidateQueries({ queryKey: ['vendors'] });
      closeModal();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message ?? 'Save failed';
      message.error(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, modeCapabilities: [] });
    setModalOpen(true);
  }

  function openEdit(vendor: Vendor) {
    setEditing(vendor);
    form.setFieldsValue({
      name: vendor.name,
      contactPerson: vendor.contactPerson ?? undefined,
      email: vendor.email,
      phone: vendor.phone ?? undefined,
      address: vendor.address ?? undefined,
      modeCapabilities: vendor.modeCapabilities,
      isActive: vendor.isActive,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  }

  async function handleOk() {
    const values = await form.validateFields();
    saveMutation.mutate(values);
  }

  return (
    <Card>
      <Space
        style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Vendors
        </Title>
        <Space>
          <Input
            allowClear
            placeholder="Search name / email / contact"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New vendor
          </Button>
        </Space>
      </Space>

      <Table<Vendor>
        rowKey="id"
        loading={isLoading}
        dataSource={vendors}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        columns={[
          { title: 'Name', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
          { title: 'Contact', dataIndex: 'contactPerson', render: (v) => v || '—' },
          { title: 'Email', dataIndex: 'email' },
          { title: 'Phone', dataIndex: 'phone', render: (v) => v || '—' },
          {
            title: 'Modes',
            dataIndex: 'modeCapabilities',
            render: (modes: ShipmentMode[]) =>
              modes.length
                ? modes.map((m) => <Tag key={m}>{MODE_LABEL[m] ?? m}</Tag>)
                : '—',
          },
          {
            title: 'Status',
            dataIndex: 'isActive',
            render: (active: boolean) => (
              <Tag color={active ? 'green' : 'default'}>
                {active ? 'Active' : 'Inactive'}
              </Tag>
            ),
          },
          {
            title: '',
            key: 'actions',
            align: 'right',
            render: (_, vendor) => (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEdit(vendor)}
              >
                Edit
              </Button>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? `Edit vendor — ${editing.name}` : 'New vendor'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={closeModal}
        confirmLoading={saveMutation.isPending}
        okText={editing ? 'Save changes' : 'Create vendor'}
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            label="Vendor name"
            name="name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="e.g. ABC Freight Forwarders" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input placeholder="quotes@vendor.com" />
          </Form.Item>
          <Form.Item label="Contact person" name="contactPerson">
            <Input placeholder="Full name" />
          </Form.Item>
          <Form.Item label="Phone" name="phone">
            <Input placeholder="+91 ..." />
          </Form.Item>
          <Form.Item label="Address" name="address">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Mode capabilities" name="modeCapabilities">
            <Select
              mode="multiple"
              allowClear
              placeholder="Which shipment modes this vendor serves"
              options={MODE_OPTIONS}
            />
          </Form.Item>
          <Form.Item label="Active" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
