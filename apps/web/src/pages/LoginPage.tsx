import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { MailOutlined, SafetyCertificateOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { requestOtp, verifyOtp } from '../api/client';

const { Text, Link } = Typography;

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
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        backgroundColor: '#0a2a4e',
        backgroundImage: 'url(/login-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Card
        style={{
          width: 'min(460px, 92vw)',
          borderRadius: 16,
          boxShadow: '0 30px 80px -24px rgba(10,42,78,0.65)',
        }}
        styles={{ body: { padding: 32 } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <img
            src="/dlogix-logo-full.png"
            alt="Dlogix — Export Logistics Made Simple"
            style={{ width: '100%', maxWidth: 300, margin: '0 auto', display: 'block' }}
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
  );
}
