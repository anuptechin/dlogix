import { useEffect, useMemo } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  createEnquiry,
  getEnquiry,
  listChargeTypes,
  listIncoterms,
  listLocations,
  listLookups,
  listParties,
  updateEnquiry,
  type EnquiryInput,
} from '../../api/client';
import { DIRECTION_OPTIONS, MODE_OPTIONS, num } from './enquiryMeta';

const { Title, Text } = Typography;

// Additional-service checkboxes differ by mode (BRD §Service Requirement).
const AIR_SERVICES = [
  { key: 'expressService', label: 'Express Service' },
  { key: 'economyService', label: 'Economy Service' },
  { key: 'directFlightPreferred', label: 'Direct Flight Preferred' },
  { key: 'consolidationAccepted', label: 'Consolidation Accepted' },
  { key: 'dangerousGoods', label: 'Dangerous Goods' },
  { key: 'temperatureControlled', label: 'Temperature Controlled' },
  { key: 'insuranceRequired', label: 'Insurance Required' },
  { key: 'customsClearanceRequired', label: 'Customs Clearance Required' },
  { key: 'stackable', label: 'Stackable' },
  { key: 'fragile', label: 'Fragile' },
];
const SEA_SERVICES = [
  { key: 'doorPickup', label: 'Door Pickup' },
  { key: 'factoryStuffing', label: 'Factory Stuffing' },
  { key: 'cfsStuffing', label: 'CFS Stuffing' },
  { key: 'customsClearanceRequired', label: 'Customs Clearance Required' },
  { key: 'vgmRequired', label: 'VGM Required' },
  { key: 'fumigationRequired', label: 'Fumigation Required' },
  { key: 'insuranceRequired', label: 'Insurance Required' },
  { key: 'hazardousCargo', label: 'Hazardous Cargo' },
  { key: 'temperatureControlled', label: 'Temperature Controlled' },
  { key: 'flexiTank', label: 'Flexi Tank' },
  { key: 'socContainer', label: 'SOC (Shipper Owned Container)' },
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];

