import {
  BusFleetStatus,
  FleetBus,
  FleetSummary,
  RouteAllocation,
  RouteOperationalStatus,
  Station,
  StationForecast,
  StationId,
  SystemSettings,
} from '../types/transit';
import { calculateOccupancyPercentage } from './densityClassifier';

export interface RouteSeedSpec {
  routeId: string;
  routeName: string;
  primaryStationId: StationId;
  startingStationId: StationId;
  startingStationName: string;
  destinationStationId: StationId;
  destinationStationName: string;
  startWeight: number;
  destWeight: number;
  busPrefix: string;
  statusCounts: {
    running: number;
    available: number;
    maintenance: number;
    outOfService: number;
  };
}

export const ROUTE_SEEDS: RouteSeedSpec[] = [
  {
    routeId: 'RT-01',
    routeName: 'Chennai Central – Guindy',
    primaryStationId: 'chennai-central',
    startingStationId: 'chennai-central',
    startingStationName: 'Chennai Central',
    destinationStationId: 'guindy',
    destinationStationName: 'Guindy',
    startWeight: 0.95,
    destWeight: 0.65,
    busPrefix: 'MTC-1',
    statusCounts: { running: 10, available: 2, maintenance: 1, outOfService: 1 },
  },
  {
    routeId: 'RT-02',
    routeName: 'Guindy – Tambaram',
    primaryStationId: 'guindy',
    startingStationId: 'guindy',
    startingStationName: 'Guindy',
    destinationStationId: 'tambaram',
    destinationStationName: 'Tambaram',
    startWeight: 1.25,
    destWeight: 0.85,
    busPrefix: 'MTC-2',
    statusCounts: { running: 9, available: 2, maintenance: 2, outOfService: 1 },
  },
  {
    routeId: 'RT-03',
    routeName: 'Chennai Central – T. Nagar',
    primaryStationId: 't-nagar',
    startingStationId: 'chennai-central',
    startingStationName: 'Chennai Central',
    destinationStationId: 't-nagar',
    destinationStationName: 'T. Nagar',
    startWeight: 0.42,
    destWeight: 0.92,
    busPrefix: 'MTC-3',
    statusCounts: { running: 7, available: 2, maintenance: 1, outOfService: 0 },
  },
  {
    routeId: 'RT-04',
    routeName: 'Tambaram – Guindy',
    primaryStationId: 'tambaram',
    startingStationId: 'tambaram',
    startingStationName: 'Tambaram',
    destinationStationId: 'guindy',
    destinationStationName: 'Guindy',
    startWeight: 0.72,
    destWeight: 0.34,
    busPrefix: 'MTC-4',
    statusCounts: { running: 6, available: 2, maintenance: 1, outOfService: 1 },
  },
];

export function evaluateFleetDeploymentGap(
  runningBuses: number,
  availableBuses: number,
  requiredBuses: number,
): {
  additionalBusesRequired: number;
  deployableAvailableBuses: number;
  netShortfallBuses: number;
} {
  const additionalBusesRequired = Math.max(0, requiredBuses - runningBuses);
  const deployableAvailableBuses = Math.min(
    Math.max(0, availableBuses),
    additionalBusesRequired,
  );
  const netShortfallBuses = Math.max(0, additionalBusesRequired - deployableAvailableBuses);
  return {
    additionalBusesRequired,
    deployableAvailableBuses,
    netShortfallBuses,
  };
}

