import React, { useState } from 'react';
import { Camera, Pause, Play, RefreshCw } from 'lucide-react';
import { useTransit } from '../context/TransitContext';
import { SimulatedCctvCanvas } from '../components/cctv/SimulatedCctvCanvas';
import { CameraStatusTag, DensityTag } from '../components/common/StatusIndicator';

export const LiveMonitoringPage: React.FC = () => {
  const {
    filteredStations,
    allCameras,
    selectedCamera,
    setSelectedCameraId,
    settings,
    toggleSimulation,
    triggerManualStep,
    toggleCameraOnlineStatus,
  } = useTransit();

  const [localFeedPlaying, setLocalFeedPlaying] = useState(true);
  const effectivePlaying = settings.simulationRunning && localFeedPlaying;

  // Show cameras for selected station filter (or all 16, grouped cleanly)
  const visibleCameras = filteredStations.flatMap((s) => s.zones);

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <p className="text-xs sm:text-sm text-slate-300">
            Simulated CCTV Crowd Detection Feed · Bounding boxes & tracking IDs are frontend
            simulations prepared for YOLOv8 + BoT-SORT backend integration.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setLocalFeedPlaying((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors whitespace-nowrap"
          >
            {localFeedPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Feed</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Play Feed</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={toggleSimulation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap"
          >
            <span>
              {settings.simulationRunning ? 'Pause Global Telemetry' : 'Resume Global Telemetry'}
            </span>
          </button>

          <button
            type="button"
            onClick={triggerManualStep}
            aria-label="Step simulated passenger count"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Step Simulation</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Large Selected Camera + Zone Telemetry Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 rounded-xl bg-[#111827] border border-slate-800/90 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <Camera className="w-4 h-4 text-blue-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  {selectedCamera.stationName} — {selectedCamera.zoneName}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedCamera.cameraCode} · {selectedCamera.locationDescription}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <CameraStatusTag status={selectedCamera.status} />
              <DensityTag level={selectedCamera.densityLevel} />
            </div>
          </div>

          <SimulatedCctvCanvas zone={selectedCamera} isPlaying={effectivePlaying} />

          {/* Camera Metrics Footer */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-[#0F172A] border border-slate-800/80">
              <div className="text-[11px] text-slate-400">Passenger Count</div>
              <div className="text-lg font-semibold text-slate-100 font-mono tabular-nums mt-0.5">
                {selectedCamera.status === 'ONLINE' ? selectedCamera.passengerCount : '—'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#0F172A] border border-slate-800/80">
              <div className="text-[11px] text-slate-400">Zone Capacity</div>
              <div className="text-lg font-semibold text-slate-100 font-mono tabular-nums mt-0.5">
                {selectedCamera.capacity} pax
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#0F172A] border border-slate-800/80">
              <div className="text-[11px] text-slate-400">Zone Density</div>
              <div className="text-lg font-semibold text-slate-100 font-mono tabular-nums mt-0.5">
                {selectedCamera.status === 'ONLINE' ? `${selectedCamera.occupancyPercentage}%` : 'N/A'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#0F172A] border border-slate-800/80 flex flex-col justify-between">
              <div className="text-[11px] text-slate-400">Camera Link Control</div>
              <button
                type="button"
                onClick={() => toggleCameraOnlineStatus(selectedCamera.id)}
                className="mt-1 text-left text-xs font-medium text-blue-400 hover:text-blue-300"
              >
                {selectedCamera.status === 'ONLINE'
                  ? 'Simulate Camera Offline'
                  : 'Restore Simulated Feed'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Station Quick Zone List */}
        <div className="xl:col-span-4 rounded-xl bg-[#111827] border border-slate-800/90 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-100">
              Camera Zones ({visibleCameras.length})
            </h3>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {allCameras.filter((c) => c.status === 'ONLINE').length}/{allCameras.length} Online
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[520px] pr-1">
            {visibleCameras.map((cam) => {
              const isSelected = cam.id === selectedCamera.id;
              return (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => setSelectedCameraId(cam.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/50'
                      : 'bg-[#0F172A] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-100 truncate">
                      {cam.stationName} · {cam.zoneName}
                    </span>
                    <CameraStatusTag status={cam.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400 font-mono tabular-nums">
                    <span>{cam.cameraCode}</span>
                    <span>
                      {cam.status === 'ONLINE'
                        ? `${cam.passengerCount} pax (${cam.occupancyPercentage}%)`
                        : 'Signal Lost'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Camera Preview Cards Grid (4+ zones at a glance) */}
      <section aria-label="Zone Camera Previews" className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-100">
          Monitoring Zone Previews (Select feed to inspect)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleCameras.slice(0, 8).map((cam) => {
            const isSelected = cam.id === selectedCamera.id;
            return (
              <button
                key={cam.id}
                type="button"
                onClick={() => setSelectedCameraId(cam.id)}
                className={`text-left rounded-xl p-3 border transition-colors ${
                  isSelected
                    ? 'bg-[#162033] border-blue-500/60'
                    : 'bg-[#111827] border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <SimulatedCctvCanvas zone={cam} isPlaying={effectivePlaying} compact />
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100 truncate">
                      {cam.zoneName}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {cam.stationName} · {cam.cameraCode}
                    </div>
                  </div>
                  <DensityTag level={cam.densityLevel} />
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-300">
                  <span>
                    {cam.status === 'ONLINE' ? `${cam.passengerCount} pax` : 'Offline'}
                  </span>
                  <span>
                    {cam.status === 'ONLINE' ? `${cam.occupancyPercentage}% density` : '0 FPS'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
