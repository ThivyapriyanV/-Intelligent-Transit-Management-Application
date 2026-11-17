import React from 'react';
import {
  Activity,
  BarChart3,
  BellRing,
  BusFront,
  Camera,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  LayoutDashboard,
  Radar,
  Route,
  Settings,
  TrendingUp,
  UserCheck,
  X,
} from 'lucide-react';
import { PageId } from '../../types/transit';
import { useTransit } from '../../context/TransitContext';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const { activePage, setActivePage, activeAlertsCount, recommendations } = useTransit();

  const pendingRecsCount = recommendations.filter((r) => r.status === 'PENDING').length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live-monitoring', label: 'Live Monitoring', icon: Camera },
    { id: 'crowd-analytics', label: 'Crowd Analytics', icon: BarChart3 },
    { id: 'crowd-prediction', label: 'Crowd Prediction', icon: TrendingUp },
    {
      id: 'alert-centre',
      label: 'Alert Centre',
      icon: BellRing,
      badgeCount: activeAlertsCount > 0 ? activeAlertsCount : undefined,
    },
    {
      id: 'bus-recommendations',
      label: 'Bus Recommendations',
      icon: BusFront,
      badgeCount: pendingRecsCount > 0 ? pendingRecsCount : undefined,
    },
    {
      id: 'bus-fleet',
      label: 'Bus Fleet & Route Management',
      icon: Route,
    },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavigate = (page: PageId) => {
    setActivePage(page);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Primary Navigation"
        className={`no-print fixed lg:sticky top-0 left-0 z-50 h-screen flex flex-col bg-[#121014] border-r border-[#343039] transition-all duration-200 shrink-0 ${
          collapsed ? 'w-[72px]' : 'w-[276px]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#343039] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#B51232]/20 border border-[#B51232]/50 crimson-glow-sm flex items-center justify-center shrink-0 text-[#F4F1F3]">
              <Radar className="w-4 h-4 text-[#D01940]" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#F4F1F3] leading-tight truncate font-display">
                  Transit Command
                </div>
                <div className="text-[11px] text-[#77717B] truncate">
                  Crowd Detection System
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden p-1.5 rounded-md text-[#AAA3AD] hover:text-[#F4F1F3] hover:bg-[#262128]"
          >
            <X className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:inline-flex items-center justify-center w-7 h-7 rounded-md text-[#AAA3AD] hover:text-[#F4F1F3] hover:bg-[#262128] transition-colors shrink-0"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                title={collapsed ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#B51232] text-[#F4F1F3] border border-[#D01940]/60 crimson-glow-sm'
                    : 'text-[#AAA3AD] hover:text-[#F4F1F3] hover:bg-[#262128] border border-transparent'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[#F4F1F3]' : 'text-[#77717B]'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </span>

                {!collapsed && item.badgeCount !== undefined && (
                  <span
                    className={`text-[11px] font-mono tabular-nums font-semibold px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-[#100E12]/40 text-[#F4F1F3]'
                        : item.id === 'alert-centre'
                          ? 'bg-[#B51232]/25 text-[#FB7185] border border-[#B51232]/40'
                          : 'bg-[#F97316]/20 text-[#FB923C] border border-[#F97316]/30'
                    }`}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Prototype Status & Operator Profile */}
        <div className="border-t border-[#343039] p-3 space-y-3 shrink-0">
          {!collapsed && (
            <div className="px-2.5 py-2 rounded-lg bg-[#201C22] border border-[#343039] flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-[#D01940] shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-[#F4F1F3] truncate">
                  Simulated Data Mode
                </div>
                <div className="text-[11px] text-[#77717B] truncate">
                  FastAPI / YOLOv8 Ready
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#262128] border border-[#343039] flex items-center justify-center text-[#F4F1F3] shrink-0">
              <UserCheck className="w-4 h-4 text-[#AAA3AD]" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#F4F1F3] truncate">
                  Transit Operations
                </div>
                <div className="text-[11px] text-[#77717B] truncate">
                  Command Duty Officer
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
