import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  InputNumber,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Typography,
  Upload,
  message,
} from 'antd';
import { CalculatorOutlined, UploadOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  importRateCards,
  listRateCards,
  updateRateCard,
  type CourierCarrier,
  type CourierFuelOrder,
} from '../../api/client';

const { Title, Text } = Typography;

export default function RateCardsPage() {
  const qc = useQueryClient();
  const [carrier, setCarrier] = useState<CourierCarrier>('DHL');
  const [cfgForm] = Form.useForm();

  const { data: cards, isLoading } = useQuery({ queryKey: ['rateCards'], queryFn: listRateCards });
  const card = cards?.find((c) => c.carrier === carrier);

  useEffect(() => {
    if (card) {
      cfgForm.setFieldsValue({
        fuelOrder: card.fuelOrder,
        volumetricDivisorCm: card.volumetricDivisorCm,
        volumetricDivisorIn: card.volumetricDivisorIn,
        flatMaxWeightKg: card.flatMaxWeightKg,
        surchargePerKg: card.surchargePerKg,
        fuelPctDisplay: card.fuelPct * 100,
        gstPctDisplay: card.gstPct * 100,
        marginX: card.marginX,
        usdRate: card.usdRate,
        gbpRate: card.gbpRate,
        eurRate: card.eurRate,
      });
    }
  }, [card, cfgForm]);

  const importMut = useMutation({
    mutationFn: (file: File) => importRateCards(file),
    onSuccess: (res) => {
      const s = res.imported.map((i) => `${i.carrier}: ${i.countries} countries`).join(', ');
      message.success(`Imported — ${s}`);
      qc.invalidateQueries({ queryKey: ['rateCards'] });
      qc.invalidateQueries({ queryKey: ['rateCardCountries'] });
    },
    onError: () => message.error('Import failed — check the workbook format.'),
  });

  const cfgMut = useMutation({
    mutationFn: (v: Record<string, number | string>) =>
      updateRateCard(carrier, {
        fuelOrder: v.fuelOrder as CourierFuelOrder,
        volumetricDivisorCm: v.volumetricDivisorCm as number,
        volumetricDivisorIn: v.volumetricDivisorIn as number,
        flatMaxWeightKg: v.flatMaxWeightKg as number,
        surchargePerKg: v.surchargePerKg as number,
        fuelPct: (v.fuelPctDisplay as number) / 100,
        gstPct: (v.gstPctDisplay as number) / 100,
        marginX: v.marginX as number,
        usdRate: v.usdRate as number,
        gbpRate: v.gbpRate as number,
        eurRate: v.eurRate as number,
      }),
    onSuccess: () => {
      message.success('Rate card settings saved');
      qc.invalidateQueries({ queryKey: ['rateCards'] });
    },
    onError: () => message.error('Could not save settings'),
  });

  if (isLoading) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start" wrap>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Courier Rate Cards
          </Title>
          <Text type="secondary">
            Upload the DHL/FedEx export rate workbook and tune the pricing factors. Rates change over
            time — re-upload to refresh zones &amp; prices; your settings are kept.
          </Text>
        </div>
        <Space>
          <Upload
            showUploadList={false}
            accept=".xlsx"
            beforeUpload={(f) => {
              importMut.mutate(f as File);
              return false;
            }}
          >
            <Button type="primary" icon={<UploadOutlined />} loading={importMut.isPending}>
              Upload rate card (.xlsx)
            </Button>
          </Upload>
          <Link to="/app/courier/calculator">
            <Button icon={<CalculatorOutlined />}>Open calculator</Button>
          </Link>
        </Space>
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

      {!card ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={`No ${carrier} rate card loaded. Upload the workbook (DHL/FedEx zone lists & price matrices) to begin.`}
          />
        </Card>
      ) : (
        <Card
          title={`${carrier} settings`}
          extra={
            <Text type="secondary">
              {card.countries} countries · {card.rateRows} rate rows · updated{' '}
              {new Date(card.updatedAt).toLocaleDateString()}
            </Text>
          }
        >
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Fuel order sets how surcharge & fuel combine per kg. DHL = (rate + surcharge) × (1 + fuel); FedEx = rate × (1 + fuel) + surcharge."
          />
          <Form
            form={cfgForm}
            layout="vertical"
            onFinish={(v) => cfgMut.mutate(v)}
            style={{ maxWidth: 820 }}
          >
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label="Fuel application order" name="fuelOrder">
                  <Select
                    options={[
                      { label: 'Surcharge then fuel (DHL): (rate + surcharge) × (1 + fuel)', value: 'SURCHARGE_THEN_FUEL' },
                      { label: 'Fuel then surcharge (FedEx): rate × (1 + fuel) + surcharge', value: 'FUEL_THEN_SURCHARGE' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Item label="Flat max wt (kg)" name="flatMaxWeightKg">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Item label="Surcharge / kg (₹)" name="surchargePerKg">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={12} sm={6}>
                <Form.Item label="Volumetric ÷ (cm)" name="volumetricDivisorCm">
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Item label="Volumetric ÷ (inch)" name="volumetricDivisorIn">
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={8} sm={4}>
                <Form.Item label="Fuel %" name="fuelPctDisplay">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={8} sm={4}>
                <Form.Item label="GST %" name="gstPctDisplay">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={8} sm={4}>
                <Form.Item label="Margin ×" name="marginX">
                  <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Divider orientation="left" plain style={{ margin: '4px 0 12px' }}>
              Currency rates (₹ per unit, defined by us)
            </Divider>
            <Row gutter={16}>
              <Col xs={8} sm={4}>
                <Form.Item label="USD" name="usdRate">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={8} sm={4}>
                <Form.Item label="GBP" name="gbpRate">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={8} sm={4}>
                <Form.Item label="EUR" name="eurRate">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Button type="primary" htmlType="submit" loading={cfgMut.isPending}>
              Save settings
            </Button>
          </Form>
        </Card>
      )}
    </Space>
  );
}
