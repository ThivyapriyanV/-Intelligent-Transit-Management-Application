import React from 'react';
import { BusFront, CheckCircle2, ClipboardCheck, Info } from 'lucide-react';
import { useTransit } from '../context/TransitContext';
import {
  DensityTag,
  PriorityTag,
  RecommendationStatusText,
} from '../components/common/StatusIndicator';

export const BusRecommendationsPage: React.FC = () => {
  const { recommendations, selectedStationFilter, updateRecommendationStatus } = useTransit();

  const visibleRecommendations =
    selectedStationFilter === 'all'
      ? recommendations
      : recommendations.filter((r) => r.stationId === selectedStationFilter);

  const totalBusesRecommended = visibleRecommendations.reduce(
    (sum, r) => sum + r.recommendedAdditionalBuses,
    0,
  );
  const urgentOrHighCount = visibleRecommendations.filter(
    (r) => r.priority === 'URGENT' || r.priority === 'HIGH',
  ).length;
  const assignedCount = visibleRecommendations.filter((r) => r.status === 'ASSIGNED').length;

  return (
    <div className="space-y-6">
      {/* Prototype Advisory Notice */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-200">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <span>
          <strong>Decision Support Prototype Only:</strong> Bus deployment suggestions are
          calculated from simulated station occupancy and +30m Holt forecasts. Marking an item as
          Reviewed or Assigned records operator intent locally and does not dispatch real transit
          vehicles.
        </span>
      </div>

      {/* Priority Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-[#111827] border border-slate-800/90 p-4">
          <div className="text-xs text-slate-400">Stations Requiring Additional Buses</div>
          <div className="text-2xl font-semibold text-slate-100 font-mono tabular-nums mt-1">
            {visibleRecommendations.length}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {urgentOrHighCount} High / Urgent priority
          </div>
        </div>
        <div className="rounded-xl bg-[#111827] border border-slate-800/90 p-4">
          <div className="text-xs text-slate-400">Total Additional Buses Suggested</div>
          <div className="text-2xl font-semibold text-amber-400 font-mono tabular-nums mt-1">
            {totalBusesRecommended}
          </div>
          <div className="text-xs text-slate-400 mt-1">Based on 55-passenger standard bus load</div>
        </div>
        <div className="rounded-xl bg-[#111827] border border-slate-800/90 p-4">
          <div className="text-xs text-slate-400">Operator Workflow Progress</div>
          <div className="text-2xl font-semibold text-emerald-400 font-mono tabular-nums mt-1">
            {assignedCount} / {visibleRecommendations.length}
          </div>
          <div className="text-xs text-slate-400 mt-1">Marked assigned in prototype queue</div>
        </div>
      </div>

      {/* Station Priority Cards */}
      {visibleRecommendations.length === 0 ? (
        <div className="rounded-xl bg-[#111827] border border-slate-800/90 p-10 text-center">
          <BusFront className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-100">
            No additional bus deployments recommended for the selected station scope.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Current and projected passenger volumes remain below the 65% capacity threshold.
          </p>
        </div>
      ) : (
        <>
          <section aria-label="Station Priority Overview" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleRecommendations.map((rec) => (
              <div
                key={rec.id}
                className="rounded-xl bg-[#111827] border border-slate-800/90 p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-semibold text-slate-100">{rec.stationName}</h3>
                      <PriorityTag priority={rec.priority} />
                    </div>
                    <DensityTag level={rec.crowdSeverity} />
                  </div>

                  <p className="text-xs text-slate-300">{rec.reason}</p>
                </div>

                <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-800/80 text-xs">
                  <div>
                    <div className="text-slate-400">Current</div>
                    <div className="text-base font-semibold text-slate-100 font-mono tabular-nums mt-0.5">
                      {rec.currentPassengers}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Predicted (+30m)</div>
                    <div className="text-base font-semibold text-slate-100 font-mono tabular-nums mt-0.5">
                      {rec.predictedPassengers}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Rec. Buses</div>
                    <div className="text-base font-semibold text-amber-400 font-mono tabular-nums mt-0.5">
                      +{rec.recommendedAdditionalBuses}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-400 font-mono tabular-nums">
                    Window: {rec.suggestedDeploymentTime} ·{' '}
                    <RecommendationStatusText status={rec.status} />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateRecommendationStatus(rec.id, 'REVIEWED')}
                      disabled={rec.status === 'REVIEWED'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 border border-slate-700 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      <span>Mark Reviewed</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRecommendationStatus(rec.id, 'ASSIGNED')}
                      disabled={rec.status === 'ASSIGNED'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 disabled:opacity-50 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition-colors whitespace-nowrap"
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
          <section className="rounded-xl bg-[#111827] border border-slate-800/90 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-slate-100">
                Bus Deployment Recommendation Ledger
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-medium text-slate-400 bg-[#0F172A]">
                    <th className="py-3 px-4">Station</th>
                    <th className="py-3 px-4 text-right">Current Pax</th>
                    <th className="py-3 px-4 text-right">Predicted Pax</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4 text-right">Add. Buses</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Suggested Window</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-sm">
                  {visibleRecommendations.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-100">{rec.stationName}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-200">
                        {rec.currentPassengers}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-200">
                        {rec.predictedPassengers}
                      </td>
                      <td className="py-3 px-4">
                        <DensityTag level={rec.crowdSeverity} />
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-amber-400">
                        {rec.recommendedAdditionalBuses}
                      </td>
                      <td className="py-3 px-4">
                        <PriorityTag priority={rec.priority} />
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-300">
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
