import { useMemo, useState } from 'react';
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
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {CARRIERS.map((carrier) =>
                  results[carrier] ? (
                    <CarrierResult key={carrier} carrier={carrier} result={results[carrier]!} />
                  ) : (
                    <Alert
                      key={carrier}
                      type="warning"
                      showIcon
                      message={`${CARRIER_LABEL[carrier]}: ${errors[carrier] ?? 'No quote'}`}
                    />
                  ),
                )}
              </Space>
            )}
          </Col>
        </Row>
      )}
    </div>
  );
}

function CarrierResult({ carrier, result }: { carrier: CourierCarrier; result: ExportCalcResult }) {
  return (
    <div className="calc__result">
      <div className="calc__carrier">
        {CARRIER_LABEL[carrier]}
        <span className="calc__carrier-dest">· {result.country}</span>
      </div>
      <div className="calc__total">
        <div className="calc__cols">
          <div className="calc__col calc__col--cost">
            <div className="calc__total-label">Our cost (all-in)</div>
            <div className="calc__cost-value">{money(result.cost.inr)}</div>
            <div className="calc__pills">
              <span className="calc__pill">{money(result.cost.usd, 'usd')}</span>
              <span className="calc__pill">{money(result.cost.gbp, 'gbp')}</span>
              <span className="calc__pill">{money(result.cost.eur, 'eur')}</span>
            </div>
          </div>
          <div className="calc__col">
            <div className="calc__total-label">Quote to customer · ex-GST</div>
            <div className="calc__total-value">{money(result.selling.inr)}</div>
            <div className="calc__pills">
              <span className="calc__pill">{money(result.selling.usd, 'usd')}</span>
              <span className="calc__pill">{money(result.selling.gbp, 'gbp')}</span>
              <span className="calc__pill">{money(result.selling.eur, 'eur')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="calc__meta">
        <span className="calc__chip">
          Boxes <b>{result.boxes}</b>
        </span>
        <span className="calc__chip">
          Zone <b>{result.zone}</b>
        </span>
        <span className="calc__chip">
          Chargeable <b>{result.chargeableWeightKg} kg</b>
        </span>
        <span className="calc__chip">
          Billed <b>{result.billedWeightKg} kg</b>
        </span>
        <span className="calc__chip">
          {result.regime === 'PERKG' ? 'Per-kg (heavy)' : 'Flat slab'}
        </span>
      </div>

      <div className="calc__rows">
        <Row>
          <Col xs={24} sm={12} style={{ paddingRight: 16 }}>
            <div className="calc__row">
              <span className="calc__row-label">Actual weight</span>
              <span className="calc__row-value">{result.actualWeightKg} kg</span>
            </div>
            <div className="calc__row">
              <span className="calc__row-label">Volumetric</span>
              <span className="calc__row-value">{result.volumetricWeightKg} kg</span>
            </div>
            <div className="calc__row">
              <span className="calc__row-label">Base rate</span>
              <span className="calc__row-value">{money(result.breakdown.base)}</span>
            </div>
            <div className="calc__row">
              <span className="calc__row-label">Rate / kg</span>
              <span className="calc__row-value">{money(result.breakdown.ratePerKg)}</span>
            </div>
          </Col>
          <Col xs={24} sm={12} style={{ paddingLeft: 16 }}>
            <div className="calc__row">
              <span className="calc__row-label">Surcharge / kg</span>
              <span className="calc__row-value">{money(result.breakdown.surchargePerKg)}</span>
            </div>
            <div className="calc__row">
              <span className="calc__row-label">Fuel ({Math.round(result.breakdown.fuelPct * 100)}%)</span>
              <span className="calc__row-value">{money(result.breakdown.fuelPerKg)} /kg</span>
            </div>
            <div className="calc__row">
              <span className="calc__row-label">Subtotal / kg</span>
              <span className="calc__row-value">{money(result.breakdown.subtotalPerKg)}</span>
            </div>
            <div className="calc__row">
              <span className="calc__row-label">Margin</span>
              <span className="calc__row-value">×{result.breakdown.marginX}</span>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
}
