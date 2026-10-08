import { useMemo, useState } from 'react';
import {
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
  message,
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

const SYMBOL: Record<string, string> = { inr: '₹', usd: '$', gbp: '£', eur: '€' };
const money = (v: number, cur: keyof typeof SYMBOL = 'inr') =>
  `${SYMBOL[cur]}${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CalculatorPage() {
  const [carrier, setCarrier] = useState<CourierCarrier>('DHL');
  const [results, setResults] = useState<Partial<Record<CourierCarrier, ExportCalcResult>>>({});
  const result = results[carrier] ?? null;
  const [form] = Form.useForm();
  const { data: me } = useSession();
  const showSettings = canManage(me?.role);

  const { data: countries, isLoading } = useQuery({
    queryKey: ['rateCardCountries', carrier],
    queryFn: () => listRateCardCountries(carrier),
  });
  const hasCard = (countries?.length ?? 0) > 0;

  const clearAll = () => {
    form.resetFields();
    setResults((prev) => ({ ...prev, [carrier]: undefined }));
  };

  const calcMut = useMutation({
    mutationFn: (v: Record<string, unknown>) =>
      exportCalculate({
        carrier,
        country: v.country as string,
        unit: (v.unit as 'cm' | 'in') ?? 'cm',
        lengthCm: v.lengthCm as number | undefined,
        widthCm: v.widthCm as number | undefined,
        heightCm: v.heightCm as number | undefined,
        actualWeightKg: v.actualWeightKg as number | undefined,
        boxes: v.boxes as number | undefined,
      }),
    onSuccess: (res) => setResults((prev) => ({ ...prev, [carrier]: res })),
    onError: (err: unknown) => {
      const m =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not calculate';
      message.error(m);
    },
  });

  const countryOptions = useMemo(
    () =>
      (countries ?? []).map((c) => ({ label: `${c.country} · Zone ${c.zone}`, value: c.country })),
    [countries],
  );

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
            Chargeable weight = greater of actual and volumetric.
          </Text>
        </div>
        <Space>
          <Segmented
            className="calc__seg"
            size="large"
            value={carrier}
            onChange={(v) => setCarrier(v as CourierCarrier)}
            options={[
              { value: 'DHL', label: <b style={{ fontSize: 16 }}>DHL</b> },
              { value: 'FEDEX', label: <b style={{ fontSize: 16 }}>FedEx</b> },
            ]}
          />
          {showSettings && (
            <Link to="/app/courier/rate-cards">
              <Button icon={<SettingOutlined />}>Rate cards</Button>
            </Link>
          )}
        </Space>
      </Space>

      {!hasCard ? (
        <div className="calc__empty">
          <div>
            <Text type="secondary">
              {showSettings
                ? `No ${carrier} rate card loaded yet.`
                : `${carrier} rates are not available yet. Please contact your manager.`}
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
            <Card size="small" title={`${carrier} shipment`}>
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
                    <Form.Item
                      label="L"
                      name="lengthCm"
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <InputNumber min={0.1} style={{ width: '100%' }} placeholder="L" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label="W"
                      name="widthCm"
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <InputNumber min={0.1} style={{ width: '100%' }} placeholder="W" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label="H"
                      name="heightCm"
                      rules={[{ required: true, message: 'Required' }]}
                    >
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
                    Calculate
                  </Button>
                  <Button icon={<ClearOutlined />} onClick={clearAll}>
                    Clear
                  </Button>
                </Space>
              </Form>
            </Card>
          </Col>

          {/* ── Result (beside inputs) ── */}
          <Col xs={24} md={15}>
            {result ? (
              <div className="calc__result">
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
                  <Row gutter={[0, 0]}>
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
                        <span className="calc__row-label">
                          Fuel ({Math.round(result.breakdown.fuelPct * 100)}%)
                        </span>
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
            ) : (
              <div className="calc__empty">
                <Text type="secondary">
                  Enter shipment details and hit <b>Calculate</b> to see the {carrier} quote here.
                </Text>
              </div>
            )}
          </Col>
        </Row>
      )}
    </div>
  );
}