export function createInitialFleetBuses(
  referenceTime: Date,
  busCapacity = 55,
): FleetBus[] {
  const iso = referenceTime.toISOString();
  const buses: FleetBus[] = [];

  ROUTE_SEEDS.forEach((route, rIdx) => {
    let seq = 1;
    const pushStatus = (count: number, status: BusFleetStatus) => {
      for (let i = 0; i < count; i += 1) {
        const num = seq.toString().padStart(2, '0');
        seq += 1;
        // Deterministic initial passenger load for RUNNING buses
        const loadRatio =
          status === 'RUNNING'
            ? Math.min(0.96, 0.72 + ((rIdx * 3 + i * 5) % 24) / 100)
            : 0;
        buses.push({
          id: `${route.busPrefix}${num}`,
          routeId: route.routeId,
          routeName: route.routeName,
          status,
          passengerOccupancy: status === 'RUNNING' ? Math.round(busCapacity * loadRatio) : 0,
          capacity: busCapacity,
          lastUpdated: iso,
        });
      }
    };

    pushStatus(route.statusCounts.running, 'RUNNING');
    pushStatus(route.statusCounts.available, 'AVAILABLE');
    pushStatus(route.statusCounts.maintenance, 'MAINTENANCE');
    pushStatus(route.statusCounts.outOfService, 'OUT OF SERVICE');
  });

  return buses;
}

export function stepSimulatedFleetBuses(
  buses: FleetBus[],
  routeAllocations: RouteAllocation[],
  tickCount: number,
  now: Date,
): FleetBus[] {
  const iso = now.toISOString();
  const routeById = new Map(routeAllocations.map((r) => [r.routeId, r]));

  return buses.map((bus, idx) => {
    if (bus.status !== 'RUNNING') {
      return bus;
    }
    const route = routeById.get(bus.routeId);
    const targetRatio = route
      ? Math.min(0.96, Math.max(0.45, route.occupancyPercentage / 100))
      : 0.75;
    const wave = Math.round(Math.sin((tickCount + idx * 2) * 0.6) * 3);
    const targetPax = Math.round(bus.capacity * targetRatio) + wave;
    const clampedPax = Math.max(18, Math.min(bus.capacity, targetPax));

    return {
      ...bus,
      passengerOccupancy: clampedPax,
      lastUpdated: iso,
    };
  });
}

function determineRouteStatus(
  occupancyPercentage: number,
  additionalBusesRequired: number,
  netShortfallBuses: number,
): RouteOperationalStatus {
  if (netShortfallBuses >= 3 || occupancyPercentage >= 110) {
    return 'CRITICAL';
  }
  if (netShortfallBuses > 0 || occupancyPercentage >= 95) {
    return 'DEFICIT';
  }
  if (additionalBusesRequired > 0 || occupancyPercentage >= 80) {
    return 'WATCH';
  }
  return 'OPTIMAL';
}

