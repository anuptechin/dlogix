import {
  Button,
  Card,
  Col,
  Dropdown,
  Empty,
  Row,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getDashboard, type DashboardData } from '../api/client';
import { MODE_LABEL, STATUS_COLOR } from './enquiries/enquiryMeta';
import { downloadCsv } from '../utils/csv';
import { exportExcel } from '../utils/excel';
import './dashboard.css';

const { Title, Text } = Typography;

const inr = (v: number) =>
  `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="dash__kpi">
      <div className="k">{label}</div>
      <div className={`v${accent ? ' accent' : ''}`}>{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  });

  if (isLoading || !data) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  const k = data.kpis;
  const maxSpend = Math.max(1, ...data.spendByMode.map((s) => s.amount));
  const statusOrder: (keyof DashboardData['byStatus'])[] = [
    'DRAFT',
    'SENT',
    'QUOTING',
    'COMPARED',
    'AWARDED',
    'CLOSED',
    'CANCELLED',
  ];
  const statusTotal = statusOrder.reduce((s, k) => s + (data.byStatus[k] ?? 0), 0);
  const statusMax = Math.max(1, ...statusOrder.map((k) => data.byStatus[k] ?? 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Title level={3} style={{ margin: 0 }}>
          Dashboard
        </Title>
        <Text type="secondary">Procurement activity across all enquiries.</Text>
      </div>

      {/* KPI tiles */}
      <div className="dash__kpis">
        <Kpi label="Enquiries" value={String(k.totalEnquiries)} />
        <Kpi label="Awarded" value={String(k.awarded)} sub="shipments" />
        <Kpi label="Awarded value" value={inr(k.awardedValue)} accent />
        <Kpi
          label="Response rate"
          value={`${k.responseRate}%`}
          sub="quotes / invites"
        />
        <Kpi label="Active vendors" value={String(k.activeVendors)} />
        <Kpi label="Rate cards" value={String(k.activeContracts)} sub="courier" />
      </div>

      <Row gutter={16}>
        {/* Enquiries by status — lifecycle bar chart */}
        <Col xs={24} lg={12}>
          <Card
            title="Enquiries by status"
            style={{ height: '100%' }}
            extra={<Text type="secondary">{statusTotal} total</Text>}
          >
            {statusTotal === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No enquiries yet."
              />
            ) : (
              <div className="statuschart" role="img" aria-label="Enquiries by status">
                {statusOrder.map((s, i) => {
                  const n = data.byStatus[s] ?? 0;
                  const pct = statusTotal ? Math.round((n / statusTotal) * 100) : 0;
                  const w = (n / statusMax) * 100;
                  return (
                    <Tooltip
                      key={s}
                      title={`${s} — ${n} enquir${n === 1 ? 'y' : 'ies'} · ${pct}% of ${statusTotal}`}
                    >
                      <div className="statusbar">
                        <span className="statusbar__label">
                          <Tag color={STATUS_COLOR[s]} style={{ margin: 0 }}>
                            {s}
                          </Tag>
                        </span>
                        <span className="statusbar__track">
                          <i
                            className={`statusbar__fill${n === 0 ? ' is-zero' : ''}`}
                            style={{
                              width: `${n === 0 ? 0 : Math.max(w, 3)}%`,
                              animationDelay: `${i * 70}ms`,
                            }}
                          />
                        </span>
                        <span className="statusbar__val">
                          {n}
                          <em>{pct}%</em>
                        </span>
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* Awarded spend by mode */}
        <Col xs={24} lg={12}>
          <Card title="Awarded spend by mode" style={{ height: '100%' }}>
            {data.spendByMode.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No awarded shipments yet."
              />
            ) : (
              data.spendByMode.map((s) => (
                <div className="bar" key={s.mode}>
                  <span className="bar__label">{MODE_LABEL[s.mode] ?? s.mode}</span>
                  <span className="bar__track">
                    <span
                      className="bar__fill"
                      style={{ width: `${(s.amount / maxSpend) * 100}%` }}
                    />
                  </span>
                  <span className="bar__value">
                    {inr(s.amount)} · {s.count}
                  </span>
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>

      {/* Vendor performance */}
      <Card
        title="Vendor performance"
        extra={
          <Dropdown
            disabled={!data.vendorPerformance.length}
            menu={{
              items: [
                { key: 'csv', label: 'Download CSV' },
                { key: 'xlsx', label: 'Download Excel' },
              ],
              onClick: ({ key }) => {
                if (key === 'csv') {
                  downloadCsv(
                    'lprms-vendor-performance.csv',
                    ['Vendor', 'Invited', 'Quoted', 'Won', 'Win rate %', 'Awarded value'],
                    data.vendorPerformance.map((v) => [
                      v.name,
                      v.invited,
                      v.quoted,
                      v.won,
                      v.winRate,
                      v.awardedValue,
                    ]),
                  );
                } else {
                  exportExcel(
                    'lprms-vendor-performance.xlsx',
                    'Vendor performance',
                    [
                      { header: 'Vendor', key: 'name', width: 28 },
                      { header: 'Invited', key: 'invited', width: 10 },
                      { header: 'Quoted', key: 'quoted', width: 10 },
                      { header: 'Won', key: 'won', width: 10 },
                      { header: 'Win rate %', key: 'winRate', width: 12 },
                      { header: 'Awarded value', key: 'awardedValue', width: 18, money: true },
                    ],
                    data.vendorPerformance.map((v) => ({ ...v })),
                  );
                }
              },
            }}
          >
            <Button size="small" icon={<DownloadOutlined />}>
              Export
            </Button>
          </Dropdown>
        }
      >
        <Table
          rowKey="vendorId"
          dataSource={data.vendorPerformance}
          pagination={false}
          locale={{ emptyText: 'No vendor activity yet.' }}
          columns={[
            { title: 'Vendor', dataIndex: 'name' },
            { title: 'Invited', dataIndex: 'invited', align: 'center' },
            { title: 'Quoted', dataIndex: 'quoted', align: 'center' },
            { title: 'Won', dataIndex: 'won', align: 'center' },
            {
              title: 'Win rate',
              dataIndex: 'winRate',
              render: (v: number) => (
                <span>
                  <span className="winbar">
                    <i style={{ width: `${v}%` }} />
                  </span>
                  {v}%
                </span>
              ),
            },
            {
              title: 'Awarded value',
              dataIndex: 'awardedValue',
              align: 'right',
              render: (v: number) => inr(v),
              sorter: (a, b) => a.awardedValue - b.awardedValue,
              defaultSortOrder: 'descend',
            },
          ]}
        />
      </Card>

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="Recent awards" style={{ height: '100%' }}>
            {data.recentAwards.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No awards yet."
              />
            ) : (
              <Table
                rowKey={(_, i) => String(i)}
                dataSource={data.recentAwards}
                pagination={false}
                size="small"
                columns={[
                  { title: 'Enquiry', dataIndex: 'enquiryNo' },
                  { title: 'Vendor', dataIndex: 'vendor' },
                  { title: 'Route', dataIndex: 'route' },
                  {
                    title: 'Value',
                    dataIndex: 'amount',
                    align: 'right',
                    render: (v: number) => inr(v),
                  },
                ]}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="Rate cards expiring soon"
            style={{ height: '100%' }}
            extra={<Text type="secondary">next 60 days</Text>}
          >
            {data.expiringContracts.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No courier rate cards expiring in the next 60 days."
              />
            ) : (
              data.expiringContracts.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: '1px solid #f0f3f6',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{c.serviceName}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {c.vendor}
                    </Text>
                  </div>
                  <Tag color={(c.daysLeft ?? 99) <= 14 ? 'red' : 'gold'}>
                    {c.validTo ? dayjs(c.validTo).format('DD MMM YYYY') : '—'}
                    {c.daysLeft != null ? ` · ${c.daysLeft}d` : ''}
                  </Tag>
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
