import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOccupancyPercentage,
  classifyCrowdDensity,
  DEFAULT_DENSITY_THRESHOLDS,
  holtDoubleExponentialSmoothing,
} from './densityClassifier';
import {
  computeRecommendedBuses,
  determineRecommendationPriority,
  evaluateFleetAlerts,
  generateBusRecommendations,
} from './decisionEngine';
import {
  computeFleetSummary,
  computeRouteAllocations,
  createInitialFleetBuses,
  evaluateFleetDeploymentGap,
} from './fleetService';
import { generateCsvReport } from './reportService';
import {
  createInitialAlerts,
  createInitialStations,
  DEFAULT_SYSTEM_SETTINGS,
  stepSimulatedStations,
} from './transitDataProvider';
import { buildStationForecast } from './densityClassifier';

test('crowd density classification matches specification bands', () => {
  assert.equal(classifyCrowdDensity(0, DEFAULT_DENSITY_THRESHOLDS), 'LOW');
  assert.equal(classifyCrowdDensity(39.9, DEFAULT_DENSITY_THRESHOLDS), 'LOW');
  assert.equal(classifyCrowdDensity(40, DEFAULT_DENSITY_THRESHOLDS), 'MODERATE');
  assert.equal(classifyCrowdDensity(65.9, DEFAULT_DENSITY_THRESHOLDS), 'MODERATE');
  assert.equal(classifyCrowdDensity(66, DEFAULT_DENSITY_THRESHOLDS), 'HIGH');
  assert.equal(classifyCrowdDensity(85.9, DEFAULT_DENSITY_THRESHOLDS), 'HIGH');
  assert.equal(classifyCrowdDensity(86, DEFAULT_DENSITY_THRESHOLDS), 'CRITICAL');
});

test('occupancy percentage handles zero capacity safely', () => {
  assert.equal(calculateOccupancyPercentage(100, 0), 0);
  assert.equal(calculateOccupancyPercentage(50, 100), 50);
  assert.equal(calculateOccupancyPercentage(420, 470), 89.4);
});

test('holt double exponential smoothing follows upward trend', () => {
  const result = holtDoubleExponentialSmoothing([300, 330, 360, 390, 420], 4);
  assert.equal(result.forecasts.length, 4);
  assert.ok(result.forecasts[0] > 420);
  assert.ok(result.forecasts[3] > result.forecasts[0]);
});

test('bus recommendation engine calculates additional buses above 65% threshold', () => {
  assert.equal(computeRecommendedBuses(200, 220, 500, 55), 0);
  assert.equal(computeRecommendedBuses(420, 560, 470, 55), 5);
  assert.equal(determineRecommendationPriority(96, 98), 'URGENT');
  assert.equal(determineRecommendationPriority(84, 88), 'HIGH');
});

test('initial transit stations contain all 4 required hubs with 4 zones each', () => {
  const ref = new Date('2026-11-16T09:00:00.000Z');
  const { stations, historyByStation } = createInitialStations(DEFAULT_DENSITY_THRESHOLDS, ref);

  assert.equal(stations.length, 4);
  const names = stations.map((s) => s.name);
  assert.deepEqual(names, ['Chennai Central', 'T. Nagar', 'Guindy', 'Tambaram']);
  stations.forEach((s) => {
    assert.equal(s.zones.length, 4);
    assert.ok(historyByStation[s.id].length >= 4);
  });

  const guindy = stations.find((s) => s.id === 'guindy');
  assert.equal(guindy?.currentPassengers, 420);

  // Step simulation deterministically
  const stepped = stepSimulatedStations(
    stations,
    historyByStation,
    1,
    DEFAULT_DENSITY_THRESHOLDS,
    ref,
  );
  assert.equal(stepped.stations.length, 4);
});

test('bus recommendations preserve user reviewed/assigned status across ticks', () => {
  const ref = new Date('2026-11-16T09:00:00.000Z');
  const { stations, historyByStation } = createInitialStations(DEFAULT_DENSITY_THRESHOLDS, ref);
  const forecasts = stations.map((s) =>
    buildStationForecast(s, historyByStation[s.id], DEFAULT_DENSITY_THRESHOLDS, ref),
  );

  const initialRecs = generateBusRecommendations(
    stations,
    forecasts,
    DEFAULT_SYSTEM_SETTINGS,
    [],
    ref,
  );
  assert.ok(initialRecs.length > 0);
  const modified = initialRecs.map((r) =>
    r.stationId === 'guindy' ? { ...r, status: 'ASSIGNED' as const } : r,
  );

  const nextRecs = generateBusRecommendations(
    stations,
    forecasts,
    DEFAULT_SYSTEM_SETTINGS,
    modified,
    ref,
  );
  const guindyRec = nextRecs.find((r) => r.stationId === 'guindy');
  assert.equal(guindyRec?.status, 'ASSIGNED');
});

