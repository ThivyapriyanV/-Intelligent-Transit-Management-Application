import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TransitProvider, useTransit } from './context/TransitContext';
import { canAccessPage } from './services/authService';
import { PATH_TO_PAGE_MAP, PAGE_PATH_MAP } from './types/auth';
import type { PageId } from './types/transit';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { DashboardPage } from './pages/DashboardPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { CrowdAnalyticsPage } from './pages/CrowdAnalyticsPage';
import { CrowdPredictionPage } from './pages/CrowdPredictionPage';
import { AlertCentrePage } from './pages/AlertCentrePage';
import { BusRecommendationsPage } from './pages/BusRecommendationsPage';
import { BusFleetPage } from './pages/BusFleetPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { PendingApprovalPage } from './pages/auth/PendingApprovalPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { AccessDeniedPage } from './pages/auth/AccessDeniedPage';

const ProtectedTransitWorkspace: React.FC = () => {
  const { user, pathname, navigate } = useAuth();
  const { activePage, setActivePage } = useTransit();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const requestedPage: PageId | undefined =
    pathname === '/' ? 'dashboard' : PATH_TO_PAGE_MAP[pathname];

  // Sync URL path -> TransitContext activePage whenever URL changes
  useEffect(() => {
    if (pathname === '/') {
      navigate(PAGE_PATH_MAP.dashboard, { replace: true });
      return;
    }
    if (requestedPage && requestedPage !== activePage) {
      setActivePage(requestedPage);
    }
  }, [pathname, requestedPage, activePage, setActivePage, navigate]);

  // Enforce RBAC for direct URL navigation or role-restricted pages
  const targetPage = requestedPage ?? activePage;
  if (!user || user.status !== 'approved' || !canAccessPage(user.assignedRole, targetPage)) {
    return <AccessDeniedPage />;
  }

  const renderPage = () => {
    switch (targetPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'live-monitoring':
        return <LiveMonitoringPage />;
      case 'crowd-analytics':
        return <CrowdAnalyticsPage />;
      case 'crowd-prediction':
        return <CrowdPredictionPage />;
      case 'alert-centre':
        return <AlertCentrePage />;
      case 'bus-recommendations':
        return <BusRecommendationsPage />;
      case 'bus-fleet':
        return <BusFleetPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
    }
  };

  return (
    <div className="min-h-screen flex bg-[#100E12] text-[#F4F1F3]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col bg-[#151217]">
        <TopHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

const AppRouter: React.FC = () => {
  const { user, loading, pathname, navigate, isAuthRoute } = useAuth();

  useEffect(() => {
    if (loading) return;

    const isApprovedUser = Boolean(user && user.status === 'approved');

    if (!isApprovedUser && !isAuthRoute) {
      navigate('/login', { replace: true });
      return;
    }

    if (isApprovedUser && (pathname === '/login' || pathname === '/register')) {
      navigate(PAGE_PATH_MAP.dashboard, { replace: true });
    }
  }, [user, loading, pathname, isAuthRoute, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#100E12] text-[#F4F1F3] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 text-[#D01940] animate-spin" />
        <p className="text-xs text-[#AAA3AD] font-medium">
          Verifying Transit Command Session...
        </p>
      </div>
    );
  }

  switch (pathname) {
    case '/login':
      return <LoginPage />;
    case '/register':
      return <RegisterPage />;
    case '/pending-approval':
      return <PendingApprovalPage />;
    case '/forgot-password':
      return <ForgotPasswordPage />;
    case '/reset-password':
      return <ResetPasswordPage />;
    case '/access-denied':
      return <AccessDeniedPage />;
    default:
      if (!user || user.status !== 'approved') {
        return <LoginPage />;
      }
      return (
        <TransitProvider>
          <ProtectedTransitWorkspace />
        </TransitProvider>
      );
  }
};

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
