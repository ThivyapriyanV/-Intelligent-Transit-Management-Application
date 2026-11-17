import React from 'react';
import { ArrowRight, BusFront, CheckCircle2, ClipboardCheck, Info } from 'lucide-react';
import { useTransit } from '../context/TransitContext';
import {
  DensityTag,
  PriorityTag,
  RecommendationStatusText,
} from '../components/common/StatusIndicator';

export const BusRecommendationsPage: React.FC = () => {
  const {
    recommendations,
    selectedStationFilter,
    updateRecommendationStatus,
    setActivePage,
  } = useTransit();

  const visibleRecommendations =
    selectedStationFilter === 'all'
      ? recommendations
      : recommendations.filter((r) => r.stationId === selectedStationFilter);

  const totalBusesRecommended = visibleRecommendations.reduce(
    (sum, r) => sum + r.recommendedAdditionalBuses,
    0,
  );
  const totalStandbyAvailable = visibleRecommendations.reduce(
    (sum, r) => sum + (r.deployableAvailableBuses ?? 0),
    0,
  );
  const totalExternalShortfall = visibleRecommendations.reduce(
    (sum, r) => sum + (r.netShortfallBuses ?? 0),
    0,
  );
  const urgentOrHighCount = visibleRecommendations.filter(
    (r) => r.priority === 'URGENT' || r.priority === 'HIGH',
  ).length;
  const assignedCount = visibleRecommendations.filter((r) => r.status === 'ASSIGNED').length;

  return (
    <div className="space-y-6">
      {/* Prototype Advisory Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#201C22] border border-[#B51232]/40 text-xs text-[#AAA3AD]">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#D01940] shrink-0 mt-0.5" />
          <span>
            <strong className="text-[#F4F1F3]">Decision Support Prototype Only:</strong> Bus
            deployment requirements are computed from simulated demand and active fleet telemetry (
            <span className="font-mono text-[#F4F1F3]">Required − Running</span>), considering only{' '}
            <span className="font-mono text-[#FACC15]">AVAILABLE</span> standby buses and excluding
            maintenance or out-of-service units.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setActivePage('bus-fleet')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#262128] hover:bg-[#343039]/60 border border-[#343039] text-[#F4F1F3] text-xs font-medium transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <span>Open Fleet &amp; Routes</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Priority Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-4">
          <div className="text-xs text-[#AAA3AD]">Corridors Requiring Buses</div>
          <div className="text-2xl font-semibold text-[#F4F1F3] font-display tabular-nums mt-1">
            {visibleRecommendations.length}
          </div>
          <div className="text-xs text-[#77717B] mt-1">
            {urgentOrHighCount} High / Urgent priority
          </div>
        </div>
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-4">
          <div className="text-xs text-[#AAA3AD]">Total Additional Buses Required</div>
          <div className="text-2xl font-semibold text-[#D01940] font-display tabular-nums mt-1">
            {totalBusesRecommended}
          </div>
          <div className="text-xs text-[#77717B] mt-1">Required − Currently Running</div>
        </div>
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-4">
          <div className="text-xs text-[#AAA3AD]">Coverable by Standby / Shortfall</div>
          <div className="text-2xl font-semibold text-[#FACC15] font-display tabular-nums mt-1">
            {totalStandbyAvailable}{' '}
            <span className="text-sm font-normal text-[#FB7185]">
              / {totalExternalShortfall} shortfall
            </span>
          </div>
          <div className="text-xs text-[#77717B] mt-1">
            Maintenance &amp; OOS buses excluded
          </div>
        </div>
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-4">
          <div className="text-xs text-[#AAA3AD]">Operator Workflow Progress</div>
          <div className="text-2xl font-semibold text-[#4ADE80] font-display tabular-nums mt-1">
            {assignedCount} / {visibleRecommendations.length}
          </div>
          <div className="text-xs text-[#77717B] mt-1">Marked assigned in prototype queue</div>
        </div>
      </div>

      {/* Station Priority Cards */}
      {visibleRecommendations.length === 0 ? (
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-10 text-center">
          <BusFront className="w-8 h-8 text-[#4ADE80] mx-auto mb-2" />
          <p className="text-sm font-medium text-[#F4F1F3]">
            No additional bus deployments recommended for the selected station scope.
          </p>
          <p className="text-xs text-[#AAA3AD] mt-1">
            Currently running fleet capacity meets projected passenger demand.
          </p>
        </div>
      ) : (
        <>
          <section
            aria-label="Station Priority Overview"
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {visibleRecommendations.map((rec) => (
              <div
                key={rec.id}
                className={`rounded-xl bg-[#201C22] p-5 flex flex-col justify-between gap-4 ${
                  rec.priority === 'URGENT'
                    ? 'border border-[#B51232]/65 crimson-glow-sm'
                    : 'border border-[#343039]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <h3 className="text-base font-semibold text-[#F4F1F3] font-display truncate">
                        {rec.stationName}
                        {rec.routeId ? ` · ${rec.routeId}` : ''}
                      </h3>
                      <PriorityTag priority={rec.priority} />
                    </div>
                    <DensityTag level={rec.crowdSeverity} />
                  </div>

                  <p className="text-xs text-[#AAA3AD]">{rec.reason}</p>
                </div>

                <div className="grid grid-cols-4 gap-2 py-3 border-y border-[#343039] text-xs">
                  <div>
                    <div className="text-[#77717B]">Required</div>
                    <div className="text-base font-semibold text-[#F4F1F3] font-display tabular-nums mt-0.5">
                      {rec.requiredBuses ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#77717B]">Running</div>
                    <div className="text-base font-semibold text-[#4ADE80] font-display tabular-nums mt-0.5">
                      {rec.runningBuses ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#77717B]">Avail. Standby</div>
                    <div className="text-base font-semibold text-[#FACC15] font-display tabular-nums mt-0.5">
                      {rec.deployableAvailableBuses ?? 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#77717B]">Add. Needed</div>
                    <div className="text-base font-semibold text-[#D01940] font-display tabular-nums mt-0.5">
                      +{rec.recommendedAdditionalBuses}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-[#AAA3AD] font-mono tabular-nums">
                    Window: {rec.suggestedDeploymentTime} ·{' '}
                    <RecommendationStatusText status={rec.status} />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateRecommendationStatus(rec.id, 'REVIEWED')}
                      disabled={rec.status === 'REVIEWED'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#262128] hover:bg-[#343039]/60 disabled:opacity-50 border border-[#343039] text-[#F4F1F3] text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      <span>Mark Reviewed</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRecommendationStatus(rec.id, 'ASSIGNED')}
                      disabled={rec.status === 'ASSIGNED'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B51232] hover:bg-[#D01940] disabled:opacity-50 text-[#F4F1F3] text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Assigned</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Detailed Recommendation Table */}
          <section className="rounded-xl bg-[#201C22] border border-[#343039] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#343039]">
              <h2 className="text-sm font-medium text-[#F4F1F3] font-display">
                Bus Deployment Recommendation Ledger
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#343039] text-xs font-medium text-[#AAA3AD] bg-[#262128]">
                    <th className="py-3 px-4">Station / Route</th>
                    <th className="py-3 px-4 text-right">Demand Pax</th>
                    <th className="py-3 px-4 text-right">Running</th>
                    <th className="py-3 px-4 text-right">Required</th>
                    <th className="py-3 px-4 text-right">Add. Needed</th>
                    <th className="py-3 px-4 text-right">Standby / Shortfall</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Suggested Window</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#343039] text-sm">
                  {visibleRecommendations.map((rec) => (
                    <tr key={rec.id} className="hover:bg-[#B51232]/10 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#F4F1F3]">{rec.stationName}</div>
                        {rec.routeName && (
                          <div className="text-[11px] font-mono text-[#77717B]">
                            {rec.routeId} · {rec.routeName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#AAA3AD]">
                        {rec.currentPassengers}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#4ADE80]">
                        {rec.runningBuses ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#F4F1F3]">
                        {rec.requiredBuses ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#D01940]">
                        {rec.recommendedAdditionalBuses}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-[#AAA3AD]">
                        <span className="text-[#FACC15]">{rec.deployableAvailableBuses ?? 0}</span>{' '}
                        /{' '}
                        <span className="text-[#FB7185]">{rec.netShortfallBuses ?? 0} ext</span>
                      </td>
                      <td className="py-3 px-4">
                        <PriorityTag priority={rec.priority} />
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[#AAA3AD]">
                        {rec.suggestedDeploymentTime}
                      </td>
                      <td className="py-3 px-4">
                        <RecommendationStatusText status={rec.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
