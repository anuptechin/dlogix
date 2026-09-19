import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import {
  MailOutlined,
  SafetyCertificateOutlined,
  ArrowLeftOutlined,
  GlobalOutlined,
  RocketOutlined,
  FileProtectOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { requestOtp, verifyOtp } from '../api/client';
import './login.css';

const { Text, Link } = Typography;

const FEATURES = [
  { icon: <GlobalOutlined />, label: 'Global Reach' },
  { icon: <RocketOutlined />, label: 'Reliable Shipping' },
  { icon: <FileProtectOutlined />, label: 'Transparent Process' },
  { icon: <LineChartOutlined />, label: 'Better Outcomes' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const errMsg = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

  const sendMut = useMutation({
    mutationFn: (e: string) => requestOtp(e),
    onSuccess: () => {
      setError(null);
      setInfo(`We've sent a 6-digit code to ${email}. It's valid for 10 minutes.`);
      setStep('code');
    },
    onError: (err) => setError(errMsg(err, 'Could not send the code. Try again.')),
  });

  const verifyMut = useMutation({
    mutationFn: (code: string) => verifyOtp(email, code),
    onSuccess: (user) => {
      qc.setQueryData(['me'], user);
      navigate('/app', { replace: true });
    },
    onError: (err) => setError(errMsg(err, 'Invalid code. Try again.')),
  });

  return (
    <div className="dlx-login">
      <div className="dlx-login__top">A D&rsquo;Decor Initiative</div>

      <div className="dlx-login__body">
        <div className="dlx-login__left">
          <div>
            <div className="dlx-login__accent" />
            <h1 className="dlx-login__headline">
              Global Trade
              <br />
              Made Simple
            </h1>
            <div className="dlx-login__sub">
              Connecting Markets
              <br />
              Empowering Business
            </div>
          </div>
          <div className="dlx-login__foot">
            Trade
            <br />
            Without
            <br />
            Boundaries
          </div>
        </div>

        <div className="dlx-login__card">
      <Card styles={{ body: { padding: 32 } }}>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <img
            src="/dlogix-logo.png"
            alt="Dlogix — Export Logistics Made Simple"
            style={{ width: '100%', maxWidth: 260, margin: '0 auto', display: 'block' }}
          />
        </div>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 22 }}>
          {step === 'email' ? 'Sign in with your work email' : 'Enter your verification code'}
        </Text>

        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {step === 'code' && info && (
          <Alert type="success" showIcon message={info} style={{ marginBottom: 16 }} />
        )}

        {step === 'email' ? (
          <Form
            layout="vertical"
            requiredMark={false}
            onFinish={(v) => {
              setError(null);
              setEmail(v.email);
              sendMut.mutate(v.email);
            }}
          >
            <Form.Item
              label="Email"
              name="email"
              rules={[{ required: true, type: 'email', message: 'Enter your work email' }]}
            >
              <Input size="large" prefix={<MailOutlined />} placeholder="you@ddecor.com" autoFocus />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={sendMut.isPending}>
              Send code
            </Button>
          </Form>
        ) : (
          <Form
            layout="vertical"
            requiredMark={false}
            onFinish={(v) => {
              setError(null);
              verifyMut.mutate(String(v.code).trim());
            }}
          >
            <Form.Item
              label="6-digit code"
              name="code"
              rules={[{ required: true, message: 'Enter the code from your email' }]}
            >
              <Input
                size="large"
                prefix={<SafetyCertificateOutlined />}
                placeholder="123456"
                inputMode="numeric"
                maxLength={8}
                autoFocus
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={verifyMut.isPending}>
              Verify &amp; sign in
            </Button>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
              <Link
                onClick={() => {
                  setStep('email');
                  setError(null);
                  setInfo(null);
                }}
              >
                <ArrowLeftOutlined /> Change email
              </Link>
              <Link disabled={sendMut.isPending} onClick={() => sendMut.mutate(email)}>
                Resend code
              </Link>
            </div>
          </Form>
        )}

        <Text
          type="secondary"
          style={{ display: 'block', textAlign: 'center', marginTop: 18, fontSize: 12 }}
        >
          Access is managed by your administrator. A one-time code is emailed each time you sign in.
        </Text>
      </Card>
        </div>

        <div className="dlx-login__right">
          {FEATURES.map((f) => (
            <div className="dlx-login__feature" key={f.label}>
              {f.icon}
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
