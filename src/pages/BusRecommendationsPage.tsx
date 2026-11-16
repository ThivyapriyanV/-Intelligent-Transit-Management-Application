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
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[#201C22] border border-[#B51232]/40 text-xs text-[#AAA3AD]">
        <Info className="w-4 h-4 text-[#D01940] shrink-0 mt-0.5" />
        <span>
          <strong className="text-[#F4F1F3]">Decision Support Prototype Only:</strong> Bus
          deployment suggestions are calculated from simulated station occupancy and +30m Holt
          forecasts. Marking an item as Reviewed or Assigned records operator intent locally and
          does not dispatch real transit vehicles.
        </span>
      </div>

      {/* Priority Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-4">
          <div className="text-xs text-[#AAA3AD]">Stations Requiring Additional Buses</div>
          <div className="text-2xl font-semibold text-[#F4F1F3] font-display tabular-nums mt-1">
            {visibleRecommendations.length}
          </div>
          <div className="text-xs text-[#77717B] mt-1">
            {urgentOrHighCount} High / Urgent priority
          </div>
        </div>
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-4">
          <div className="text-xs text-[#AAA3AD]">Total Additional Buses Suggested</div>
          <div className="text-2xl font-semibold text-[#D01940] font-display tabular-nums mt-1">
            {totalBusesRecommended}
          </div>
          <div className="text-xs text-[#77717B] mt-1">Based on 55-passenger standard bus load</div>
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
            Current and projected passenger volumes remain below the 65% capacity threshold.
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
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-semibold text-[#F4F1F3] font-display">
                        {rec.stationName}
                      </h3>
                      <PriorityTag priority={rec.priority} />
                    </div>
                    <DensityTag level={rec.crowdSeverity} />
                  </div>

                  <p className="text-xs text-[#AAA3AD]">{rec.reason}</p>
                </div>

                <div className="grid grid-cols-3 gap-3 py-3 border-y border-[#343039] text-xs">
                  <div>
                    <div className="text-[#77717B]">Current</div>
                    <div className="text-base font-semibold text-[#F4F1F3] font-display tabular-nums mt-0.5">
                      {rec.currentPassengers}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#77717B]">Predicted (+30m)</div>
                    <div className="text-base font-semibold text-[#F4F1F3] font-display tabular-nums mt-0.5">
                      {rec.predictedPassengers}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#77717B]">Rec. Buses</div>
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
                <tbody className="divide-y divide-[#343039] text-sm">
                  {visibleRecommendations.map((rec) => (
                    <tr key={rec.id} className="hover:bg-[#B51232]/10 transition-colors">
                      <td className="py-3 px-4 font-medium text-[#F4F1F3]">{rec.stationName}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#AAA3AD]">
                        {rec.currentPassengers}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#F4F1F3]">
                        {rec.predictedPassengers}
                      </td>
                      <td className="py-3 px-4">
                        <DensityTag level={rec.crowdSeverity} />
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#D01940]">
                        {rec.recommendedAdditionalBuses}
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
