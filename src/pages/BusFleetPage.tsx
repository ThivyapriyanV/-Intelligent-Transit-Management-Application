import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bus,
  CheckCircle2,
  Info,
  RotateCcw,
  Search,
  Wrench,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StationFilter, useTransit } from '../context/TransitContext';
import { BusFleetStatus } from '../types/transit';
import { BusFleetStatusTag, RouteStatusTag } from '../components/common/StatusIndicator';
import { computeFleetSummary } from '../services/fleetService';

const BUS_STATUS_FILTERS: Array<'ALL' | BusFleetStatus> = [
  'ALL',
  'RUNNING',
  'AVAILABLE',
  'MAINTENANCE',
  'OUT OF SERVICE',
];

export const BusFleetPage: React.FC = () => {
  const {
    stations,
    selectedStationFilter,
    setSelectedStationFilter,
    routeAllocations,
    fleetBuses,
    settings,
    toggleBusAvailability,
    setActivePage,
  } = useTransit();

  const [routeSearch, setRouteSearch] = useState('');
  const [busStatusFilter, setBusStatusFilter] = useState<'ALL' | BusFleetStatus>('ALL');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('RT-02');
  const [busScope, setBusScope] = useState<'ALL_FILTERED' | 'SELECTED_ROUTE'>('ALL_FILTERED');

  const stationScopedRoutes = useMemo(() => {
    return routeAllocations.filter((route) => {
      if (
        selectedStationFilter !== 'all' &&
        route.startingStationId !== selectedStationFilter &&
        route.destinationStationId !== selectedStationFilter
      ) {
        return false;
      }
      if (routeSearch.trim() !== '') {
        const q = routeSearch.trim().toLowerCase();
        const matchId = route.routeId.toLowerCase().includes(q);
        const matchName = route.routeName.toLowerCase().includes(q);
        const matchStart = route.startingStationName.toLowerCase().includes(q);
        const matchDest = route.destinationStationName.toLowerCase().includes(q);
        if (!matchId && !matchName && !matchStart && !matchDest) {
          return false;
        }
      }
      return true;
    });
  }, [routeAllocations, selectedStationFilter, routeSearch]);

  useEffect(() => {
    if (
      stationScopedRoutes.length > 0 &&
      !stationScopedRoutes.some((r) => r.routeId === selectedRouteId)
    ) {
      setSelectedRouteId(stationScopedRoutes[0].routeId);
    }
  }, [stationScopedRoutes, selectedRouteId]);

  const selectedRoute = useMemo(() => {
    return (
      stationScopedRoutes.find((r) => r.routeId === selectedRouteId) ??
      stationScopedRoutes[0] ??
      null
    );
  }, [stationScopedRoutes, selectedRouteId]);

  const scopedRouteIds = useMemo(
    () => new Set(stationScopedRoutes.map((r) => r.routeId)),
    [stationScopedRoutes],
  );

  const scopedFleetBuses = useMemo(
    () => fleetBuses.filter((b) => scopedRouteIds.has(b.routeId)),
    [fleetBuses, scopedRouteIds],
  );

  const scopedSummary = useMemo(
    () => computeFleetSummary(scopedFleetBuses, stationScopedRoutes),
    [scopedFleetBuses, stationScopedRoutes],
  );

  const filteredBusList = useMemo(() => {
    return scopedFleetBuses.filter((bus) => {
      if (busScope === 'SELECTED_ROUTE' && selectedRoute && bus.routeId !== selectedRoute.routeId) {
        return false;
      }
      if (busStatusFilter !== 'ALL' && bus.status !== busStatusFilter) {
        return false;
      }
      return true;
    });
  }, [scopedFleetBuses, busScope, selectedRoute, busStatusFilter]);

  const comparisonChartData = useMemo(() => {
    if (!selectedRoute) return [];
    return [
      { category: 'Running', buses: selectedRoute.runningBuses, fill: '#22C55E' },
      { category: 'Available', buses: selectedRoute.availableBuses, fill: '#EAB308' },
      { category: 'Maint. / OOS', buses: selectedRoute.outOfServiceTotal, fill: '#F97316' },
      { category: 'Allocated', buses: selectedRoute.totalAllocatedBuses, fill: '#AAA3AD' },
      { category: 'Required', buses: selectedRoute.requiredBuses, fill: '#D01940' },
    ];
  }, [selectedRoute]);

  const overviewCards = [
    {
      label: 'Total Allocated Buses',
      value: scopedSummary.totalAllocatedBuses,
      subtext: `${scopedSummary.fleetUtilizationPercentage}% fleet utilization`,
      accent: 'text-[#F4F1F3]',
      icon: Bus,
    },
    {
      label: 'Currently Running Buses',
      value: scopedSummary.runningBuses,
      subtext: `${scopedSummary.runningBuses * settings.busCapacityAssumed} active seat capacity`,
      accent: 'text-[#4ADE80]',
      icon: CheckCircle2,
    },
    {
      label: 'Available Buses',
      value: scopedSummary.availableBuses,
      subtext: `${scopedSummary.totalDeployableAvailable} eligible for current demand`,
      accent: 'text-[#FACC15]',
      icon: Info,
    },
    {
      label: 'Maintenance / Out of Service',
      value: scopedSummary.outOfServiceTotal,
      subtext: `${scopedSummary.maintenanceBuses} Maint. · ${scopedSummary.outOfServiceOnlyBuses} Out of Service`,
      accent: 'text-[#FB7185]',
      icon: Wrench,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Prototype Disclaimer + Cross-Module Links */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#201C22] border border-[#B51232]/40">
        <div className="flex items-start gap-2.5 text-xs text-[#AAA3AD]">
          <Info className="w-4 h-4 text-[#D01940] shrink-0 mt-0.5" />
          <span>
            <strong className="text-[#F4F1F3]">Simulated Fleet Prototype:</strong> Bus allocations,
            corridor demand, and unit statuses share the live station telemetry engine and feed
            directly into Bus Recommendations and Alert Centre without external dispatch connections.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActivePage('bus-recommendations')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B51232] hover:bg-[#D01940] text-[#F4F1F3] text-xs font-medium transition-colors whitespace-nowrap"
          >
            <span>Bus Recommendations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setActivePage('alert-centre')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#262128] hover:bg-[#343039]/60 border border-[#343039] text-[#F4F1F3] text-xs font-medium transition-colors whitespace-nowrap"
          >
            <span>Alert Centre</span>
          </button>
        </div>
      </div>

      {/* Fleet Overview Cards */}
      <section aria-label="Fleet Overview" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl bg-[#201C22] border border-[#343039] hover:border-[#B51232]/50 transition-colors p-4 flex flex-col justify-between min-h-[118px]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#AAA3AD]">{card.label}</span>
                <Icon className="w-4 h-4 text-[#D01940] shrink-0" />
              </div>
              <div className={`text-2xl font-semibold font-display tabular-nums mt-2 ${card.accent}`}>
                {card.value}
              </div>
              <div className="text-[11px] text-[#77717B] mt-2 pt-2 border-t border-[#343039]/70 font-mono tabular-nums">
                {card.subtext}
              </div>
            </div>
          );
        })}
      </section>

      {/* Fleet Conservation & Utilization Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#201C22] border border-[#343039] text-xs">
        <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums text-[#AAA3AD]">
          <span className="text-[#F4F1F3] font-medium">Fleet Allocation Balance:</span>
          <span>
            {scopedSummary.totalAllocatedBuses} Allocated = {scopedSummary.runningBuses} Running +{' '}
            {scopedSummary.availableBuses} Available + {scopedSummary.outOfServiceTotal} Maint./OOS
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
          <span className="text-[#AAA3AD]">
            Utilization:{' '}
            <strong className="text-[#F4F1F3]">{scopedSummary.fleetUtilizationPercentage}%</strong>
          </span>
          <span className="text-[#343039]" aria-hidden="true">
            |
          </span>
          <span className="text-[#AAA3AD]">
            Required: <strong className="text-[#F4F1F3]">{scopedSummary.totalRequiredBuses}</strong>
          </span>
          <span className="text-[#343039]" aria-hidden="true">
            |
          </span>
          <span className="text-[#FB7185]">
            Add. Needed: <strong>{scopedSummary.totalAdditionalBusesRequired}</strong> (
            {scopedSummary.totalDeployableAvailable} standby · {scopedSummary.totalNetShortfall}{' '}
            shortfall)
          </span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-[#343039]">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search by Route ID or Route Name */}
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-[#77717B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="route-search-input" className="sr-only">
              Search by route ID or route name
            </label>
            <input
              id="route-search-input"
              type="search"
              value={routeSearch}
              onChange={(e) => setRouteSearch(e.target.value)}
              placeholder="Search route ID or name (e.g. RT-02, Guindy)..."
              className="w-full sm:w-72 pl-8 pr-3 py-1.5 rounded-lg bg-[#201C22] border border-[#343039] text-xs text-[#F4F1F3] placeholder-[#77717B] focus:outline-none focus:border-[#B51232]"
            />
          </div>

          {/* Filter by Station */}
          <div className="flex items-center gap-2">
            <label htmlFor="fleet-station-filter" className="text-xs font-medium text-[#AAA3AD]">
              Station:
            </label>
            <select
              id="fleet-station-filter"
              value={selectedStationFilter}
              onChange={(e) => setSelectedStationFilter(e.target.value as StationFilter)}
              className="px-3 py-1.5 rounded-lg bg-[#201C22] border border-[#343039] text-xs text-[#F4F1F3] focus:outline-none focus:border-[#B51232]"
            >
              <option value="all">All Stations (4)</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter by Bus Status */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#AAA3AD]">Bus Status:</span>
          <div className="inline-flex flex-wrap items-center p-1 rounded-lg bg-[#201C22] border border-[#343039]">
            {BUS_STATUS_FILTERS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setBusStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  busStatusFilter === st
                    ? 'bg-[#B51232] text-[#F4F1F3]'
                    : 'text-[#AAA3AD] hover:text-[#F4F1F3]'
                }`}
              >
                {st === 'ALL' ? 'All Statuses' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Route-Wise Allocation Table */}
      <section className="rounded-xl bg-[#201C22] border border-[#343039] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#343039] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium text-[#F4F1F3] font-display">
              Route-Wise Fleet Allocation ({stationScopedRoutes.length})
            </h2>
            <p className="text-xs text-[#AAA3AD] mt-0.5">
              Select a route row to inspect demand balance, standby eligibility, and capacity comparison
            </p>
          </div>
        </div>

        {stationScopedRoutes.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-[#F4F1F3]">
              No transit routes match your current station or search filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setRouteSearch('');
                setSelectedStationFilter('all');
              }}
              className="mt-3 px-3.5 py-1.5 rounded-lg bg-[#B51232] hover:bg-[#D01940] text-[#F4F1F3] text-xs font-medium transition-colors"
            >
              Reset Route Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#343039] text-[11px] font-medium text-[#AAA3AD] bg-[#262128]">
                  <th className="py-2.5 px-2.5 whitespace-nowrap">Route ID</th>
                  <th className="py-2.5 px-2.5 whitespace-nowrap">Route Name</th>
                  <th className="py-2.5 px-2.5 whitespace-nowrap">Starting Station</th>
                  <th className="py-2.5 px-2.5 whitespace-nowrap">Destination</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap">Allocated</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap">Running</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap">Available</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap">Out-of-Svc</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap">Demand</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap">Required</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap">Add. Req.</th>
                  <th className="py-2.5 px-2.5 whitespace-nowrap">Route Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#343039] text-xs">
                {stationScopedRoutes.map((route) => {
                  const isSelected = selectedRoute?.routeId === route.routeId;
                  return (
                    <tr
                      key={route.routeId}
                      onClick={() => setSelectedRouteId(route.routeId)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#B51232]/15' : 'hover:bg-[#B51232]/10'
                      }`}
                    >
                      <td className="py-2.5 px-2.5 font-mono text-xs font-semibold text-[#F4F1F3] whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRouteId(route.routeId);
                          }}
                          className="hover:text-[#FB7185] focus:outline-none underline-offset-2 hover:underline"
                          aria-label={`Select route ${route.routeId} ${route.routeName}`}
                        >
                          {route.routeId}
                        </button>
                      </td>
                      <td className="py-2.5 px-2.5 font-medium text-[#F4F1F3] whitespace-nowrap">
                        {route.routeName}
                      </td>
                      <td className="py-2.5 px-2.5 text-[#AAA3AD] whitespace-nowrap">
                        {route.startingStationName}
                      </td>
                      <td className="py-2.5 px-2.5 text-[#AAA3AD] whitespace-nowrap">
                        {route.destinationStationName}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-[#F4F1F3]">
                        {route.totalAllocatedBuses}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-[#4ADE80]">
                        {route.runningBuses}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-[#FACC15]">
                        {route.availableBuses}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-[#FB923C]">
                        {route.outOfServiceTotal}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-[#F4F1F3]">
                        {route.currentPassengerDemand}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums font-medium text-[#F4F1F3]">
                        {route.requiredBuses}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold text-[#D01940]">
                        {route.additionalBusesRequired > 0
                          ? `+${route.additionalBusesRequired}`
                          : '0'}
                      </td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <RouteStatusTag status={route.routeStatus} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Selected Route Details + Allocated vs Required Visual Comparison */}
      {selectedRoute && (
        <section
          aria-label="Selected Route Details"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Route Overview & Fleet Decision Breakdown */}
          <div className="lg:col-span-7 rounded-xl bg-[#201C22] border border-[#B51232]/50 crimson-glow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono text-[#FB7185]">
                  SELECTED ROUTE · {selectedRoute.routeId}
                </div>
                <h2 className="text-base font-semibold text-[#F4F1F3] font-display mt-0.5">
                  {selectedRoute.routeName}
                </h2>
                <p className="text-xs text-[#AAA3AD] mt-0.5">
                  Corridor: {selectedRoute.startingStationName} →{' '}
                  {selectedRoute.destinationStationName} · Utilization{' '}
                  {selectedRoute.utilizationPercentage}%
                </p>
              </div>
              <RouteStatusTag status={selectedRoute.routeStatus} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#343039]">
              <div className="p-3 rounded-lg bg-[#262128] border border-[#343039]">
                <div className="text-[11px] text-[#77717B]">Allocated Fleet</div>
                <div className="text-lg font-semibold text-[#F4F1F3] font-display tabular-nums mt-0.5">
                  {selectedRoute.totalAllocatedBuses} buses
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#262128] border border-[#343039]">
                <div className="text-[11px] text-[#77717B]">Currently Running</div>
                <div className="text-lg font-semibold text-[#4ADE80] font-display tabular-nums mt-0.5">
                  {selectedRoute.runningBuses} buses
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#262128] border border-[#343039]">
                <div className="text-[11px] text-[#77717B]">Available Standby</div>
                <div className="text-lg font-semibold text-[#FACC15] font-display tabular-nums mt-0.5">
                  {selectedRoute.availableBuses} buses
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#262128] border border-[#343039]">
                <div className="text-[11px] text-[#77717B]">Maint. / Out of Service</div>
                <div className="text-lg font-semibold text-[#FB923C] font-display tabular-nums mt-0.5">
                  {selectedRoute.outOfServiceTotal} buses
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <div className="text-[11px] text-[#77717B]">Passenger Demand</div>
                <div className="text-sm font-semibold text-[#F4F1F3] font-mono tabular-nums mt-0.5">
                  {selectedRoute.currentPassengerDemand} pax
                </div>
                <div className="text-[11px] text-[#77717B] font-mono">
                  +30m: {selectedRoute.predictedPassengerDemand} pax
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#77717B]">Current Occupancy</div>
                <div className="text-sm font-semibold text-[#F4F1F3] font-mono tabular-nums mt-0.5">
                  {selectedRoute.occupancyPercentage}%
                </div>
                <div className="text-[11px] text-[#77717B] font-mono">
                  vs {selectedRoute.runningFleetCapacity} running seats
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#77717B]">Required Fleet Capacity</div>
                <div className="text-sm font-semibold text-[#F4F1F3] font-mono tabular-nums mt-0.5">
                  {selectedRoute.requiredBuses} buses
                </div>
                <div className="text-[11px] text-[#77717B] font-mono">
                  {selectedRoute.requiredFleetCapacity} seat target
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#77717B]">Additional Required</div>
                <div className="text-sm font-semibold text-[#D01940] font-mono tabular-nums mt-0.5">
                  +{selectedRoute.additionalBusesRequired} buses
                </div>
                <div className="text-[11px] text-[#77717B] font-mono">
                  ({selectedRoute.requiredBuses} req − {selectedRoute.runningBuses} run)
                </div>
              </div>
            </div>

            {/* Decision Engine Explanation */}
            <div className="p-3.5 rounded-lg bg-[#151217] border border-[#343039] text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-medium text-[#F4F1F3]">
                <AlertTriangle className="w-3.5 h-3.5 text-[#D01940] shrink-0" />
                <span>Decision Engine Capacity Analysis (Maintenance/OOS Excluded)</span>
              </div>
              {selectedRoute.additionalBusesRequired === 0 ? (
                <p className="text-[#AAA3AD]">
                  Active running fleet ({selectedRoute.runningBuses} buses) meets projected corridor
                  requirement ({selectedRoute.requiredBuses} buses). {selectedRoute.availableBuses}{' '}
                  standby buses remain available in reserve.
                </p>
              ) : (
                <p className="text-[#AAA3AD]">
                  Additional requirement is{' '}
                  <strong className="text-[#F4F1F3]">
                    {selectedRoute.additionalBusesRequired} buses
                  </strong>{' '}
                  ({selectedRoute.requiredBuses} required − {selectedRoute.runningBuses} running).{' '}
                  <strong className="text-[#FACC15]">
                    {selectedRoute.deployableAvailableBuses} available standby bus
                    {selectedRoute.deployableAvailableBuses === 1 ? '' : 'es'}
                  </strong>{' '}
                  can be considered for immediate deployment, leaving{' '}
                  <strong className="text-[#FB7185]">
                    {selectedRoute.netShortfallBuses} more bus
                    {selectedRoute.netShortfallBuses === 1 ? '' : 'es'}
                  </strong>{' '}
                  required from external reserves ({selectedRoute.outOfServiceTotal} under
                  maintenance/OOS excluded).
                </p>
              )}
            </div>
          </div>

          {/* Visual Comparison: Allocated vs Required Buses */}
          <div className="lg:col-span-5 rounded-xl bg-[#201C22] border border-[#343039] p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-medium text-[#F4F1F3] font-display">
                Allocated vs. Required Fleet ({selectedRoute.routeId})
              </h3>
              <p className="text-xs text-[#AAA3AD] mt-0.5">
                Comparison of running, standby, unavailable, total allocated, and required buses
              </p>
            </div>

            <div className="h-56 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonChartData}
                  margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#343039" vertical={false} />
                  <XAxis
                    dataKey="category"
                    stroke="#77717B"
                    tick={{ fontSize: 11, fill: '#AAA3AD' }}
                  />
                  <YAxis
                    allowDecimals={false}
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
                    formatter={(value) => [`${value ?? 0} buses`, 'Count']}
                  />
                  <Bar dataKey="buses" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {comparisonChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Operational Coverage Bar */}
            <div className="mt-3 pt-3 border-t border-[#343039] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#AAA3AD]">Running Coverage vs. Required</span>
                <span className="font-mono tabular-nums text-[#F4F1F3]">
                  {selectedRoute.runningBuses} / {selectedRoute.requiredBuses} buses (
                  {Math.min(
                    100,
                    Math.round(
                      (selectedRoute.runningBuses / Math.max(1, selectedRoute.requiredBuses)) * 100,
                    ),
                  )}
                  %)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#151217] border border-[#343039]/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (selectedRoute.runningBuses / Math.max(1, selectedRoute.requiredBuses)) *
                          100,
                      ),
                    )}%`,
                    backgroundColor:
                      selectedRoute.netShortfallBuses > 0 ? '#D01940' : '#22C55E',
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Bus Status Monitoring Section */}
      <section className="rounded-xl bg-[#201C22] border border-[#343039] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#343039] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-[#F4F1F3] font-display">
              Bus Status Monitoring ({filteredBusList.length})
            </h2>
            <p className="text-xs text-[#AAA3AD] mt-0.5">
              Individual simulated vehicle telemetry — mark buses unavailable to test decision engine recalculation
            </p>
          </div>

          <div className="inline-flex items-center p-1 rounded-lg bg-[#262128] border border-[#343039] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setBusScope('ALL_FILTERED')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                busScope === 'ALL_FILTERED'
                  ? 'bg-[#B51232] text-[#F4F1F3]'
                  : 'text-[#AAA3AD] hover:text-[#F4F1F3]'
              }`}
            >
              All Filtered Routes ({scopedFleetBuses.length})
            </button>
            <button
              type="button"
              onClick={() => setBusScope('SELECTED_ROUTE')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                busScope === 'SELECTED_ROUTE'
                  ? 'bg-[#B51232] text-[#F4F1F3]'
                  : 'text-[#AAA3AD] hover:text-[#F4F1F3]'
              }`}
            >
              {selectedRoute ? `${selectedRoute.routeId} Only` : 'Selected Route'}
            </button>
          </div>
        </div>

        {filteredBusList.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-[#F4F1F3]">
              No buses match the selected status or route filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setBusStatusFilter('ALL');
                setBusScope('ALL_FILTERED');
              }}
              className="mt-3 px-3.5 py-1.5 rounded-lg bg-[#B51232] hover:bg-[#D01940] text-[#F4F1F3] text-xs font-medium transition-colors"
            >
              Show All Buses
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#343039] text-xs font-medium text-[#AAA3AD] bg-[#262128]">
                  <th className="py-3 px-4">Bus ID</th>
                  <th className="py-3 px-4">Assigned Route</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4 text-right">Passenger Occupancy</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4 text-right">Simulation Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#343039] text-sm">
                {filteredBusList.map((bus) => {
                  const occPct = Math.round((bus.passengerOccupancy / bus.capacity) * 100);
                  const updatedTime = new Date(bus.lastUpdated).toLocaleTimeString('en-IN', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  const isOperational = bus.status === 'RUNNING' || bus.status === 'AVAILABLE';

                  return (
                    <tr key={bus.id} className="hover:bg-[#B51232]/10 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-xs font-semibold text-[#F4F1F3]">
                        {bus.id}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#AAA3AD]">
                        <span className="font-mono text-[#F4F1F3] mr-1.5">{bus.routeId}</span>
                        <span>· {bus.routeName}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <BusFleetStatusTag status={bus.status} />
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs tabular-nums text-[#F4F1F3]">
                        {bus.status === 'RUNNING'
                          ? `${bus.passengerOccupancy} / ${bus.capacity} pax (${occPct}%)`
                          : `0 / ${bus.capacity} pax`}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs tabular-nums text-[#77717B]">
                        {updatedTime}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {isOperational ? (
                          <button
                            type="button"
                            onClick={() => toggleBusAvailability(bus.id, 'OUT OF SERVICE')}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#262128] hover:bg-[#B51232]/20 border border-[#B51232]/45 text-[#FB7185] text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Mark Unavailable</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleBusAvailability(bus.id, 'AVAILABLE')}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#262128] hover:bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#4ADE80] text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore Available</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
