import React from 'react';
import {
  Activity,
  ArrowRight,
  BellRing,
  BusFront,
  Camera,
  TrendingUp,
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

const MiniSparkline: React.FC<{ points: number[]; color?: string }> = ({
  points,
  color = '#D01940',
}) => {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = Math.max(1, max - min);
  const w = 68;
  const h = 24;
  const coords = points.map((p, idx) => {
    const x = (idx / Math.max(1, points.length - 1)) * w;
    const y = h - ((p - min) / span) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(' ')}
      />
    </svg>
  );
};

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
  const prevPassengers = filteredStations.reduce((sum, s) => sum + s.previousPassengers, 0);
  const passengerDeltaPct =
    prevPassengers > 0
      ? (((totalPassengers - prevPassengers) / prevPassengers) * 100).toFixed(1)
      : '0.0';

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

  const topCrowdedZones = [...allFilteredZones]
    .filter((z) => z.status === 'ONLINE')
    .sort((a, b) => b.occupancyPercentage - a.occupancyPercentage)
    .slice(0, 5);

  const summaryCards = [
    {
      label: 'Total Passengers',
      value: totalPassengers.toLocaleString(),
      subtext: `Across ${filteredStations.length} station${filteredStations.length > 1 ? 's' : ''}`,
      trend: `${Number(passengerDeltaPct) >= 0 ? '+' : ''}${passengerDeltaPct}%`,
      spark: trendChartData.slice(-7).map((d) => d.passengers),
      icon: Users,
    },
    {
      label: 'Active Monitoring Zones',
      value: `${onlineZonesCount} / ${allFilteredZones.length}`,
      subtext: `${allFilteredZones.length - onlineZonesCount} camera offline`,
      trend: `${Math.round((onlineZonesCount / Math.max(1, allFilteredZones.length)) * 100)}% uptime`,
      spark: [15, 16, 16, 15, 15, 15, onlineZonesCount],
      icon: Camera,
    },
    {
      label: 'Average Crowd Density',
      value: `${avgOccupancy}%`,
      subtext: `Classification: ${avgDensityLevel}`,
      trend: avgDensityLevel,
      spark: [58, 62, 66, 69, 70, 72, Math.round(avgOccupancy)],
      icon: Activity,
    },
    {
      label: 'Active Alerts',
      value: String(activeAlerts.length),
      subtext: `${filteredAlerts.filter((a) => a.severity === 'CRITICAL' && a.status === 'ACTIVE').length} critical active`,
      trend: 'Live Watch',
      spark: [3, 4, 5, 4, 6, 5, activeAlerts.length],
      icon: BellRing,
    },
    {
      label: 'Recommended Additional Buses',
      value: String(totalRecommendedBuses),
      subtext: 'Advisory count',
      trend: `${filteredRecs.length} hubs`,
      spark: [2, 3, 4, 5, 5, 6, totalRecommendedBuses],
      icon: BusFront,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Prototype context bar + Quick Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#343039]">
        <p className="text-xs sm:text-sm text-[#AAA3AD]">
          Simulated network overview · Deterministic crowd telemetry across Chennai transit corridors
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActivePage('live-monitoring')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#B51232] hover:bg-[#D01940] text-[#F4F1F3] text-xs font-medium transition-colors crimson-glow-sm whitespace-nowrap"
          >
            <span>Open Live Monitoring</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setActivePage('crowd-analytics')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#201C22] hover:bg-[#262128] border border-[#343039] text-[#F4F1F3] text-xs font-medium transition-colors whitespace-nowrap"
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
              className="rounded-xl bg-[#201C22] border border-[#343039] hover:border-[#B51232]/50 transition-colors p-4 flex flex-col justify-between min-h-[132px]"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-[#AAA3AD] leading-snug">{card.label}</span>
                <Icon className="w-4 h-4 shrink-0 text-[#D01940] mt-0.5" />
              </div>
              <div className="flex items-end justify-between gap-2 my-1">
                <div className="text-2xl font-semibold text-[#F4F1F3] font-display tabular-nums leading-none">
                  {card.value}
                </div>
                <MiniSparkline points={card.spark} color="#D01940" />
              </div>
              <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#343039]/70">
                <span className="text-[11px] text-[#77717B] truncate">{card.subtext}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FB7185] font-mono tabular-nums shrink-0">
                  <TrendingUp className="w-3 h-3" />
                  {card.trend}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Primary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Passenger Count Trend Chart */}
        <section className="lg:col-span-7 rounded-xl bg-[#201C22] border border-[#343039] p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-medium text-[#F4F1F3] font-display">
                Passenger Count Trend (Hourly Simulated Profile)
              </h2>
              <p className="text-xs text-[#AAA3AD] mt-0.5">
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
                  <linearGradient id="crimsonPaxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B51232" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#B51232" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="passengers"
                  name="Passengers"
                  stroke="#D01940"
                  strokeWidth={2.2}
                  fill="url(#crimsonPaxGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Crowd Density by Zone Chart */}
        <section className="lg:col-span-5 rounded-xl bg-[#201C22] border border-[#343039] p-5">
          <div className="mb-4">
            <h2 className="text-sm font-medium text-[#F4F1F3] font-display">
              Crowd Density by Zone (%)
            </h2>
            <p className="text-xs text-[#AAA3AD] mt-0.5">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#343039" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  stroke="#77717B"
                  tick={{ fontSize: 11, fill: '#AAA3AD' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={202}
                  stroke="#77717B"
                  tick={{ fontSize: 11, fill: '#AAA3AD' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#262128',
                    borderColor: '#343039',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F4F1F3',
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
        <section className="lg:col-span-5 rounded-xl bg-[#201C22] border border-[#343039] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-[#F4F1F3] font-display">
              Station Occupancy Overview
            </h2>
            <button
              type="button"
              onClick={() => setActivePage('bus-recommendations')}
              className="text-xs text-[#D01940] hover:text-[#FB7185] font-medium transition-colors"
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
                      <span className="text-sm font-medium text-[#F4F1F3]">{station.name}</span>
                      <span className="text-xs text-[#77717B] ml-2 font-mono tabular-nums">
                        {station.currentPassengers}/{station.totalCapacity} pax
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono tabular-nums text-[#AAA3AD]">
                        {station.occupancyPercentage}%
                      </span>
                      <DensityTag level={station.densityLevel} />
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#151217] border border-[#343039]/60 overflow-hidden">
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
        <section className="lg:col-span-4 rounded-xl bg-[#201C22] border border-[#343039] p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-[#F4F1F3] font-display">Recent Alerts</h2>
            <button
              type="button"
              onClick={() => setActivePage('alert-centre')}
              className="text-xs text-[#D01940] hover:text-[#FB7185] font-medium transition-colors"
            >
              Manage All
            </button>
          </div>

          <div className="divide-y divide-[#343039] flex-1">
            {filteredAlerts.slice(0, 4).map((alert) => (
              <div key={alert.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-[#F4F1F3] truncate">
                    {alert.stationName} · {alert.zoneName}
                  </span>
                  <SeverityTag severity={alert.severity} />
                </div>
                <p className="text-xs text-[#AAA3AD] line-clamp-2">{alert.description}</p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-[#77717B] font-mono tabular-nums">
                  <span>{alert.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{alert.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Top Crowded Locations */}
        <section className="lg:col-span-3 rounded-xl bg-[#201C22] border border-[#343039] p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-[#F4F1F3] font-display">Top Crowded Zones</h2>
            <button
              type="button"
              onClick={() => setActivePage('live-monitoring')}
              className="text-xs text-[#D01940] hover:text-[#FB7185] font-medium transition-colors"
            >
              View Feeds
            </button>
          </div>

          <div className="space-y-2.5 flex-1">
            {topCrowdedZones.map((zone, index) => (
              <button
                key={zone.id}
                type="button"
                onClick={() => {
                  setSelectedCameraId(zone.id);
                  setActivePage('live-monitoring');
                }}
                className="w-full text-left p-2.5 rounded-lg bg-[#262128] hover:bg-[#B51232]/15 border border-[#343039] hover:border-[#B51232]/60 transition-colors flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#F4F1F3] truncate">
                    {index + 1}. {zone.stationName}
                  </div>
                  <div className="text-[11px] text-[#AAA3AD] truncate">{zone.zoneName}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono tabular-nums font-semibold text-[#F4F1F3]">
                    {zone.occupancyPercentage}%
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-[#77717B]">
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
