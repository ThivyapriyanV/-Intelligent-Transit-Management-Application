import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#343039]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#AAA3AD] mr-1">Station:</span>
          <div className="inline-flex flex-wrap items-center p-1 rounded-lg bg-[#201C22] border border-[#343039]">
            <button
              type="button"
              onClick={() => setStationFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                stationFilter === 'all'
                  ? 'bg-[#B51232] text-[#F4F1F3]'
                  : 'text-[#AAA3AD] hover:text-[#F4F1F3]'
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
                    ? 'bg-[#B51232] text-[#F4F1F3]'
                    : 'text-[#AAA3AD] hover:text-[#F4F1F3]'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#AAA3AD]">Time Window:</span>
          <div className="inline-flex items-center p-1 rounded-lg bg-[#201C22] border border-[#343039]">
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
                    ? 'bg-[#262128] text-[#F4F1F3] border border-[#B51232]/50'
                    : 'text-[#AAA3AD] hover:text-[#F4F1F3] border border-transparent'
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
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-4">
          <div className="text-xs text-[#AAA3AD]">Selected Scope Passengers</div>
          <div className="text-2xl font-semibold text-[#F4F1F3] font-display tabular-nums mt-1">
            {activeStations.reduce((s, st) => s + st.currentPassengers, 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-4">
          <div className="text-xs text-[#AAA3AD]">Peak Crowd Hour</div>
          <div className="text-2xl font-semibold text-[#F4F1F3] font-display tabular-nums mt-1">
            {peakWindow?.hour ?? '18:00'}
          </div>
        </div>
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-4">
          <div className="text-xs text-[#AAA3AD]">Critical / High Zones</div>
          <div className="text-2xl font-semibold text-[#FB923C] font-display tabular-nums mt-1">
            {
              zoneAnalyticsRows.filter(
                (z) => z.densityLevel === 'CRITICAL' || z.densityLevel === 'HIGH',
              ).length
            }{' '}
            / {zoneAnalyticsRows.length}
          </div>
        </div>
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-4">
          <div className="text-xs text-[#AAA3AD] mb-1.5">Density Bands</div>
          <div className="text-[11px] text-[#F4F1F3] space-y-0.5 font-mono tabular-nums">
            <div>LOW &lt;40% · MOD 40-65%</div>
            <div>HIGH 66-85% · CRIT &gt;85%</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Passenger Count by Station */}
        <section className="lg:col-span-5 rounded-xl bg-[#201C22] border border-[#343039] p-5">
          <h2 className="text-sm font-medium text-[#F4F1F3] font-display mb-1">
            Passenger Count &amp; Occupancy by Station
          </h2>
          <p className="text-xs text-[#AAA3AD] mb-4">
            Current simulated load compared across all 4 monitoring hubs
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stationComparisonData}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#343039" vertical={false} />
                <XAxis dataKey="name" stroke="#77717B" tick={{ fontSize: 11, fill: '#AAA3AD' }} />
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
                <Bar
                  dataKey="passengers"
                  name="Passengers"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                >
                  {stationComparisonData.map((entry, idx) => (
                    <Cell key={idx} fill={getDensityColorHex(entry.level)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Hourly Passenger Flow */}
        <section className="lg:col-span-7 rounded-xl bg-[#201C22] border border-[#343039] p-5">
          <h2 className="text-sm font-medium text-[#F4F1F3] font-display mb-1">
            Hourly Passenger Flow &amp; Peak Hours
          </h2>
          <p className="text-xs text-[#AAA3AD] mb-4">
            Simulated diurnal transit volume across selected time window
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredHourly} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#343039" vertical={false} />
                <XAxis dataKey="hour" stroke="#77717B" tick={{ fontSize: 11, fill: '#AAA3AD' }} />
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
                {(stationFilter === 'all' || stationFilter === 'guindy') && (
                  <Line
                    type="monotone"
                    dataKey="guindy"
                    name="Guindy"
                    stroke="#D01940"
                    strokeWidth={2.4}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
                {(stationFilter === 'all' || stationFilter === 'chennai-central') && (
                  <Line
                    type="monotone"
                    dataKey="chennaiCentral"
                    name="Chennai Central"
                    stroke="#F97316"
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
                    stroke="#EAB308"
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
                    stroke="#22C55E"
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
      <section className="rounded-xl bg-[#201C22] border border-[#343039] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#343039] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-[#F4F1F3] font-display">
              Zone-by-Zone Density Breakdown
            </h2>
            <p className="text-xs text-[#AAA3AD]">
              Detailed occupancy percentages and crowd classifications
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#343039] text-xs font-medium text-[#AAA3AD] bg-[#262128]">
                <th className="py-3 px-4">Station</th>
                <th className="py-3 px-4">Zone</th>
                <th className="py-3 px-4">Camera ID</th>
                <th className="py-3 px-4 text-right">Passengers</th>
                <th className="py-3 px-4 text-right">Capacity</th>
                <th className="py-3 px-4 text-right">Occupancy</th>
                <th className="py-3 px-4">Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#343039] text-sm">
              {zoneAnalyticsRows.map((zone) => (
                <tr
                  key={zone.id}
                  className="hover:bg-[#B51232]/10 transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-[#F4F1F3]">{zone.stationName}</td>
                  <td className="py-3 px-4 text-[#AAA3AD]">{zone.zoneName}</td>
                  <td className="py-3 px-4 font-mono text-xs text-[#77717B]">{zone.cameraCode}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#F4F1F3]">
                    {zone.status === 'ONLINE' ? zone.passengerCount : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#AAA3AD]">
                    {zone.capacity}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#F4F1F3]">
                    {zone.status === 'ONLINE' ? `${zone.occupancyPercentage}%` : 'Offline'}
                  </td>
                  <td className="py-3 px-4">
                    {zone.status === 'ONLINE' ? (
                      <DensityTag level={zone.densityLevel} />
                    ) : (
                      <span className="text-xs text-[#FB7185] font-medium">Camera Offline</span>
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
