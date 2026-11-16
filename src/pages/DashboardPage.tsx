import React from 'react';
import {
  Activity,
  ArrowRight,
  BellRing,
  BusFront,
  Camera,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTransit } from '../context/TransitContext';
import {
  DensityTag,
  getDensityColorHex,
  SeverityTag,
} from '../components/common/StatusIndicator';
import { calculateOccupancyPercentage, classifyCrowdDensity } from '../services/densityClassifier';

export const DashboardPage: React.FC = () => {
  const {
    filteredStations,
    stations,
    selectedStationFilter,
    alerts,
    recommendations,
    hourlyFlow,
    settings,
    setActivePage,
    setSelectedCameraId,
  } = useTransit();

  const totalPassengers = filteredStations.reduce((sum, s) => sum + s.currentPassengers, 0);
  const totalCapacity = filteredStations.reduce((sum, s) => sum + s.totalCapacity, 0);
  const avgOccupancy = calculateOccupancyPercentage(totalPassengers, totalCapacity);
  const avgDensityLevel = classifyCrowdDensity(avgOccupancy, settings.thresholds);

  const allFilteredZones = filteredStations.flatMap((s) => s.zones);
  const onlineZonesCount = allFilteredZones.filter((z) => z.status === 'ONLINE').length;

  const filteredAlerts =
    selectedStationFilter === 'all'
      ? alerts
      : alerts.filter((a) => a.stationId === selectedStationFilter);
  const activeAlerts = filteredAlerts.filter((a) => a.status === 'ACTIVE');

  const filteredRecs =
    selectedStationFilter === 'all'
      ? recommendations
      : recommendations.filter((r) => r.stationId === selectedStationFilter);
  const totalRecommendedBuses = filteredRecs.reduce(
    (sum, r) => sum + r.recommendedAdditionalBuses,
    0,
  );

  // Trend chart data respects selected station filter
  const trendChartData = hourlyFlow.map((pt) => {
    let passengers = pt.total;
    if (selectedStationFilter === 'chennai-central') passengers = pt.chennaiCentral;
    else if (selectedStationFilter === 't-nagar') passengers = pt.tNagar;
    else if (selectedStationFilter === 'guindy') passengers = pt.guindy;
    else if (selectedStationFilter === 'tambaram') passengers = pt.tambaram;
    return {
      hour: pt.hour,
      passengers,
    };
  });

  // Crowd density by zone bar chart
  const shortStationCode: Record<string, string> = {
    'Chennai Central': 'Central',
    'T. Nagar': 'T. Nagar',
    Guindy: 'Guindy',
    Tambaram: 'Tambaram',
  };
  const zoneDensityData = [...allFilteredZones]
    .filter((z) => z.status === 'ONLINE')
    .sort((a, b) => b.occupancyPercentage - a.occupancyPercentage)
    .slice(0, 8)
    .map((z) => ({
      name:
        selectedStationFilter === 'all'
          ? `${shortStationCode[z.stationName] ?? z.stationName} · ${z.zoneName.split(' ').slice(0, 2).join(' ')}`
          : z.zoneName,
      occupancy: z.occupancyPercentage,
      passengers: z.passengerCount,
      level: z.densityLevel,
    }));

  // Top crowded locations sorted by occupancy
  const topCrowdedZones = [...allFilteredZones]
    .filter((z) => z.status === 'ONLINE')
    .sort((a, b) => b.occupancyPercentage - a.occupancyPercentage)
    .slice(0, 5);

  const summaryCards = [
    {
      label: 'Total Passengers',
      value: totalPassengers.toLocaleString(),
      subtext: `Across ${filteredStations.length} station${filteredStations.length > 1 ? 's' : ''}`,
      icon: Users,
      accent: 'text-blue-400',
    },
    {
      label: 'Active Monitoring Zones',
      value: `${onlineZonesCount} / ${allFilteredZones.length}`,
      subtext: `${allFilteredZones.length - onlineZonesCount} camera offline`,
      icon: Camera,
      accent: 'text-emerald-400',
    },
    {
      label: 'Average Crowd Density',
      value: `${avgOccupancy}%`,
      subtext: `Classification: ${avgDensityLevel}`,
      icon: Activity,
      accent:
        avgDensityLevel === 'CRITICAL'
          ? 'text-red-400'
          : avgDensityLevel === 'HIGH'
            ? 'text-amber-400'
            : avgDensityLevel === 'MODERATE'
              ? 'text-blue-400'
              : 'text-emerald-400',
    },
    {
      label: 'Active Alerts',
      value: String(activeAlerts.length),
      subtext: `${filteredAlerts.filter((a) => a.severity === 'CRITICAL' && a.status === 'ACTIVE').length} critical requiring action`,
      icon: BellRing,
      accent: activeAlerts.length > 0 ? 'text-red-400' : 'text-emerald-400',
    },
    {
      label: 'Recommended Additional Buses',
      value: String(totalRecommendedBuses),
      subtext: 'Prototype advisory count',
      icon: BusFront,
      accent: totalRecommendedBuses > 0 ? 'text-amber-400' : 'text-emerald-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Prototype context bar + Quick Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <p className="text-xs sm:text-sm text-slate-400">
          Simulated network overview · Deterministic crowd telemetry across Chennai transit corridors
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActivePage('live-monitoring')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors whitespace-nowrap"
          >
            <span>Open Live Monitoring</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setActivePage('crowd-analytics')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap"
          >
            <span>View Analytics</span>
          </button>
        </div>
      </div>

      {/* 5 Summary Cards */}
      <section aria-label="Key Transit Metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl bg-[#111827] border border-slate-800/90 p-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-medium text-slate-400">{card.label}</span>
                <Icon className={`w-4 h-4 shrink-0 ${card.accent}`} />
              </div>
              <div>
                <div className="text-2xl font-semibold text-slate-100 font-mono tabular-nums">
                  {card.value}
                </div>
                <div className="text-xs text-slate-400 mt-1">{card.subtext}</div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Primary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Passenger Count Trend Chart */}
        <section className="lg:col-span-7 rounded-xl bg-[#111827] border border-slate-800/90 p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Passenger Count Trend (Hourly Simulated Profile)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedStationFilter === 'all'
                  ? 'Aggregate passenger volume across 4 monitored transit hubs'
                  : `Hourly passenger distribution for ${filteredStations[0]?.name}`}
              </p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashPaxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="hour" stroke="#64748B" tick={{ fontSize: 11 }} />
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
                <Area
                  type="monotone"
                  dataKey="passengers"
                  name="Passengers"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#dashPaxGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Crowd Density by Zone Chart */}
        <section className="lg:col-span-5 rounded-xl bg-[#111827] border border-slate-800/90 p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-100">Crowd Density by Zone (%)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Occupancy percentage relative to zone rated capacity
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={zoneDensityData}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 6, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#64748B" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={178}
                  stroke="#94A3B8"
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F1F5F9',
                  }}
                  formatter={(value) => [`${value ?? 0}%`, 'Occupancy']}
                />
                <Bar dataKey="occupancy" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {zoneDensityData.map((entry, idx) => (
                    <Cell key={idx} fill={getDensityColorHex(entry.level)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Bottom Grid: Station Occupancy Overview, Recent Alerts, Top Crowded Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Station Occupancy Overview */}
        <section className="lg:col-span-5 rounded-xl bg-[#111827] border border-slate-800/90 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-100">Station Occupancy Overview</h2>
            <button
              type="button"
              onClick={() => setActivePage('bus-recommendations')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Bus Advisories
            </button>
          </div>

          <div className="space-y-4">
            {stations.map((station) => {
              const barColor = getDensityColorHex(station.densityLevel);
              return (
                <div key={station.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-slate-100">{station.name}</span>
                      <span className="text-xs text-slate-400 ml-2 font-mono tabular-nums">
                        {station.currentPassengers}/{station.totalCapacity} pax
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono tabular-nums text-slate-200">
                        {station.occupancyPercentage}%
                      </span>
                      <DensityTag level={station.densityLevel} />
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, station.occupancyPercentage)}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Alerts List */}
        <section className="lg:col-span-4 rounded-xl bg-[#111827] border border-slate-800/90 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-100">Recent Alerts</h2>
            <button
              type="button"
              onClick={() => setActivePage('alert-centre')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Manage All
            </button>
          </div>

          <div className="divide-y divide-slate-800/80 flex-1">
            {filteredAlerts.slice(0, 4).map((alert) => (
              <div key={alert.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {alert.stationName} · {alert.zoneName}
                  </span>
                  <SeverityTag severity={alert.severity} />
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{alert.description}</p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 font-mono tabular-nums">
                  <span>{alert.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{alert.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Top Crowded Locations */}
        <section className="lg:col-span-3 rounded-xl bg-[#111827] border border-slate-800/90 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-100">Top Crowded Zones</h2>
            <button
              type="button"
              onClick={() => setActivePage('live-monitoring')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              View Feeds
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {topCrowdedZones.map((zone, index) => (
              <button
                key={zone.id}
                type="button"
                onClick={() => {
                  setSelectedCameraId(zone.id);
                  setActivePage('live-monitoring');
                }}
                className="w-full text-left p-2.5 rounded-lg bg-[#0F172A] hover:bg-slate-800/70 border border-slate-800 transition-colors flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-100 truncate">
                    {index + 1}. {zone.stationName}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{zone.zoneName}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono tabular-nums font-semibold text-slate-100">
                    {zone.occupancyPercentage}%
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-slate-400">
                    {zone.passengerCount} pax
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
