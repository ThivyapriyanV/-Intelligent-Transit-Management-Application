import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  BusRecommendation,
  CameraZone,
  DensityThresholds,
  PageId,
  RecommendationStatus,
  Station,
  StationForecast,
  StationId,
  SystemSettings,
  TransitAlert,
} from '../types/transit';
import { buildStationForecast } from '../services/densityClassifier';
import { evaluateZoneAlerts, generateBusRecommendations } from '../services/decisionEngine';
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
  hourlyFlow: ReturnType<typeof getHourlyFlowSeries>;
  settings: SystemSettings;
  toggleSimulation: () => void;
  triggerManualStep: () => void;
  updateSettings: (partial: Partial<SystemSettings>) => void;
  updateThresholds: (thresholds: DensityThresholds) => void;
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  updateRecommendationStatus: (recId: string, status: RecommendationStatus) => void;
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
  const [alerts, setAlerts] = useState<TransitAlert[]>(() => createInitialAlerts(new Date()));
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

  const performSimulationStep = useCallback(
    (nextTick: number, currentSettings: SystemSettings) => {
      const now = new Date();
      setStationState((prev) => {
        const stepped = stepSimulatedStations(
          prev.stations,
          prev.historyByStation,
          nextTick,
          currentSettings.thresholds,
          now,
        );
        setAlerts((prevAlerts) =>
          evaluateZoneAlerts(stepped.stations, prevAlerts, currentSettings, now),
        );
        return stepped;
      });
    },
    [],
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
    setSettings(DEFAULT_SYSTEM_SETTINGS);
    setStationState(createInitialStations(DEFAULT_SYSTEM_SETTINGS.thresholds, now));
    setAlerts(createInitialAlerts(now));
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

  const recommendations = useMemo(() => {
    const baseRecs = generateBusRecommendations(
      stationState.stations,
      forecasts,
      settings,
      [],
      currentTime,
    );
    return baseRecs.map((rec) => ({
      ...rec,
      status: recommendationStatuses[rec.id] ?? rec.status,
    }));
  }, [stationState.stations, forecasts, settings, recommendationStatuses, currentTime]);

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
    hourlyFlow,
    settings,
    toggleSimulation,
    triggerManualStep,
    updateSettings,
    updateThresholds,
    acknowledgeAlert,
    resolveAlert,
    updateRecommendationStatus,
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
