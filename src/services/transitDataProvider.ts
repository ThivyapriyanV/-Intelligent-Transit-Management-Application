import {
  CameraZone,
  DensityThresholds,
  HourlyFlowPoint,
  Station,
  StationId,
  SystemSettings,
  TransitAlert,
} from '../types/transit';
import {
  calculateOccupancyPercentage,
  classifyCrowdDensity,
  DEFAULT_DENSITY_THRESHOLDS,
} from './densityClassifier';

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  thresholds: { ...DEFAULT_DENSITY_THRESHOLDS },
  simulationRunning: true,
  updateIntervalMs: 3000,
  enableHighDensityAlerts: true,
  enableRapidSurgeAlerts: true,
  enableCameraOfflineAlerts: true,
  rapidSurgePercentage: 18,
  busCapacityAssumed: 55,
};

interface SeedZoneSpec {
  id: string;
  zoneName: string;
  cameraCode: string;
  locationDescription: string;
  status: 'ONLINE' | 'OFFLINE';
  capacity: number;
  passengerCount: number;
  sceneType: CameraZone['sceneType'];
}

interface SeedStationSpec {
  id: StationId;
  name: string;
  code: string;
  corridor: string;
  busBayCapacity: number;
  scheduledBusesPerHour: number;
  zones: SeedZoneSpec[];
  history15m: number[];
}

const STATION_SEEDS: SeedStationSpec[] = [
  {
    id: 'chennai-central',
    name: 'Chennai Central',
    code: 'MAS-01',
    corridor: 'North-Central Intermodal Hub',
    busBayCapacity: 14,
    scheduledBusesPerHour: 28,
    history15m: [295, 312, 328, 340, 352, 368],
    zones: [
      {
        id: 'cc-z1',
        zoneName: 'Main Concourse',
        cameraCode: 'CAM-MAS-01',
        locationDescription: 'Central ticket hall & inter-corridor walkway',
        status: 'ONLINE',
        capacity: 150,
        passengerCount: 114,
        sceneType: 'concourse',
      },
      {
        id: 'cc-z2',
        zoneName: 'Suburban Platform 1-2',
        cameraCode: 'CAM-MAS-02',
        locationDescription: 'Northbound boarding island',
        status: 'ONLINE',
        capacity: 130,
        passengerCount: 92,
        sceneType: 'platform',
      },
      {
        id: 'cc-z3',
        zoneName: 'Bus Bay East',
        cameraCode: 'CAM-MAS-03',
        locationDescription: 'MTC feeder bay lanes 1 to 6',
        status: 'ONLINE',
        capacity: 140,
        passengerCount: 108,
        sceneType: 'bus-bay',
      },
      {
        id: 'cc-z4',
        zoneName: 'Metro Link Gate',
        cameraCode: 'CAM-MAS-04',
        locationDescription: 'AFC turnstiles & escalator landing',
        status: 'ONLINE',
        capacity: 100,
        passengerCount: 54,
        sceneType: 'gate',
      },
    ],
  },
  {
    id: 't-nagar',
    name: 'T. Nagar',
    code: 'TNG-02',
    corridor: 'Commercial Arterial Terminus',
    busBayCapacity: 12,
    scheduledBusesPerHour: 24,
    history15m: [255, 270, 282, 294, 305, 316],
    zones: [
      {
        id: 'tn-z1',
        zoneName: 'Terminus Forecourt',
        cameraCode: 'CAM-TNG-01',
        locationDescription: 'Main passenger waiting apron',
        status: 'ONLINE',
        capacity: 140,
        passengerCount: 104,
        sceneType: 'concourse',
      },
      {
        id: 'tn-z2',
        zoneName: 'South Bus Bay',
        cameraCode: 'CAM-TNG-02',
        locationDescription: 'Express corridor lanes 4 to 8',
        status: 'ONLINE',
        capacity: 120,
        passengerCount: 96,
        sceneType: 'bus-bay',
      },
      {
        id: 'tn-z3',
        zoneName: 'Skywalk Entry Gate',
        cameraCode: 'CAM-TNG-03',
        locationDescription: 'Pedestrian bridge & fare gates',
        status: 'ONLINE',
        capacity: 110,
        passengerCount: 74,
        sceneType: 'gate',
      },
      {
        id: 'tn-z4',
        zoneName: 'North Boarding Pier',
        cameraCode: 'CAM-TNG-04',
        locationDescription: 'Feeder route staging platform',
        status: 'ONLINE',
        capacity: 100,
        passengerCount: 42,
        sceneType: 'platform',
      },
    ],
  },
  {
    id: 'guindy',
    name: 'Guindy',
    code: 'GDY-03',
    corridor: 'IT & Industrial Interchange',
    busBayCapacity: 10,
    scheduledBusesPerHour: 22,
    history15m: [318, 340, 362, 384, 404, 420],
    zones: [
      {
        id: 'gd-z1',
        zoneName: 'GST Road Bus Bay',
        cameraCode: 'CAM-GDY-01',
        locationDescription: 'High-frequency IT corridor boarding bays',
        status: 'ONLINE',
        capacity: 130,
        passengerCount: 122,
        sceneType: 'bus-bay',
      },
      {
        id: 'gd-z2',
        zoneName: 'Interchange Concourse',
        cameraCode: 'CAM-GDY-02',
        locationDescription: 'Rail-to-bus transfer plaza',
        status: 'ONLINE',
        capacity: 125,
        passengerCount: 112,
        sceneType: 'concourse',
      },
      {
        id: 'gd-z3',
        zoneName: 'Platform 3-4',
        cameraCode: 'CAM-GDY-03',
        locationDescription: 'Suburban express boarding zone',
        status: 'ONLINE',
        capacity: 115,
        passengerCount: 104,
        sceneType: 'platform',
      },
      {
        id: 'gd-z4',
        zoneName: 'East Turnstile Gate',
        cameraCode: 'CAM-GDY-04',
        locationDescription: 'Industrial estate entry gates',
        status: 'ONLINE',
        capacity: 100,
        passengerCount: 82,
        sceneType: 'gate',
      },
    ],
  },
  {
    id: 'tambaram',
    name: 'Tambaram',
    code: 'TBM-04',
    corridor: 'Southern Suburban Gateway',
    busBayCapacity: 11,
    scheduledBusesPerHour: 18,
    history15m: [188, 195, 202, 208, 212, 218],
    zones: [
      {
        id: 'tb-z1',
        zoneName: 'West Terminus Concourse',
        cameraCode: 'CAM-TBM-01',
        locationDescription: 'Main commuter hall & ticket counter',
        status: 'ONLINE',
        capacity: 140,
        passengerCount: 78,
        sceneType: 'concourse',
      },
      {
        id: 'tb-z2',
        zoneName: 'Mofussil Bus Bay',
        cameraCode: 'CAM-TBM-02',
        locationDescription: 'Southern highway coach lanes',
        status: 'ONLINE',
        capacity: 130,
        passengerCount: 86,
        sceneType: 'bus-bay',
      },
      {
        id: 'tb-z3',
        zoneName: 'Platform 1-2',
        cameraCode: 'CAM-TBM-03',
        locationDescription: 'Suburban arrival platform',
        status: 'ONLINE',
        capacity: 130,
        passengerCount: 54,
        sceneType: 'platform',
      },
      {
        id: 'tb-z4',
        zoneName: 'East Footbridge Gate',
        cameraCode: 'CAM-TBM-04',
        locationDescription: 'East entry overpass & AFC gate',
        status: 'OFFLINE',
        capacity: 100,
        passengerCount: 0,
        sceneType: 'gate',
      },
    ],
  },
];

