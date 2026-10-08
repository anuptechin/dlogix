import { Fragment, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  InputNumber,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd';
import { CalculatorOutlined, ClearOutlined, SettingOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  exportCalculate,
  listRateCardCountries,
  type CourierCarrier,
  type ExportCalcResult,
} from '../../api/client';
import { useSession, canManage } from '../../auth/useSession';
import './calculator.css';

const { Title, Text } = Typography;

const CARRIERS: CourierCarrier[] = ['DHL', 'FEDEX'];
const CARRIER_LABEL: Record<CourierCarrier, string> = { DHL: 'DHL', FEDEX: 'FedEx' };

const SYMBOL: Record<string, string> = { inr: '₹', usd: '$', gbp: '£', eur: '€' };
const money = (v: number, cur: keyof typeof SYMBOL = 'inr') =>
  `${SYMBOL[cur]}${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const errMsg = (err: unknown) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
  'Could not calculate';

export default function CalculatorPage() {
  const [results, setResults] = useState<Partial<Record<CourierCarrier, ExportCalcResult>>>({});
  const [errors, setErrors] = useState<Partial<Record<CourierCarrier, string>>>({});
  const [calculated, setCalculated] = useState(false);
  const [form] = Form.useForm();
  const { data: me } = useSession();
  const showSettings = canManage(me?.role);

  // Country lists for both carriers (Logistics can't read the rate cards themselves).
  const dhl = useQuery({ queryKey: ['rateCardCountries', 'DHL'], queryFn: () => listRateCardCountries('DHL') });
  const fedex = useQuery({ queryKey: ['rateCardCountries', 'FEDEX'], queryFn: () => listRateCardCountries('FEDEX') });
  const isLoading = dhl.isLoading || fedex.isLoading;

  // Union of countries from either carrier.
  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    (dhl.data ?? []).forEach((c) => set.add(c.country));
    (fedex.data ?? []).forEach((c) => set.add(c.country));
    return [...set].sort((a, b) => a.localeCompare(b)).map((c) => ({ label: c, value: c }));
  }, [dhl.data, fedex.data]);
  const hasCards = countryOptions.length > 0;

  const clearAll = () => {
    form.resetFields();
    setResults({});
    setErrors({});
    setCalculated(false);
  };

  const calcMut = useMutation({
    mutationFn: async (v: Record<string, unknown>) => {
      const base = {
        country: v.country as string,
        unit: (v.unit as 'cm' | 'in') ?? 'cm',
        lengthCm: v.lengthCm as number | undefined,
        widthCm: v.widthCm as number | undefined,
        heightCm: v.heightCm as number | undefined,
        actualWeightKg: v.actualWeightKg as number | undefined,
        boxes: v.boxes as number | undefined,
      };
      const settled = await Promise.allSettled(
        CARRIERS.map((carrier) => exportCalculate({ carrier, ...base })),
      );
      return settled;
    },
    onSuccess: (settled) => {
      const r: Partial<Record<CourierCarrier, ExportCalcResult>> = {};
      const e: Partial<Record<CourierCarrier, string>> = {};
      settled.forEach((s, i) => {
        const carrier = CARRIERS[i];
        if (s.status === 'fulfilled') r[carrier] = s.value;
        else e[carrier] = errMsg(s.reason);
      });
      setResults(r);
      setErrors(e);
      setCalculated(true);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  return (
    <div className="calc">
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }} align="center" wrap>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Export Courier Calculator
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            DHL &amp; FedEx side by side. Chargeable weight = greater of actual and volumetric.
          </Text>
        </div>
        {showSettings && (
          <Link to="/app/courier/rate-cards">
            <Button icon={<SettingOutlined />}>Rate cards</Button>
          </Link>
        )}
      </Space>

      {!hasCards ? (
        <div className="calc__empty">
          <div>
            <Text type="secondary">
              {showSettings
                ? 'No rate cards loaded yet.'
                : 'Courier rates are not available yet. Please contact your manager.'}
            </Text>
            {showSettings && (
              <div style={{ marginTop: 12 }}>
                <Link to="/app/courier/rate-cards">
                  <Button type="primary">Go to Rate Cards to upload</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {/* ── Inputs ── */}
          <Col xs={24} md={9}>
            <Card size="small" title="Shipment">
              <Form
                form={form}
                layout="vertical"
                initialValues={{ unit: 'cm', boxes: 1 }}
                onFinish={(v) => calcMut.mutate(v)}
              >
                <Form.Item
                  label="Destination"
                  name="country"
                  rules={[{ required: true, message: 'Pick a country' }]}
                  style={{ marginBottom: 12 }}
                >
                  <Select
                    showSearch
                    placeholder="Type a country…"
                    optionFilterProp="label"
                    options={countryOptions}
                  />
                </Form.Item>

                <Form.Item label="Unit" name="unit" style={{ marginBottom: 12 }}>
                  <Segmented
                    options={[
                      { label: 'cm', value: 'cm' },
                      { label: 'inch', value: 'in' },
                    ]}
                  />
                </Form.Item>

                <Row gutter={8}>
                  <Col span={8}>
                    <Form.Item label="L" name="lengthCm" rules={[{ required: true, message: 'Required' }]}>
                      <InputNumber min={0.1} style={{ width: '100%' }} placeholder="L" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="W" name="widthCm" rules={[{ required: true, message: 'Required' }]}>
                      <InputNumber min={0.1} style={{ width: '100%' }} placeholder="W" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="H" name="heightCm" rules={[{ required: true, message: 'Required' }]}>
                      <InputNumber min={0.1} style={{ width: '100%' }} placeholder="H" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={8}>
                  <Col span={12}>
                    <Form.Item label="Actual wt / box (kg)" name="actualWeightKg" style={{ marginBottom: 16 }}>
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="kg" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="No. of boxes" name="boxes" style={{ marginBottom: 16 }}>
                      <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="1" />
                    </Form.Item>
                  </Col>
                </Row>

                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<CalculatorOutlined />}
                    loading={calcMut.isPending}
                  >
                    Calculate both
                  </Button>
                  <Button icon={<ClearOutlined />} onClick={clearAll}>
                    Clear
                  </Button>
                </Space>
              </Form>
            </Card>
          </Col>

          {/* ── Results: DHL + FedEx stacked ── */}
          <Col xs={24} md={15}>
            {!calculated ? (
              <div className="calc__empty">
                <Text type="secondary">
                  Enter shipment details and hit <b>Calculate both</b> to compare DHL and FedEx here.
                </Text>
              </div>
            ) : (
              <Comparison results={results} errors={errors} />
            )}
          </Col>
        </Row>
      )}
    </div>
  );
}

type Row = { section: string } | { label: string; val: (r: ExportCalcResult) => string; money?: boolean };

const ROWS: Row[] = [
  { section: 'Quote to customer · ex-GST' },
  { label: 'INR', val: (r) => money(r.selling.inr), money: true },
  { label: 'USD', val: (r) => money(r.selling.usd, 'usd') },
  { label: 'GBP', val: (r) => money(r.selling.gbp, 'gbp') },
  { label: 'EUR', val: (r) => money(r.selling.eur, 'eur') },
  { section: 'Shipment' },
  { label: 'Zone', val: (r) => r.zone },
  { label: 'Actual weight', val: (r) => `${r.actualWeightKg} kg` },
  { label: 'Volumetric', val: (r) => `${r.volumetricWeightKg} kg` },
  { label: 'Chargeable wt', val: (r) => `${r.chargeableWeightKg} kg` },
  { label: 'Billed wt', val: (r) => `${r.billedWeightKg} kg` },
  { label: 'Regime', val: (r) => (r.regime === 'PERKG' ? 'Per-kg (heavy)' : 'Flat slab') },
  { section: 'Our cost (all-in)' },
  { label: 'INR', val: (r) => money(r.cost.inr) },
  { label: 'USD', val: (r) => money(r.cost.usd, 'usd') },
  { label: 'GBP', val: (r) => money(r.cost.gbp, 'gbp') },
  { label: 'EUR', val: (r) => money(r.cost.eur, 'eur') },
  { section: 'Rate build-up' },
  { label: 'Base rate', val: (r) => money(r.breakdown.base) },
  { label: 'Rate / kg', val: (r) => money(r.breakdown.ratePerKg) },
  { label: 'Surcharge / kg', val: (r) => money(r.breakdown.surchargePerKg) },
  {
    label: 'Fuel',
    val: (r) => `${money(r.breakdown.fuelPerKg)} /kg · ${Math.round(r.breakdown.fuelPct * 100)}%`,
  },
  { label: 'Subtotal / kg', val: (r) => money(r.breakdown.subtotalPerKg) },
  { label: 'Margin', val: (r) => `×${r.breakdown.marginX}` },
];

function Comparison({
  results,
  errors,
}: {
  results: Partial<Record<CourierCarrier, ExportCalcResult>>;
  errors: Partial<Record<CourierCarrier, string>>;
}) {
  const any = results.DHL ?? results.FEDEX;
  if (!any) {
    return (
      <Alert
        type="warning"
        showIcon
        message="No quote for either carrier"
        description={CARRIERS.map((c) => `${CARRIER_LABEL[c]}: ${errors[c] ?? '—'}`).join('  ·  ')}
      />
    );
  }

  // Cheaper customer quote (INR) wins the highlight.
  const bestCarrier: CourierCarrier | null =
    results.DHL && results.FEDEX
      ? results.DHL.selling.inr <= results.FEDEX.selling.inr
        ? 'DHL'
        : 'FEDEX'
      : (results.DHL && 'DHL') || (results.FEDEX && 'FEDEX') || null;

  return (
    <div className="cmp">
      <div className="cmp__head">
        <span className="cmp__dest">{any.country}</span>
        <span className="cmp__sub">
          {any.boxes} box{any.boxes > 1 ? 'es' : ''} · {any.chargeableWeightKg} kg chargeable
        </span>
      </div>

      <div className="cmp__grid">
        <div className="cmp__cell cmp__corner" />
        {CARRIERS.map((c) => (
          <div key={c} className="cmp__cell cmp__carhead">
            {CARRIER_LABEL[c]}
            {!results[c] && <span className="cmp__na"> · n/a</span>}
            {results[c] && bestCarrier === c && <span className="cmp__badge">cheapest</span>}
          </div>
        ))}

        {ROWS.map((row, i) =>
          'section' in row ? (
            <div key={`s${i}`} className="cmp__cell cmp__section">
              {row.section}
            </div>
          ) : (
            <Fragment key={`r${i}`}>
              <div className="cmp__cell cmp__label">{row.label}</div>
              {CARRIERS.map((c) => {
                const r = results[c];
                const best = row.money && bestCarrier === c;
                return (
                  <div
                    key={c}
                    className={`cmp__cell cmp__val${best ? ' cmp__val--best' : ''}`}
                  >
                    {r ? row.val(r) : '—'}
                  </div>
                );
              })}
            </Fragment>
          ),
        )}
      </div>
    </div>
  );
}
