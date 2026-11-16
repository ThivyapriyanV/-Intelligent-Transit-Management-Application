import {
  BusRecommendation,
  RecommendationPriority,
  RecommendationStatus,
  Station,
  StationForecast,
  SystemSettings,
  TransitAlert,
} from '../types/transit';
import { calculateOccupancyPercentage, classifyCrowdDensity } from './densityClassifier';

export function computeRecommendedBuses(
  currentPassengers: number,
  predictedPassengers: number,
  totalCapacity: number,
  busCapacity = 55,
): number {
  const effectiveDemand = Math.max(currentPassengers, predictedPassengers);
  const thresholdPassengers = totalCapacity * 0.65;
  if (effectiveDemand <= thresholdPassengers) {
    return 0;
  }
  const excessPassengers = effectiveDemand - thresholdPassengers;
  const buses = Math.ceil(excessPassengers / Math.max(20, busCapacity));
  return Math.max(1, Math.min(8, buses));
}

export function determineRecommendationPriority(
  occupancyPercentage: number,
  predictedOccupancy: number,
): RecommendationPriority {
  const peak = Math.max(occupancyPercentage, predictedOccupancy);
  if (peak >= 95) {
    return 'URGENT';
  }
  if (peak >= 82) {
    return 'HIGH';
  }
  if (peak >= 66) {
    return 'MEDIUM';
  }
  return 'LOW';
}

function buildRecommendationReason(
  station: Station,
  predictedPassengers: number,
  predictedOccupancy: number,
): string {
  const delta = predictedPassengers - station.currentPassengers;
  if (station.densityLevel === 'CRITICAL') {
    return `Current occupancy at ${station.occupancyPercentage}% (${station.currentPassengers} pax) with projected ${predictedPassengers} pax demand.`;
  }
  if (delta > 30) {
    return `Rapid inflow projected (+${delta} passengers over next 30m, reaching ${predictedOccupancy}% capacity).`;
  }
  return `Elevated corridor load (${station.occupancyPercentage}% current, ${predictedOccupancy}% projected) exceeds 65% comfort threshold.`;
}

export function generateBusRecommendations(
  stations: Station[],
  forecasts: StationForecast[],
  settings: SystemSettings,
  previousRecommendations: BusRecommendation[],
  referenceTime: Date,
): BusRecommendation[] {
  const prevByStation = new Map<string, BusRecommendation>();
  previousRecommendations.forEach((rec) => {
    prevByStation.set(rec.stationId, rec);
  });

  const recs: BusRecommendation[] = [];

  stations.forEach((station) => {
    const forecast = forecasts.find((f) => f.stationId === station.id);
    const horizon30 = forecast?.horizons.find((h) => h.minutes === 30);
    const predictedPassengers = horizon30
      ? horizon30.predictedPassengers
      : station.currentPassengers;

    const buses = computeRecommendedBuses(
      station.currentPassengers,
      predictedPassengers,
      station.totalCapacity,
      settings.busCapacityAssumed,
    );

    if (buses <= 0) {
      return;
    }

    const predictedOccupancy = calculateOccupancyPercentage(
      predictedPassengers,
      station.totalCapacity,
    );
    const priority = determineRecommendationPriority(
      station.occupancyPercentage,
      predictedOccupancy,
    );
    const severity = classifyCrowdDensity(
      Math.max(station.occupancyPercentage, predictedOccupancy),
      settings.thresholds,
    );

    const deployMinutes = priority === 'URGENT' ? 5 : priority === 'HIGH' ? 10 : 15;
    const deployAt = new Date(referenceTime.getTime() + deployMinutes * 60_000);
    const suggestedDeploymentTime = `${deployAt
      .getHours()
      .toString()
      .padStart(2, '0')}:${deployAt.getMinutes().toString().padStart(2, '0')} (in ${deployMinutes} min)`;

    const existing = prevByStation.get(station.id);
    const preservedStatus: RecommendationStatus = existing ? existing.status : 'PENDING';

    recs.push({
      id: `REC-${station.code}`,
      stationId: station.id,
      stationName: station.name,
      currentPassengers: station.currentPassengers,
      predictedPassengers,
      occupancyPercentage: station.occupancyPercentage,
      crowdSeverity: severity,
      recommendedAdditionalBuses: buses,
      priority,
      suggestedDeploymentTime,
      reason: buildRecommendationReason(station, predictedPassengers, predictedOccupancy),
      status: preservedStatus,
      updatedAt: referenceTime.toISOString(),
    });
  });

  const priorityRank: Record<RecommendationPriority, number> = {
    URGENT: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };

  return recs.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
}

