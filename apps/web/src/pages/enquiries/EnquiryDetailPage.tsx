import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  List,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  BarChartOutlined,
  BulbOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PaperClipOutlined,
  SendOutlined,
  TeamOutlined,
  UploadOutlined,
  UserAddOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { EnquiryStatus } from '@lprms/shared';
import {
  addEnquiryVendors,
  enquiryDocumentUrl,
  getEnquiry,
  getEnquiryInsights,
  listVendorGroups,
  listVendors,
  removeEnquiryDocument,
  removeEnquiryVendor,
  sendEnquiry,
  uploadEnquiryDocument,
  type EnquiryVendorRow,
} from '../../api/client';
import { EV_STATUS_COLOR, MODE_LABEL, STATUS_COLOR, num } from './enquiryMeta';

const { Title, Text } = Typography;

const SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ' };
const money = (v: number | null | undefined, cur = 'INR') =>
  v == null ? '—' : `${SYMBOL[cur] ?? cur + ' '}${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtSize = (b?: number | null) =>
  b == null ? '' : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;

export default function EnquiryDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const { data: enq, isLoading } = useQuery({
    queryKey: ['enquiry', id],
    queryFn: () => getEnquiry(id),
    enabled: Boolean(id),
  });

  const { data: allVendors } = useQuery({
    queryKey: ['vendors', 'active-for-invite'],
    queryFn: () => listVendors({ active: true }),
    enabled: addOpen,
  });

  const { data: vendorGroups } = useQuery({
    queryKey: ['vendorGroups'],
    queryFn: listVendorGroups,
    enabled: addOpen,
  });

  const { data: insights } = useQuery({
    queryKey: ['insights', id],
    queryFn: () => getEnquiryInsights(id),
    enabled: Boolean(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['enquiry', id] });
    qc.invalidateQueries({ queryKey: ['enquiries'] });
    qc.invalidateQueries({ queryKey: ['insights', id] });
  };

  const uploadMut = useMutation({
    mutationFn: (file: File) => uploadEnquiryDocument(id, file),
    onSuccess: () => {
      message.success('Document uploaded');
      invalidate();
    },
    onError: () => message.error('Upload failed'),
  });

  const removeDocMut = useMutation({
    mutationFn: (docId: string) => removeEnquiryDocument(id, docId),
    onSuccess: () => {
      message.success('Document removed');
      invalidate();
    },
    onError: () => message.error('Could not remove document'),
  });

  const addMut = useMutation({
    mutationFn: (vendorIds: string[]) => addEnquiryVendors(id, vendorIds),
    onSuccess: () => {
      message.success('Vendors added');
      setAddOpen(false);
      setSelected([]);
      invalidate();
    },
    onError: () => message.error('Could not add vendors'),
  });

  const removeMut = useMutation({
    mutationFn: (evId: string) => removeEnquiryVendor(id, evId),
    onSuccess: () => {
      message.success('Vendor removed');
      invalidate();
    },
    onError: () => message.error('Could not remove vendor'),
  });

  const sendMut = useMutation({
    mutationFn: () => sendEnquiry(id),
    onSuccess: () => {
      message.success('Enquiry sent — invitation emails dispatched');
      invalidate();
    },
    onError: (err: unknown) => {
      const m =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Send failed';
      message.error(m);
    },
  });

  if (isLoading || !enq) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  const isDraft = enq.status === EnquiryStatus.DRAFT;
  const invitedVendorIds = new Set(enq.enquiryVendors.map((ev) => ev.vendorId));
  const availableVendors = (allVendors ?? []).filter(
    (v) => !invitedVendorIds.has(v.id),
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space
          style={{ width: '100%', justifyContent: 'space-between' }}
          align="start"
        >
          <Space direction="vertical" size={4}>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/app/enquiries')}
              >
                Enquiries
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                {enq.enquiryNo}
              </Title>
              <Tag color={STATUS_COLOR[enq.status]}>{enq.status}</Tag>
            </Space>
          </Space>
          <Space>
            {isDraft && (
              <Button
                icon={<EditOutlined />}
                onClick={() => navigate(`/app/enquiries/${id}/edit`)}
              >
                Edit
              </Button>
            )}
            {enq.status !== EnquiryStatus.DRAFT && (
              <Button
                icon={<BarChartOutlined />}
                onClick={() => navigate(`/app/enquiries/${id}/compare`)}
              >
                Compare quotes
              </Button>
            )}
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={sendMut.isPending}
              disabled={enq.enquiryVendors.length === 0}
              onClick={() => sendMut.mutate()}
            >
              {enq.status === EnquiryStatus.DRAFT
                ? 'Send to vendors'
                : 'Re-send'}
            </Button>
          </Space>
        </Space>

        <Descriptions
          style={{ marginTop: 16 }}
          column={{ xs: 1, sm: 2, md: 3 }}
          size="small"
          bordered
        >
          <Descriptions.Item label="Direction">
            {enq.direction}
          </Descriptions.Item>
          <Descriptions.Item label="Mode">
            {MODE_LABEL[enq.mode] ?? enq.mode}
          </Descriptions.Item>
          <Descriptions.Item label="Incoterm">
            {enq.incoterm || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Origin">
            {enq.origin ? `${enq.origin.code ?? ''} ${enq.origin.name}` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Destination">
            {enq.destination
              ? `${enq.destination.code ?? ''} ${enq.destination.name}`
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Chargeable wt">
            {num(enq.chargeableWeight) ?? '—'} kg
          </Descriptions.Item>
          <Descriptions.Item label="Actual wt">
            {num(enq.weightKg) ?? '—'} kg
          </Descriptions.Item>
          <Descriptions.Item label="Volume">
            {num(enq.volumeCbm) ?? '—'} cbm
          </Descriptions.Item>
          <Descriptions.Item label="Quote deadline">
            {enq.quoteDeadline
              ? new Date(enq.quoteDeadline).toLocaleString()
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Cargo" span={3}>
            {enq.cargoDesc || '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {insights && insights.duplicates.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={
            <Space wrap>
              <span>Possible duplicate on the same lane &amp; party:</span>
              {insights.duplicates.map((d) => (
                <Tag
                  key={d.id}
                  color="orange"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/app/enquiries/${d.id}`)}
                >
                  {d.enquiryNo} · {d.status}
                </Tag>
              ))}
            </Space>
          }
        />
      )}

      {insights && (
        <Card title={<Space><BulbOutlined /> Smart decision panel</Space>}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Statistic
                title="Previous shipment on this lane"
                value={
                  insights.previousShipment
                    ? money(insights.previousShipment.amount, insights.previousShipment.currency)
                    : '—'
                }
              />
              <Text type="secondary">
                {insights.previousShipment
                  ? `${insights.previousShipment.vendor}${
                      insights.previousShipment.awardedAt
                        ? ` · ${dayjs(insights.previousShipment.awardedAt).format('DD MMM YYYY')}`
                        : ''
                    }`
                  : 'No prior award on this route & mode yet.'}
              </Text>
            </Col>
            <Col xs={24} md={8}>
              <Statistic
                title="Historical rate (average)"
                value={insights.historicalRates ? money(insights.historicalRates.avg, insights.historicalRates.currency) : '—'}
              />
              <Text type="secondary">
                {insights.historicalRates
                  ? `Low ${money(insights.historicalRates.low, insights.historicalRates.currency)} · High ${money(
                      insights.historicalRates.high,
                      insights.historicalRates.currency,
                    )} · n=${insights.historicalRates.count}`
                  : 'Builds up as shipments are awarded.'}
              </Text>
            </Col>
            <Col xs={24} md={8}>
              <Statistic title="Vendors invited" value={enq.enquiryVendors.length} />
              <Text type="secondary">
                {enq.enquiryVendors.filter((v) => v.quotation?.status === 'SUBMITTED').length} quoted so far
              </Text>
            </Col>
          </Row>

          {insights.incoterm && insights.incoterm.shownFields?.length ? (
            <>
              <Divider orientation="left" plain>
                {insights.incoterm.code} — responsibilities to confirm
              </Divider>
              <Space wrap>
                {insights.incoterm.shownFields.map((f) => (
                  <Tag key={f}>{f}</Tag>
                ))}
              </Space>
            </>
          ) : null}

          <Divider orientation="left" plain>Suggested vendors for this lane</Divider>
          {insights.suggestedVendors.length === 0 ? (
            <Text type="secondary">No capable vendors found for this mode.</Text>
          ) : (
            <List
              grid={{ gutter: 12, xs: 1, sm: 2, md: 3 }}
              dataSource={insights.suggestedVendors}
              renderItem={(s) => {
                const invited = invitedVendorIds.has(s.vendorId);
                return (
                  <List.Item>
                    <Card size="small">
                      <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.name}</div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {s.laneWins} lane win(s) · {s.winRate}% win · {s.responseRate}% response
                          </Text>
                        </div>
                        {invited ? (
                          <Tag color="green">Invited</Tag>
                        ) : (
                          <Button
                            size="small"
                            disabled={enq.status === EnquiryStatus.AWARDED}
                            onClick={() => addMut.mutate([s.vendorId])}
                          >
                            Add
                          </Button>
                        )}
                      </Space>
                    </Card>
                  </List.Item>
                );
              }}
            />
          )}
        </Card>
      )}

      <Card
        title={`Invited vendors (${enq.enquiryVendors.length})`}
        extra={
          <Button
            icon={<UserAddOutlined />}
            onClick={() => setAddOpen(true)}
            disabled={enq.status === EnquiryStatus.AWARDED}
          >
            Add vendors
          </Button>
        }
      >
        {enq.status !== EnquiryStatus.DRAFT && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="Invitation emails are logged to the API console in dev mode (EMAIL_TRANSPORT=console)."
          />
        )}
        <Table<EnquiryVendorRow>
          rowKey="id"
          dataSource={enq.enquiryVendors}
          pagination={false}
          locale={{ emptyText: 'No vendors invited yet — add some, then send.' }}
          columns={[
            { title: 'Vendor', dataIndex: ['vendor', 'name'] },
            { title: 'Email', dataIndex: ['vendor', 'email'] },
            {
              title: 'Invite status',
              dataIndex: 'status',
              render: (v: string) => <Tag color={EV_STATUS_COLOR[v]}>{v}</Tag>,
            },
            {
              title: 'Quotation',
              key: 'quote',
              render: (_, ev) =>
                ev.quotation ? (
                  <Tag color="green">{ev.quotation.status}</Tag>
                ) : (
                  <Text type="secondary">—</Text>
                ),
            },
            {
              title: '',
              key: 'actions',
              align: 'right',
              render: (_, ev) =>
                isDraft ? (
                  <Popconfirm
                    title="Remove this vendor?"
                    onConfirm={() => removeMut.mutate(ev.id)}
                  >
                    <Button size="small" danger type="text">
                      Remove
                    </Button>
                  </Popconfirm>
                ) : null,
            },
          ]}
        />
      </Card>

      <Card
        title={<Space><PaperClipOutlined /> Documents ({enq.documents?.length ?? 0})</Space>}
        extra={
          <Upload
            showUploadList={false}
            beforeUpload={(file) => {
              uploadMut.mutate(file as File);
              return false; // handle upload ourselves
            }}
          >
            <Button icon={<UploadOutlined />} loading={uploadMut.isPending}>
              Upload
            </Button>
          </Upload>
        }
      >
        {!enq.documents || enq.documents.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No documents yet — attach invoice, packing list, VGM, etc."
          />
        ) : (
          <List
            dataSource={enq.documents}
            renderItem={(d) => (
              <List.Item
                actions={[
                  <a
                    key="dl"
                    href={enquiryDocumentUrl(id, d.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <DownloadOutlined /> Download
                  </a>,
                  <Popconfirm
                    key="rm"
                    title="Remove this document?"
                    onConfirm={() => removeDocMut.mutate(d.id)}
                  >
                    <Button size="small" danger type="text" icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={<PaperClipOutlined style={{ fontSize: 18, color: '#1e7fe6' }} />}
                  title={d.fileName}
                  description={`${d.docType ? d.docType + ' · ' : ''}${fmtSize(
                    d.sizeBytes,
                  )} · ${dayjs(d.uploadedAt).format('DD MMM YYYY, HH:mm')}`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        title="Add vendors to this enquiry"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={() => addMut.mutate(selected)}
        okButtonProps={{ disabled: selected.length === 0 }}
        confirmLoading={addMut.isPending}
        okText="Add selected"
      >
        <Text type="secondary">Quick add by vendor group</Text>
        <Select
          style={{ width: '100%', margin: '6px 0 14px' }}
          placeholder="Add every vendor in a group…"
          value={null}
          suffixIcon={<TeamOutlined />}
          options={(vendorGroups ?? []).map((g) => ({
            label: `${g.name} (${g.vendorIds.length})`,
            value: g.id,
          }))}
          onChange={(gid) => {
            const g = (vendorGroups ?? []).find((x) => x.id === gid);
            if (!g) return;
            const add = g.vendorIds.filter((v) => !invitedVendorIds.has(v));
            setSelected((prev) => [...new Set([...prev, ...add])]);
            message.info(`Added ${add.length} vendor(s) from ${g.name}`);
          }}
        />
        <Text type="secondary">Or pick individually</Text>
        <Select
          mode="multiple"
          style={{ width: '100%', marginTop: 6 }}
          placeholder="Select active vendors"
          value={selected}
          onChange={setSelected}
          optionFilterProp="label"
          options={availableVendors.map((v) => ({
            label: `${v.name} — ${v.email}`,
            value: v.id,
          }))}
        />
      </Modal>
    </Space>
  );
}
