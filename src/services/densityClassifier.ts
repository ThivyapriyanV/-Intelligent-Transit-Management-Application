import {
  CrowdDensityLevel,
  DensityThresholds,
  ForecastHorizon,
  ForecastPoint,
  Station,
  StationForecast,
} from '../types/transit';

export const DEFAULT_DENSITY_THRESHOLDS: DensityThresholds = {
  moderateMin: 40,
  highMin: 66,
  criticalMin: 86, // above 85%
};

export function calculateOccupancyPercentage(
  passengerCount: number,
  capacity: number,
): number {
  if (capacity <= 0) {
    return 0;
  }
  const raw = (Math.max(0, passengerCount) / capacity) * 100;
  return Math.min(130, Math.round(raw * 10) / 10);
}

/**
 * Classifies crowd density based on occupancy percentage:
 * - LOW: below 40%
 * - MODERATE: 40% to 65%
 * - HIGH: 66% to 85%
 * - CRITICAL: above 85%
 */
export function classifyCrowdDensity(
  occupancyPercentage: number,
  thresholds: DensityThresholds = DEFAULT_DENSITY_THRESHOLDS,
): CrowdDensityLevel {
  if (occupancyPercentage >= thresholds.criticalMin) {
    return 'CRITICAL';
  }
  if (occupancyPercentage >= thresholds.highMin) {
    return 'HIGH';
  }
  if (occupancyPercentage >= thresholds.moderateMin) {
    return 'MODERATE';
  }
  return 'LOW';
}

export interface HoltForecastResult {
  level: number;
  trend: number;
  forecasts: number[];
}

/**
 * Simulated forecasting model inspired by Holt's double exponential smoothing.
 * Computes level (l_t) and linear trend (b_t) over historical 15-minute buckets.
 */
export function holtDoubleExponentialSmoothing(
  observations: number[],
  stepsAhead: number,
  alpha = 0.45,
  beta = 0.25,
): HoltForecastResult {
  if (observations.length === 0) {
    return { level: 0, trend: 0, forecasts: Array(stepsAhead).fill(0) };
  }
  if (observations.length === 1) {
    const val = Math.max(0, Math.round(observations[0]));
    return { level: val, trend: 0, forecasts: Array(stepsAhead).fill(val) };
  }

  let level = observations[0];
  let trend = observations[1] - observations[0];

  for (let i = 1; i < observations.length; i++) {
    const y = observations[i];
    const nextLevel = alpha * y + (1 - alpha) * (level + trend);
    const nextTrend = beta * (nextLevel - level) + (1 - beta) * trend;
    level = nextLevel;
    trend = nextTrend;
  }

  // Apply mild damping factor so 60m horizon remains realistic for station capacity
  const phi = 0.88;
  const forecasts: number[] = [];
  let dampedSum = 0;
  for (let h = 1; h <= stepsAhead; h++) {
    dampedSum += Math.pow(phi, h);
    const projected = Math.max(0, Math.round(level + dampedSum * trend));
    forecasts.push(projected);
  }

  return {
    level: Math.round(level),
    trend: Math.round(trend * 10) / 10,
    forecasts,
  };
}

function formatOffsetTime(baseDate: Date, offsetMinutes: number): string {
  const target = new Date(baseDate.getTime() + offsetMinutes * 60_000);
  const hours = target.getHours().toString().padStart(2, '0');
  const mins = target.getMinutes().toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

export function buildStationForecast(
  station: Station,
  historySeries: number[],
  thresholds: DensityThresholds,
  referenceTime: Date,
): StationForecast {
  const alpha = 0.48;
  const beta = 0.26;
  // Ensure latest point aligns with current station count
  const observations =
    historySeries.length > 0
      ? [...historySeries.slice(0, -1), station.currentPassengers]
      : [station.currentPassengers];

  // Each step is 15 minutes -> 4 steps = +60 minutes
  const { forecasts } = holtDoubleExponentialSmoothing(observations, 4, alpha, beta);
  const [f15, f30, f45, f60] = forecasts;

  const makeHorizon = (
    minutes: 15 | 30 | 60,
    predictedPassengers: number,
    confidencePercentage: number,
  ): ForecastHorizon => {
    const occupancyPercentage = calculateOccupancyPercentage(
      predictedPassengers,
      station.totalCapacity,
    );
    return {
      minutes,
      predictedPassengers,
      occupancyPercentage,
      densityLevel: classifyCrowdDensity(occupancyPercentage, thresholds),
      confidencePercentage,
    };
  };

  const horizons: ForecastHorizon[] = [
    makeHorizon(15, f15, 92),
    makeHorizon(30, f30, 86),
    makeHorizon(60, f60, 78),
  ];

  // Build chart series: last 4 historical 15-min intervals (-45m, -30m, -15m, Now) + 4 forecast intervals
  const series: ForecastPoint[] = [];
  const histSlice = observations.slice(-4);
  const histCount = histSlice.length;

  histSlice.forEach((val, idx) => {
    const offsetMinutes = -15 * (histCount - 1 - idx);
    series.push({
      timeLabel: offsetMinutes === 0 ? 'Now' : formatOffsetTime(referenceTime, offsetMinutes),
      offsetMinutes,
      actualPassengers: val,
      predictedPassengers: val,
      upperBound: val,
      lowerBound: val,
    });
  });

  const forecastSteps: Array<{ offset: number; val: number; spreadPct: number }> = [
    { offset: 15, val: f15, spreadPct: 0.05 },
    { offset: 30, val: f30, spreadPct: 0.08 },
    { offset: 45, val: f45, spreadPct: 0.11 },
    { offset: 60, val: f60, spreadPct: 0.14 },
  ];

  forecastSteps.forEach((step) => {
    const margin = Math.round(step.val * step.spreadPct);
    series.push({
      timeLabel: formatOffsetTime(referenceTime, step.offset),
      offsetMinutes: step.offset,
      actualPassengers: null,
      predictedPassengers: step.val,
      upperBound: step.val + margin,
      lowerBound: Math.max(0, step.val - margin),
    });
  });

  // Determine peak among horizons + current
  let peakVal = station.currentPassengers;
  let peakOffset = 0;
  forecastSteps.forEach((step) => {
    if (step.val > peakVal) {
      peakVal = step.val;
      peakOffset = step.offset;
    }
  });

  return {
    stationId: station.id,
    stationName: station.name,
    currentPassengers: station.currentPassengers,
    horizons,
    expectedPeakTime:
      peakOffset === 0 ? 'Current Window' : formatOffsetTime(referenceTime, peakOffset),
    expectedPeakPassengers: peakVal,
    overallConfidence: 85,
    alphaLevel: alpha,
    betaTrend: beta,
    series,
  };
}
