import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Form,
  InputNumber,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
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

const { Title, Text } = Typography;

const SYMBOL: Record<string, string> = { inr: '₹', usd: '$', gbp: '£', eur: '€' };
const money = (v: number, cur: keyof typeof SYMBOL = 'inr') =>
  `${SYMBOL[cur]}${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CalculatorPage() {
  const [carrier, setCarrier] = useState<CourierCarrier>('DHL');
  const [result, setResult] = useState<ExportCalcResult | null>(null);
  const [form] = Form.useForm();
  const { data: me } = useSession();
  const showSettings = canManage(me?.role);

  // Availability is inferred from the country list (Logistics can't read rate cards).
  const { data: countries, isLoading } = useQuery({
    queryKey: ['rateCardCountries', carrier],
    queryFn: () => listRateCardCountries(carrier),
  });
  const hasCard = (countries?.length ?? 0) > 0;

  // Keep the entered data & result when switching carriers; the user clears
  // manually via the Clear button.
  const clearAll = () => {
    form.resetFields();
    setResult(null);
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
      }),
    onSuccess: setResult,
    onError: (err: unknown) => {
      const m =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not calculate';
      message.error(m);
    },
  });

  const countryOptions = useMemo(
    () =>
      (countries ?? []).map((c) => ({
        label: `${c.country} · Zone ${c.zone}`,
        value: c.country,
      })),
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
    <Space direction="vertical" size={16} style={{ width: '100%', maxWidth: 760 }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start" wrap>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Export Courier Calculator
          </Title>
          <Text type="secondary">
            DHL &amp; FedEx export rates. Chargeable weight = the greater of actual and volumetric weight.
          </Text>
        </div>
        {showSettings && (
          <Link to="/app/courier/rate-cards">
            <Button icon={<SettingOutlined />}>Rate cards &amp; settings</Button>
          </Link>
        )}
      </Space>

      <Segmented
        options={[
          { label: 'DHL', value: 'DHL' },
          { label: 'FedEx', value: 'FEDEX' },
        ]}
        value={carrier}
        onChange={(v) => setCarrier(v as CourierCarrier)}
        size="large"
      />

      {!hasCard ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              showSettings
                ? `No ${carrier} rate card loaded yet.`
                : `${carrier} rates are not available yet. Please contact your manager.`
            }
          >
            {showSettings && (
              <Link to="/app/courier/rate-cards">
                <Button type="primary">Go to Rate Cards to upload</Button>
              </Link>
            )}
          </Empty>
        </Card>
      ) : (
        <Card title={`${carrier} export quote`}>
          <Form
            form={form}
            layout="vertical"
            initialValues={{ unit: 'cm' }}
            onFinish={(v) => calcMut.mutate(v)}
          >
            <Form.Item
              label="Destination country"
              name="country"
              rules={[{ required: true, message: 'Pick a country' }]}
            >
              <Select
                showSearch
                placeholder="Type a few letters…"
                optionFilterProp="label"
                options={countryOptions}
              />
            </Form.Item>

            <Form.Item label="Dimension unit" name="unit">
              <Segmented
                options={[
                  { label: 'Centimetres', value: 'cm' },
                  { label: 'Inches', value: 'in' },
                ]}
              />
            </Form.Item>

            <Row gutter={12}>
              <Col span={6}>
                <Form.Item label="Length" name="lengthCm">
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="L" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="Width" name="widthCm">
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="W" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="Height" name="heightCm">
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="H" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="Actual wt (kg)" name="actualWeightKg">
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="kg" />
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

          {result && (
            <>
              <Divider />
              <Row gutter={16} align="middle">
                <Col xs={24} sm={12}>
                  <Statistic
                    title={`Grand total (incl. ${Math.round(result.breakdown.gstPct * 100)}% GST)`}
                    value={money(result.grandTotal.inr)}
                  />
                  <Text type="secondary">
                    Selling {money(result.selling.inr)} + GST {money(result.breakdown.gstAmount)}
                  </Text>
                </Col>
                <Col xs={24} sm={12}>
                  <Space wrap>
                    <Tag color="magenta">{money(result.grandTotal.usd, 'usd')}</Tag>
                    <Tag color="volcano">{money(result.grandTotal.gbp, 'gbp')}</Tag>
                    <Tag color="gold">{money(result.grandTotal.eur, 'eur')}</Tag>
                  </Space>
                </Col>
              </Row>

              <Descriptions style={{ marginTop: 16 }} size="small" column={{ xs: 1, sm: 2 }} bordered>
                <Descriptions.Item label="Zone">{result.zone}</Descriptions.Item>
                <Descriptions.Item label="Regime">
                  {result.regime === 'PERKG' ? 'Per-kg (heavy)' : 'Flat slab'}
                </Descriptions.Item>
                <Descriptions.Item label="Actual weight">{result.actualWeightKg} kg</Descriptions.Item>
                <Descriptions.Item label="Volumetric weight">
                  {result.volumetricWeightKg} kg
                </Descriptions.Item>
                <Descriptions.Item label="Chargeable weight">
                  <b>{result.chargeableWeightKg} kg</b>
                </Descriptions.Item>
                <Descriptions.Item label="Billed weight">{result.billedWeightKg} kg</Descriptions.Item>
                <Descriptions.Item label="Base rate">{money(result.breakdown.base)}</Descriptions.Item>
                <Descriptions.Item label="Rate / kg">{money(result.breakdown.ratePerKg)}</Descriptions.Item>
                <Descriptions.Item label="Surcharge / kg">
                  {money(result.breakdown.surchargePerKg)}
                </Descriptions.Item>
                <Descriptions.Item label={`Fuel (${Math.round(result.breakdown.fuelPct * 100)}%)`}>
                  {money(result.breakdown.fuelPerKg)} / kg
                </Descriptions.Item>
                <Descriptions.Item label="Cost to us">{money(result.breakdown.costToUs)}</Descriptions.Item>
                <Descriptions.Item label={`Margin ×${result.breakdown.marginX}`}>
                  {money(result.breakdown.sellingInr)}
                </Descriptions.Item>
              </Descriptions>
            </>
          )}
        </Card>
      )}
    </Space>
  );
}