export function createInitialStations(
  thresholds: DensityThresholds,
  referenceTime: Date,
): { stations: Station[]; historyByStation: Record<StationId, number[]> } {
  const historyByStation = {} as Record<StationId, number[]>;
  const iso = referenceTime.toISOString();

  const stations: Station[] = STATION_SEEDS.map((seed) => {
    historyByStation[seed.id] = [...seed.history15m];

    const zones: CameraZone[] = seed.zones.map((z) => {
      const occupancyPercentage =
        z.status === 'OFFLINE' ? 0 : calculateOccupancyPercentage(z.passengerCount, z.capacity);
      return {
        ...z,
        stationId: seed.id,
        stationName: seed.name,
        previousPassengerCount: z.passengerCount,
        occupancyPercentage,
        densityLevel: classifyCrowdDensity(occupancyPercentage, thresholds),
        fpsSimulated: z.status === 'OFFLINE' ? 0 : 15,
        resolution: '1920x1080',
        lastUpdated: iso,
      };
    });

    const onlineZones = zones.filter((z) => z.status === 'ONLINE');
    const totalCapacity = onlineZones.reduce((sum, z) => sum + z.capacity, 0);
    const currentPassengers = onlineZones.reduce((sum, z) => sum + z.passengerCount, 0);
    const occupancyPercentage = calculateOccupancyPercentage(currentPassengers, totalCapacity);

    return {
      id: seed.id,
      name: seed.name,
      code: seed.code,
      corridor: seed.corridor,
      totalCapacity,
      currentPassengers,
      previousPassengers: currentPassengers,
      occupancyPercentage,
      densityLevel: classifyCrowdDensity(occupancyPercentage, thresholds),
      zones,
      busBayCapacity: seed.busBayCapacity,
      scheduledBusesPerHour: seed.scheduledBusesPerHour,
    };
  });

  return { stations, historyByStation };
}

