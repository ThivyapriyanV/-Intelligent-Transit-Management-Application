import React, { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
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
import {
  buildDailyReportRecords,
  generateCsvReport,
  getWeeklyPassengerTrends,
} from '../services/reportService';

export const ReportsPage: React.FC = () => {
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
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Report Window:</span>
          <div className="inline-flex items-center p-1 rounded-lg bg-[#111827] border border-slate-800">
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
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111827] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {exportMessage && (
        <div className="no-print px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
          {exportMessage}
        </div>
      )}

      {/* Report Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#111827] border border-slate-800/90 p-4">
          <div className="text-xs text-slate-400">Daily Passenger Throughput (Est.)</div>
          <div className="text-2xl font-semibold text-slate-100 font-mono tabular-nums mt-1">
            {totalEstimatedDailyPax.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl bg-[#111827] border border-slate-800/90 p-4">
          <div className="text-xs text-slate-400">Primary Peak Crowd Window</div>
          <div className="text-2xl font-semibold text-slate-100 font-mono tabular-nums mt-1">
            08:30 - 09:30
          </div>
        </div>
        <div className="rounded-xl bg-[#111827] border border-slate-800/90 p-4">
          <div className="text-xs text-slate-400">Alert Statistics (Session)</div>
          <div className="text-2xl font-semibold text-amber-400 font-mono tabular-nums mt-1">
            {totalAlertsLogged} logged
          </div>
        </div>
        <div className="rounded-xl bg-[#111827] border border-slate-800/90 p-4">
          <div className="text-xs text-slate-400">Bus Recommendations Issued</div>
          <div className="text-2xl font-semibold text-blue-400 font-mono tabular-nums mt-1">
            {totalBusesSuggested} buses
          </div>
        </div>
      </div>

      {/* Charts: Weekly Passenger Trends + Station Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-xl bg-[#111827] border border-slate-800/90 p-5">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">
            Weekly Passenger Trends by Hub (Simulated)
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Estimated daily commuter throughput across Monday–Sunday
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrends} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="day" stroke="#94A3B8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F1F5F9',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="guindy" name="Guindy" fill="#EF4444" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar
                  dataKey="chennaiCentral"
                  name="Chennai Central"
                  fill="#3B82F6"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar dataKey="tNagar" name="T. Nagar" fill="#F59E0B" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="tambaram" name="Tambaram" fill="#10B981" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-5 rounded-xl bg-[#111827] border border-slate-800/90 p-5">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">
            Station Comparison Summary
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Estimated daily load vs occupancy and alert volume
          </p>
          <div className="space-y-3 mt-2">
            {stationComparisonData.map((row) => (
              <div
                key={row.station}
                className="p-3.5 rounded-lg bg-[#0F172A] border border-slate-800/80 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-medium text-slate-100">{row.station}</div>
                  <div className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                    Peak Load: {row.occupancy}% · Alerts: {row.alerts}
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="text-sm font-semibold text-slate-100">
                    {row.dailyEstimate.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400">est. daily pax</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Daily Statistics Table */}
      <section className="rounded-xl bg-[#111827] border border-slate-800/90 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">
            Daily Station Statistics ({dailyRecords.length} records)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-medium text-slate-400 bg-[#0F172A]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Station</th>
                <th className="py-3 px-4 text-right">Est. Daily Pax</th>
                <th className="py-3 px-4 text-right">Peak Occupancy</th>
                <th className="py-3 px-4">Peak Period</th>
                <th className="py-3 px-4 text-right">Alerts</th>
                <th className="py-3 px-4 text-right">Rec. Buses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {dailyRecords.map((rec, idx) => (
                <tr key={`${rec.date}-${rec.stationId}-${idx}`} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-4 font-mono text-xs text-slate-300">{rec.date}</td>
                  <td className="py-2.5 px-4 font-medium text-slate-100">{rec.stationName}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-200">
                    {rec.totalPassengers.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-200">
                    {rec.peakOccupancy}%
                  </td>
                  <td className="py-2.5 px-4 font-mono text-xs text-slate-300">{rec.peakHour}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-amber-400">
                    {rec.alertsTriggered}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-blue-400">
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
