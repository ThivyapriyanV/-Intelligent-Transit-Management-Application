import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  BusFleetStatus,
  BusRecommendation,
  CameraZone,
  DensityThresholds,
  FleetBus,
  FleetSummary,
  PageId,
  RecommendationStatus,
  RouteAllocation,
  Station,
  StationForecast,
  StationId,
  SystemSettings,
  TransitAlert,
} from '../types/transit';
import { buildStationForecast } from '../services/densityClassifier';
import {
  evaluateFleetAlerts,
  evaluateZoneAlerts,
  generateBusRecommendations,
} from '../services/decisionEngine';
import {
  computeFleetSummary,
  computeRouteAllocations,
  createInitialFleetBuses,
  stepSimulatedFleetBuses,
} from '../services/fleetService';
import {
  createInitialAlerts,
  createInitialStations,
  DEFAULT_SYSTEM_SETTINGS,
  getHourlyFlowSeries,
  reclassifyStations,
  stepSimulatedStations,
} from '../services/transitDataProvider';

export type StationFilter = 'all' | StationId;

interface TransitContextValue {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  selectedStationFilter: StationFilter;
  setSelectedStationFilter: (filter: StationFilter) => void;
  selectedCameraId: string;
  setSelectedCameraId: (cameraId: string) => void;
  currentTime: Date;
  tickCount: number;
  stations: Station[];
  filteredStations: Station[];
  allCameras: CameraZone[];
  selectedCamera: CameraZone;
  forecasts: StationForecast[];
  alerts: TransitAlert[];
  activeAlertsCount: number;
  recommendations: BusRecommendation[];
  fleetBuses: FleetBus[];
  routeAllocations: RouteAllocation[];
  fleetSummary: FleetSummary;
  hourlyFlow: ReturnType<typeof getHourlyFlowSeries>;
  settings: SystemSettings;
  toggleSimulation: () => void;
  triggerManualStep: () => void;
  updateSettings: (partial: Partial<SystemSettings>) => void;
  updateThresholds: (thresholds: DensityThresholds) => void;
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  updateRecommendationStatus: (recId: string, status: RecommendationStatus) => void;
  toggleBusAvailability: (busId: string, targetStatus?: BusFleetStatus) => void;
  toggleCameraOnlineStatus: (cameraId: string) => void;
  resetSimulationData: () => void;
}

const TransitContext = createContext<TransitContextValue | null>(null);

