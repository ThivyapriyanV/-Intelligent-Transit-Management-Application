import React, { useState } from 'react';
import { TransitProvider, useTransit } from './context/TransitContext';
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

const TransitWorkspace: React.FC = () => {
  const { activePage } = useTransit();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderPage = () => {
    switch (activePage) {
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

export default function App() {
  return (
    <TransitProvider>
      <TransitWorkspace />
    </TransitProvider>
  );
}