export function computeRouteAllocations(
  buses: FleetBus[],
  stations: Station[],
  forecasts: StationForecast[],
  settings: SystemSettings,
): RouteAllocation[] {
  const stationById = new Map(stations.map((s) => [s.id, s]));
  const forecastById = new Map(forecasts.map((f) => [f.stationId, f]));
  const busCapacity = Math.max(20, settings.busCapacityAssumed);

  return ROUTE_SEEDS.map((seed) => {
    const routeBuses = buses.filter((b) => b.routeId === seed.routeId);
    const runningBuses = routeBuses.filter((b) => b.status === 'RUNNING').length;
    const availableBuses = routeBuses.filter((b) => b.status === 'AVAILABLE').length;
    const maintenanceBuses = routeBuses.filter((b) => b.status === 'MAINTENANCE').length;
    const outOfServiceOnlyBuses = routeBuses.filter((b) => b.status === 'OUT OF SERVICE').length;
    const outOfServiceTotal = maintenanceBuses + outOfServiceOnlyBuses;
    const totalAllocatedBuses =
      runningBuses + availableBuses + maintenanceBuses + outOfServiceOnlyBuses;

    const startStation = stationById.get(seed.startingStationId);
    const destStation = stationById.get(seed.destinationStationId);
    const startForecast = forecastById
      .get(seed.startingStationId)
      ?.horizons.find((h) => h.minutes === 30);
    const destForecast = forecastById
      .get(seed.destinationStationId)
      ?.horizons.find((h) => h.minutes === 30);

    const startCurr = startStation?.currentPassengers ?? 300;
    const destCurr = destStation?.currentPassengers ?? 300;
    const startPred = startForecast?.predictedPassengers ?? startCurr;
    const destPred = destForecast?.predictedPassengers ?? destCurr;

    const currentPassengerDemand = Math.round(
      startCurr * seed.startWeight + destCurr * seed.destWeight,
    );
    const predictedPassengerDemand = Math.round(
      startPred * seed.startWeight + destPred * seed.destWeight,
    );

    const effectiveDemand = Math.max(currentPassengerDemand, predictedPassengerDemand);
    const requiredBuses = Math.max(1, Math.ceil(effectiveDemand / busCapacity));
    const requiredFleetCapacity = requiredBuses * busCapacity;
    const allocatedFleetCapacity = totalAllocatedBuses * busCapacity;
    const runningFleetCapacity = runningBuses * busCapacity;

    const occupancyPercentage =
      runningFleetCapacity > 0
        ? calculateOccupancyPercentage(currentPassengerDemand, runningFleetCapacity)
        : 100;

    const gap = evaluateFleetDeploymentGap(runningBuses, availableBuses, requiredBuses);

    const utilizationPercentage =
      totalAllocatedBuses > 0
        ? Math.round((runningBuses / totalAllocatedBuses) * 1000) / 10
        : 0;

    const routeStatus = determineRouteStatus(
      occupancyPercentage,
      gap.additionalBusesRequired,
      gap.netShortfallBuses,
    );

    return {
      routeId: seed.routeId,
      routeName: seed.routeName,
      primaryStationId: seed.primaryStationId,
      startingStationId: seed.startingStationId,
      startingStationName: seed.startingStationName,
      destinationStationId: seed.destinationStationId,
      destinationStationName: seed.destinationStationName,
      totalAllocatedBuses,
      runningBuses,
      availableBuses,
      maintenanceBuses,
      outOfServiceOnlyBuses,
      outOfServiceTotal,
      currentPassengerDemand,
      predictedPassengerDemand,
      occupancyPercentage,
      requiredBuses,
      requiredFleetCapacity,
      allocatedFleetCapacity,
      runningFleetCapacity,
      additionalBusesRequired: gap.additionalBusesRequired,
      deployableAvailableBuses: gap.deployableAvailableBuses,
      netShortfallBuses: gap.netShortfallBuses,
      utilizationPercentage,
      routeStatus,
    };
  });
}

export function computeFleetSummary(
  buses: FleetBus[],
  routes: RouteAllocation[],
): FleetSummary {
  const runningBuses = buses.filter((b) => b.status === 'RUNNING').length;
  const availableBuses = buses.filter((b) => b.status === 'AVAILABLE').length;
  const maintenanceBuses = buses.filter((b) => b.status === 'MAINTENANCE').length;
  const outOfServiceOnlyBuses = buses.filter((b) => b.status === 'OUT OF SERVICE').length;
  const outOfServiceTotal = maintenanceBuses + outOfServiceOnlyBuses;
  const totalAllocatedBuses = runningBuses + availableBuses + outOfServiceTotal;

  const fleetUtilizationPercentage =
    totalAllocatedBuses > 0
      ? Math.round((runningBuses / totalAllocatedBuses) * 1000) / 10
      : 0;
  const operationalAvailabilityPercentage =
    totalAllocatedBuses > 0
      ? Math.round(((runningBuses + availableBuses) / totalAllocatedBuses) * 1000) / 10
      : 0;

  const totalRequiredBuses = routes.reduce((sum, r) => sum + r.requiredBuses, 0);
  const totalAdditionalBusesRequired = routes.reduce(
    (sum, r) => sum + r.additionalBusesRequired,
    0,
  );
  const totalDeployableAvailable = routes.reduce(
    (sum, r) => sum + r.deployableAvailableBuses,
    0,
  );
  const totalNetShortfall = routes.reduce((sum, r) => sum + r.netShortfallBuses, 0);

  return {
    totalAllocatedBuses,
    runningBuses,
    availableBuses,
    maintenanceBuses,
    outOfServiceOnlyBuses,
    outOfServiceTotal,
    fleetUtilizationPercentage,
    operationalAvailabilityPercentage,
    totalRequiredBuses,
    totalAdditionalBusesRequired,
    totalDeployableAvailable,
    totalNetShortfall,
  };
}
