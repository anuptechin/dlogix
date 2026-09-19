import type { ReactNode } from 'react';
import { Card, Result, Spin } from 'antd';
import { Navigate } from 'react-router-dom';
import { useSession } from './useSession';
import type { Role } from '../api/client';

/** Gate the whole authenticated app — redirects to /login when not signed in. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = useSession();
  if (isLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }
  if (isError || !data) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Gate a page to specific roles; shows an access-denied panel otherwise. */
export function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  const { data } = useSession();
  if (!data) return null;
  if (!roles.includes(data.role)) {
    return (
      <Card>
        <Result
          status="403"
          title="No access"
          subTitle="This section is restricted. Contact an administrator if you need access."
        />
      </Card>
    );
  }
  return <>{children}</>;
}
