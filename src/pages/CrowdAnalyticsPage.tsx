import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTransit } from '../context/TransitContext';
import { StationId } from '../types/transit';
import { DensityTag, getDensityColorHex } from '../components/common/StatusIndicator';

type TimeRangeFilter = 'today' | 'morning-peak' | 'evening-peak';

export const CrowdAnalyticsPage: React.FC = () => {
  const { stations, hourlyFlow } = useTransit();
  const [stationFilter, setStationFilter] = useState<'all' | StationId>('all');
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('today');

  const activeStations = useMemo(() => {
    if (stationFilter === 'all') return stations;
    return stations.filter((s) => s.id === stationFilter);
  }, [stations, stationFilter]);

  const filteredHourly = useMemo(() => {
    if (timeRange === 'morning-peak') {
      return hourlyFlow.filter((h) => h.hour >= '07:00' && h.hour <= '11:00');
    }
    if (timeRange === 'evening-peak') {
      return hourlyFlow.filter((h) => h.hour >= '16:00' && h.hour <= '20:00');
    }
    return hourlyFlow;
  }, [hourlyFlow, timeRange]);

  const stationComparisonData = useMemo(
    () =>
      stations.map((s) => ({
        name: s.name,
        passengers: s.currentPassengers,
        capacity: s.totalCapacity,
        occupancy: s.occupancyPercentage,
        level: s.densityLevel,
      })),
    [stations],
  );

  const zoneAnalyticsRows = useMemo(
    () => activeStations.flatMap((s) => s.zones),
    [activeStations],
  );

  const peakWindow = useMemo(() => {
    let maxRow = filteredHourly[0];
    filteredHourly.forEach((row) => {
      if (row.total > (maxRow?.total ?? 0)) {
        maxRow = row;
      }
    });
    return maxRow;
  }, [filteredHourly]);

  return (
    <div className="space-y-6">
      {/* Interactive Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400 mr-1">Station:</span>
          <div className="inline-flex items-center p-1 rounded-lg bg-[#111827] border border-slate-800">
            <button
              type="button"
              onClick={() => setStationFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                stationFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              All Stations
            </button>
            {stations.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStationFilter(s.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  stationFilter === s.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Time Window:</span>
          <div className="inline-flex items-center p-1 rounded-lg bg-[#111827] border border-slate-800">
            {(
              [
                { id: 'today', label: 'Full Day (06-21h)' },
                { id: 'morning-peak', label: 'Morning Peak' },
                { id: 'evening-peak', label: 'Evening Peak' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTimeRange(item.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  timeRange === item.id
                    ? 'bg-slate-700 text-slate-100'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Classification Legend + Peak Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#111827] border border-slate-800/90 p-4">
          <div className="text-xs text-slate-400">Selected Scope Passengers</div>
          <div className="text-2xl font-semibold text-slate-100 font-mono tabular-nums mt-1">
            {activeStations.reduce((s, st) => s + st.currentPassengers, 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl bg-[#111827] border border-slate-800/90 p-4">
          <div className="text-xs text-slate-400">Peak Crowd Hour</div>
          <div className="text-2xl font-semibold text-slate-100 font-mono tabular-nums mt-1">
            {peakWindow?.hour ?? '18:00'}
          </div>
        </div>
        <div className="rounded-xl bg-[#111827] border border-slate-800/90 p-4">
          <div className="text-xs text-slate-400">Critical / High Zones</div>
          <div className="text-2xl font-semibold text-amber-400 font-mono tabular-nums mt-1">
            {
              zoneAnalyticsRows.filter(
                (z) => z.densityLevel === 'CRITICAL' || z.densityLevel === 'HIGH',
              ).length
            }{' '}
            / {zoneAnalyticsRows.length}
          </div>
        </div>
        <div className="rounded-xl bg-[#111827] border border-slate-800/90 p-4">
          <div className="text-xs text-slate-400 mb-1.5">Density Bands</div>
          <div className="text-[11px] text-slate-300 space-y-0.5 font-mono tabular-nums">
            <div>LOW &lt;40% · MOD 40-65%</div>
            <div>HIGH 66-85% · CRIT &gt;85%</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Passenger Count by Station */}
        <section className="lg:col-span-5 rounded-xl bg-[#111827] border border-slate-800/90 p-5">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">
            Passenger Count & Occupancy by Station
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Current simulated load compared across all 4 monitoring hubs
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stationComparisonData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="name" stroke="#94A3B8" tick={{ fontSize: 11 }} />
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
                <Bar dataKey="passengers" name="Passengers" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {stationComparisonData.map((entry, idx) => (
                    <Cell key={idx} fill={getDensityColorHex(entry.level)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Hourly Passenger Flow */}
        <section className="lg:col-span-7 rounded-xl bg-[#111827] border border-slate-800/90 p-5">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">
            Hourly Passenger Flow & Peak Hours
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Simulated diurnal transit volume across selected time window
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredHourly} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="hour" stroke="#94A3B8" tick={{ fontSize: 11 }} />
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
                {(stationFilter === 'all' || stationFilter === 'guindy') && (
                  <Line
                    type="monotone"
                    dataKey="guindy"
                    name="Guindy"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
                {(stationFilter === 'all' || stationFilter === 'chennai-central') && (
                  <Line
                    type="monotone"
                    dataKey="chennaiCentral"
                    name="Chennai Central"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
                {(stationFilter === 'all' || stationFilter === 't-nagar') && (
                  <Line
                    type="monotone"
                    dataKey="tNagar"
                    name="T. Nagar"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
                {(stationFilter === 'all' || stationFilter === 'tambaram') && (
                  <Line
                    type="monotone"
                    dataKey="tambaram"
                    name="Tambaram"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Zone-Level Density Table */}
      <section className="rounded-xl bg-[#111827] border border-slate-800/90 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Zone-by-Zone Density Breakdown</h2>
            <p className="text-xs text-slate-400">
              Detailed occupancy percentages and crowd classifications
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-medium text-slate-400 bg-[#0F172A]">
                <th className="py-3 px-4">Station</th>
                <th className="py-3 px-4">Zone</th>
                <th className="py-3 px-4">Camera ID</th>
                <th className="py-3 px-4 text-right">Passengers</th>
                <th className="py-3 px-4 text-right">Capacity</th>
                <th className="py-3 px-4 text-right">Occupancy</th>
                <th className="py-3 px-4">Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {zoneAnalyticsRows.map((zone) => (
                <tr key={zone.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-100">{zone.stationName}</td>
                  <td className="py-3 px-4 text-slate-300">{zone.zoneName}</td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-400">{zone.cameraCode}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-200">
                    {zone.status === 'ONLINE' ? zone.passengerCount : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                    {zone.capacity}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-100">
                    {zone.status === 'ONLINE' ? `${zone.occupancyPercentage}%` : 'Offline'}
                  </td>
                  <td className="py-3 px-4">
                    {zone.status === 'ONLINE' ? (
                      <DensityTag level={zone.densityLevel} />
                    ) : (
                      <span className="text-xs text-red-400 font-medium">Camera Offline</span>
                    )}
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
