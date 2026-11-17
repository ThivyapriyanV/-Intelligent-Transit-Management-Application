import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Clock,
  LogOut,
  MapPin,
  Menu,
  Pause,
  Play,
  Settings,
  User as UserIcon,
} from 'lucide-react';
import { PageId } from '../../types/transit';
import { PAGE_PATH_MAP, ROLE_LABELS } from '../../types/auth';
import { StationFilter, useTransit } from '../../context/TransitContext';
import { useAuth } from '../../context/AuthContext';
import {
  canAccessPage,
  canOperateDispatchAndAlerts,
} from '../../services/authService';
import { SeverityTag } from '../common/StatusIndicator';
import { UserProfileModal } from '../auth/UserProfileModal';

const PAGE_TITLES: Record<PageId, string> = {
  dashboard: 'Operations Overview',
  'live-monitoring': 'Live CCTV Crowd Monitoring',
  'crowd-analytics': 'Crowd Density Analytics',
  'crowd-prediction': 'Passenger Flow Prediction',
  'alert-centre': 'Alert Management Centre',
  'bus-recommendations': 'Bus Deployment Recommendations',
  'bus-fleet': 'Bus Fleet & Route Allocation',
  reports: 'Transit Reports & Export',
  settings: 'System Configuration',
};

const PAGE_BREADCRUMBS: Record<PageId, string> = {
  dashboard: 'Overview',
  'live-monitoring': 'Live Monitoring',
  'crowd-analytics': 'Crowd Analytics',
  'crowd-prediction': 'Crowd Prediction',
  'alert-centre': 'Alert Centre',
  'bus-recommendations': 'Bus Recommendations',
  'bus-fleet': 'Bus Fleet & Routes',
  reports: 'Reports',
  settings: 'Settings',
};

