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
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-4">
          <div className="text-xs text-[#AAA3AD]">Active Alerts</div>
          <div className="text-2xl font-semibold text-[#FB7185] font-display tabular-nums mt-1">
            {counts.active}
          </div>
        </div>
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-4">
          <div className="text-xs text-[#AAA3AD]">Critical Unresolved</div>
          <div className="text-2xl font-semibold text-[#D01940] font-display tabular-nums mt-1">
            {counts.critical}
          </div>
        </div>
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-4">
          <div className="text-xs text-[#AAA3AD]">Acknowledged</div>
          <div className="text-2xl font-semibold text-[#FB923C] font-display tabular-nums mt-1">
            {counts.acknowledged}
          </div>
        </div>
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-4">
          <div className="text-xs text-[#AAA3AD]">Resolved</div>
          <div className="text-2xl font-semibold text-[#4ADE80] font-display tabular-nums mt-1">
            {counts.resolved}
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#343039]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#AAA3AD]">Severity:</span>
          <div className="inline-flex items-center p-1 rounded-lg bg-[#201C22] border border-[#343039]">
            {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  severityFilter === sev
                    ? 'bg-[#B51232] text-[#F4F1F3]'
                    : 'text-[#AAA3AD] hover:text-[#F4F1F3]'
                }`}
              >
                {sev === 'ALL' ? 'All Severities' : sev}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#AAA3AD]">Status:</span>
          <div className="inline-flex items-center p-1 rounded-lg bg-[#201C22] border border-[#343039]">
            {(['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-[#262128] text-[#F4F1F3] border border-[#B51232]/50'
                    : 'text-[#AAA3AD] hover:text-[#F4F1F3] border border-transparent'
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
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-10 text-center">
          <p className="text-sm font-medium text-[#F4F1F3]">
            No alerts match the selected severity and status filters.
          </p>
          <p className="text-xs text-[#AAA3AD] mt-1">
            Adjust filters above to view resolved or lower-priority alerts.
          </p>
          <button
            type="button"
            onClick={() => {
              setSeverityFilter('ALL');
              setStatusFilter('ALL');
            }}
            className="mt-4 px-3.5 py-2 rounded-lg bg-[#B51232] hover:bg-[#D01940] text-[#F4F1F3] text-xs font-medium transition-colors"
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
            const isCritActive = alert.severity === 'CRITICAL' && alert.status === 'ACTIVE';
            return (
              <article
                key={alert.id}
                className={`rounded-xl bg-[#201C22] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                  isCritActive
                    ? 'border border-[#B51232]/65 crimson-glow-sm'
                    : 'border border-[#343039] hover:border-[#4B4452]'
                }`}
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-mono text-[#77717B]">{alert.id}</span>
                    <SeverityTag severity={alert.severity} />
                    <span className="text-xs font-medium text-[#F4F1F3]">{alert.category}</span>
                    <span className="text-[#343039]" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-xs text-[#AAA3AD] font-mono tabular-nums">
                      {timeFormatted}
                    </span>
                    <span className="text-[#343039]" aria-hidden="true">
                      ·
                    </span>
                    <AlertStatusText status={alert.status} />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-[#F4F1F3] font-display">
                      {alert.stationName} — {alert.zoneName}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#AAA3AD] mt-0.5">{alert.description}</p>
                  </div>

                  <div className="text-xs text-[#77717B]">
                    <span className="font-medium text-[#AAA3AD]">Recommended Action: </span>
                    {alert.recommendedAction}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {alert.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#262128] hover:bg-[#F97316]/15 border border-[#F97316]/45 text-[#FB923C] text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Acknowledge</span>
                    </button>
                  )}

                  {alert.status !== 'RESOLVED' && (
                    <button
                      type="button"
                      onClick={() => resolveAlert(alert.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#262128] hover:bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#4ADE80] text-xs font-medium transition-colors whitespace-nowrap"
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
