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
  generateBusRecommendations,
} from './decisionEngine';
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
