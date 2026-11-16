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
      if (isPlaying && nowMs - lastDrawTime < 55) {
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

      // 1. Dark obsidian architectural ceiling & floor gradient matching #100E12 / #151217
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#0D0B0F');
      bgGrad.addColorStop(0.32, '#151217');
      bgGrad.addColorStop(0.33, '#1B171E');
      bgGrad.addColorStop(1, '#100E12');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Perspective floor grid
      ctx.strokeStyle = 'rgba(170, 163, 173, 0.10)';
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
        ctx.fillStyle = 'rgba(234, 179, 8, 0.34)';
        ctx.fillRect(0, h * 0.88, w, h * 0.028);
        ctx.fillStyle = 'rgba(16, 14, 18, 0.9)';
        ctx.fillRect(0, h * 0.91, w, h * 0.09);
      } else if (zone.sceneType === 'bus-bay') {
        ctx.strokeStyle = 'rgba(181, 18, 50, 0.42)';
        ctx.setLineDash([12, 10]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.12, h * 0.84);
        ctx.lineTo(w * 0.88, h * 0.84);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#262128';
        ctx.fillRect(w * 0.14, h * 0.1, w * 0.025, h * 0.42);
        ctx.fillRect(w * 0.835, h * 0.1, w * 0.025, h * 0.42);
      } else if (zone.sceneType === 'gate') {
        ctx.fillStyle = '#262128';
        ctx.strokeStyle = 'rgba(170, 163, 173, 0.28)';
        for (let g = 0; g < 6; g++) {
          const gx = w * (0.16 + g * 0.13);
          ctx.fillRect(gx, h * 0.38, w * 0.026, h * 0.14);
          ctx.strokeRect(gx, h * 0.38, w * 0.026, h * 0.14);
          ctx.fillStyle = '#22C55E';
          ctx.fillRect(gx + w * 0.008, h * 0.39, w * 0.01, h * 0.012);
          ctx.fillStyle = '#262128';
        }
      } else {
        ctx.fillStyle = 'rgba(244, 241, 243, 0.07)';
        for (let l = 0; l < 4; l++) {
          ctx.fillRect(w * (0.15 + l * 0.22), h * 0.07, w * 0.09, h * 0.025);
        }
        ctx.fillStyle = '#262128';
        ctx.fillRect(w * 0.25, h * 0.08, w * 0.024, h * 0.36);
        ctx.fillRect(w * 0.72, h * 0.08, w * 0.024, h * 0.36);
      }

      // 4. Sort detections back-to-front by Y
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
        ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
        ctx.beginPath();
        ctx.ellipse(px + bw * 0.5, py + bh, bw * 0.45, bh * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();

        const centerX = px + bw * 0.5;
        const headR = Math.max(3, bw * 0.22);

        // Legs
        ctx.strokeStyle = '#AAA3AD';
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
        ctx.roundRect(centerX - bw * 0.28, py + headR * 2.1, bw * 0.56, bh * 0.42, 3);
        ctx.fill();

        // Head
        ctx.fillStyle = '#F4F1F3';
        ctx.beginPath();
        ctx.arc(centerX, py + headR * 1.1, headR, 0, Math.PI * 2);
        ctx.fill();

        // Simulated YOLOv8 Bounding Box
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = compact ? 1 : 1.5;
        ctx.strokeRect(px, py, bw, bh);

        if (!compact) {
          const tick = Math.min(8, bw * 0.3);
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(px, py + tick);
          ctx.lineTo(px, py);
          ctx.lineTo(px + tick, py);
          ctx.moveTo(px + bw - tick, py);
          ctx.lineTo(px + bw, py);
          ctx.lineTo(px + bw, py + tick);
          ctx.stroke();

          const label = `ID-${person.trackingId} · ${Math.round(person.confidence * 100)}%`;
          ctx.font = '600 10px "JetBrains Mono", monospace';
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(16, 14, 18, 0.88)';
          ctx.fillRect(px, Math.max(0, py - 15), textWidth + 8, 14);
          ctx.fillStyle = boxColor;
          ctx.fillText(label, px + 4, Math.max(10, py - 4));
        }
      });

      // Subtle scanline texture
      ctx.fillStyle = 'rgba(244, 241, 243, 0.016)';
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
        className={`relative w-full overflow-hidden rounded-lg bg-[#100E12] border border-[#B51232]/50 flex flex-col items-center justify-center text-center p-4 ${
          compact ? 'aspect-video' : 'aspect-video min-h-[320px]'
        }`}
      >
        <WifiOff className={`${compact ? 'w-6 h-6' : 'w-10 h-10'} text-[#FB7185] mb-2`} />
        <div className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-[#FB7185]`}>
          FEED OFFLINE — {zone.cameraCode}
        </div>
        {!compact && (
          <p className="text-xs text-[#AAA3AD] mt-1 max-w-md">
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
      className="relative w-full aspect-video rounded-lg overflow-hidden bg-[#100E12] border border-[#343039]"
    >
      <canvas
        ref={canvasRef}
        width={compact ? 400 : 880}
        height={compact ? 225 : 495}
        className="w-full h-full block"
      />

      {/* Top HUD Overlay */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#100E12]/90 border border-[#343039] text-[11px] font-mono text-[#F4F1F3] whitespace-nowrap shrink-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isPlaying ? 'bg-[#D01940]' : 'bg-[#F97316]'
            }`}
          />
          <span>
            {compact ? (isPlaying ? 'SIM' : 'PAUSED') : isPlaying ? 'SIMULATED LIVE' : 'PAUSED'}
          </span>
          <span className="text-[#77717B]" aria-hidden="true">
            |
          </span>
          <span>{zone.cameraCode}</span>
        </div>

        {!compact && (
          <div className="px-2.5 py-1 rounded bg-[#100E12]/90 border border-[#343039] text-[11px] font-mono text-[#AAA3AD]">
            SIMULATED CV OVERLAY · YOLOv8 + BoT-SORT PROTOTYPE
          </div>
        )}
      </div>

      {/* Bottom Telemetry Overlay */}
      {!compact && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="px-2.5 py-1 rounded bg-[#100E12]/90 border border-[#343039] text-[11px] font-mono tabular-nums text-[#F4F1F3]">
            {zone.stationName} · {zone.zoneName} · {zone.resolution} · {zone.fpsSimulated} FPS
          </div>
          <div className="px-2.5 py-1 rounded bg-[#100E12]/90 border border-[#343039] text-[11px] font-mono tabular-nums text-[#F4F1F3]">
            Tracked Boxes: {trackedCount} · Est. Zone Count: {zone.passengerCount} pax
          </div>
        </div>
      )}
    </div>
  );
};