interface TopHeaderProps {
  onOpenMobileMenu: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenMobileMenu }) => {
  const {
    activePage,
    currentTime,
    selectedStationFilter,
    setSelectedStationFilter,
    stations,
    settings,
    toggleSimulation,
    alerts,
    activeAlertsCount,
    setActivePage,
  } = useTransit();
  const { user, navigate, logout } = useAuth();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = currentTime.toLocaleTimeString('en-IN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE').slice(0, 4);
  const canViewAlertCentre = canAccessPage(user?.assignedRole, 'alert-centre');
  const canViewSettings = canAccessPage(user?.assignedRole, 'settings');
  const canControlSim = canOperateDispatchAndAlerts(user?.assignedRole);

  const initials =
    user?.fullName
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0].toUpperCase())
      .join('') || 'OP';

  const navigateToPage = (page: PageId) => {
    setActivePage(page);
    navigate(PAGE_PATH_MAP[page]);
  };

  return (
    <>
      <header className="no-print sticky top-0 z-30 h-16 bg-[#121014]/95 backdrop-blur-sm border-b border-[#343039] px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Left Zone: Mobile menu + Breadcrumb + Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 rounded-lg text-[#AAA3AD] hover:text-[#F4F1F3] hover:bg-[#262128]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#77717B] mb-0.5">
              <span>Transit Command</span>
              <ChevronRight className="w-3 h-3 text-[#77717B]" />
              <span className="text-[#AAA3AD]">{PAGE_BREADCRUMBS[activePage]}</span>
            </div>
            <h1 className="text-base sm:text-lg font-semibold text-[#F4F1F3] truncate font-display leading-tight">
              {PAGE_TITLES[activePage]}
            </h1>
          </div>
        </div>

        {/* Right Zone: Date/Time, Station Selector, Simulation Status, Notifications, Settings, Profile Menu */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#201C22] border border-[#343039] text-xs text-[#AAA3AD] font-mono tabular-nums whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-[#77717B]" />
            <span>{formattedDate}</span>
            <span className="text-[#343039]" aria-hidden="true">
              |
            </span>
            <span className="text-[#F4F1F3]">{formattedTime}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#201C22] border border-[#343039] hover:border-[#4B4452] rounded-lg px-2.5 py-1.5 transition-colors">
            <MapPin className="w-3.5 h-3.5 text-[#D01940] shrink-0" />
            <label htmlFor="header-station-select" className="sr-only">
              Select transit station
            </label>
            <select
              id="header-station-select"
              value={selectedStationFilter}
              onChange={(e) => setSelectedStationFilter(e.target.value as StationFilter)}
              className="bg-transparent text-xs sm:text-sm text-[#F4F1F3] font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-[#201C22] text-[#F4F1F3]">
                All Stations (4)
              </option>
              {stations.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#201C22] text-[#F4F1F3]">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {canControlSim && (
            <button
              type="button"
              onClick={toggleSimulation}
              aria-label={settings.simulationRunning ? 'Pause simulation' : 'Resume simulation'}
              className={`hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                settings.simulationRunning
                  ? 'bg-[#201C22] border-[#B51232]/50 text-[#F4F1F3] hover:bg-[#262128] crimson-glow-sm'
                  : 'bg-[#201C22] border-[#343039] text-[#AAA3AD] hover:text-[#F4F1F3] hover:bg-[#262128]'
              }`}
            >
              {settings.simulationRunning ? (
                <Pause className="w-3.5 h-3.5 text-[#D01940]" />
              ) : (
                <Play className="w-3.5 h-3.5 text-[#4ADE80]" />
              )}
              <span>{settings.simulationRunning ? 'Simulation Active' : 'Simulation Paused'}</span>
            </button>
          )}

          {/* Notification Popover Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                setNotificationsOpen((prev) => !prev);
              }}
              aria-label={`Notifications (${activeAlertsCount} active alerts)`}
              aria-expanded={notificationsOpen}
              className="relative p-2 rounded-lg bg-[#201C22] border border-[#343039] text-[#AAA3AD] hover:text-[#F4F1F3] hover:bg-[#262128] transition-colors"
            >
              <Bell className="w-4 h-4" />
              {activeAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#B51232] text-[#F4F1F3] text-[10px] font-mono font-semibold flex items-center justify-center border border-[#121014]">
                  {activeAlertsCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#201C22] border border-[#343039] shadow-2xl crimson-glow z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-[#343039] flex items-center justify-between bg-[#262128]">
                  <span className="text-sm font-semibold text-[#F4F1F3] font-display">
                    Active Transit Alerts ({activeAlertsCount})
                  </span>
                  {canViewAlertCentre && (
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        navigateToPage('alert-centre');
                      }}
                      className="text-xs font-medium text-[#D01940] hover:text-[#FB7185]"
                    >
                      Open Alert Centre
                    </button>
                  )}
                </div>
                <div className="divide-y divide-[#343039] max-h-72 overflow-y-auto">
                  {activeAlerts.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-[#77717B]">
                      No active alerts right now. All monitored zones nominal.
                    </div>
                  ) : (
                    activeAlerts.map((alert) => (
                      <button
                        key={alert.id}
                        type="button"
                        onClick={() => {
                          setNotificationsOpen(false);
                          if (canViewAlertCentre) {
                            navigateToPage('alert-centre');
                          }
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-[#262128] transition-colors block"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-semibold text-[#F4F1F3] truncate">
                            {alert.stationName} · {alert.zoneName}
                          </span>
                          <SeverityTag severity={alert.severity} />
                        </div>
                        <p className="text-xs text-[#AAA3AD] line-clamp-2">{alert.description}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {canViewSettings && (
            <button
              type="button"
              onClick={() => navigateToPage('settings')}
              aria-label="Open system settings"
              title="System Settings"
              className={`p-2 rounded-lg border transition-colors ${
                activePage === 'settings'
                  ? 'bg-[#B51232] border-[#D01940] text-[#F4F1F3] crimson-glow-sm'
                  : 'bg-[#201C22] border-[#343039] text-[#AAA3AD] hover:text-[#F4F1F3] hover:bg-[#262128]'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* User Profile Menu */}
          {user && (
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen(false);
                  setProfileMenuOpen((prev) => !prev);
                }}
                aria-label="Open user profile menu"
                aria-expanded={profileMenuOpen}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg bg-[#201C22] hover:bg-[#262128] border border-[#343039] transition-colors"
              >
                <span className="w-6 h-6 rounded-md bg-[#B51232]/25 border border-[#B51232]/50 text-[11px] font-semibold text-[#F4F1F3] flex items-center justify-center shrink-0">
                  {initials}
                </span>
                <span className="hidden sm:block text-left max-w-[130px]">
                  <span className="block text-xs font-medium text-[#F4F1F3] truncate leading-tight">
                    {user.fullName}
                  </span>
                  <span className="block text-[10px] text-[#77717B] truncate leading-tight">
                    {ROLE_LABELS[user.assignedRole]}
                  </span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#77717B]" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#201C22] border border-[#343039] shadow-2xl crimson-glow z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#343039] bg-[#262128]">
                    <div className="text-xs font-semibold text-[#F4F1F3] truncate">
                      {user.fullName}
                    </div>
                    <div className="text-[11px] font-mono text-[#AAA3AD] truncate mt-0.5">
                      {user.email}
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded bg-[#B51232]/20 border border-[#B51232]/40 text-[10px] font-medium text-[#FB7185]">
                      {ROLE_LABELS[user.assignedRole]}
                    </span>
                  </div>

                  <div className="p-1.5 space-y-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setProfileModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#AAA3AD] hover:text-[#F4F1F3] hover:bg-[#262128] transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        if (canViewSettings) {
                          navigateToPage('settings');
                        } else {
                          setProfileModalOpen(true);
                        }
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#AAA3AD] hover:text-[#F4F1F3] hover:bg-[#262128] transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Account Settings</span>
                    </button>

                    <div className="my-1 border-t border-[#343039]" />

                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#FB7185] hover:bg-[#B51232]/15 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {user && (
        <UserProfileModal
          user={user}
          open={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
        />
      )}
    </>
  );
};
