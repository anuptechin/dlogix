import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Button,
  DatePicker,
  Input,
  InputNumber,
  Select,
  Spin,
  message,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { AxiosError } from 'axios';
import {
  getQuoteSummary,
  saveQuotation,
  submitQuotation,
  type QuotePortalSummary,
} from '../api/client';
import { DlogixLogo } from '../components/DlogixLogo';
import './quote.css';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];
const SYMBOL: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED ',
};

interface Row {
  key: number;
  chargeTypeId?: string;
  description: string;
  unit?: string;
  qty: number;
  rate: number;
}

interface QuoteExtra {
  rateType?: 'SPOT' | 'CONTRACT';
  freeDetentionOriginDays?: number;
  freeDetentionDestDays?: number;
  freeDemurrageDestDays?: number;
  etd?: dayjs.Dayjs | null;
  eta?: dayjs.Dayjs | null;
  transshipments?: number;
  shippingLine?: string;
  vesselName?: string;
}

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const money = (v: number, cur: string) =>
  `${SYMBOL[cur] ?? cur + ' '}${v.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function ModeGlyph({ mode }: { mode: string }) {
  if (mode === 'AIR')
    return (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
      </svg>
    );
  if (mode === 'COURIER')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
      </svg>
    );
  // sea (LCL / FCL)
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18a3 3 0 0 0 3-1 3 3 0 0 1 5 0 3 3 0 0 0 5 0 3 3 0 0 1 3 1M4 14l1.5-5h13L20 14M12 4v5M9 9V6h6v3" />
    </svg>
  );
}

function StateScreen({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rfq">
      <div className="rfq__state">
        <div className="rfq__state-inner">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <DlogixLogo tone="dark" size={34} />
          </div>
          <h2>{title}</h2>
          <p>{children}</p>
        </div>
      </div>
    </div>
  );
}

export default function QuotePage() {
  const { token = '' } = useParams();
  const qc = useQueryClient();
  const nextKey = useRef(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['portal', token],
    queryFn: () => getQuoteSummary(token),
    retry: false,
  });

  const [rows, setRows] = useState<Row[]>([]);
  const [currency, setCurrency] = useState('INR');
  const [transit, setTransit] = useState<number | undefined>();
  const [validUntil, setValidUntil] = useState<dayjs.Dayjs | null>(null);
  const [remarks, setRemarks] = useState('');
  const [extra, setExtra] = useState<QuoteExtra>({});
  const [ready, setReady] = useState(false);
  const patchExtra = (p: Partial<QuoteExtra>) => setExtra((e) => ({ ...e, ...p }));

  useEffect(() => {
    if (data && !ready) {
      const q = data.quotation;
      setCurrency(q.currency || 'INR');
      setTransit(q.transitTimeDays ?? undefined);
      setValidUntil(q.validUntil ? dayjs(q.validUntil) : null);
      setRemarks(q.remarks ?? '');
      setExtra({
        rateType: q.rateType ?? undefined,
        freeDetentionOriginDays: q.freeDetentionOriginDays ?? undefined,
        freeDetentionDestDays: q.freeDetentionDestDays ?? undefined,
        freeDemurrageDestDays: q.freeDemurrageDestDays ?? undefined,
        etd: q.etd ? dayjs(q.etd) : null,
        eta: q.eta ? dayjs(q.eta) : null,
        transshipments: q.transshipments ?? undefined,
        shippingLine: q.shippingLine ?? undefined,
        vesselName: q.vesselName ?? undefined,
      });
      setRows(
        q.lines.map((l) => ({
          key: nextKey.current++,
          chargeTypeId: l.chargeTypeId ?? undefined,
          description: l.description ?? '',
          unit: l.unit ?? undefined,
          qty: n(l.qty),
          rate: n(l.rate),
        })),
      );
      setReady(true);
    }
  }, [data, ready]);

  const total = useMemo(
    () => rows.reduce((s, r) => s + n(r.qty) * n(r.rate), 0),
    [rows],
  );

  const payload = () => ({
    currency,
    transitTimeDays: transit,
    validUntil: validUntil ? validUntil.toISOString() : undefined,
    remarks: remarks || undefined,
    lines: rows.map((r) => ({
      chargeTypeId: r.chargeTypeId,
      description: r.description || undefined,
      unit: r.unit || undefined,
      qty: n(r.qty),
      rate: n(r.rate),
    })),
    rateType: extra.rateType,
    freeDetentionOriginDays: extra.freeDetentionOriginDays,
    freeDetentionDestDays: extra.freeDetentionDestDays,
    freeDemurrageDestDays: extra.freeDemurrageDestDays,
    etd: extra.etd ? extra.etd.toISOString() : undefined,
    eta: extra.eta ? extra.eta.toISOString() : undefined,
    transshipments: extra.transshipments,
    shippingLine: extra.shippingLine || undefined,
    vesselName: extra.vesselName || undefined,
  });

  const saveMut = useMutation({
    mutationFn: () => saveQuotation(token, payload()),
    onSuccess: () => message.success('Draft saved — you can come back anytime.'),
    onError: () => message.error('Could not save. Please try again.'),
  });

  const submitMut = useMutation({
    mutationFn: async () => {
      await saveQuotation(token, payload());
      return submitQuotation(token);
    },
    onSuccess: (fresh) => {
      qc.setQueryData(['portal', token], fresh);
      message.success('Quotation submitted — thank you!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (err: unknown) => {
      const m =
        (err as AxiosError<{ message?: string }>)?.response?.data?.message ??
        'Could not submit. Please check your rates and try again.';
      message.error(m);
    },
  });

  // ── state screens ──
  if (isLoading) {
    return (
      <div className="rfq">
        <div className="rfq__state">
          <Spin size="large" />
        </div>
      </div>
    );
  }
  if (isError) {
    const status = (error as AxiosError)?.response?.status;
    if (status === 404) {
      return (
        <StateScreen title="This link isn’t valid">
          The quotation link could not be found. Please use the link from your
          invitation email, or contact Dlogix support.
        </StateScreen>
      );
    }
    return (
      <StateScreen title="Something went wrong">
        We couldn’t load this quotation. Please refresh, or contact Dlogix
        support if it keeps happening.
      </StateScreen>
    );
  }
  if (!data) return null;

  if (data.expired) {
    return (
      <StateScreen title="This invitation has expired">
        The deadline for quoting on {data.enquiry.enquiryNo} has passed. Please
        contact Dlogix support if you’d still like to participate.
      </StateScreen>
    );
  }

  const submitted = data.quotation.status === 'SUBMITTED';
  const deadline = data.enquiry.quoteDeadline
    ? dayjs(data.enquiry.quoteDeadline)
    : null;
  const daysLeft = deadline ? deadline.diff(dayjs(), 'day') : null;

  const addRow = () =>
    setRows((r) => [
      ...r,
      { key: nextKey.current++, description: '', qty: 1, rate: 0 },
    ]);
  const patchRow = (key: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const removeRow = (key: number) =>
    setRows((r) => r.filter((row) => row.key !== key));

  return (
    <QuoteView
      data={data}
      rows={rows}
      currency={currency}
      transit={transit}
      validUntil={validUntil}
      remarks={remarks}
      total={total}
      submitted={submitted}
      daysLeft={daysLeft}
      deadline={deadline}
      saving={saveMut.isPending}
      submitting={submitMut.isPending}
      onCurrency={setCurrency}
      onTransit={setTransit}
      onValidUntil={setValidUntil}
      onRemarks={setRemarks}
      extra={extra}
      onExtra={patchExtra}
      isSea={data.enquiry.mode === 'LCL' || data.enquiry.mode === 'FCL'}
      onAddRow={addRow}
      onPatchRow={patchRow}
      onRemoveRow={removeRow}
      onSave={() => saveMut.mutate()}
      onSubmit={() => submitMut.mutate()}
    />
  );
}

/* ---- presentational view (keeps the container lean) ---- */
function QuoteView(props: {
  data: QuotePortalSummary;
  rows: Row[];
  currency: string;
  transit?: number;
  validUntil: dayjs.Dayjs | null;
  remarks: string;
  total: number;
  submitted: boolean;
  daysLeft: number | null;
  deadline: dayjs.Dayjs | null;
  saving: boolean;
  submitting: boolean;
  extra: QuoteExtra;
  isSea: boolean;
  onExtra: (p: Partial<QuoteExtra>) => void;
  onCurrency: (v: string) => void;
  onTransit: (v?: number) => void;
  onValidUntil: (v: dayjs.Dayjs | null) => void;
  onRemarks: (v: string) => void;
  onAddRow: () => void;
  onPatchRow: (key: number, patch: Partial<Row>) => void;
  onRemoveRow: (key: number) => void;
  onSave: () => void;
  onSubmit: () => void;
}) {
  const { data, rows, currency, total, submitted } = props;
  const e = data.enquiry;

  return (
    <div className="rfq">
      <div className="rfq__bar">
        <div className="rfq__bar-left">
          <DlogixLogo tone="dark" size={28} />
          <span className="rfq__bar-label">Request for Quotation</span>
        </div>
        <span className="rfq__bar-ref">
          Ref <b>{e.enquiryNo}</b>
        </span>
      </div>

      <div className="rfq__shell">
        {/* signature route ticket */}
        <div className="rfq__ticket">
          <div className="rfq__ticket-eyebrow">
            {e.direction} · {modeLabel(e.mode)}
          </div>
          <div className="rfq__route">
            <div className="rfq__place">
              <div className="code">{e.origin?.code ?? '—'}</div>
              <div className="name">{e.origin?.name ?? 'Origin'}</div>
            </div>
            <div className="rfq__path">
              <span className="rail" />
              <span className="glyph">
                <ModeGlyph mode={e.mode} />
              </span>
              <span className="rail" />
            </div>
            <div className="rfq__place rfq__place--to">
              <div className="code">{e.destination?.code ?? '—'}</div>
              <div className="name">{e.destination?.name ?? 'Destination'}</div>
            </div>
          </div>
          <div className="rfq__meta">
            {e.chargeableWeight != null && (
              <span className="rfq__chip">
                <span className="k">Chargeable</span>
                <span className="v">{n(e.chargeableWeight)} kg</span>
              </span>
            )}
            {e.incoterm && (
              <span className="rfq__chip">
                <span className="k">Incoterm</span>
                <span className="v">{e.incoterm}</span>
              </span>
            )}
            {e.cargoDesc && (
              <span className="rfq__chip">
                <span className="k">Cargo</span>
                <span className="v">{e.cargoDesc}</span>
              </span>
            )}
            {props.deadline && (
              <span className="rfq__chip rfq__chip--deadline">
                <span className="k">Submit by</span>
                <span className="v">
                  {props.deadline.format('DD MMM YYYY')}
                  {props.daysLeft != null &&
                    props.daysLeft >= 0 &&
                    ` · ${props.daysLeft}d left`}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* greeting */}
        <div className="rfq__hello">
          <h1>Hello, {data.vendor.contactPerson ?? data.vendor.name}</h1>
          <p>
            We’ve started your quotation with the usual charges for this
            shipment — just enter your rates and submit. Amounts and the total
            are calculated for you.
          </p>
        </div>

        {/* worksheet */}
        <div className="rfq__card">
          {submitted && (
            <div className="rfq__submitted">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span>
                Quotation submitted
                {data.quotation.submittedAt &&
                  ` on ${dayjs(data.quotation.submittedAt).format('DD MMM YYYY, HH:mm')}`}
                . You can revise and re-submit any time before the deadline.
              </span>
            </div>
          )}

          <h2 className="rfq__card-title">Your quotation</h2>
          <p className="rfq__card-sub">
            All amounts in {currency}. Add or remove lines as needed.
          </p>

          <div className="rfq__lines-head">
            <span>Charge</span>
            <span className="r">Qty</span>
            <span className="r">Rate</span>
            <span className="r">Amount</span>
            <span />
          </div>

          {rows.map((row) => {
            const amount = n(row.qty) * n(row.rate);
            return (
              <div className="rfq__line" key={row.key}>
                <div className="rfq__line-desc">
                  <Input
                    variant="borderless"
                    placeholder="Charge description"
                    value={row.description}
                    onChange={(ev) =>
                      props.onPatchRow(row.key, { description: ev.target.value })
                    }
                    style={{ padding: 0, fontWeight: 500 }}
                  />
                  {row.unit && <span className="u">{row.unit}</span>}
                </div>
                <div>
                  <span className="rfq__mobile-label">Qty</span>
                  <InputNumber
                    min={0}
                    value={row.qty}
                    onChange={(v) => props.onPatchRow(row.key, { qty: n(v) })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <span className="rfq__mobile-label">Rate</span>
                  <InputNumber
                    min={0}
                    value={row.rate}
                    onChange={(v) => props.onPatchRow(row.key, { rate: n(v) })}
                    style={{ width: '100%' }}
                    prefix={SYMBOL[currency] ?? ''}
                  />
                </div>
                <div className="rfq__line-amt">
                  <span className="rfq__mobile-label">Amount</span>
                  {money(amount, currency)}
                </div>
                <div className="rfq__line-remove">
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => props.onRemoveRow(row.key)}
                    aria-label="Remove line"
                  />
                </div>
              </div>
            );
          })}

          <div className="rfq__add">
            <Button icon={<PlusOutlined />} onClick={props.onAddRow}>
              Add charge
            </Button>
          </div>
        </div>

        {/* details */}
        <div className="rfq__card">
          <h2 className="rfq__card-title">Quote details</h2>
          <div className="rfq__fields" style={{ marginTop: 12 }}>
            <div className="rfq__field">
              <label>Currency</label>
              <Select
                value={currency}
                style={{ width: '100%' }}
                onChange={props.onCurrency}
                options={CURRENCIES.map((c) => ({ label: c, value: c }))}
              />
            </div>
            <div className="rfq__field">
              <label>Transit time (days)</label>
              <InputNumber
                min={0}
                value={props.transit}
                onChange={(v) => props.onTransit(v ?? undefined)}
                style={{ width: '100%' }}
                placeholder="e.g. 5"
              />
            </div>
            <div className="rfq__field">
              <label>Rates valid until</label>
              <DatePicker
                value={props.validUntil}
                onChange={props.onValidUntil}
                style={{ width: '100%' }}
              />
            </div>
            <div className="rfq__field rfq__field--full">
              <label>Remarks (optional)</label>
              <Input.TextArea
                rows={2}
                value={props.remarks}
                onChange={(ev) => props.onRemarks(ev.target.value)}
                placeholder="Anything Dlogix should know — inclusions, exclusions, notes."
              />
            </div>
          </div>
        </div>

        {/* BRD: rate type, sailing schedule & free days */}
        <div className="rfq__card">
          <h2 className="rfq__card-title">Schedule &amp; terms</h2>
          <p className="rfq__card-sub">
            These help Dlogix compare true total cost and service, not just the headline rate.
          </p>
          <div className="rfq__fields" style={{ marginTop: 12 }}>
            <div className="rfq__field">
              <label>Rate type</label>
              <Select
                allowClear
                value={props.extra.rateType}
                onChange={(v) => props.onExtra({ rateType: v })}
                style={{ width: '100%' }}
                placeholder="Spot / Contract"
                options={[
                  { label: 'Spot quote', value: 'SPOT' },
                  { label: 'Contract rate', value: 'CONTRACT' },
                ]}
              />
            </div>
            <div className="rfq__field">
              <label>{props.isSea ? 'Shipping line' : 'Airline'}</label>
              <Input
                value={props.extra.shippingLine}
                onChange={(ev) => props.onExtra({ shippingLine: ev.target.value })}
                placeholder={props.isSea ? 'e.g. Maersk' : 'e.g. Emirates'}
              />
            </div>
            <div className="rfq__field">
              <label>{props.isSea ? 'Vessel name' : 'Flight'}</label>
              <Input
                value={props.extra.vesselName}
                onChange={(ev) => props.onExtra({ vesselName: ev.target.value })}
              />
            </div>
            {props.isSea && (
              <>
                <div className="rfq__field">
                  <label>ETD</label>
                  <DatePicker
                    value={props.extra.etd ?? null}
                    onChange={(v) => props.onExtra({ etd: v })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="rfq__field">
                  <label>ETA</label>
                  <DatePicker
                    value={props.extra.eta ?? null}
                    onChange={(v) => props.onExtra({ eta: v })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="rfq__field">
                  <label>Transshipments</label>
                  <InputNumber
                    min={0}
                    value={props.extra.transshipments}
                    onChange={(v) => props.onExtra({ transshipments: v ?? undefined })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="rfq__field">
                  <label>Free detention — origin (days)</label>
                  <InputNumber
                    min={0}
                    value={props.extra.freeDetentionOriginDays}
                    onChange={(v) => props.onExtra({ freeDetentionOriginDays: v ?? undefined })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="rfq__field">
                  <label>Free detention — destination (days)</label>
                  <InputNumber
                    min={0}
                    value={props.extra.freeDetentionDestDays}
                    onChange={(v) => props.onExtra({ freeDetentionDestDays: v ?? undefined })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="rfq__field">
                  <label>Free demurrage — destination (days)</label>
                  <InputNumber
                    min={0}
                    value={props.extra.freeDemurrageDestDays}
                    onChange={(v) => props.onExtra({ freeDemurrageDestDays: v ?? undefined })}
                    style={{ width: '100%' }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <p className="rfq__foot">
          Dlogix · Your Global Trade Partner · Confidential
        </p>
      </div>

      {/* sticky total + submit */}
      <div className="rfq__totalbar">
        <div className="rfq__totalbar-inner">
          <div className="rfq__total">
            <span className="k">Quotation total</span>
            <span className="v">{money(total, currency)}</span>
          </div>
          <div className="rfq__actions">
            {props.deadline && (
              <span className="rfq__deadline-note">
                Submit by {props.deadline.format('DD MMM')}
              </span>
            )}
            <Button size="large" onClick={props.onSave} loading={props.saving}>
              Save draft
            </Button>
            <Button
              size="large"
              type="primary"
              onClick={props.onSubmit}
              loading={props.submitting}
              disabled={total <= 0}
            >
              {submitted ? 'Update quotation' : 'Submit quotation'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function modeLabel(mode: string) {
  return (
    { AIR: 'Air Freight', LCL: 'Sea LCL', FCL: 'Sea FCL', COURIER: 'Courier' }[
      mode
    ] ?? mode
  );
}
