import React, { useState } from 'react';
import { Bell, Clock, MapPin, Menu, Pause, Play } from 'lucide-react';
import { PageId } from '../../types/transit';
import { StationFilter, useTransit } from '../../context/TransitContext';
import { SeverityTag } from '../common/StatusIndicator';

const PAGE_TITLES: Record<PageId, string> = {
  dashboard: 'Operations Overview',
  'live-monitoring': 'Live CCTV Crowd Monitoring',
  'crowd-analytics': 'Crowd Density Analytics',
  'crowd-prediction': 'Passenger Flow Prediction',
  'alert-centre': 'Alert Management Centre',
  'bus-recommendations': 'Bus Deployment Recommendations',
  reports: 'Transit Reports & Export',
  settings: 'System Configuration',
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

  const [notificationsOpen, setNotificationsOpen] = useState(false);

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

  return (
    <header className="no-print sticky top-0 z-30 h-16 bg-[#0B1120]/95 backdrop-blur-sm border-b border-slate-800/80 px-4 lg:px-6 flex items-center justify-between gap-4">
      {/* Left Zone: Mobile menu + Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-slate-100 truncate font-display">
            {PAGE_TITLES[activePage]}
          </h1>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span>Intelligent Transit Management</span>
            <span aria-hidden="true">·</span>
            <span>Simulated Feed Mode</span>
          </div>
        </div>
      </div>

      {/* Right Zone: Date/Time, Station Selector, Simulation Status, Notification Bell */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Live Date & Time */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111827] border border-slate-800 text-xs text-slate-300 font-mono tabular-nums whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{formattedDate}</span>
          <span className="text-slate-600" aria-hidden="true">
            |
          </span>
          <span className="text-slate-100">{formattedTime}</span>
        </div>

        {/* Station Selector */}
        <div className="flex items-center gap-1.5 bg-[#111827] border border-slate-800 rounded-lg px-2.5 py-1.5">
          <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <label htmlFor="header-station-select" className="sr-only">
            Select transit station
          </label>
          <select
            id="header-station-select"
            value={selectedStationFilter}
            onChange={(e) => setSelectedStationFilter(e.target.value as StationFilter)}
            className="bg-transparent text-xs sm:text-sm text-slate-100 font-medium focus:outline-none cursor-pointer pr-1"
          >
            <option value="all" className="bg-[#111827] text-slate-100">
              All Stations (4)
            </option>
            {stations.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#111827] text-slate-100">
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* System Status / Play-Pause Control */}
        <button
          type="button"
          onClick={toggleSimulation}
          aria-label={settings.simulationRunning ? 'Pause simulation' : 'Resume simulation'}
          className={`hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            settings.simulationRunning
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
          }`}
        >
          {settings.simulationRunning ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          <span>{settings.simulationRunning ? 'Simulation Active' : 'Simulation Paused'}</span>
        </button>

        {/* Notification Popover Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((prev) => !prev)}
            aria-label={`Notifications (${activeAlertsCount} active alerts)`}
            aria-expanded={notificationsOpen}
            className="relative p-2 rounded-lg bg-[#111827] border border-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-700 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {activeAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-mono font-semibold flex items-center justify-center">
                {activeAlertsCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#111827] border border-slate-700/80 shadow-2xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-100">
                  Active Transit Alerts ({activeAlertsCount})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(false);
                    setActivePage('alert-centre');
                  }}
                  className="text-xs font-medium text-blue-400 hover:text-blue-300"
                >
                  Open Alert Centre
                </button>
              </div>
              <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto">
                {activeAlerts.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400">
                    No active alerts right now. All monitored zones nominal.
                  </div>
                ) : (
                  activeAlerts.map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        setActivePage('alert-centre');
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-800/50 transition-colors block"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-100 truncate">
                          {alert.stationName} · {alert.zoneName}
                        </span>
                        <SeverityTag severity={alert.severity} />
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">{alert.description}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
