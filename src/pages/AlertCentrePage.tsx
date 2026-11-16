import React, { useMemo, useState } from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { useTransit } from '../context/TransitContext';
import { AlertSeverity, AlertStatus } from '../types/transit';
import { AlertStatusText, SeverityTag } from '../components/common/StatusIndicator';

export const AlertCentrePage: React.FC = () => {
  const { alerts, selectedStationFilter, acknowledgeAlert, resolveAlert } = useTransit();

  const [severityFilter, setSeverityFilter] = useState<'ALL' | AlertSeverity>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AlertStatus>('ALL');

  const stationScopedAlerts = useMemo(() => {
    if (selectedStationFilter === 'all') return alerts;
    return alerts.filter((a) => a.stationId === selectedStationFilter);
  }, [alerts, selectedStationFilter]);

  const filteredAlerts = useMemo(() => {
    return stationScopedAlerts.filter((a) => {
      if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      return true;
    });
  }, [stationScopedAlerts, severityFilter, statusFilter]);

  const counts = useMemo(() => {
    return {
      total: stationScopedAlerts.length,
      active: stationScopedAlerts.filter((a) => a.status === 'ACTIVE').length,
      acknowledged: stationScopedAlerts.filter((a) => a.status === 'ACKNOWLEDGED').length,
      resolved: stationScopedAlerts.filter((a) => a.status === 'RESOLVED').length,
      critical: stationScopedAlerts.filter(
        (a) => a.severity === 'CRITICAL' && a.status !== 'RESOLVED',
      ).length,
    };
  }, [stationScopedAlerts]);

  return (
    <div className="space-y-6">
      {/* Alert Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#111827] border border-slate-800/90 p-4">
          <div className="text-xs text-slate-400">Active Alerts</div>
          <div className="text-2xl font-semibold text-red-400 font-mono tabular-nums mt-1">
            {counts.active}
          </div>
        </div>
        <div className="rounded-xl bg-[#111827] border border-slate-800/90 p-4">
          <div className="text-xs text-slate-400">Critical Unresolved</div>
          <div className="text-2xl font-semibold text-amber-400 font-mono tabular-nums mt-1">
            {counts.critical}
          </div>
        </div>
        <div className="rounded-xl bg-[#111827] border border-slate-800/90 p-4">
          <div className="text-xs text-slate-400">Acknowledged</div>
          <div className="text-2xl font-semibold text-blue-400 font-mono tabular-nums mt-1">
            {counts.acknowledged}
          </div>
        </div>
        <div className="rounded-xl bg-[#111827] border border-slate-800/90 p-4">
          <div className="text-xs text-slate-400">Resolved</div>
          <div className="text-2xl font-semibold text-emerald-400 font-mono tabular-nums mt-1">
            {counts.resolved}
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Severity:</span>
          <div className="inline-flex items-center p-1 rounded-lg bg-[#111827] border border-slate-800">
            {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  severityFilter === sev
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {sev === 'ALL' ? 'All Severities' : sev}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Status:</span>
          <div className="inline-flex items-center p-1 rounded-lg bg-[#111827] border border-slate-800">
            {(['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-slate-700 text-slate-100'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {st === 'ALL' ? 'All Statuses' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts List / Empty State */}
      {filteredAlerts.length === 0 ? (
        <div className="rounded-xl bg-[#111827] border border-slate-800/90 p-10 text-center">
          <p className="text-sm font-medium text-slate-200">
            No alerts match the selected severity and status filters.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Adjust filters above to view resolved or lower-priority alerts.
          </p>
          <button
            type="button"
            onClick={() => {
              setSeverityFilter('ALL');
              setStatusFilter('ALL');
            }}
            className="mt-4 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const timeFormatted = new Date(alert.timestamp).toLocaleTimeString('en-IN', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            return (
              <article
                key={alert.id}
                className="rounded-xl bg-[#111827] border border-slate-800/90 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-mono text-slate-400">{alert.id}</span>
                    <SeverityTag severity={alert.severity} />
                    <span className="text-xs font-medium text-slate-200">{alert.category}</span>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-xs text-slate-400 font-mono tabular-nums">
                      {timeFormatted}
                    </span>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <AlertStatusText status={alert.status} />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      {alert.stationName} — {alert.zoneName}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-0.5">{alert.description}</p>
                  </div>

                  <div className="text-xs text-slate-400">
                    <span className="font-medium text-slate-300">Recommended Action: </span>
                    {alert.recommendedAction}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {alert.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Acknowledge</span>
                    </button>
                  )}

                  {alert.status !== 'RESOLVED' && (
                    <button
                      type="button"
                      onClick={() => resolveAlert(alert.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Resolve Alert</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
