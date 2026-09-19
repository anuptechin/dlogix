import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Dropdown,
  Empty,
  Input,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  awardEnquiry,
  getComparison,
  type ComparisonVendor,
} from '../../api/client';
import { MODE_LABEL, STATUS_COLOR } from './enquiryMeta';
import { downloadCsv } from '../../utils/csv';
import { exportExcel } from '../../utils/excel';
import { exportComparisonPdf } from '../../utils/pdf';
import './comparison.css';

const { Title, Text } = Typography;

const SYMBOL: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED ',
};
const money = (v: number | null, cur = 'INR') =>
  v == null
    ? '—'
    : `${SYMBOL[cur] ?? cur + ' '}${v.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

export default function ComparisonPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [awardTarget, setAwardTarget] = useState<ComparisonVendor | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['comparison', id],
    queryFn: () => getComparison(id),
    enabled: Boolean(id),
  });

  const awardMut = useMutation({
    mutationFn: (v: ComparisonVendor) =>
      awardEnquiry(id, v.quotationId!, reason || undefined),
    onSuccess: (_res, v) => {
      message.success(`Awarded to ${v.name} — feedback sent to all vendors.`);
      setAwardTarget(null);
      setReason('');
      qc.invalidateQueries({ queryKey: ['comparison', id] });
      qc.invalidateQueries({ queryKey: ['enquiry', id] });
      qc.invalidateQueries({ queryKey: ['enquiries'] });
    },
    onError: (err: unknown) => {
      const m =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Could not award. Please try again.';
      message.error(m);
    },
  });

  if (isLoading || !data) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  const { enquiry, chargeTypes, vendors, history } = data;
  const submitted = vendors.filter((v) => v.submitted);
  const awardedQid = enquiry.awardedQuotationId;
  const isAwardedPhase = Boolean(awardedQid);

  const lowestTotal = submitted.length
    ? Math.min(...submitted.map((v) => v.total ?? Infinity))
    : null;
  const awardedVendor = vendors.find((v) => v.quotationId === awardedQid) ?? null;

  // Column highlight: gold if awarded, else teal on the lowest.
  const colCls = (v: ComparisonVendor) => {
    if (isAwardedPhase) return v.quotationId === awardedQid ? 'cmp__awarded' : '';
    return v.submitted && v.total != null && v.total === lowestTotal
      ? 'cmp__win'
      : '';
  };
  const isLowest = (v: ComparisonVendor) =>
    !isAwardedPhase &&
    v.submitted &&
    v.total != null &&
    v.total === lowestTotal;

  // BRD: landed-cost breakdown by charge category.
  const CAT_ORDER = ['FREIGHT', 'ORIGIN', 'DESTINATION', 'LOCAL', 'OTHER'] as const;
  const CAT_LABEL: Record<string, string> = {
    FREIGHT: 'Freight subtotal',
    ORIGIN: 'Origin charges',
    DESTINATION: 'Destination charges',
    LOCAL: 'Local charges',
    OTHER: 'Other charges',
  };
  const activeCats = CAT_ORDER.filter((c) =>
    submitted.some((v) => v.categoryTotals?.[c] != null),
  );
  const anyHas = (fn: (v: ComparisonVendor) => unknown) => submitted.some(fn);
  const isSea = enquiry.mode === 'LCL' || enquiry.mode === 'FCL';

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space direction="vertical" size={4}>
          <Space wrap>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/app/enquiries/${id}`)}
            >
              Enquiry
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              Compare quotes
            </Title>
            <Tag color={STATUS_COLOR[enquiry.status]}>{enquiry.status}</Tag>
          </Space>
          <Text type="secondary">
            {enquiry.enquiryNo} · {enquiry.direction} ·{' '}
            {MODE_LABEL[enquiry.mode] ?? enquiry.mode} ·{' '}
            {enquiry.origin?.code ?? enquiry.origin?.name ?? '—'} →{' '}
            {enquiry.destination?.code ?? enquiry.destination?.name ?? '—'}
            {enquiry.chargeableWeight
              ? ` · CW ${enquiry.chargeableWeight} kg`
              : ''}
          </Text>
        </Space>
      </Card>

      <Card
        title={`Quote comparison (${submitted.length} of ${vendors.length} responded)`}
        extra={
          <Dropdown
            disabled={submitted.length === 0}
            menu={{
              items: [
                { key: 'csv', label: 'Download CSV' },
                { key: 'xlsx', label: 'Download Excel' },
                { key: 'pdf', label: 'Download PDF (branded)' },
              ],
              onClick: ({ key }) => {
                if (key === 'csv') {
                  downloadCsv(
                    `lprms-comparison-${enquiry.enquiryNo}.csv`,
                    ['Charge', ...vendors.map((v) => v.name)],
                    [
                      ...chargeTypes.map((ct) => [
                        ct.name,
                        ...vendors.map((v) =>
                          v.submitted && v.lines[ct.id] != null
                            ? v.lines[ct.id]
                            : '',
                        ),
                      ]),
                      ['Total', ...vendors.map((v) => (v.submitted ? v.total : ''))],
                      ['Transit (days)', ...vendors.map((v) => v.transitTimeDays ?? '')],
                      [
                        'Valid until',
                        ...vendors.map((v) =>
                          v.validUntil ? dayjs(v.validUntil).format('YYYY-MM-DD') : '',
                        ),
                      ],
                    ],
                  );
                } else if (key === 'xlsx') {
                  exportExcel(
                    `lprms-comparison-${enquiry.enquiryNo}.xlsx`,
                    enquiry.enquiryNo,
                    [
                      { header: 'Charge', key: 'charge', width: 26 },
                      ...vendors.map((v, i) => ({
                        header: v.name,
                        key: `v${i}`,
                        width: 18,
                        money: true,
                      })),
                    ],
                    [
                      ...chargeTypes.map((ct) => ({
                        charge: ct.name,
                        ...Object.fromEntries(
                          vendors.map((v, i) => [
                            `v${i}`,
                            v.submitted && v.lines[ct.id] != null
                              ? v.lines[ct.id]
                              : null,
                          ]),
                        ),
                      })),
                      {
                        charge: 'Total',
                        ...Object.fromEntries(
                          vendors.map((v, i) => [`v${i}`, v.submitted ? v.total : null]),
                        ),
                      },
                    ],
                  );
                } else if (key === 'pdf') {
                  exportComparisonPdf(data).catch(() =>
                    message.error('Could not generate PDF'),
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
        {submitted.length === 0 ? (
          <Empty description="No quotations submitted yet. Vendors' quotes will appear here as they respond." />
        ) : (
          <>
            {isAwardedPhase && awardedVendor ? (
              <Alert
                type="warning"
                showIcon
                icon={<TrophyOutlined />}
                style={{ marginBottom: 16 }}
                message={
                  <>
                    Awarded to <strong>{awardedVendor.name}</strong> at{' '}
                    <strong>
                      {money(awardedVendor.total, awardedVendor.currency)}
                    </strong>
                    . Confirmation sent to the winner; the others received blind
                    feedback (no rate or vendor disclosed).
                  </>
                }
              />
            ) : (
              lowestTotal != null && (
                <Alert
                  type="success"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message={
                    <>
                      Lowest total:{' '}
                      <strong>
                        {money(
                          lowestTotal,
                          submitted.find((v) => v.total === lowestTotal)
                            ?.currency,
                        )}
                      </strong>{' '}
                      from{' '}
                      <strong>
                        {submitted.find((v) => v.total === lowestTotal)?.name}
                      </strong>
                      . Award on total value, service and validity — not price
                      alone.
                    </>
                  }
                />
              )
            )}

            <div className="cmp__scroll">
              <table className="cmp">
                <thead>
                  <tr>
                    <th className="cmp__rowhead">Charge</th>
                    {vendors.map((v) => (
                      <th key={v.vendorId} className={colCls(v)}>
                        <div className="cmp__vendor-name">{v.name}</div>
                        <div className="cmp__vendor-sub">
                          {v.submitted
                            ? `${v.currency}${
                                v.transitTimeDays != null
                                  ? ` · ${v.transitTimeDays}d transit`
                                  : ''
                              }`
                            : 'awaiting quote'}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chargeTypes.map((ct) => (
                    <tr key={ct.id}>
                      <td className="cmp__rowhead">{ct.name}</td>
                      {vendors.map((v) => (
                        <td key={v.vendorId} className={`cmp__num ${colCls(v)}`}>
                          {v.submitted && v.lines[ct.id] != null ? (
                            money(v.lines[ct.id], v.currency)
                          ) : (
                            <span className="cmp__muted">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {activeCats.length > 1 &&
                    activeCats.map((cat) => (
                      <tr key={`cat-${cat}`} className="cmp__subtotal-row">
                        <td className="cmp__rowhead cmp__rowhead--sub">
                          {CAT_LABEL[cat]}
                        </td>
                        {vendors.map((v) => (
                          <td key={v.vendorId} className={`cmp__num ${colCls(v)}`}>
                            {v.submitted && v.categoryTotals?.[cat] != null ? (
                              money(v.categoryTotals[cat]!, v.currency)
                            ) : (
                              <span className="cmp__muted">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  <tr className="cmp__total-row">
                    <td className="cmp__rowhead">Total landed cost</td>
                    {vendors.map((v) => (
                      <td key={v.vendorId} className={`cmp__num ${colCls(v)}`}>
                        {v.submitted ? (
                          <>
                            {money(v.total, v.currency)}
                            {v.quotationId === awardedQid && (
                              <span className="cmp__awardtag">Awarded</span>
                            )}
                            {isLowest(v) && (
                              <span className="cmp__lowtag">Lowest</span>
                            )}
                          </>
                        ) : (
                          <span className="cmp__awaiting">Awaiting</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="cmp__rowhead">Valid until</td>
                    {vendors.map((v) => (
                      <td key={v.vendorId} className={colCls(v)}>
                        {v.validUntil
                          ? dayjs(v.validUntil).format('DD MMM YYYY')
                          : '—'}
                      </td>
                    ))}
                  </tr>
                  {anyHas((v) => v.rateType) && (
                    <tr>
                      <td className="cmp__rowhead">Rate type</td>
                      {vendors.map((v) => (
                        <td key={v.vendorId} className={colCls(v)}>
                          {v.rateType === 'CONTRACT' ? (
                            <Tag color="purple">Contract</Tag>
                          ) : v.rateType === 'SPOT' ? (
                            <Tag>Spot</Tag>
                          ) : (
                            '—'
                          )}
                        </td>
                      ))}
                    </tr>
                  )}
                  {anyHas((v) => v.shippingLine) && (
                    <tr>
                      <td className="cmp__rowhead">{isSea ? 'Shipping line' : 'Airline'}</td>
                      {vendors.map((v) => (
                        <td key={v.vendorId} className={colCls(v)}>
                          {v.shippingLine ?? '—'}
                          {v.vesselName ? ` · ${v.vesselName}` : ''}
                        </td>
                      ))}
                    </tr>
                  )}
                  {anyHas((v) => v.etd || v.eta) && (
                    <tr>
                      <td className="cmp__rowhead">ETD → ETA</td>
                      {vendors.map((v) => (
                        <td key={v.vendorId} className={colCls(v)}>
                          {v.etd ? dayjs(v.etd).format('DD MMM') : '—'}
                          {' → '}
                          {v.eta ? dayjs(v.eta).format('DD MMM') : '—'}
                          {v.transshipments != null
                            ? ` · ${v.transshipments} T/S`
                            : ''}
                        </td>
                      ))}
                    </tr>
                  )}
                  {anyHas(
                    (v) =>
                      v.freeDetentionOriginDays != null ||
                      v.freeDetentionDestDays != null ||
                      v.freeDemurrageDestDays != null,
                  ) && (
                    <tr>
                      <td className="cmp__rowhead">Free days (det/dem)</td>
                      {vendors.map((v) => {
                        const parts = [
                          v.freeDetentionOriginDays,
                          v.freeDetentionDestDays,
                          v.freeDemurrageDestDays,
                        ];
                        const has = parts.some((p) => p != null);
                        return (
                          <td key={v.vendorId} className={colCls(v)}>
                            {has
                              ? parts.map((p) => (p == null ? '—' : `${p}d`)).join(' / ')
                              : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                  {!isAwardedPhase && (
                    <tr>
                      <td className="cmp__rowhead">Decision</td>
                      {vendors.map((v) => (
                        <td
                          key={v.vendorId}
                          className={`cmp__decision-cell ${colCls(v)}`}
                          style={{ textAlign: 'right' }}
                        >
                          {v.submitted ? (
                            <Button
                              size="small"
                              type={isLowest(v) ? 'primary' : 'default'}
                              icon={<TrophyOutlined />}
                              onClick={() => setAwardTarget(v)}
                            >
                              Award
                            </Button>
                          ) : (
                            <span className="cmp__muted">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card title="Previous rates on this lane">
        {history.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No previous shipments recorded on this route and mode yet. Awarded shipments show here for benchmarking."
          />
        ) : (
          <Table
            rowKey={(_, i) => String(i)}
            dataSource={history}
            pagination={false}
            columns={[
              { title: 'Vendor', dataIndex: 'vendor' },
              {
                title: 'Rate',
                dataIndex: 'amount',
                align: 'right',
                render: (v: number | null, r) => money(v, r.currency ?? 'INR'),
              },
              {
                title: 'Awarded',
                dataIndex: 'awardedAt',
                render: (v: string) => dayjs(v).format('DD MMM YYYY'),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        title={`Award to ${awardTarget?.name ?? ''}`}
        open={Boolean(awardTarget)}
        onCancel={() => setAwardTarget(null)}
        onOk={() => awardTarget && awardMut.mutate(awardTarget)}
        confirmLoading={awardMut.isPending}
        okText="Confirm award"
      >
        <p>
          Awarding{' '}
          <strong>{money(awardTarget?.total ?? null, awardTarget?.currency)}</strong>{' '}
          to <strong>{awardTarget?.name}</strong>. The winner gets a
          confirmation; other vendors get generic feedback with no rate or
          vendor disclosed. This can’t be undone.
        </p>
        <label
          style={{ display: 'block', marginBottom: 6, color: '#64788c' }}
        >
          Reason for award (recorded for audit)
        </label>
        <Input.TextArea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Best total with acceptable transit time and valid rates."
        />
      </Modal>
    </Space>
  );
}