export function createInitialAlerts(referenceTime: Date): TransitAlert[] {
  const t = (minsAgo: number) =>
    new Date(referenceTime.getTime() - minsAgo * 60_000).toISOString();

  return [
    {
      id: 'ALT-DENSITY-gd-z1',
      stationId: 'guindy',
      stationName: 'Guindy',
      zoneId: 'gd-z1',
      zoneName: 'GST Road Bus Bay',
      category: 'Critical Overcrowding',
      severity: 'CRITICAL',
      timestamp: t(3),
      description: 'Occupancy reached 93.8% (122/130 pax) in GST Road Bus Bay.',
      recommendedAction:
        'Open secondary entry gates, deploy platform marshals, and review additional bus dispatch recommendations.',
      status: 'ACTIVE',
    },
    {
      id: 'ALT-DENSITY-gd-z2',
      stationId: 'guindy',
      stationName: 'Guindy',
      zoneId: 'gd-z2',
      zoneName: 'Interchange Concourse',
      category: 'Critical Overcrowding',
      severity: 'CRITICAL',
      timestamp: t(6),
      description: 'Occupancy reached 89.6% (112/125 pax) in Interchange Concourse.',
      recommendedAction:
        'Open secondary entry gates, deploy platform marshals, and review additional bus dispatch recommendations.',
      status: 'ACTIVE',
    },
    {
      id: 'ALT-SURGE-gd-z3',
      stationId: 'guindy',
      stationName: 'Guindy',
      zoneId: 'gd-z3',
      zoneName: 'Platform 3-4',
      category: 'Rapid Passenger Increase',
      severity: 'WARNING',
      timestamp: t(9),
      description:
        'Sudden +22% passenger inflow detected in Platform 3-4 following suburban rail arrival.',
      recommendedAction:
        'Check incoming train/bus arrival schedule and pre-stage crowd guidance announcements.',
      status: 'ACTIVE',
    },
    {
      id: 'ALT-DENSITY-tn-z2',
      stationId: 't-nagar',
      stationName: 'T. Nagar',
      zoneId: 'tn-z2',
      zoneName: 'South Bus Bay',
      category: 'High Crowd Density',
      severity: 'WARNING',
      timestamp: t(14),
      description: 'Sustained high density at 80.0% (96/120 pax) in South Bus Bay.',
      recommendedAction:
        'Monitor boarding queue clearance rate and prepare standby bus bay allocation.',
      status: 'ACTIVE',
    },
    {
      id: 'ALT-DENSITY-cc-z3',
      stationId: 'chennai-central',
      stationName: 'Chennai Central',
      zoneId: 'cc-z3',
      zoneName: 'Bus Bay East',
      category: 'High Crowd Density',
      severity: 'WARNING',
      timestamp: t(19),
      description: 'Sustained high density at 77.1% (108/140 pax) in Bus Bay East.',
      recommendedAction:
        'Monitor boarding queue clearance rate and prepare standby bus bay allocation.',
      status: 'ACKNOWLEDGED',
    },
    {
      id: 'ALT-OFF-tb-z4',
      stationId: 'tambaram',
      stationName: 'Tambaram',
      zoneId: 'tb-z4',
      zoneName: 'East Footbridge Gate',
      category: 'Camera Offline',
      severity: 'WARNING',
      timestamp: t(26),
      description:
        'CAM-TBM-04 at Tambaram (East Footbridge Gate) is unreachable and reporting offline status.',
      recommendedAction:
        'Verify PoE network switch connectivity and dispatch field technician if feed remains dark.',
      status: 'ACTIVE',
    },
  ];
}

/**
 * Advances simulation deterministically by one controlled step.
 * Keeps passenger counts realistic around natural transit waves without wild random jumps.
 */
