import { Button, Card, Dropdown, Space, Table, Tag, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { listAudit, type AuditRow } from '../api/client';
import { downloadCsv } from '../utils/csv';
import { exportExcel } from '../utils/excel';

const { Title, Text } = Typography;

const ACTION_COLOR: Record<string, string> = {
  AWARD: 'gold',
  CREATE: 'blue',
  UPDATE: 'default',
  DELETE: 'red',
};

function summarize(after: unknown): string {
  if (!after || typeof after !== 'object') return '';
  const a = after as Record<string, unknown>;
  const parts: string[] = [];
  if (a.amount != null) parts.push(`₹${Number(a.amount).toLocaleString('en-IN')}`);
  if (a.reason) parts.push(String(a.reason));
  return parts.join(' · ');
}

export default function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: () => listAudit(),
  });

  return (
    <Card>
      <Space
        style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}
        align="start"
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Reports &amp; audit
          </Title>
          <Text type="secondary">
            Every award and rate-card change is recorded here for governance.
          </Text>
        </div>
        <Dropdown
          disabled={!data?.length}
          menu={{
            items: [
              { key: 'csv', label: 'Download CSV' },
              { key: 'xlsx', label: 'Download Excel' },
            ],
            onClick: ({ key }) => {
              const rows = (data ?? []).map((r) => ({
                when: dayjs(r.at).format('YYYY-MM-DD HH:mm'),
                actor: r.actor,
                action: r.action,
                entity: r.entity,
                details: summarize(r.after),
              }));
              if (key === 'csv') {
                downloadCsv(
                  'lprms-audit-log.csv',
                  ['When', 'Actor', 'Action', 'Entity', 'Details'],
                  rows.map((r) => [r.when, r.actor, r.action, r.entity, r.details]),
                );
              } else {
                exportExcel(
                  'lprms-audit-log.xlsx',
                  'Audit log',
                  [
                    { header: 'When', key: 'when', width: 18 },
                    { header: 'Actor', key: 'actor', width: 20 },
                    { header: 'Action', key: 'action', width: 12 },
                    { header: 'Entity', key: 'entity', width: 14 },
                    { header: 'Details', key: 'details', width: 40 },
                  ],
                  rows,
                );
              }
            },
          }}
        >
          <Button icon={<DownloadOutlined />}>Export</Button>
        </Dropdown>
      </Space>
      <Table<AuditRow>
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={{ pageSize: 15, hideOnSinglePage: true }}
        locale={{ emptyText: 'No audit activity yet.' }}
        columns={[
          {
            title: 'When',
            dataIndex: 'at',
            render: (v: string) => dayjs(v).format('DD MMM YYYY, HH:mm'),
            width: 190,
          },
          { title: 'Actor', dataIndex: 'actor' },
          {
            title: 'Action',
            dataIndex: 'action',
            render: (v: string) => (
              <Tag color={ACTION_COLOR[v] ?? 'default'}>{v}</Tag>
            ),
          },
          { title: 'Entity', dataIndex: 'entity' },
          {
            title: 'Details',
            key: 'details',
            render: (_, r) => (
              <Text type="secondary">{summarize(r.after)}</Text>
            ),
          },
        ]}
      />
    </Card>
  );
}