export default function EnquiryFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form] = Form.useForm();

  // Watched fields that drive the dynamic sections.
  const mode = Form.useWatch('mode', form) as string | undefined;
  const direction = Form.useWatch('direction', form) as string | undefined;
  const incoterm = Form.useWatch('incoterm', form) as string | undefined;
  const dims = Form.useWatch('dimensions', form) as
    | { lengthCm?: number; widthCm?: number; heightCm?: number; qty?: number }[]
    | undefined;
  const weightKg = Form.useWatch('weightKg', form) as number | undefined;

  const isAir = mode === 'AIR';
  const isCourier = mode === 'COURIER';
  const isSea = mode === 'LCL' || mode === 'FCL';
  const isFcl = mode === 'FCL';
  const isImport = direction === 'IMPORT';

  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: listLocations });
  const { data: parties } = useQuery({ queryKey: ['parties'], queryFn: () => listParties() });
  const { data: incoterms } = useQuery({ queryKey: ['incoterms'], queryFn: listIncoterms });
  const { data: commodities } = useQuery({ queryKey: ['lk', 'COMMODITY'], queryFn: () => listLookups('COMMODITY') });
  const { data: packageTypes } = useQuery({ queryKey: ['lk', 'PACKAGE_TYPE'], queryFn: () => listLookups('PACKAGE_TYPE') });
  const { data: natures } = useQuery({ queryKey: ['lk', 'NATURE_OF_CARGO'], queryFn: () => listLookups('NATURE_OF_CARGO') });
  const { data: serviceScopes } = useQuery({ queryKey: ['lk', 'SERVICE_SCOPE'], queryFn: () => listLookups('SERVICE_SCOPE') });
  const { data: businessUnits } = useQuery({ queryKey: ['lk', 'BUSINESS_UNIT'], queryFn: () => listLookups('BUSINESS_UNIT') });
  const { data: containerTypes } = useQuery({ queryKey: ['lk', 'CONTAINER_TYPE'], queryFn: () => listLookups('CONTAINER_TYPE') });
  const { data: chargeTypes } = useQuery({
    queryKey: ['chargeTypes', mode],
    queryFn: () => listChargeTypes(mode as EnquiryInput['mode']),
    enabled: !!mode,
  });

  const { data: existing } = useQuery({
    queryKey: ['enquiry', id],
    queryFn: () => getEnquiry(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    const so = existing.serviceOptions ?? {};
    form.setFieldsValue({
      direction: existing.direction,
      mode: existing.mode,
      businessUnit: existing.businessUnit ?? undefined,
      branchPlant: existing.branchPlant ?? undefined,
      customerId: existing.customerId ?? undefined,
      consigneeId: existing.consigneeId ?? undefined,
      supplierId: existing.supplierId ?? undefined,
      buyerId: existing.buyerId ?? undefined,
      salesOrderNo: existing.salesOrderNo ?? undefined,
      customerPoNo: existing.customerPoNo ?? undefined,
      supplierInvoiceNo: existing.supplierInvoiceNo ?? undefined,
      poNumbers: existing.poNumbers ?? undefined,
      originId: existing.originId ?? undefined,
      destinationId: existing.destinationId ?? undefined,
      originIcdCfsId: existing.originIcdCfsId ?? undefined,
      pickupAddress: existing.pickupAddress ?? undefined,
      deliveryAddress: existing.deliveryAddress ?? undefined,
      finalDestination: existing.finalDestination ?? undefined,
      stuffingLocation: existing.stuffingLocation ?? undefined,
      commodity: existing.commodity ?? undefined,
      hsCode: existing.hsCode ?? undefined,
      natureOfCargo: existing.natureOfCargo ?? undefined,
      packageType: existing.packageType ?? undefined,
      packageCount: existing.packageCount ?? undefined,
      cargoDesc: existing.cargoDesc ?? undefined,
      weightKg: num(existing.weightKg),
      netWeightKg: num(existing.netWeightKg),
      volumeCbm: num(existing.volumeCbm),
      chargeableWeight: num(existing.chargeableWeight),
      cargoValue: num(existing.cargoValue),
      cargoCurrency: existing.cargoCurrency ?? undefined,
      priority: existing.priority ?? undefined,
      incoterm: existing.incoterm ?? undefined,
      incotermDetails: existing.incotermDetails ?? undefined,
      serviceScope: existing.serviceScope ?? undefined,
      serviceOptions: Object.keys(so).filter((k) => so[k]),
      preferredShippingLine: existing.preferredShippingLine ?? undefined,
      preferredVessel: existing.preferredVessel ?? undefined,
      directServiceOnly: existing.directServiceOnly ?? undefined,
      transshipmentAllowed: existing.transshipmentAllowed ?? undefined,
      maxTransitDays: existing.maxTransitDays ?? undefined,
      targetDate: existing.targetDate ? dayjs(existing.targetDate) : undefined,
      etdRequired: existing.etdRequired ? dayjs(existing.etdRequired) : undefined,
      etaRequired: existing.etaRequired ? dayjs(existing.etaRequired) : undefined,
      quoteDeadline: existing.quoteDeadline ? dayjs(existing.quoteDeadline) : undefined,
      quoteValidityDate: existing.quoteValidityDate ? dayjs(existing.quoteValidityDate) : undefined,
      sailingRequiredBefore: existing.sailingRequiredBefore ? dayjs(existing.sailingRequiredBefore) : undefined,
      specialInstructions: existing.specialInstructions ?? undefined,
      internalRemarks: existing.internalRemarks ?? undefined,
      dimensions: (existing.dimensions ?? []).map((d) => ({
        label: d.label ?? undefined,
        lengthCm: num(d.lengthCm),
        widthCm: num(d.widthCm),
        heightCm: num(d.heightCm),
        qty: d.qty,
      })),
      containers: (existing.containers ?? []).map((c) => ({
        containerType: c.containerType,
        qty: c.qty,
        estWeightKg: num(c.estWeightKg),
      })),
      requiredChargeTypeIds: (existing.requiredCharges ?? []).map((r) => r.chargeTypeId),
    });
  }, [existing, form]);

  // Live volumetric / chargeable weight preview.
  const preview = useMemo(() => {
    const rows = (dims ?? []).filter((d) => d && d.lengthCm && d.widthCm && d.heightCm);
    if (!rows.length) return null;
    const cm3 = rows.reduce(
      (s, d) => s + (d.lengthCm! * d.widthCm! * d.heightCm! * (d.qty ?? 1)),
      0,
    );
    const cbm = cm3 / 1_000_000;
    const divisor = isCourier ? 5000 : 6000;
    const volumetric = cm3 / divisor;
    let chargeable = volumetric;
    if (isAir || isCourier) chargeable = Math.max(weightKg ?? 0, volumetric);
    else if (mode === 'LCL') chargeable = Math.max(cbm, (weightKg ?? 0) / 1000);
    return { cbm: cbm.toFixed(3), volumetric: volumetric.toFixed(1), chargeable: chargeable.toFixed(1) };
  }, [dims, weightKg, mode, isAir, isCourier]);

  const activeIncoterm = useMemo(
    () => (incoterms ?? []).find((i) => i.code === incoterm),
    [incoterms, incoterm],
  );

  const save = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const selectedFlags = (values.serviceOptions as string[] | undefined) ?? [];
      const serviceOptions: Record<string, boolean> = {};
      for (const k of selectedFlags) serviceOptions[k] = true;

      const iso = (v: unknown) => (v ? (v as dayjs.Dayjs).toISOString() : undefined);
      const str = (v: unknown) => ((v as string) || undefined);

      const payload: EnquiryInput = {
        direction: values.direction as EnquiryInput['direction'],
        mode: values.mode as EnquiryInput['mode'],
        businessUnit: str(values.businessUnit),
        branchPlant: str(values.branchPlant),
        customerId: str(values.customerId),
        consigneeId: str(values.consigneeId),
        supplierId: str(values.supplierId),
        buyerId: str(values.buyerId),
        salesOrderNo: str(values.salesOrderNo),
        customerPoNo: str(values.customerPoNo),
        supplierInvoiceNo: str(values.supplierInvoiceNo),
        poNumbers: (values.poNumbers as string[] | undefined)?.length
          ? (values.poNumbers as string[])
          : undefined,
        originId: str(values.originId),
        destinationId: str(values.destinationId),
        originIcdCfsId: str(values.originIcdCfsId),
        pickupAddress: str(values.pickupAddress),
        deliveryAddress: str(values.deliveryAddress),
        finalDestination: str(values.finalDestination),
        stuffingLocation: str(values.stuffingLocation),
        commodity: str(values.commodity),
        hsCode: str(values.hsCode),
        natureOfCargo: str(values.natureOfCargo),
        packageType: str(values.packageType),
        packageCount: values.packageCount as number | undefined,
        cargoDesc: str(values.cargoDesc),
        weightKg: values.weightKg as number | undefined,
        netWeightKg: values.netWeightKg as number | undefined,
        volumeCbm: values.volumeCbm as number | undefined,
        chargeableWeight: values.chargeableWeight as number | undefined,
        cargoValue: values.cargoValue as number | undefined,
        cargoCurrency: str(values.cargoCurrency),
        priority: str(values.priority) as EnquiryInput['priority'],
        incoterm: str(values.incoterm),
        incotermDetails: values.incotermDetails as Record<string, unknown> | undefined,
        serviceScope: str(values.serviceScope),
        serviceOptions: Object.keys(serviceOptions).length ? serviceOptions : undefined,
        preferredShippingLine: str(values.preferredShippingLine),
        preferredVessel: str(values.preferredVessel),
        directServiceOnly: values.directServiceOnly as boolean | undefined,
        transshipmentAllowed: values.transshipmentAllowed as boolean | undefined,
        maxTransitDays: values.maxTransitDays as number | undefined,
        targetDate: iso(values.targetDate),
        etdRequired: iso(values.etdRequired),
        etaRequired: iso(values.etaRequired),
        quoteDeadline: iso(values.quoteDeadline),
        quoteValidityDate: iso(values.quoteValidityDate),
        sailingRequiredBefore: iso(values.sailingRequiredBefore),
        specialInstructions: str(values.specialInstructions),
        internalRemarks: str(values.internalRemarks),
        dimensions: (values.dimensions as EnquiryInput['dimensions']) ?? undefined,
        containers: isFcl
          ? ((values.containers as EnquiryInput['containers']) ?? undefined)
          : undefined,
        requiredChargeTypeIds:
          (values.requiredChargeTypeIds as string[] | undefined)?.length
            ? (values.requiredChargeTypeIds as string[])
            : undefined,
      };
      return isEdit ? updateEnquiry(id!, payload) : createEnquiry(payload);
    },
    onSuccess: (enq) => {
      message.success(isEdit ? 'Enquiry updated' : 'Enquiry created');
      qc.invalidateQueries({ queryKey: ['enquiries'] });
      qc.invalidateQueries({ queryKey: ['enquiry', enq.id] });
      navigate(`/app/enquiries/${enq.id}`);
    },
    onError: (err: unknown) => {
      const m =
        (err as { response?: { data?: { message?: string | string[] } } })?.response
          ?.data?.message ?? 'Save failed';
      message.error(Array.isArray(m) ? m.join(', ') : m);
    },
  });

  const locationOptions = (locations ?? []).map((l) => ({
    label: `${l.code ? l.code + ' — ' : ''}${l.name}`,
    value: l.id,
  }));
  const partyOpts = (role: string) =>
    (parties ?? [])
      .filter((p) => p.roles.includes(role as never))
      .map((p) => ({ label: p.name, value: p.id }));
  const lkOpts = (rows?: { label: string }[]) =>
    (rows ?? []).map((r) => ({ label: r.label, value: r.label }));
  const services = isSea ? SEA_SERVICES : AIR_SERVICES;

  return (
    <Card>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
        <Title level={3} style={{ margin: 0 }}>
          {isEdit ? `Edit ${existing?.enquiryNo ?? 'enquiry'}` : 'New enquiry'}
        </Title>
      </Space>

      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        initialValues={{ direction: 'EXPORT', mode: 'AIR', cargoCurrency: 'INR' }}
        onFinish={(v) => save.mutate(v)}
        style={{ maxWidth: 1000 }}
      >
        <Collapse
          defaultActiveKey={['basic', 'route', 'cargo', 'charges']}
          items={[
            {
              key: 'basic',
              label: 'Basic information',
              children: (
                <>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item label="Direction" name="direction" rules={[{ required: true }]}>
                        <Select options={DIRECTION_OPTIONS} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Mode" name="mode" rules={[{ required: true }]}>
                        <Select options={MODE_OPTIONS} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Priority" name="priority">
                        <Select
                          allowClear
                          options={[
                            { label: 'Normal', value: 'NORMAL' },
                            { label: 'Urgent', value: 'URGENT' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item label="Business unit" name="businessUnit">
                        <Select allowClear options={lkOpts(businessUnits)} placeholder="—" />
                      </Form.Item>
                    </Col>
                    {isImport && (
                      <Col span={8}>
                        <Form.Item label="Branch / plant" name="branchPlant">
                          <Input placeholder="Receiving location" />
                        </Form.Item>
                      </Col>
                    )}
                    <Col span={8}>
                      <Form.Item label="Incoterm" name="incoterm">
                        <Select
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          placeholder="FOB, CIF, DDP…"
                          options={(incoterms ?? []).map((i) => ({
                            label: `${i.code} — ${i.name}`,
                            value: i.code,
                          }))}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  {/* Party fields differ by direction */}
                  {!isImport ? (
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="Customer" name="customerId">
                          <Select allowClear showSearch optionFilterProp="label" options={partyOpts('CUSTOMER')} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="Consignee" name="consigneeId">
                          <Select allowClear showSearch optionFilterProp="label" options={partyOpts('CONSIGNEE')} />
                        </Form.Item>
                      </Col>
                    </Row>
                  ) : (
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="Supplier" name="supplierId">
                          <Select allowClear showSearch optionFilterProp="label" options={partyOpts('SUPPLIER')} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="Buyer" name="buyerId">
                          <Select allowClear showSearch optionFilterProp="label" options={partyOpts('BUYER')} />
                        </Form.Item>
                      </Col>
                    </Row>
                  )}
                  <Row gutter={16}>
                    {!isImport ? (
                      <>
                        <Col span={8}><Form.Item label="Sales order no." name="salesOrderNo"><Input /></Form.Item></Col>
                        <Col span={8}><Form.Item label="Customer PO no." name="customerPoNo"><Input /></Form.Item></Col>
                      </>
                    ) : (
                      <>
                        <Col span={8}><Form.Item label="Supplier invoice no." name="supplierInvoiceNo"><Input /></Form.Item></Col>
                        <Col span={8}>
                          <Form.Item label="PO number(s)" name="poNumbers">
                            <Select mode="tags" tokenSeparators={[',']} placeholder="Add PO numbers" />
                          </Form.Item>
                        </Col>
                      </>
                    )}
                    <Col span={8}>
                      <Form.Item label="Cargo ready date" name="targetDate">
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              ),
            },
            {
              key: 'route',
              label: 'Origin & destination',
              children: (
                <>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label={isAir || isCourier ? 'Origin airport' : 'Port of loading (POL)'} name="originId">
                        <Select showSearch allowClear optionFilterProp="label" options={locationOptions} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label={isAir || isCourier ? 'Destination airport' : 'Port of discharge (POD)'} name="destinationId">
                        <Select showSearch allowClear optionFilterProp="label" options={locationOptions} />
                      </Form.Item>
                    </Col>
                  </Row>
                  {isSea && (
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="Origin ICD / CFS" name="originIcdCfsId">
                          <Select showSearch allowClear optionFilterProp="label" options={locationOptions} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="Stuffing location" name="stuffingLocation">
                          <Input placeholder="Factory / CFS" />
                        </Form.Item>
                      </Col>
                    </Row>
                  )}
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="Pickup address" name="pickupAddress">
                        <Input.TextArea rows={2} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label={isImport ? 'Final delivery address' : 'Delivery address'} name="deliveryAddress">
                        <Input.TextArea rows={2} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item label="Final destination (optional)" name="finalDestination">
                    <Input />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'cargo',
              label: 'Cargo details',
              children: (
                <>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item label="Commodity" name="commodity">
                        <Select allowClear showSearch optionFilterProp="label" options={lkOpts(commodities)} />
                      </Form.Item>
                    </Col>
                    <Col span={8}><Form.Item label="HS Code" name="hsCode"><Input /></Form.Item></Col>
                    <Col span={8}>
                      <Form.Item label="Nature of cargo" name="natureOfCargo">
                        <Select allowClear options={lkOpts(natures)} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={6}>
                      <Form.Item label="Package type" name="packageType">
                        <Select allowClear options={lkOpts(packageTypes)} />
                      </Form.Item>
                    </Col>
                    <Col span={6}><Form.Item label="No. of packages" name="packageCount"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={6}><Form.Item label="Gross weight (kg)" name="weightKg"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={6}><Form.Item label="Net weight (kg)" name="netWeightKg"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={8}><Form.Item label="Cargo value" name="cargoValue"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={8}>
                      <Form.Item label="Currency" name="cargoCurrency">
                        <Select options={CURRENCIES.map((c) => ({ label: c, value: c }))} />
                      </Form.Item>
                    </Col>
                    {isSea && (
                      <Col span={8}><Form.Item label="Total volume (CBM)" name="volumeCbm"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                    )}
                  </Row>
                  <Form.Item label="Cargo description / remarks" name="cargoDesc">
                    <Input.TextArea rows={2} />
                  </Form.Item>

                  <Divider orientation="left" plain>Dimensions (L × W × H × Qty, cm)</Divider>
                  <Form.List name="dimensions">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map((f) => (
                          <Row gutter={8} key={f.key} align="middle">
                            <Col span={6}><Form.Item name={[f.name, 'lengthCm']} rules={[{ required: true, message: 'L' }]}><InputNumber min={0} placeholder="Length" style={{ width: '100%' }} /></Form.Item></Col>
                            <Col span={6}><Form.Item name={[f.name, 'widthCm']} rules={[{ required: true, message: 'W' }]}><InputNumber min={0} placeholder="Width" style={{ width: '100%' }} /></Form.Item></Col>
                            <Col span={6}><Form.Item name={[f.name, 'heightCm']} rules={[{ required: true, message: 'H' }]}><InputNumber min={0} placeholder="Height" style={{ width: '100%' }} /></Form.Item></Col>
                            <Col span={4}><Form.Item name={[f.name, 'qty']} initialValue={1} rules={[{ required: true, message: 'Qty' }]}><InputNumber min={1} placeholder="Qty" style={{ width: '100%' }} /></Form.Item></Col>
                            <Col span={2}><Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(f.name)} /></Col>
                          </Row>
                        ))}
                        <Button type="dashed" onClick={() => add({ qty: 1 })} icon={<PlusOutlined />} block>
                          Add dimension row
                        </Button>
                      </>
                    )}
                  </Form.List>
                  {preview && (
                    <Alert
                      style={{ marginTop: 12 }}
                      type="info"
                      showIcon
                      message={
                        <Space size="large" wrap>
                          <span>Volume: <b>{preview.cbm} CBM</b></span>
                          {(isAir || isCourier) && <span>Volumetric: <b>{preview.volumetric} kg</b></span>}
                          <span>Chargeable: <b>{preview.chargeable} {isSea ? 'freight ton' : 'kg'}</b></span>
                        </Space>
                      }
                    />
                  )}

                  {isFcl && (
                    <>
                      <Divider orientation="left" plain>Containers</Divider>
                      <Form.List name="containers">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map((f) => (
                              <Row gutter={8} key={f.key} align="middle">
                                <Col span={10}>
                                  <Form.Item name={[f.name, 'containerType']} rules={[{ required: true, message: 'Type' }]}>
                                    <Select placeholder="Container type" options={lkOpts(containerTypes)} />
                                  </Form.Item>
                                </Col>
                                <Col span={6}><Form.Item name={[f.name, 'qty']} initialValue={1} rules={[{ required: true }]}><InputNumber min={1} placeholder="Qty" style={{ width: '100%' }} /></Form.Item></Col>
                                <Col span={6}><Form.Item name={[f.name, 'estWeightKg']}><InputNumber min={0} placeholder="Est. weight kg" style={{ width: '100%' }} /></Form.Item></Col>
                                <Col span={2}><Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(f.name)} /></Col>
                              </Row>
                            ))}
                            <Button type="dashed" onClick={() => add({ qty: 1 })} icon={<PlusOutlined />} block>
                              Add container
                            </Button>
                          </>
                        )}
                      </Form.List>
                    </>
                  )}
                </>
              ),
            },
            {
              key: 'service',
              label: 'Service requirements',
              children: (
                <>
                  <Form.Item label="Service scope" name="serviceScope">
                    <Select allowClear options={lkOpts(serviceScopes)} placeholder="Airport to Airport, Door to Door…" />
                  </Form.Item>
                  <Form.Item label="Additional services" name="serviceOptions">
                    <Checkbox.Group>
                      <Row>
                        {services.map((s) => (
                          <Col span={8} key={s.key} style={{ marginBottom: 6 }}>
                            <Checkbox value={s.key}>{s.label}</Checkbox>
                          </Col>
                        ))}
                      </Row>
                    </Checkbox.Group>
                  </Form.Item>
                </>
              ),
            },
            ...(activeIncoterm && activeIncoterm.shownFields?.length
              ? [{
                  key: 'incoterm',
                  label: `Incoterm details — ${activeIncoterm.code}`,
                  children: (
                    <Row gutter={16}>
                      {activeIncoterm.shownFields!.map((fld) => (
                        <Col span={12} key={fld}>
                          <Form.Item label={fld} name={['incotermDetails', fld]}>
                            <Input />
                          </Form.Item>
                        </Col>
                      ))}
                    </Row>
                  ),
                }]
              : []),
            ...(isSea || isAir
              ? [{
                  key: 'shipping',
                  label: 'Shipping requirements',
                  children: (
                    <>
                      <Row gutter={16}>
                        <Col span={12}><Form.Item label="Preferred shipping line / airline" name="preferredShippingLine"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item label="Preferred vessel / flight" name="preferredVessel"><Input /></Form.Item></Col>
                      </Row>
                      <Row gutter={16}>
                        <Col span={8}><Form.Item name="directServiceOnly" valuePropName="checked"><Checkbox>Direct service only</Checkbox></Form.Item></Col>
                        <Col span={8}><Form.Item name="transshipmentAllowed" valuePropName="checked"><Checkbox>Transshipment allowed</Checkbox></Form.Item></Col>
                        <Col span={8}><Form.Item label="Max transit (days)" name="maxTransitDays"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                      </Row>
                      <Row gutter={16}>
                        <Col span={12}><Form.Item label="ETD required" name="etdRequired"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="ETA required" name="etaRequired"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                      </Row>
                    </>
                  ),
                }]
              : []),
            {
              key: 'charges',
              label: 'Charges vendors must quote',
              children: (
                <>
                  <Text type="secondary">
                    Pick exactly which charges each vendor should quote. The vendor portal and the
                    comparison grid are built from this list.
                  </Text>
                  <Form.Item name="requiredChargeTypeIds" style={{ marginTop: 12 }}>
                    <Select
                      mode="multiple"
                      allowClear
                      optionFilterProp="label"
                      placeholder="Select required charges"
                      options={(chargeTypes ?? []).map((c) => ({
                        label: `${c.name}${c.category ? ` · ${c.category}` : ''}`,
                        value: c.id,
                      }))}
                    />
                  </Form.Item>
                  <Space wrap>
                    <Button size="small" onClick={() => form.setFieldValue('requiredChargeTypeIds', (chargeTypes ?? []).map((c) => c.id))}>
                      Select all
                    </Button>
                    <Button size="small" onClick={() => form.setFieldValue('requiredChargeTypeIds', [])}>Clear</Button>
                    {(chargeTypes ?? []).length > 0 && (
                      <Tag color="blue">{(chargeTypes ?? []).length} available for {mode}</Tag>
                    )}
                  </Space>
                </>
              ),
            },
            {
              key: 'quote',
              label: 'Quote submission & instructions',
              children: (
                <>
                  <Row gutter={16}>
                    <Col span={8}><Form.Item label="Quote deadline" name="quoteDeadline"><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={8}><Form.Item label="Freight validity required" name="quoteValidityDate"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={8}><Form.Item label="Sailing required before" name="sailingRequiredBefore"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                  </Row>
                  <Form.Item label="Special instructions (visible to vendors)" name="specialInstructions">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                  <Form.Item label="Internal remarks (D'Decor only)" name="internalRemarks">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </>
              ),
            },
          ]}
        />

        <Space style={{ marginTop: 20 }}>
          <Button type="primary" htmlType="submit" loading={save.isPending}>
            {isEdit ? 'Save changes' : 'Create enquiry'}
          </Button>
          <Text type="secondary">
            Saved as a draft — you invite vendors and send on the next screen.
          </Text>
        </Space>
      </Form>
    </Card>
  );
}