export function stepSimulatedStations(
  stations: Station[],
  historyByStation: Record<StationId, number[]>,
  tickCount: number,
  thresholds: DensityThresholds,
  now: Date,
): { stations: Station[]; historyByStation: Record<StationId, number[]> } {
  const nextHistory: Record<StationId, number[]> = { ...historyByStation };
  const iso = now.toISOString();

  const nextStations = stations.map((station, sIdx) => {
    const zones = station.zones.map((zone, zIdx) => {
      if (zone.status === 'OFFLINE') {
        return { ...zone, lastUpdated: iso };
      }

      // Deterministic smooth sinusoidal + micro-oscillation delta (-4 to +5 passengers)
      const wave = Math.sin((tickCount + sIdx * 3 + zIdx * 2) * 0.55);
      const secondary = Math.cos((tickCount + zIdx * 5) * 0.35);
      const rawDelta = Math.round(wave * 3 + secondary * 2);

      // Gentle mean-reversion toward station's typical demand band
      const minPax = Math.round(zone.capacity * 0.25);
      const maxPax = Math.round(zone.capacity * 0.98);
      const nextCount = Math.max(minPax, Math.min(maxPax, zone.passengerCount + rawDelta));
      const occupancyPercentage = calculateOccupancyPercentage(nextCount, zone.capacity);

      return {
        ...zone,
        previousPassengerCount: zone.passengerCount,
        passengerCount: nextCount,
        occupancyPercentage,
        densityLevel: classifyCrowdDensity(occupancyPercentage, thresholds),
        lastUpdated: iso,
      };
    });

    const onlineZones = zones.filter((z) => z.status === 'ONLINE');
    const totalCapacity = onlineZones.reduce((sum, z) => sum + z.capacity, 0);
    const currentPassengers = onlineZones.reduce((sum, z) => sum + z.passengerCount, 0);
    const occupancyPercentage = calculateOccupancyPercentage(currentPassengers, totalCapacity);

    // Every 3 ticks, append to rolling 15m-style history buffer for forecasting
    if (tickCount % 3 === 0) {
      const prevHist = nextHistory[station.id] ?? [];
      nextHistory[station.id] = [...prevHist.slice(-7), currentPassengers];
    }

    return {
      ...station,
      totalCapacity,
      previousPassengers: station.currentPassengers,
      currentPassengers,
      occupancyPercentage,
      densityLevel: classifyCrowdDensity(occupancyPercentage, thresholds),
      zones,
    };
  });

  return { stations: nextStations, historyByStation: nextHistory };
}

export function reclassifyStations(
  stations: Station[],
  thresholds: DensityThresholds,
): Station[] {
  return stations.map((station) => {
    const zones = station.zones.map((zone) => {
      if (zone.status === 'OFFLINE') {
        return zone;
      }
      const occupancyPercentage = calculateOccupancyPercentage(zone.passengerCount, zone.capacity);
      return {
        ...zone,
        occupancyPercentage,
        densityLevel: classifyCrowdDensity(occupancyPercentage, thresholds),
      };
    });
    const occupancyPercentage = calculateOccupancyPercentage(
      station.currentPassengers,
      station.totalCapacity,
    );
    return {
      ...station,
      occupancyPercentage,
      densityLevel: classifyCrowdDensity(occupancyPercentage, thresholds),
      zones,
    };
  });
}

export function getHourlyFlowSeries(stations: Station[]): HourlyFlowPoint[] {
  const byId = new Map(stations.map((s) => [s.id, s.currentPassengers]));
  const ccNow = byId.get('chennai-central') ?? 368;
  const tnNow = byId.get('t-nagar') ?? 316;
  const gdNow = byId.get('guindy') ?? 420;
  const tbNow = byId.get('tambaram') ?? 218;

  // Morning and evening commuter curve multipliers
  const profile: Array<{ hour: string; factor: number }> = [
    { hour: '06:00', factor: 0.36 },
    { hour: '07:00', factor: 0.58 },
    { hour: '08:00', factor: 0.86 },
    { hour: '09:00', factor: 1.04 },
    { hour: '10:00', factor: 0.92 },
    { hour: '11:00', factor: 0.72 },
    { hour: '12:00', factor: 0.68 },
    { hour: '13:00', factor: 0.65 },
    { hour: '14:00', factor: 0.69 },
    { hour: '15:00', factor: 0.76 },
    { hour: '16:00', factor: 0.85 },
    { hour: '17:00', factor: 0.98 },
    { hour: '18:00', factor: 1.08 },
    { hour: '19:00', factor: 0.95 },
    { hour: '20:00', factor: 0.74 },
    { hour: '21:00', factor: 0.51 },
  ];

  return profile.map(({ hour, factor }) => {
    const chennaiCentral = Math.round(ccNow * factor);
    const tNagar = Math.round(tnNow * factor);
    const guindy = Math.round(gdNow * factor);
    const tambaram = Math.round(tbNow * factor);
    return {
      hour,
      chennaiCentral,
      tNagar,
      guindy,
      tambaram,
      total: chennaiCentral + tNagar + guindy + tambaram,
    };
  });
}
