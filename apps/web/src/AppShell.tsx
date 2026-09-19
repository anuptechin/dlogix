import { useEffect } from 'react';
import { Layout, Menu, Typography, Tag, Spin, Button, Dropdown, Avatar } from 'antd';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getHealth, logLoginEvent, logout } from './api/client';
import { DlogixLogo } from './components/DlogixLogo';
import { useSession, canManage, isAdmin } from './auth/useSession';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

function HealthBadge() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 10000,
  });

  if (isLoading) return <Spin size="small" />;
  if (isError || !data) return <Tag color="red">API unreachable</Tag>;

  return (
    <>
      <Tag color={data.status === 'ok' ? 'green' : 'orange'}>
        API: {data.status}
      </Tag>
      <Tag color={data.db === 'up' ? 'green' : 'red'}>DB: {data.db}</Tag>
    </>
  );
}

// Menu key → route path (relative to /app). `manage` = Admin/Manager only; `admin` = Admin only.
const NAV = [
  { key: 'dashboard', label: 'Dashboard', path: '/app' },
  { key: 'enquiries', label: 'Enquiries', path: '/app/enquiries' },
  { key: 'vendors', label: 'Vendors', path: '/app/vendors' },
  { key: 'calculator', label: 'Courier Calculator', path: '/app/courier/calculator' },
  { key: 'ratecards', label: 'Courier Rate Cards', path: '/app/courier/rate-cards', manage: true },
  { key: 'reports', label: 'Reports', path: '/app/reports', manage: true },
  { key: 'audit', label: 'Audit Log', path: '/app/audit', manage: true },
  { key: 'users', label: 'Users & Roles', path: '/app/users', admin: true },
] as { key: string; label: string; path: string; manage?: boolean; admin?: boolean }[];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGEMENT: 'Manager',
  LOGISTICS: 'Logistics User',
  DOCUMENTATION: 'Documentation',
};

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const { data: me } = useSession();
  const role = me?.role;

  const nav = NAV.filter(
    (n) => (!n.manage || canManage(role)) && (!n.admin || isAdmin(role)),
  );

  const signOut = async () => {
    try {
      await logout();
    } catch {
      /* ignore */
    }
    qc.clear();
    sessionStorage.removeItem('lprms.loginLogged');
    navigate('/login', { replace: true });
  };

  // Record a login/session-start once per browser session (dev placeholder;
  // the real hook moves to the M365 sign-in callback in P0-3).
  useEffect(() => {
    if (sessionStorage.getItem('lprms.loginLogged')) return;
    logLoginEvent()
      .then(() => sessionStorage.setItem('lprms.loginLogged', '1'))
      .catch(() => {});
  }, []);

  // Highlight the deepest matching nav item.
  const selected =
    NAV.filter((n) => location.pathname === n.path || (n.path !== '/app' && location.pathname.startsWith(n.path)))
      .sort((a, b) => b.path.length - a.path.length)[0]?.key ?? 'dashboard';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark">
        <Link
          to="/"
          style={{
            display: 'block',
            padding: '22px 18px 16px',
            textAlign: 'center',
          }}
        >
          <DlogixLogo tone="light" size={30} />
          <div
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 9.5,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginTop: 10,
            }}
          >
            Your Global Trade Partner
          </div>
        </Link>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selected]}
          onClick={({ key }) => {
            const item = nav.find((n) => n.key === key);
            if (item) navigate(item.path);
          }}
          items={nav.map(({ key, label }) => ({ key, label }))}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingInline: 24,
          }}
        >
          <Text strong style={{ color: '#0a2a4e' }}>
            Dlogix — Logistics Procurement &amp; Rate Management
          </Text>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <HealthBadge />
            {me && (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'who',
                      disabled: true,
                      label: (
                        <div style={{ lineHeight: 1.3 }}>
                          <div style={{ fontWeight: 600, color: '#0a2a4e' }}>{me.name}</div>
                          <div style={{ fontSize: 12, color: '#8798ac' }}>{me.email}</div>
                        </div>
                      ),
                    },
                    { type: 'divider' },
                    { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', onClick: signOut },
                  ],
                }}
                trigger={['click']}
              >
                <Button type="text" style={{ height: 'auto', padding: '4px 8px' }}>
                  <Avatar size="small" icon={<UserOutlined />} style={{ background: '#1e7fe6' }} />
                  <span style={{ marginLeft: 8, textAlign: 'left' }}>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#0a2a4e', lineHeight: 1.1 }}>
                      {me.name}
                    </span>
                    <span style={{ display: 'block', fontSize: 11, color: '#8798ac', lineHeight: 1.1 }}>
                      {ROLE_LABEL[me.role] ?? me.role}
                    </span>
                  </span>
                </Button>
              </Dropdown>
            )}
          </div>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
