export type PageId =
  | 'dashboard'
  | 'live-monitoring'
  | 'crowd-analytics'
  | 'crowd-prediction'
  | 'alert-centre'
  | 'bus-recommendations'
  | 'bus-fleet'
  | 'reports'
  | 'settings';

export type StationId = 'chennai-central' | 't-nagar' | 'guindy' | 'tambaram';

export type CrowdDensityLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type CameraStatus = 'ONLINE' | 'OFFLINE';

export type AlertCategory =
  | 'High Crowd Density'
  | 'Critical Overcrowding'
  | 'Camera Offline'
  | 'Rapid Passenger Increase'
  | 'Fleet Shortage';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export type RecommendationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type RecommendationStatus = 'PENDING' | 'REVIEWED' | 'ASSIGNED';

export interface DensityThresholds {
  moderateMin: number; // default 40
  highMin: number;     // default 66
  criticalMin: number; // default 86 (above 85%)
}

export interface CameraZone {
  id: string;
  stationId: StationId;
  stationName: string;
  zoneName: string;
  cameraCode: string;
  locationDescription: string;
  status: CameraStatus;
  capacity: number;
  passengerCount: number;
  previousPassengerCount: number;
  occupancyPercentage: number;
  densityLevel: CrowdDensityLevel;
  fpsSimulated: number;
  resolution: string;
  lastUpdated: string;
  sceneType: 'concourse' | 'platform' | 'bus-bay' | 'gate';
}

export interface Station {
  id: StationId;
  name: string;
  code: string;
  corridor: string;
  totalCapacity: number;
  currentPassengers: number;
  previousPassengers: number;
  occupancyPercentage: number;
  densityLevel: CrowdDensityLevel;
  zones: CameraZone[];
  busBayCapacity: number;
  scheduledBusesPerHour: number;
}

export interface DetectedPassenger {
  trackingId: number;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  width: number; // normalized
  height: number; // normalized
  vx: number;
  vy: number;
  confidence: number;
  clothingTone: string;
  heading: 'left' | 'right';
  phaseOffset: number;
}

export interface TrackingFrame {
  cameraId: string;
  timestamp: string;
  frameIndex: number;
  detections: DetectedPassenger[];
  isSimulated: true;
}

export interface ForecastHorizon {
  minutes: 15 | 30 | 60;
  predictedPassengers: number;
  occupancyPercentage: number;
  densityLevel: CrowdDensityLevel;
  confidencePercentage: number;
}

export interface ForecastPoint {
  timeLabel: string;
  offsetMinutes: number;
  actualPassengers: number | null;
  predictedPassengers: number;
  upperBound: number;
  lowerBound: number;
}

export interface StationForecast {
  stationId: StationId;
  stationName: string;
  currentPassengers: number;
  horizons: ForecastHorizon[];
  expectedPeakTime: string;
  expectedPeakPassengers: number;
  overallConfidence: number;
  alphaLevel: number;
  betaTrend: number;
  series: ForecastPoint[];
}

export interface TransitAlert {
  id: string;
  stationId: StationId;
  stationName: string;
  zoneId: string;
  zoneName: string;
  category: AlertCategory;
  severity: AlertSeverity;
  timestamp: string;
  description: string;
  recommendedAction: string;
  status: AlertStatus;
}

export interface BusRecommendation {
  id: string;
  stationId: StationId;
  stationName: string;
  routeId?: string;
  routeName?: string;
  currentPassengers: number;
  predictedPassengers: number;
  occupancyPercentage: number;
  crowdSeverity: CrowdDensityLevel;
  recommendedAdditionalBuses: number;
  allocatedBuses?: number;
  runningBuses?: number;
  availableBuses?: number;
  unavailableBuses?: number;
  requiredBuses?: number;
  deployableAvailableBuses?: number;
  netShortfallBuses?: number;
  priority: RecommendationPriority;
  suggestedDeploymentTime: string;
  reason: string;
  status: RecommendationStatus;
  updatedAt: string;
}

export type BusFleetStatus = 'RUNNING' | 'AVAILABLE' | 'MAINTENANCE' | 'OUT OF SERVICE';

export type RouteOperationalStatus = 'OPTIMAL' | 'WATCH' | 'DEFICIT' | 'CRITICAL';

export interface FleetBus {
  id: string;
  routeId: string;
  routeName: string;
  status: BusFleetStatus;
  passengerOccupancy: number;
  capacity: number;
  lastUpdated: string;
}

export interface RouteAllocation {
  routeId: string;
  routeName: string;
  primaryStationId: StationId;
  startingStationId: StationId;
  startingStationName: string;
  destinationStationId: StationId;
  destinationStationName: string;
  totalAllocatedBuses: number;
  runningBuses: number;
  availableBuses: number;
  maintenanceBuses: number;
  outOfServiceOnlyBuses: number;
  outOfServiceTotal: number; // maintenance + out of service
  currentPassengerDemand: number;
  predictedPassengerDemand: number;
  occupancyPercentage: number;
  requiredBuses: number;
  requiredFleetCapacity: number;
  allocatedFleetCapacity: number;
  runningFleetCapacity: number;
  additionalBusesRequired: number; // max(0, requiredBuses - runningBuses)
  deployableAvailableBuses: number; // min(availableBuses, additionalBusesRequired)
  netShortfallBuses: number; // max(0, additionalBusesRequired - deployableAvailableBuses)
  utilizationPercentage: number;
  routeStatus: RouteOperationalStatus;
}

export interface FleetSummary {
  totalAllocatedBuses: number;
  runningBuses: number;
  availableBuses: number;
  maintenanceBuses: number;
  outOfServiceOnlyBuses: number;
  outOfServiceTotal: number;
  fleetUtilizationPercentage: number;
  operationalAvailabilityPercentage: number;
  totalRequiredBuses: number;
  totalAdditionalBusesRequired: number;
  totalDeployableAvailable: number;
  totalNetShortfall: number;
}

export interface HourlyFlowPoint {
  hour: string;
  chennaiCentral: number;
  tNagar: number;
  guindy: number;
  tambaram: number;
  total: number;
}

export interface DailyReportRecord {
  date: string;
  stationId: StationId;
  stationName: string;
  totalPassengers: number;
  peakOccupancy: number;
  peakHour: string;
  alertsTriggered: number;
  busesRecommended: number;
}

export interface SystemSettings {
  thresholds: DensityThresholds;
  simulationRunning: boolean;
  updateIntervalMs: number;
  enableHighDensityAlerts: boolean;
  enableRapidSurgeAlerts: boolean;
  enableCameraOfflineAlerts: boolean;
  rapidSurgePercentage: number;
  busCapacityAssumed: number;
}