test('csv report generator produces valid CSV headers and escaped rows', () => {
  const csv = generateCsvReport([
    {
      date: '2026-11-16',
      stationId: 'guindy',
      stationName: 'Guindy',
      totalPassengers: 15120,
      peakOccupancy: 89,
      peakHour: '08:30 - 09:30',
      alertsTriggered: 3,
      busesRecommended: 3,
    },
  ]);
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^Date,Station,/);
  assert.match(lines[1], /^2026-11-16,Guindy,15120,89,08:30 - 09:30,3,3$/);
});

test('initial alerts include all required categories', () => {
  const alerts = createInitialAlerts(new Date('2026-11-16T09:00:00.000Z'));
  const categories = new Set(alerts.map((a) => a.category));
  assert.ok(categories.has('Critical Overcrowding'));
  assert.ok(categories.has('High Crowd Density'));
  assert.ok(categories.has('Camera Offline'));
  assert.ok(categories.has('Rapid Passenger Increase'));
});

test('fleet deployment gap calculates required minus running and excludes maintenance buses', () => {
  // Prompt scenario: 30 allocated, 24 running, 4 available, 2 maintenance, 33 required
  const gap = evaluateFleetDeploymentGap(24, 4, 33);
  assert.equal(gap.additionalBusesRequired, 9);
  assert.equal(gap.deployableAvailableBuses, 4);
  assert.equal(gap.netShortfallBuses, 5);

  // Surplus running buses
  const surplus = evaluateFleetDeploymentGap(10, 2, 8);
  assert.equal(surplus.additionalBusesRequired, 0);
  assert.equal(surplus.deployableAvailableBuses, 0);
  assert.equal(surplus.netShortfallBuses, 0);
});

test('fleet conservation invariant and cross-module decision engine consistency hold', () => {
  const ref = new Date('2026-11-16T09:00:00.000Z');
  const { stations, historyByStation } = createInitialStations(DEFAULT_DENSITY_THRESHOLDS, ref);
  const forecasts = stations.map((s) =>
    buildStationForecast(s, historyByStation[s.id], DEFAULT_DENSITY_THRESHOLDS, ref),
  );
  const buses = createInitialFleetBuses(ref, DEFAULT_SYSTEM_SETTINGS.busCapacityAssumed);
  const routes = computeRouteAllocations(buses, stations, forecasts, DEFAULT_SYSTEM_SETTINGS);
  const summary = computeFleetSummary(buses, routes);

  assert.equal(routes.length, 4);
  assert.deepEqual(
    routes.map((r) => r.routeName),
    [
      'Chennai Central – Guindy',
      'Guindy – Tambaram',
      'Chennai Central – T. Nagar',
      'Tambaram – Guindy',
    ],
  );

  // Global invariant: total = running + available + out-of-service (including maintenance)
  assert.equal(
    summary.totalAllocatedBuses,
    summary.runningBuses + summary.availableBuses + summary.outOfServiceTotal,
  );

  // Per-route invariant
  routes.forEach((r) => {
    assert.equal(
      r.totalAllocatedBuses,
      r.runningBuses + r.availableBuses + r.outOfServiceTotal,
    );
    assert.equal(r.additionalBusesRequired, Math.max(0, r.requiredBuses - r.runningBuses));
  });

  // Mark one RUNNING bus on RT-02 as OUT OF SERVICE and verify downstream consistency
  const targetBus = buses.find((b) => b.routeId === 'RT-02' && b.status === 'RUNNING');
  assert.ok(targetBus);
  const updatedBuses = buses.map((b) =>
    b.id === targetBus.id ? { ...b, status: 'OUT OF SERVICE' as const, passengerOccupancy: 0 } : b,
  );
  const updatedRoutes = computeRouteAllocations(
    updatedBuses,
    stations,
    forecasts,
    DEFAULT_SYSTEM_SETTINGS,
  );
  const updatedSummary = computeFleetSummary(updatedBuses, updatedRoutes);

  assert.equal(updatedSummary.totalAllocatedBuses, summary.totalAllocatedBuses);
  assert.equal(updatedSummary.runningBuses, summary.runningBuses - 1);
  assert.equal(updatedSummary.outOfServiceTotal, summary.outOfServiceTotal + 1);

  const recs = generateBusRecommendations(
    stations,
    forecasts,
    DEFAULT_SYSTEM_SETTINGS,
    [],
    ref,
    updatedRoutes,
  );
  const rt02 = updatedRoutes.find((r) => r.routeId === 'RT-02');
  const guindyRec = recs.find((r) => r.routeId === 'RT-02');
  assert.ok(rt02 && guindyRec);
  assert.equal(guindyRec.recommendedAdditionalBuses, rt02.additionalBusesRequired);
  assert.equal(guindyRec.netShortfallBuses, rt02.netShortfallBuses);

  const fleetAlerts = evaluateFleetAlerts(updatedRoutes, createInitialAlerts(ref), ref);
  const rt02Alert = fleetAlerts.find((a) => a.id === 'ALT-FLEET-RT-02');
  assert.ok(rt02Alert);
  assert.equal(rt02Alert.category, 'Fleet Shortage');
});
