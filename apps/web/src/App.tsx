import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/dlogix/LandingPage';
import LoginPage from './pages/LoginPage';
import AppShell from './AppShell';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import AuditPage from './pages/AuditPage';
import VendorsPage from './pages/VendorsPage';
import UsersPage from './pages/UsersPage';
import ComingSoon from './pages/ComingSoon';
import EnquiriesPage from './pages/enquiries/EnquiriesPage';
import EnquiryFormPage from './pages/enquiries/EnquiryFormPage';
import EnquiryDetailPage from './pages/enquiries/EnquiryDetailPage';
import ComparisonPage from './pages/enquiries/ComparisonPage';
import CalculatorPage from './pages/courier/CalculatorPage';
import RateCardsPage from './pages/courier/RateCardsPage';
import QuotePage from './quote/QuotePage';
import { RequireAuth, RequireRole, StaffOnly } from './auth/guards';
import { useSession } from './auth/useSession';

// Roles allowed to manage rate cards / see reports / manage users.
const MANAGE = ['ADMIN', 'MANAGEMENT'] as const;

// End-users land on the calculator; everyone else on the dashboard.
function AppHome() {
  const { data } = useSession();
  if (data?.role === 'END_USER') return <Navigate to="/app/courier/calculator" replace />;
  return <DashboardPage />;
}

export default function App() {
  return (
    <Routes>
      {/* Public front door + login */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      {/* Public vendor quotation portal (token link, no login) */}
      <Route path="/quote/:token" element={<QuotePage />} />
      {/* Authenticated application */}
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<AppHome />} />
        <Route path="vendors" element={<StaffOnly><VendorsPage /></StaffOnly>} />
        <Route path="enquiries" element={<StaffOnly><EnquiriesPage /></StaffOnly>} />
        <Route path="enquiries/new" element={<StaffOnly><EnquiryFormPage /></StaffOnly>} />
        <Route path="enquiries/:id" element={<StaffOnly><EnquiryDetailPage /></StaffOnly>} />
        <Route path="enquiries/:id/edit" element={<StaffOnly><EnquiryFormPage /></StaffOnly>} />
        <Route path="enquiries/:id/compare" element={<StaffOnly><ComparisonPage /></StaffOnly>} />
        <Route path="courier" element={<Navigate to="/app/courier/calculator" replace />} />
        <Route
          path="courier/rate-cards"
          element={<RequireRole roles={[...MANAGE]}><RateCardsPage /></RequireRole>}
        />
        <Route path="courier/calculator" element={<CalculatorPage />} />
        <Route
          path="reports"
          element={<RequireRole roles={[...MANAGE]}><ReportsPage /></RequireRole>}
        />
        <Route
          path="audit"
          element={<RequireRole roles={[...MANAGE]}><AuditPage /></RequireRole>}
        />
        <Route
          path="users"
          element={<RequireRole roles={['ADMIN']}><UsersPage /></RequireRole>}
        />
        <Route path="*" element={<ComingSoon />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