export function evaluateZoneAlerts(
  stations: Station[],
  existingAlerts: TransitAlert[],
  settings: SystemSettings,
  referenceTime: Date,
): TransitAlert[] {
  const alertsMap = new Map<string, TransitAlert>();
  existingAlerts.forEach((a) => {
    alertsMap.set(a.id, a);
  });

  const timestamp = referenceTime.toISOString();

  stations.forEach((station) => {
    station.zones.forEach((zone) => {
      // 1. Camera Offline Alert
      if (settings.enableCameraOfflineAlerts && zone.status === 'OFFLINE') {
        const alertId = `ALT-OFF-${zone.id}`;
        if (!alertsMap.has(alertId)) {
          alertsMap.set(alertId, {
            id: alertId,
            stationId: station.id,
            stationName: station.name,
            zoneId: zone.id,
            zoneName: zone.zoneName,
            category: 'Camera Offline',
            severity: 'WARNING',
            timestamp,
            description: `${zone.cameraCode} at ${station.name} (${zone.zoneName}) is unreachable and reporting offline status.`,
            recommendedAction:
              'Verify PoE network switch connectivity and dispatch field technician if feed remains dark.',
            status: 'ACTIVE',
          });
        }
      }

      if (zone.status === 'ONLINE') {
        // 2. Unified Zone Density Alert (Critical Overcrowding or High Crowd Density)
        if (
          settings.enableHighDensityAlerts &&
          (zone.densityLevel === 'CRITICAL' || zone.densityLevel === 'HIGH')
        ) {
          const alertId = `ALT-DENSITY-${zone.id}`;
          const existing = alertsMap.get(alertId);
          const isCrit = zone.densityLevel === 'CRITICAL';
          const category = isCrit ? 'Critical Overcrowding' : 'High Crowd Density';
          const severity = isCrit ? 'CRITICAL' : 'WARNING';
          const description = isCrit
            ? `Occupancy reached ${zone.occupancyPercentage}% (${zone.passengerCount}/${zone.capacity} pax) in ${zone.zoneName}.`
            : `Sustained high density at ${zone.occupancyPercentage}% (${zone.passengerCount}/${zone.capacity} pax) in ${zone.zoneName}.`;
          const recommendedAction = isCrit
            ? 'Open secondary entry gates, deploy platform marshals, and review additional bus dispatch recommendations.'
            : 'Monitor boarding queue clearance rate and prepare standby bus bay allocation.';

          if (!existing) {
            alertsMap.set(alertId, {
              id: alertId,
              stationId: station.id,
              stationName: station.name,
              zoneId: zone.id,
              zoneName: zone.zoneName,
              category,
              severity,
              timestamp,
              description,
              recommendedAction,
              status: 'ACTIVE',
            });
          } else if (existing.status === 'ACTIVE') {
            alertsMap.set(alertId, {
              ...existing,
              category,
              severity,
              description,
              recommendedAction,
            });
          }
        }

        // 4. Rapid Passenger Increase Alert
        if (
          settings.enableRapidSurgeAlerts &&
          zone.previousPassengerCount > 0 &&
          ((zone.passengerCount - zone.previousPassengerCount) / zone.previousPassengerCount) * 100 >=
            settings.rapidSurgePercentage
        ) {
          const alertId = `ALT-SURGE-${zone.id}`;
          if (!alertsMap.has(alertId)) {
            const pct = Math.round(
              ((zone.passengerCount - zone.previousPassengerCount) / zone.previousPassengerCount) *
                100,
            );
            alertsMap.set(alertId, {
              id: alertId,
              stationId: station.id,
              stationName: station.name,
              zoneId: zone.id,
              zoneName: zone.zoneName,
              category: 'Rapid Passenger Increase',
              severity: 'WARNING',
              timestamp,
              description: `Sudden +${pct}% passenger inflow detected in ${zone.zoneName} (${zone.previousPassengerCount} to ${zone.passengerCount} pax).`,
              recommendedAction:
                'Check incoming train/bus arrival schedule and pre-stage crowd guidance announcements.',
              status: 'ACTIVE',
            });
          }
        }
      }
    });
  });

  const severityWeight: Record<string, number> = {
    CRITICAL: 0,
    WARNING: 1,
    INFO: 2,
  };
  const statusWeight: Record<string, number> = {
    ACTIVE: 0,
    ACKNOWLEDGED: 1,
    RESOLVED: 2,
  };

  return Array.from(alertsMap.values()).sort((a, b) => {
    if (statusWeight[a.status] !== statusWeight[b.status]) {
      return statusWeight[a.status] - statusWeight[b.status];
    }
    if (severityWeight[a.severity] !== severityWeight[b.severity]) {
      return severityWeight[a.severity] - severityWeight[b.severity];
    }
    return b.timestamp.localeCompare(a.timestamp);
  });
}
