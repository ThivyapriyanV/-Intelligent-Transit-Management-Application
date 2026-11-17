import React, { useMemo, useState } from 'react';
import { Download, Eye, Printer } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTransit } from '../context/TransitContext';
import { useAuth } from '../context/AuthContext';
import { isPageReadOnly } from '../services/authService';
import {
  buildDailyReportRecords,
  generateCsvReport,
  getWeeklyPassengerTrends,
} from '../services/reportService';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const readOnly = isPageReadOnly(user?.assignedRole, 'reports');
  const { stations, alerts, recommendations, currentTime, selectedStationFilter } = useTransit();
  const [dateRangeDays, setDateRangeDays] = useState<1 | 7 | 30>(7);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const scopedStations = useMemo(() => {
    if (selectedStationFilter === 'all') return stations;
    return stations.filter((s) => s.id === selectedStationFilter);
  }, [stations, selectedStationFilter]);

  const weeklyTrends = useMemo(() => getWeeklyPassengerTrends(stations), [stations]);

  const dailyRecords = useMemo(
    () =>
      buildDailyReportRecords(
        scopedStations,
        alerts,
        recommendations,
        dateRangeDays,
        currentTime,
      ),
    [scopedStations, alerts, recommendations, dateRangeDays, currentTime],
  );

  const totalEstimatedDailyPax = dailyRecords
    .slice(0, scopedStations.length)
    .reduce((sum, r) => sum + r.totalPassengers, 0);

  const totalAlertsLogged = alerts.length;
  const totalBusesSuggested = recommendations.reduce(
    (s, r) => s + r.recommendedAdditionalBuses,
    0,
  );

  const stationComparisonData = scopedStations.map((s) => ({
    station: s.name,
    dailyEstimate: s.currentPassengers * 36,
    occupancy: s.occupancyPercentage,
    alerts: alerts.filter((a) => a.stationId === s.id).length,
  }));

  const handleExportCsv = () => {
    const csvContent = generateCsvReport(dailyRecords);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `transit-crowd-report-${dateRangeDays}d-${currentTime.toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportMessage(`Exported ${dailyRecords.length} report rows to CSV.`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toolbar: Date Range + CSV & Print Actions */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#343039]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#AAA3AD]">Report Window:</span>
          <div className="inline-flex items-center p-1 rounded-lg bg-[#201C22] border border-[#343039]">
            {(
              [
                { days: 1, label: 'Today (24h)' },
                { days: 7, label: 'Last 7 Days' },
                { days: 30, label: 'Last 30 Days' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.days}
                type="button"
                onClick={() => setDateRangeDays(opt.days)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  dateRangeDays === opt.days
                    ? 'bg-[#B51232] text-[#F4F1F3]'
                    : 'text-[#AAA3AD] hover:text-[#F4F1F3]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {readOnly && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/35 text-[#60A5FA] text-xs font-medium whitespace-nowrap">
              <Eye className="w-3.5 h-3.5" />
              <span>Read-Only Observer View</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#B51232] hover:bg-[#D01940] text-[#F4F1F3] text-xs font-medium transition-colors crimson-glow-sm whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#201C22] hover:bg-[#262128] border border-[#343039] text-[#F4F1F3] text-xs font-medium transition-colors whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {exportMessage && (
        <div className="no-print px-4 py-2.5 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 text-xs text-[#4ADE80]">
          {exportMessage}
        </div>
      )}

      {/* Report Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-4">
          <div className="text-xs text-[#AAA3AD]">Daily Passenger Throughput (Est.)</div>
          <div className="text-2xl font-semibold text-[#F4F1F3] font-display tabular-nums mt-1">
            {totalEstimatedDailyPax.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-4">
          <div className="text-xs text-[#AAA3AD]">Primary Peak Crowd Window</div>
          <div className="text-2xl font-semibold text-[#F4F1F3] font-display tabular-nums mt-1">
            08:30 - 09:30
          </div>
        </div>
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-4">
          <div className="text-xs text-[#AAA3AD]">Alert Statistics (Session)</div>
          <div className="text-2xl font-semibold text-[#FB923C] font-display tabular-nums mt-1">
            {totalAlertsLogged} logged
          </div>
        </div>
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-4">
          <div className="text-xs text-[#AAA3AD]">Bus Recommendations Issued</div>
          <div className="text-2xl font-semibold text-[#D01940] font-display tabular-nums mt-1">
            {totalBusesSuggested} buses
          </div>
        </div>
      </div>

      {/* Charts: Weekly Passenger Trends + Station Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-xl bg-[#201C22] border border-[#343039] p-5">
          <h2 className="text-sm font-medium text-[#F4F1F3] font-display mb-1">
            Weekly Passenger Trends by Hub (Simulated)
          </h2>
          <p className="text-xs text-[#AAA3AD] mb-4">
            Estimated daily commuter throughput across Monday–Sunday
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrends} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#343039" vertical={false} />
                <XAxis dataKey="day" stroke="#77717B" tick={{ fontSize: 11, fill: '#AAA3AD' }} />
                <YAxis stroke="#77717B" tick={{ fontSize: 11, fill: '#AAA3AD' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#262128',
                    borderColor: '#343039',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F4F1F3',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#AAA3AD' }} />
                <Bar
                  dataKey="guindy"
                  name="Guindy"
                  fill="#D01940"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="chennaiCentral"
                  name="Chennai Central"
                  fill="#F97316"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="tNagar"
                  name="T. Nagar"
                  fill="#EAB308"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="tambaram"
                  name="Tambaram"
                  fill="#22C55E"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-5 rounded-xl bg-[#201C22] border border-[#343039] p-5">
          <h2 className="text-sm font-medium text-[#F4F1F3] font-display mb-1">
            Station Comparison Summary
          </h2>
          <p className="text-xs text-[#AAA3AD] mb-4">
            Estimated daily load vs occupancy and alert volume
          </p>
          <div className="space-y-3 mt-2">
            {stationComparisonData.map((row) => (
              <div
                key={row.station}
                className="p-3.5 rounded-lg bg-[#262128] border border-[#343039] hover:border-[#B51232]/50 transition-colors flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-medium text-[#F4F1F3]">{row.station}</div>
                  <div className="text-xs text-[#AAA3AD] font-mono tabular-nums mt-0.5">
                    Peak Load: {row.occupancy}% · Alerts: {row.alerts}
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="text-sm font-semibold text-[#F4F1F3]">
                    {row.dailyEstimate.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[#77717B]">est. daily pax</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Daily Statistics Table */}
      <section className="rounded-xl bg-[#201C22] border border-[#343039] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#343039] flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#F4F1F3] font-display">
            Daily Station Statistics ({dailyRecords.length} records)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#343039] text-xs font-medium text-[#AAA3AD] bg-[#262128]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Station</th>
                <th className="py-3 px-4 text-right">Est. Daily Pax</th>
                <th className="py-3 px-4 text-right">Peak Occupancy</th>
                <th className="py-3 px-4">Peak Period</th>
                <th className="py-3 px-4 text-right">Alerts</th>
                <th className="py-3 px-4 text-right">Rec. Buses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#343039] text-sm">
              {dailyRecords.map((rec, idx) => (
                <tr
                  key={`${rec.date}-${rec.stationId}-${idx}`}
                  className="hover:bg-[#B51232]/10 transition-colors"
                >
                  <td className="py-2.5 px-4 font-mono text-xs text-[#AAA3AD]">{rec.date}</td>
                  <td className="py-2.5 px-4 font-medium text-[#F4F1F3]">{rec.stationName}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#F4F1F3]">
                    {rec.totalPassengers.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#AAA3AD]">
                    {rec.peakOccupancy}%
                  </td>
                  <td className="py-2.5 px-4 font-mono text-xs text-[#AAA3AD]">{rec.peakHour}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#FB923C]">
                    {rec.alertsTriggered}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#FB7185]">
                    {rec.busesRecommended}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
