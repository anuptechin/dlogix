import { useState } from 'react';
import { Button, Card, Select, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { EnquiryStatus } from '@lprms/shared';
import { listEnquiries, type EnquiryListItem } from '../../api/client';
import { MODE_LABEL, STATUS_COLOR } from './enquiryMeta';

const { Title } = Typography;

const STATUS_FILTER = [
  { label: 'All statuses', value: '' },
  ...Object.values(EnquiryStatus).map((s) => ({ label: s, value: s })),
];

export default function EnquiriesPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['enquiries', status],
    queryFn: () =>
      listEnquiries(status ? { status: status as EnquiryStatus } : undefined),
  });

  return (
    <Card>
      <Space
        style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Enquiries
        </Title>
        <Space>
          <Select
            value={status}
            style={{ width: 180 }}
            options={STATUS_FILTER}
            onChange={setStatus}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/app/enquiries/new')}
          >
            New enquiry
          </Button>
        </Space>
      </Space>

      <Table<EnquiryListItem>
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={{ pageSize: 12, hideOnSinglePage: true }}
        onRow={(r) => ({
          style: { cursor: 'pointer' },
          onClick: () => navigate(`/app/enquiries/${r.id}`),
        })}
        columns={[
          {
            title: 'Enquiry #',
            dataIndex: 'enquiryNo',
            render: (v) => <strong>{v}</strong>,
          },
          {
            title: 'Direction',
            dataIndex: 'direction',
            render: (v) => <Tag>{v}</Tag>,
          },
          {
            title: 'Mode',
            dataIndex: 'mode',
            render: (v: string) => MODE_LABEL[v] ?? v,
          },
          {
            title: 'Route',
            key: 'route',
            render: (_, r) =>
              `${r.origin?.code ?? r.origin?.name ?? '—'} → ${
                r.destination?.code ?? r.destination?.name ?? '—'
              }`,
          },
          {
            title: 'Vendors',
            key: 'vendors',
            align: 'center',
            render: (_, r) => r._count.enquiryVendors,
          },
          {
            title: 'Deadline',
            dataIndex: 'quoteDeadline',
            render: (v: string | null) =>
              v ? new Date(v).toLocaleDateString() : '—',
          },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v}</Tag>,
          },
        ]}
      />
    </Card>
  );
}
