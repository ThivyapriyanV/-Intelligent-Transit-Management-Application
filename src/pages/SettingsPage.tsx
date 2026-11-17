import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Save } from 'lucide-react';
import { useTransit } from '../context/TransitContext';
import { useAuth } from '../context/AuthContext';
import { canManageUsers } from '../services/authService';
import { CameraStatusTag, DensityTag } from '../components/common/StatusIndicator';
import { AdminUserManagement } from '../components/admin/AdminUserManagement';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const {
    settings,
    allCameras,
    updateSettings,
    updateThresholds,
    toggleSimulation,
    toggleCameraOnlineStatus,
    resetSimulationData,
  } = useTransit();

  const [moderateMin, setModerateMin] = useState(settings.thresholds.moderateMin);
  const [highMin, setHighMin] = useState(settings.thresholds.highMin);
  const [criticalMin, setCriticalMin] = useState(settings.thresholds.criticalMin);
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const handleApplyThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(moderateMin < highMin && highMin < criticalMin)) {
      setThresholdError('Thresholds must increase strictly: Moderate < High < Critical.');
      setSavedBanner(null);
      return;
    }
    setThresholdError(null);
    updateThresholds({ moderateMin, highMin, criticalMin });
    setSavedBanner('Crowd density thresholds updated across all monitoring zones.');
  };

  return (
    <div className="space-y-6">
      {canManageUsers(user?.assignedRole) && <AdminUserManagement />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Application Information & Integration Readiness */}
        <section className="lg:col-span-5 rounded-xl bg-[#201C22] border border-[#343039] p-5 space-y-4">
          <div>
            <h2 className="text-sm font-medium text-[#F4F1F3] font-display">
              Application Information
            </h2>
            <p className="text-xs text-[#AAA3AD] mt-1">
              Frontend prototype architecture &amp; integration readiness
            </p>
          </div>

          <dl className="divide-y divide-[#343039] text-xs">
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-[#AAA3AD]">System Name</dt>
              <dd className="text-[#F4F1F3] font-medium text-right">
                Intelligent Transit Management &amp; Crowd Detection
              </dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-[#AAA3AD]">Current Runtime Mode</dt>
              <dd className="text-[#FB7185] font-mono text-right">Frontend Simulated Prototype</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-[#AAA3AD]">Planned Detection Pipeline</dt>
              <dd className="text-[#F4F1F3] font-mono text-right">YOLOv8 + BoT-SORT (Offline)</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-[#AAA3AD]">Target Backend Adapter</dt>
              <dd className="text-[#F4F1F3] font-mono text-right">Python FastAPI REST / WS</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-[#AAA3AD]">Desktop Target</dt>
              <dd className="text-[#F4F1F3] font-mono text-right">Electron Packaging Ready</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-[#AAA3AD]">Forecasting Heuristic</dt>
              <dd className="text-[#F4F1F3] font-mono text-right">
                Simulated Holt Exponential Smoothing
              </dd>
            </div>
          </dl>
        </section>

        {/* Crowd Density Thresholds */}
        <section className="lg:col-span-7 rounded-xl bg-[#201C22] border border-[#343039] p-5">
          <h2 className="text-sm font-medium text-[#F4F1F3] font-display">
            Crowd-Density Thresholds (%)
          </h2>
          <p className="text-xs text-[#AAA3AD] mt-1 mb-4">
            Adjust occupancy bands used to classify Low, Moderate, High, and Critical zones.
          </p>

          <form onSubmit={handleApplyThresholds} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="thresh-moderate"
                  className="block text-xs font-medium text-[#AAA3AD] mb-1.5"
                >
                  Moderate Min (%)
                </label>
                <input
                  id="thresh-moderate"
                  type="number"
                  min={10}
                  max={70}
                  value={moderateMin}
                  onChange={(e) => setModerateMin(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-[#262128] border border-[#343039] text-sm font-mono tabular-nums text-[#F4F1F3] focus:outline-none focus:border-[#B51232]"
                />
                <span className="text-[11px] text-[#77717B] mt-1 block">Default: 40%</span>
              </div>

              <div>
                <label
                  htmlFor="thresh-high"
                  className="block text-xs font-medium text-[#AAA3AD] mb-1.5"
                >
                  High Min (%)
                </label>
                <input
                  id="thresh-high"
                  type="number"
                  min={20}
                  max={85}
                  value={highMin}
                  onChange={(e) => setHighMin(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-[#262128] border border-[#343039] text-sm font-mono tabular-nums text-[#F4F1F3] focus:outline-none focus:border-[#B51232]"
                />
                <span className="text-[11px] text-[#77717B] mt-1 block">Default: 66%</span>
              </div>

              <div>
                <label
                  htmlFor="thresh-critical"
                  className="block text-xs font-medium text-[#AAA3AD] mb-1.5"
                >
                  Critical Min (%)
                </label>
                <input
                  id="thresh-critical"
                  type="number"
                  min={40}
                  max={100}
                  value={criticalMin}
                  onChange={(e) => setCriticalMin(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-[#262128] border border-[#343039] text-sm font-mono tabular-nums text-[#F4F1F3] focus:outline-none focus:border-[#B51232]"
                />
                <span className="text-[11px] text-[#77717B] mt-1 block">
                  Default: 86% (&gt;85%)
                </span>
              </div>
            </div>

            {thresholdError && (
              <div className="px-3 py-2 rounded-lg bg-[#B51232]/15 border border-[#B51232]/50 text-xs text-[#FB7185]">
                {thresholdError}
              </div>
            )}
            {savedBanner && (
              <div className="px-3 py-2 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 text-xs text-[#4ADE80]">
                {savedBanner}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#B51232] hover:bg-[#D01940] text-[#F4F1F3] text-xs font-medium transition-colors crimson-glow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Apply Thresholds</span>
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Alert Preferences & Simulation Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-6 rounded-xl bg-[#201C22] border border-[#343039] p-5 space-y-4">
          <div>
            <h2 className="text-sm font-medium text-[#F4F1F3] font-display">Alert Preferences</h2>
            <p className="text-xs text-[#AAA3AD] mt-0.5">
              Configure which simulated events trigger new entries in the Alert Centre
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between gap-4 p-3 rounded-lg bg-[#262128] border border-[#343039] cursor-pointer hover:border-[#B51232]/40 transition-colors">
              <div>
                <div className="text-xs font-medium text-[#F4F1F3]">
                  High &amp; Critical Crowd Density Alerts
                </div>
                <div className="text-[11px] text-[#77717B]">
                  Trigger alerts when zone occupancy crosses High or Critical bounds
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.enableHighDensityAlerts}
                onChange={(e) => updateSettings({ enableHighDensityAlerts: e.target.checked })}
                className="w-4 h-4 accent-[#B51232]"
              />
            </label>

            <label className="flex items-center justify-between gap-4 p-3 rounded-lg bg-[#262128] border border-[#343039] cursor-pointer hover:border-[#B51232]/40 transition-colors">
              <div>
                <div className="text-xs font-medium text-[#F4F1F3]">
                  Rapid Passenger Increase Alerts
                </div>
                <div className="text-[11px] text-[#77717B]">
                  Notify when zone headcount surges by {settings.rapidSurgePercentage}%+ in one
                  step
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.enableRapidSurgeAlerts}
                onChange={(e) => updateSettings({ enableRapidSurgeAlerts: e.target.checked })}
                className="w-4 h-4 accent-[#B51232]"
              />
            </label>

            <label className="flex items-center justify-between gap-4 p-3 rounded-lg bg-[#262128] border border-[#343039] cursor-pointer hover:border-[#B51232]/40 transition-colors">
              <div>
                <div className="text-xs font-medium text-[#F4F1F3]">Camera Offline Alerts</div>
                <div className="text-[11px] text-[#77717B]">
                  Generate warning alert when a simulated camera feed drops offline
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.enableCameraOfflineAlerts}
                onChange={(e) => updateSettings({ enableCameraOfflineAlerts: e.target.checked })}
                className="w-4 h-4 accent-[#B51232]"
              />
            </label>
          </div>
        </section>

        <section className="lg:col-span-6 rounded-xl bg-[#201C22] border border-[#343039] p-5 space-y-4">
          <div>
            <h2 className="text-sm font-medium text-[#F4F1F3] font-display">Simulation Controls</h2>
            <p className="text-xs text-[#AAA3AD] mt-0.5">
              Control telemetry cadence and reset prototype state
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <span className="block text-xs font-medium text-[#AAA3AD] mb-2">Update Interval</span>
              <div className="inline-flex items-center p-1 rounded-lg bg-[#262128] border border-[#343039]">
                {[
                  { ms: 1500, label: '1.5s (Fast)' },
                  { ms: 3000, label: '3.0s (Standard)' },
                  { ms: 6000, label: '6.0s (Slow)' },
                ].map((opt) => (
                  <button
                    key={opt.ms}
                    type="button"
                    onClick={() => updateSettings({ updateIntervalMs: opt.ms })}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      settings.updateIntervalMs === opt.ms
                        ? 'bg-[#B51232] text-[#F4F1F3]'
                        : 'text-[#AAA3AD] hover:text-[#F4F1F3]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={toggleSimulation}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#B51232] hover:bg-[#D01940] text-[#F4F1F3] text-xs font-medium transition-colors crimson-glow-sm"
              >
                {settings.simulationRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause Simulation</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Resume Simulation</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  resetSimulationData();
                  setModerateMin(40);
                  setHighMin(66);
                  setCriticalMin(86);
                  setSavedBanner('Simulation state and thresholds reset to initial defaults.');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#262128] hover:bg-[#343039]/60 border border-[#343039] text-[#F4F1F3] text-xs font-medium transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Prototype Data</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Camera Configuration Preview */}
      <section className="rounded-xl bg-[#201C22] border border-[#343039] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#343039] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-[#F4F1F3] font-display">
              Camera Configuration Preview (16 Zones)
            </h2>
            <p className="text-xs text-[#AAA3AD]">
              Simulated RTSP/stream endpoints prepared for backend pipeline mapping
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#343039] text-xs font-medium text-[#AAA3AD] bg-[#262128]">
                <th className="py-3 px-4">Camera ID</th>
                <th className="py-3 px-4">Station</th>
                <th className="py-3 px-4">Zone</th>
                <th className="py-3 px-4">Resolution</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Current Density</th>
                <th className="py-3 px-4 text-right">Simulated Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#343039] text-sm">
              {allCameras.map((cam) => (
                <tr key={cam.id} className="hover:bg-[#B51232]/10 transition-colors">
                  <td className="py-2.5 px-4 font-mono text-xs text-[#F4F1F3]">
                    {cam.cameraCode}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-[#F4F1F3]">{cam.stationName}</td>
                  <td className="py-2.5 px-4 text-[#AAA3AD]">{cam.zoneName}</td>
                  <td className="py-2.5 px-4 font-mono text-xs text-[#77717B]">
                    {cam.resolution} · {cam.fpsSimulated}fps
                  </td>
                  <td className="py-2.5 px-4">
                    <CameraStatusTag status={cam.status} />
                  </td>
                  <td className="py-2.5 px-4">
                    <DensityTag level={cam.densityLevel} />
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => toggleCameraOnlineStatus(cam.id)}
                      className="text-xs font-medium text-[#D01940] hover:text-[#FB7185] transition-colors"
                    >
                      {cam.status === 'ONLINE' ? 'Set Offline' : 'Set Online'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
