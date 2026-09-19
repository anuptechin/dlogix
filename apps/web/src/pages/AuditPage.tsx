import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { ReloadOutlined as Reload } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getAuditFacets, listAudit, type AuditRow } from '../api/client';

const { Title, Text } = Typography;

const ACTION_COLOR: Record<string, string> = {
  CREATE: 'green',
  CREATE_MANY: 'green',
  UPDATE: 'blue',
  UPDATE_MANY: 'blue',
  UPSERT: 'geekblue',
  DELETE: 'red',
  DELETE_MANY: 'red',
  AWARD: 'gold',
  LOGIN: 'purple',
};

function Json({ value }: { value: unknown }) {
  if (value == null) return <Text type="secondary">—</Text>;
  return (
    <pre
      style={{
        margin: 0,
        maxHeight: 260,
        overflow: 'auto',
        background: '#faf1ee',
        border: '1px solid #f0e2dd',
        borderRadius: 8,
        padding: 10,
        fontSize: 12,
      }}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function AuditPage() {
  const [entity, setEntity] = useState<string>();
  const [action, setAction] = useState<string>();
  const [actorId, setActorId] = useState<string>();
  const [q, setQ] = useState('');

  const facets = useQuery({ queryKey: ['auditFacets'], queryFn: getAuditFacets, retry: false });
  const rows = useQuery({
    queryKey: ['audit', entity, action, actorId, q],
    queryFn: () => listAudit({ entity, action, actorId, q: q || undefined, limit: 500 }),
    retry: false,
  });

  const forbidden =
    (rows.error as { response?: { status?: number } })?.response?.status === 403 ||
    (facets.error as { response?: { status?: number } })?.response?.status === 403;

  if (forbidden) {
    return (
      <Card>
        <Alert
          type="error"
          showIcon
          message="Administrators only"
          description="The audit log is restricted to admin users. Sign in with an administrator account to view it."
        />
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0 }}>
          Audit Log
        </Title>
        <Text type="secondary">
          Every login and data change across the portal, newest first. Restricted to administrators.
        </Text>
      </div>

      <Card
        size="small"
        extra={
          <Button size="small" icon={<Reload />} onClick={() => rows.refetch()}>
            Refresh
          </Button>
        }
      >
        <Row gutter={12}>
          <Col xs={12} md={6}>
            <Select
              allowClear
              style={{ width: '100%' }}
              placeholder="Entity"
              value={entity}
              onChange={setEntity}
              options={(facets.data?.entities ?? []).map((e) => ({ label: e, value: e }))}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              allowClear
              style={{ width: '100%' }}
              placeholder="Action"
              value={action}
              onChange={setAction}
              options={(facets.data?.actions ?? []).map((a) => ({ label: a, value: a }))}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder="Actor"
              value={actorId}
              onChange={setActorId}
              options={(facets.data?.actors ?? []).map((a) => ({ label: a.name, value: a.id }))}
            />
          </Col>
          <Col xs={12} md={6}>
            <Input.Search
              allowClear
              placeholder="Record ID"
              onSearch={setQ}
              onChange={(e) => !e.target.value && setQ('')}
            />
          </Col>
        </Row>
      </Card>

      <Card bodyStyle={{ padding: 0 }}>
        <Table<AuditRow>
          rowKey="id"
          loading={rows.isLoading}
          dataSource={rows.data ?? []}
          size="small"
          pagination={{ pageSize: 25, showSizeChanger: false }}
          expandable={{
            expandedRowRender: (r) => (
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Before</Text>
                  <Json value={r.before} />
                </Col>
                <Col span={12}>
                  <Text strong>After</Text>
                  <Json value={r.after} />
                </Col>
              </Row>
            ),
          }}
          columns={[
            {
              title: 'When',
              dataIndex: 'at',
              width: 170,
              render: (v: string) => dayjs(v).format('DD MMM YYYY, HH:mm:ss'),
            },
            {
              title: 'Actor',
              dataIndex: 'actor',
              render: (v: string, r) => (
                <span>
                  {v}
                  {r.actorEmail && (
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                      {r.actorEmail}
                    </Text>
                  )}
                </span>
              ),
            },
            {
              title: 'Action',
              dataIndex: 'action',
              width: 120,
              render: (v: string) => <Tag color={ACTION_COLOR[v] ?? 'default'}>{v}</Tag>,
            },
            { title: 'Entity', dataIndex: 'entity', width: 150 },
            {
              title: 'Record ID',
              dataIndex: 'entityId',
              render: (v: string | null) =>
                v ? (
                  <Text code style={{ fontSize: 11 }}>
                    {v}
                  </Text>
                ) : (
                  <Text type="secondary">—</Text>
                ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
