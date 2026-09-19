import { useState } from 'react';
import { Alert, Card, Col, Row, Select, Statistic, Tag, Typography } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  calculateCourier,
  courierZones,
  listCourierContracts,
} from '../../api/client';

const { Text } = Typography;

const SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ' };
const money = (v: number, cur = 'INR') =>
  `${SYMBOL[cur] ?? cur + ' '}${v.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function AirVsCourierPanel({
  chargeableWeight,
  benchmarkTotal,
  benchmarkCurrency = 'INR',
  benchmarkLabel,
}: {
  chargeableWeight?: number | null;
  benchmarkTotal: number | null;
  benchmarkCurrency?: string;
  benchmarkLabel?: string;
}) {
  const [contractId, setContractId] = useState<string>();
  const [zone, setZone] = useState<string>();

  const { data: contracts } = useQuery({
    queryKey: ['courier-contracts', 'active'],
    queryFn: () => listCourierContracts(true),
  });
  const { data: zones } = useQuery({
    queryKey: ['courier-zones', contractId],
    queryFn: () => courierZones(contractId!),
    enabled: Boolean(contractId),
  });

  const enabled = Boolean(contractId && zone && chargeableWeight);
  const { data: result, isFetching, isError } = useQuery({
    queryKey: ['courier-calc', contractId, zone, chargeableWeight],
    queryFn: () =>
      calculateCourier({
        contractId: contractId!,
        destinationZone: zone!,
        weightKg: chargeableWeight!,
      }),
    enabled,
    retry: false,
  });

  const diff =
    result && benchmarkTotal != null ? benchmarkTotal - result.total : null;

  return (
    <Card
      title={
        <>
          <SwapOutlined /> Air vs Courier
        </>
      }
    >
      {!chargeableWeight ? (
        <Alert
          type="info"
          showIcon
          message="Add a chargeable weight to this enquiry to compare against courier rates."
        />
      ) : (
        <>
          <Text type="secondary">
            Cost this shipment against a contracted courier rate card for its
            chargeable weight ({chargeableWeight} kg).
          </Text>
          <Row gutter={12} style={{ marginTop: 12 }}>
            <Col xs={24} sm={12}>
              <Select
                style={{ width: '100%' }}
                placeholder="Courier rate card"
                value={contractId}
                onChange={(v) => {
                  setContractId(v);
                  setZone(undefined);
                }}
                options={(contracts ?? []).map((c) => ({
                  label: `${c.serviceName} — ${c.vendor.name}`,
                  value: c.id,
                }))}
              />
            </Col>
            <Col xs={24} sm={12}>
              <Select
                style={{ width: '100%' }}
                placeholder={contractId ? 'Destination zone' : 'Pick a card first'}
                disabled={!contractId}
                value={zone}
                onChange={setZone}
                options={(zones ?? []).map((z) => ({ label: z, value: z }))}
              />
            </Col>
          </Row>

          {isError && (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 14 }}
              message="No courier slab covers that zone/weight on this rate card."
            />
          )}

          {result && !isError && (
            <div style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Courier cost"
                    value={money(result.total, result.currency)}
                    valueStyle={{ color: '#1e7fe6', fontWeight: 700 }}
                    loading={isFetching}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Transit"
                    value={
                      result.transitDays != null
                        ? `${result.transitDays} days`
                        : '—'
                    }
                  />
                </Col>
              </Row>
              {benchmarkTotal != null && diff != null && (
                <Alert
                  style={{ marginTop: 14 }}
                  type={diff > 0 ? 'success' : 'warning'}
                  showIcon
                  message={
                    diff > 0 ? (
                      <>
                        Courier is <strong>cheaper by {money(diff, result.currency)}</strong>{' '}
                        than {benchmarkLabel ?? 'the lowest quote'} (
                        {money(benchmarkTotal, benchmarkCurrency)}).
                      </>
                    ) : diff < 0 ? (
                      <>
                        {benchmarkLabel ?? 'The lowest quote'} is{' '}
                        <strong>cheaper by {money(-diff, result.currency)}</strong>{' '}
                        than courier.
                      </>
                    ) : (
                      <>Courier matches the lowest quote exactly.</>
                    )
                  }
                />
              )}
              {benchmarkTotal == null && (
                <Tag style={{ marginTop: 14 }}>No submitted quotes to compare yet</Tag>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