export const TransitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [selectedStationFilter, setSelectedStationFilter] = useState<StationFilter>('all');
  const [selectedCameraId, setSelectedCameraId] = useState<string>('gd-z1');
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [tickCount, setTickCount] = useState<number>(0);

  const [stationState, setStationState] = useState(() =>
    createInitialStations(DEFAULT_SYSTEM_SETTINGS.thresholds, new Date()),
  );
  const [fleetBuses, setFleetBuses] = useState<FleetBus[]>(() =>
    createInitialFleetBuses(new Date(), DEFAULT_SYSTEM_SETTINGS.busCapacityAssumed),
  );
  const [alerts, setAlerts] = useState<TransitAlert[]>(() => {
    const now = new Date();
    const initialStations = createInitialStations(DEFAULT_SYSTEM_SETTINGS.thresholds, now);
    const initialForecasts = initialStations.stations.map((s) =>
      buildStationForecast(
        s,
        initialStations.historyByStation[s.id] ?? [s.currentPassengers],
        DEFAULT_SYSTEM_SETTINGS.thresholds,
        now,
      ),
    );
    const initialBuses = createInitialFleetBuses(now, DEFAULT_SYSTEM_SETTINGS.busCapacityAssumed);
    const initialRoutes = computeRouteAllocations(
      initialBuses,
      initialStations.stations,
      initialForecasts,
      DEFAULT_SYSTEM_SETTINGS,
    );
    return evaluateFleetAlerts(initialRoutes, createInitialAlerts(now), now);
  });
  const [recommendationStatuses, setRecommendationStatuses] = useState<
    Record<string, RecommendationStatus>
  >({});

  // Clock ticker (1s) for real-time header clock
  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const forecasts = useMemo(() => {
    return stationState.stations.map((station) =>
      buildStationForecast(
        station,
        stationState.historyByStation[station.id] ?? [station.currentPassengers],
        settings.thresholds,
        currentTime,
      ),
    );
  }, [stationState.stations, stationState.historyByStation, settings.thresholds, currentTime]);

  const routeAllocations = useMemo(
    () => computeRouteAllocations(fleetBuses, stationState.stations, forecasts, settings),
    [fleetBuses, stationState.stations, forecasts, settings],
  );

  const fleetSummary = useMemo(
    () => computeFleetSummary(fleetBuses, routeAllocations),
    [fleetBuses, routeAllocations],
  );

  const performSimulationStep = useCallback(
    (nextTick: number, currentSettings: SystemSettings) => {
      const now = new Date();
      const stepped = stepSimulatedStations(
        stationState.stations,
        stationState.historyByStation,
        nextTick,
        currentSettings.thresholds,
        now,
      );
      const nextForecasts = stepped.stations.map((station) =>
        buildStationForecast(
          station,
          stepped.historyByStation[station.id] ?? [station.currentPassengers],
          currentSettings.thresholds,
          now,
        ),
      );
      const nextRoutes = computeRouteAllocations(
        fleetBuses,
        stepped.stations,
        nextForecasts,
        currentSettings,
      );
      const nextBuses = stepSimulatedFleetBuses(fleetBuses, nextRoutes, nextTick, now);

      setStationState(stepped);
      setFleetBuses(nextBuses);
      setAlerts((prevAlerts) => {
        const withZones = evaluateZoneAlerts(stepped.stations, prevAlerts, currentSettings, now);
        return evaluateFleetAlerts(nextRoutes, withZones, now);
      });
    },
    [stationState, fleetBuses],
  );

  // Controlled periodic simulation updates
  useEffect(() => {
    if (!settings.simulationRunning) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setTickCount((prevTick) => {
        const nextTick = prevTick + 1;
        performSimulationStep(nextTick, settings);
        return nextTick;
      });
    }, settings.updateIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [settings, performSimulationStep]);

  const toggleSimulation = useCallback(() => {
    setSettings((prev) => ({ ...prev, simulationRunning: !prev.simulationRunning }));
  }, []);

  const triggerManualStep = useCallback(() => {
    setTickCount((prevTick) => {
      const nextTick = prevTick + 1;
      performSimulationStep(nextTick, settings);
      return nextTick;
    });
  }, [performSimulationStep, settings]);

  const updateSettings = useCallback((partial: Partial<SystemSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const updateThresholds = useCallback((thresholds: DensityThresholds) => {
    setSettings((prev) => ({ ...prev, thresholds }));
    setStationState((prev) => ({
      ...prev,
      stations: reclassifyStations(prev.stations, thresholds),
    }));
  }, []);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId && a.status === 'ACTIVE' ? { ...a, status: 'ACKNOWLEDGED' } : a)),
    );
  }, []);

  const resolveAlert = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'RESOLVED' } : a)),
    );
  }, []);

  const updateRecommendationStatus = useCallback(
    (recId: string, status: RecommendationStatus) => {
      setRecommendationStatuses((prev) => ({ ...prev, [recId]: status }));
    },
    [],
  );

  const toggleBusAvailability = useCallback(
    (busId: string, targetStatus?: BusFleetStatus) => {
      const now = new Date();
      const iso = now.toISOString();

      const nextBuses = fleetBuses.map((bus) => {
        if (bus.id !== busId) {
          return bus;
        }
        const resolvedStatus: BusFleetStatus =
          targetStatus ??
          (bus.status === 'RUNNING' || bus.status === 'AVAILABLE'
            ? 'OUT OF SERVICE'
            : 'AVAILABLE');
        return {
          ...bus,
          status: resolvedStatus,
          passengerOccupancy:
            resolvedStatus === 'RUNNING' ? Math.round(bus.capacity * 0.78) : 0,
          lastUpdated: iso,
        };
      });

      const nextRoutes = computeRouteAllocations(
        nextBuses,
        stationState.stations,
        forecasts,
        settings,
      );

      setFleetBuses(nextBuses);
      setAlerts((prevAlerts) => evaluateFleetAlerts(nextRoutes, prevAlerts, now));
    },
    [fleetBuses, stationState.stations, forecasts, settings],
  );

  const toggleCameraOnlineStatus = useCallback(
    (cameraId: string) => {
      const now = new Date();
      setStationState((prev) => {
        const updatedStations = prev.stations.map((station) => {
          const zones = station.zones.map((z) => {
            if (z.id !== cameraId) {
              return z;
            }
            const nextStatus: 'ONLINE' | 'OFFLINE' = z.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
            const nextCount = nextStatus === 'ONLINE' ? Math.round(z.capacity * 0.56) : 0;
            return {
              ...z,
              status: nextStatus,
              passengerCount: nextCount,
              fpsSimulated: nextStatus === 'ONLINE' ? 15 : 0,
              lastUpdated: now.toISOString(),
            };
          });
          const onlineZones = zones.filter((z) => z.status === 'ONLINE');
          const totalCapacity = onlineZones.reduce((s, z) => s + z.capacity, 0);
          const currentPassengers = onlineZones.reduce((s, z) => s + z.passengerCount, 0);
          return {
            ...station,
            totalCapacity,
            currentPassengers,
            zones,
          };
        });
        const reclassified = reclassifyStations(updatedStations, settings.thresholds);
        setAlerts((prevAlerts) => evaluateZoneAlerts(reclassified, prevAlerts, settings, now));
        return { ...prev, stations: reclassified };
      });
    },
    [settings],
  );

  const resetSimulationData = useCallback(() => {
    const now = new Date();
    const initialStations = createInitialStations(DEFAULT_SYSTEM_SETTINGS.thresholds, now);
    const initialBuses = createInitialFleetBuses(now, DEFAULT_SYSTEM_SETTINGS.busCapacityAssumed);
    const initialForecasts = initialStations.stations.map((s) =>
      buildStationForecast(
        s,
        initialStations.historyByStation[s.id] ?? [s.currentPassengers],
        DEFAULT_SYSTEM_SETTINGS.thresholds,
        now,
      ),
    );
    const initialRoutes = computeRouteAllocations(
      initialBuses,
      initialStations.stations,
      initialForecasts,
      DEFAULT_SYSTEM_SETTINGS,
    );

    setSettings(DEFAULT_SYSTEM_SETTINGS);
    setStationState(initialStations);
    setFleetBuses(initialBuses);
    setAlerts(evaluateFleetAlerts(initialRoutes, createInitialAlerts(now), now));
    setRecommendationStatuses({});
    setTickCount(0);
  }, []);

  const filteredStations = useMemo(() => {
    if (selectedStationFilter === 'all') {
      return stationState.stations;
    }
    return stationState.stations.filter((s) => s.id === selectedStationFilter);
  }, [stationState.stations, selectedStationFilter]);

  const allCameras = useMemo(
    () => stationState.stations.flatMap((s) => s.zones),
    [stationState.stations],
  );

  const selectedCamera = useMemo(() => {
    return allCameras.find((c) => c.id === selectedCameraId) ?? allCameras[0];
  }, [allCameras, selectedCameraId]);

  const recommendations = useMemo(() => {
    const baseRecs = generateBusRecommendations(
      stationState.stations,
      forecasts,
      settings,
      [],
      currentTime,
      routeAllocations,
    );
    return baseRecs.map((rec) => ({
      ...rec,
      status: recommendationStatuses[rec.id] ?? rec.status,
    }));
  }, [stationState.stations, forecasts, settings, recommendationStatuses, currentTime, routeAllocations]);

  const hourlyFlow = useMemo(
    () => getHourlyFlowSeries(stationState.stations),
    [stationState.stations],
  );

  const activeAlertsCount = useMemo(
    () => alerts.filter((a) => a.status === 'ACTIVE').length,
    [alerts],
  );

  const value: TransitContextValue = {
    activePage,
    setActivePage,
    selectedStationFilter,
    setSelectedStationFilter,
    selectedCameraId,
    setSelectedCameraId,
    currentTime,
    tickCount,
    stations: stationState.stations,
    filteredStations,
    allCameras,
    selectedCamera,
    forecasts,
    alerts,
    activeAlertsCount,
    recommendations,
    fleetBuses,
    routeAllocations,
    fleetSummary,
    hourlyFlow,
    settings,
    toggleSimulation,
    triggerManualStep,
    updateSettings,
    updateThresholds,
    acknowledgeAlert,
    resolveAlert,
    updateRecommendationStatus,
    toggleBusAvailability,
    toggleCameraOnlineStatus,
    resetSimulationData,
  };

  return <TransitContext.Provider value={value}>{children}</TransitContext.Provider>;
};

export function useTransit(): TransitContextValue {
  const ctx = useContext(TransitContext);
  if (!ctx) {
    throw new Error('useTransit must be used within a TransitProvider');
  }
  return ctx;
}
