import { useState } from 'react';
import {
  Button,
  Card,
  Segmented,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import { DownloadOutlined, FileExcelOutlined, InboxOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import {
  fedexCheck,
  fedexCheckExport,
  type FedexCheckResult,
  type FedexCheckRow,
  type FedexCheckStatus,
} from '../../api/client';

const { Title, Text } = Typography;

const money = (v: number | null) =>
  v == null ? '—' : `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_TAG: Record<FedexCheckStatus, { color: string; label: string }> = {
  CORRECT: { color: 'green', label: 'Correct' },
  INCORRECT: { color: 'red', label: 'Incorrect' },
  NO_ZONE: { color: 'orange', label: 'Dest not mapped' },
  NO_RATE: { color: 'default', label: 'No rate' },
};

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

export default function FedexCheckPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<FedexCheckResult | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'INCORRECT' | 'UNMATCHED'>('ALL');

  const checkMut = useMutation({
    mutationFn: (f: File) => fedexCheck(f),
    onSuccess: (res) => {
      setResult(res);
      message.success(`Checked ${res.summary.total} shipments.`);
    },
    onError: (err) => message.error(errMsg(err, 'Could not process the file.')),
  });

  const exportMut = useMutation({
    mutationFn: (f: File) => fedexCheckExport(f),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fedex-data-check.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (err) => message.error(errMsg(err, 'Could not export.')),
  });

  const rows = (result?.rows ?? []).filter((r) =>
    filter === 'ALL'
      ? true
      : filter === 'INCORRECT'
        ? r.status === 'INCORRECT'
        : r.status === 'NO_ZONE' || r.status === 'NO_RATE',
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%', maxWidth: 1040 }}>
      <div>
        <Title level={3} style={{ margin: 0 }}>
          FedEx Data Check
        </Title>
        <Text type="secondary">
          Upload the FedEx report; each shipment&rsquo;s base rate is validated against our FedEx rate
          card (destination = col J, final weight = col M, base rate = col Q).
        </Text>
      </div>

      <Card>
        <Upload.Dragger
          accept=".xlsx"
          maxCount={1}
          multiple={false}
          beforeUpload={(f) => {
            setFile(f);
            setResult(null);
            return false; // don't auto-upload; we post on "Run check"
          }}
          onRemove={() => {
            setFile(null);
            setResult(null);
          }}
          fileList={file ? [{ uid: '1', name: file.name } as never] : []}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag the FedEx report (.xlsx) here</p>
          <p className="ant-upload-hint">Reads the monthly shipment sheets automatically.</p>
        </Upload.Dragger>

        <Space style={{ marginTop: 16 }} wrap>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            disabled={!file}
            loading={checkMut.isPending}
            onClick={() => file && checkMut.mutate(file)}
          >
            Run check
          </Button>
          <Button
            icon={<DownloadOutlined />}
            disabled={!file || !result}
            loading={exportMut.isPending}
            onClick={() => file && exportMut.mutate(file)}
          >
            Download Excel
          </Button>
        </Space>
      </Card>

      {result && (
        <Card>
          <Space size={32} wrap style={{ marginBottom: 16 }}>
            <Statistic title="Shipments" value={result.summary.total} />
            <Statistic title="Correct" value={result.summary.correct} valueStyle={{ color: '#148f47' }} />
            <Statistic title="Incorrect" value={result.summary.incorrect} valueStyle={{ color: '#cf1322' }} />
            <Statistic
              title="Unmatched (no zone/rate)"
              value={result.summary.noZone + result.summary.noRate}
              valueStyle={{ color: '#d46b08' }}
            />
          </Space>

          <div style={{ marginBottom: 12 }}>
            <Segmented
              value={filter}
              onChange={(v) => setFilter(v as typeof filter)}
              options={[
                { label: `All (${result.summary.total})`, value: 'ALL' },
                { label: `Incorrect (${result.summary.incorrect})`, value: 'INCORRECT' },
                {
                  label: `Unmatched (${result.summary.noZone + result.summary.noRate})`,
                  value: 'UNMATCHED',
                },
              ]}
            />
          </div>

          <Table<FedexCheckRow>
            rowKey={(_, i) => String(i)}
            dataSource={rows}
            size="small"
            pagination={{ pageSize: 25, showSizeChanger: true }}
            columns={[
              { title: 'Sheet', dataIndex: 'sheet', width: 80 },
              { title: 'Destination', dataIndex: 'destCountry' },
              { title: 'Final Wt (kg)', dataIndex: 'finalWt', align: 'right', render: (v: number) => v },
              { title: 'Zone', dataIndex: 'zone', width: 70, render: (v) => v ?? '—' },
              {
                title: 'Reported base',
                dataIndex: 'reportedBase',
                align: 'right',
                render: (v: number) => money(v),
              },
              {
                title: 'Expected base',
                dataIndex: 'expectedBase',
                align: 'right',
                render: (v: number | null) => money(v),
              },
              {
                title: 'Diff',
                dataIndex: 'diff',
                align: 'right',
                render: (v: number | null) => (v == null ? '—' : money(v)),
              },
              {
                title: 'Status',
                dataIndex: 'status',
                render: (s: FedexCheckStatus) => (
                  <Tag color={STATUS_TAG[s].color}>{STATUS_TAG[s].label}</Tag>
                ),
              },
            ]}
          />
        </Card>
      )}
    </Space>
  );
}
