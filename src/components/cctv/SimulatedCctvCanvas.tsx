import React, { useEffect, useRef, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { CameraZone, DetectedPassenger } from '../../types/transit';
import { advanceTrackingFrame, createInitialDetectionsForZone } from '../../services/detectionService';
import { getDensityColorHex } from '../common/StatusIndicator';

interface SimulatedCctvCanvasProps {
  zone: CameraZone;
  isPlaying: boolean;
  compact?: boolean;
}

export const SimulatedCctvCanvas: React.FC<SimulatedCctvCanvasProps> = ({
  zone,
  isPlaying,
  compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectionsRef = useRef<DetectedPassenger[]>(createInitialDetectionsForZone(zone));
  const frameRef = useRef<number>(0);
  const [trackedCount, setTrackedCount] = useState<number>(detectionsRef.current.length);

  // Reset deterministic trajectories when switching camera zone
  useEffect(() => {
    detectionsRef.current = createInitialDetectionsForZone(zone);
    frameRef.current = 0;
    setTrackedCount(detectionsRef.current.length);
  }, [zone.id, zone.status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || zone.status === 'OFFLINE') {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    let rafId = 0;
    let lastDrawTime = 0;

    const drawScene = (nowMs: number) => {
      // Cap software canvas redraws cleanly (~20fps when playing, single draw when paused)
      if (isPlaying && nowMs - lastDrawTime < 50) {
        rafId = window.requestAnimationFrame(drawScene);
        return;
      }
      lastDrawTime = nowMs;

      if (isPlaying) {
        frameRef.current += 1;
        const frame = advanceTrackingFrame(
          zone,
          detectionsRef.current,
          frameRef.current,
          new Date().toISOString(),
        );
        detectionsRef.current = frame.detections;
        if (frameRef.current % 10 === 0) {
          setTrackedCount(frame.detections.length);
        }
      }

      const w = canvas.width;
      const h = canvas.height;

      // 1. Background architectural ceiling & wall gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#090E1A');
      bgGrad.addColorStop(0.32, '#11192B');
      bgGrad.addColorStop(0.33, '#172033');
      bgGrad.addColorStop(1, '#0D1322');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Perspective floor grid
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = 1;
      const horizonY = h * 0.32;
      const vanishX = w * 0.5;

      for (let i = -8; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(vanishX + i * (w * 0.045), horizonY);
        ctx.lineTo(vanishX + i * (w * 0.19), h);
        ctx.stroke();
      }
      for (let r = 0; r < 7; r++) {
        const y = horizonY + Math.pow(r / 6, 1.45) * (h - horizonY);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 3. Scene-specific architectural cues
      if (zone.sceneType === 'platform') {
        // Yellow platform safety edge strip
        ctx.fillStyle = 'rgba(234, 179, 8, 0.32)';
        ctx.fillRect(0, h * 0.88, w, h * 0.028);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, h * 0.91, w, h * 0.09);
      } else if (zone.sceneType === 'bus-bay') {
        // Bus bay lane markings & shelter pillars
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
        ctx.setLineDash([12, 10]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.12, h * 0.84);
        ctx.lineTo(w * 0.88, h * 0.84);
        ctx.stroke();
        ctx.setLineDash([]);
        // Overhead bay pillars
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(w * 0.14, h * 0.1, w * 0.025, h * 0.42);
        ctx.fillRect(w * 0.835, h * 0.1, w * 0.025, h * 0.42);
      } else if (zone.sceneType === 'gate') {
        // AFC fare turnstile barriers in mid-ground
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
        for (let g = 0; g < 6; g++) {
          const gx = w * (0.16 + g * 0.13);
          ctx.fillRect(gx, h * 0.38, w * 0.026, h * 0.14);
          ctx.strokeRect(gx, h * 0.38, w * 0.026, h * 0.14);
          ctx.fillStyle = '#10B981';
          ctx.fillRect(gx + w * 0.008, h * 0.39, w * 0.01, h * 0.012);
          ctx.fillStyle = '#1E293B';
        }
      } else {
        // Main concourse overhead light fixtures & structural columns
        ctx.fillStyle = 'rgba(226, 232, 240, 0.08)';
        for (let l = 0; l < 4; l++) {
          ctx.fillRect(w * (0.15 + l * 0.22), h * 0.07, w * 0.09, h * 0.025);
        }
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(w * 0.25, h * 0.08, w * 0.024, h * 0.36);
        ctx.fillRect(w * 0.72, h * 0.08, w * 0.024, h * 0.36);
      }

      // 4. Sort detections back-to-front by Y so closer pedestrians occlude farther ones
      const sorted = [...detectionsRef.current].sort((a, b) => a.y - b.y);
      const boxColor = getDensityColorHex(zone.densityLevel);

      sorted.forEach((person) => {
        const px = person.x * w;
        const py = person.y * h;
        const bw = person.width * w;
        const bh = person.height * h;
        const stride = isPlaying
          ? Math.sin(frameRef.current * 0.28 + person.phaseOffset) * (bh * 0.06)
          : 0;

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        ctx.beginPath();
        ctx.ellipse(px + bw * 0.5, py + bh, bw * 0.45, bh * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pedestrian silhouette (head + torso + legs)
        const centerX = px + bw * 0.5;
        const headR = Math.max(3, bw * 0.22);

        // Legs
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = Math.max(2, bw * 0.16);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(centerX - bw * 0.12, py + bh * 0.58);
        ctx.lineTo(centerX - bw * 0.15 + stride, py + bh * 0.96);
        ctx.moveTo(centerX + bw * 0.12, py + bh * 0.58);
        ctx.lineTo(centerX + bw * 0.15 - stride, py + bh * 0.96);
        ctx.stroke();

        // Torso
        ctx.fillStyle = person.clothingTone;
        ctx.beginPath();
        ctx.roundRect(
          centerX - bw * 0.28,
          py + headR * 2.1,
          bw * 0.56,
          bh * 0.42,
          3,
        );
        ctx.fill();

        // Head
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.arc(centerX, py + headR * 1.1, headR, 0, Math.PI * 2);
        ctx.fill();

        // Simulated YOLOv8 Bounding Box
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = compact ? 1 : 1.5;
        ctx.strokeRect(px, py, bw, bh);

        // Corner ticks for precision command-center bounding boxes
        if (!compact) {
          const tick = Math.min(8, bw * 0.3);
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          // Top-left
          ctx.moveTo(px, py + tick);
          ctx.lineTo(px, py);
          ctx.lineTo(px + tick, py);
          // Top-right
          ctx.moveTo(px + bw - tick, py);
          ctx.lineTo(px + bw, py);
          ctx.lineTo(px + bw, py + tick);
          ctx.stroke();

          // BoT-SORT Tracking ID tag
          const label = `ID-${person.trackingId} · ${Math.round(person.confidence * 100)}%`;
          ctx.font = '600 10px "JetBrains Mono", monospace';
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(11, 17, 32, 0.86)';
          ctx.fillRect(px, Math.max(0, py - 15), textWidth + 8, 14);
          ctx.fillStyle = boxColor;
          ctx.fillText(label, px + 4, Math.max(10, py - 4));
        }
      });

      // Subtle scanline texture
      ctx.fillStyle = 'rgba(255, 255, 255, 0.018)';
      for (let sy = 0; sy < h; sy += 4) {
        ctx.fillRect(0, sy, w, 1);
      }

      if (isPlaying && !compact) {
        rafId = window.requestAnimationFrame(drawScene);
      }
    };

    rafId = window.requestAnimationFrame(drawScene);
    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [zone, isPlaying, compact]);

  if (zone.status === 'OFFLINE') {
    return (
      <div
        data-testid="cctv-simulation-canvas"
        data-camera-id={zone.id}
        data-status="OFFLINE"
        className={`relative w-full overflow-hidden rounded-lg bg-[#080C16] border border-red-500/30 flex flex-col items-center justify-center text-center p-4 ${
          compact ? 'aspect-video' : 'aspect-video min-h-[320px]'
        }`}
      >
        <WifiOff className={`${compact ? 'w-6 h-6' : 'w-10 h-10'} text-red-400 mb-2`} />
        <div className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-red-300`}>
          FEED OFFLINE — {zone.cameraCode}
        </div>
        {!compact && (
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            Simulated camera stream unavailable for {zone.stationName} · {zone.zoneName}. Check
            Settings or toggle simulated camera status to restore stream.
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="cctv-simulation-canvas"
      data-camera-id={zone.id}
      data-playing={String(isPlaying)}
      data-status="ONLINE"
      className="relative w-full aspect-video rounded-lg overflow-hidden bg-[#080C16] border border-slate-800"
    >
      <canvas
        ref={canvasRef}
        width={compact ? 400 : 880}
        height={compact ? 225 : 495}
        className="w-full h-full block"
      />

      {/* Top HUD Overlay */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/85 border border-slate-700/70 text-[11px] font-mono text-slate-100 whitespace-nowrap shrink-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isPlaying ? 'bg-red-500' : 'bg-amber-400'
            }`}
          />
          <span>{compact ? (isPlaying ? 'SIM' : 'PAUSED') : isPlaying ? 'SIMULATED LIVE' : 'PAUSED'}</span>
          <span className="text-slate-500" aria-hidden="true">
            |
          </span>
          <span>{zone.cameraCode}</span>
        </div>

        {!compact && (
          <div className="px-2.5 py-1 rounded bg-slate-950/85 border border-slate-700/70 text-[11px] font-mono text-slate-300">
            SIMULATED CV OVERLAY · YOLOv8 + BoT-SORT PROTOTYPE
          </div>
        )}
      </div>

      {/* Bottom Telemetry Overlay */}
      {!compact && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="px-2.5 py-1 rounded bg-slate-950/85 border border-slate-700/70 text-[11px] font-mono tabular-nums text-slate-200">
            {zone.stationName} · {zone.zoneName} · {zone.resolution} · {zone.fpsSimulated} FPS
          </div>
          <div className="px-2.5 py-1 rounded bg-slate-950/85 border border-slate-700/70 text-[11px] font-mono tabular-nums text-slate-200">
            Tracked Boxes: {trackedCount} · Est. Zone Count: {zone.passengerCount} pax
          </div>
        </div>
      )}
    </div>
  );
};
