import { CameraZone, DetectedPassenger, TrackingFrame } from '../types/transit';

const CLOTHING_TONES = [
  '#60A5FA',
  '#94A3B8',
  '#CBD5E1',
  '#38BDF8',
  '#818CF8',
  '#A7F3D0',
  '#FCD34D',
  '#FCA5A5',
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Generates deterministic initial simulated passenger tracking targets for a camera zone.
 * Visual count is capped at a clean representative sample (up to 36 bounding boxes)
 * so the CCTV canvas stays readable even when zone passengerCount is 180+.
 */
export function createInitialDetectionsForZone(zone: CameraZone): DetectedPassenger[] {
  if (zone.status === 'OFFLINE') {
    return [];
  }

  const visualCount = Math.max(4, Math.min(34, Math.round(zone.passengerCount / 5)));
  const detections: DetectedPassenger[] = [];
  const baseSeed = zone.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  for (let i = 0; i < visualCount; i++) {
    const r1 = seededRandom(baseSeed + i * 7 + 1);
    const r2 = seededRandom(baseSeed + i * 7 + 2);
    const r3 = seededRandom(baseSeed + i * 7 + 3);
    const r4 = seededRandom(baseSeed + i * 7 + 4);

    // Keep pedestrians in realistic floor plane (y: 0.34 to 0.86)
    const y = 0.34 + r2 * 0.5;
    // Perspective scaling: closer pedestrians (larger y) have larger bounding boxes
    const scale = 0.65 + (y - 0.34) * 0.9;
    const width = 0.036 * scale;
    const height = 0.135 * scale;
    const x = 0.08 + r1 * 0.84;
    const speed = 0.0014 + r3 * 0.0018;
    const heading: 'left' | 'right' = r4 > 0.5 ? 'right' : 'left';

    detections.push({
      trackingId: 100 + ((baseSeed % 40) * 10) + i + 1,
      x,
      y,
      width,
      height,
      vx: heading === 'right' ? speed : -speed,
      vy: (r3 - 0.5) * 0.0005,
      confidence: Math.round((0.86 + r4 * 0.12) * 100) / 100,
      clothingTone: CLOTHING_TONES[(baseSeed + i) % CLOTHING_TONES.length],
      heading,
      phaseOffset: r1 * Math.PI * 2,
    });
  }

  return detections;
}

/**
 * Advances simulated BoT-SORT tracking positions for one animation step
 * and adjusts active bounding box count if the zone passengerCount changed.
 */
export function advanceTrackingFrame(
  zone: CameraZone,
  previousDetections: DetectedPassenger[],
  frameIndex: number,
  timestamp: string,
): TrackingFrame {
  if (zone.status === 'OFFLINE') {
    return {
      cameraId: zone.id,
      timestamp,
      frameIndex,
      detections: [],
      isSimulated: true,
    };
  }

  const targetVisualCount = Math.max(4, Math.min(34, Math.round(zone.passengerCount / 5)));
  const updated: DetectedPassenger[] = [];

  for (let i = 0; i < Math.min(previousDetections.length, targetVisualCount); i++) {
    const p = previousDetections[i];
    let nextX = p.x + p.vx;
    let nextY = p.y + p.vy;
    let nextVx = p.vx;
    let nextVy = p.vy;
    let heading = p.heading;

    if (nextX < 0.05) {
      nextX = 0.05;
      nextVx = Math.abs(p.vx);
      heading = 'right';
    } else if (nextX > 0.92) {
      nextX = 0.92;
      nextVx = -Math.abs(p.vx);
      heading = 'left';
    }

    if (nextY < 0.34) {
      nextY = 0.34;
      nextVy = Math.abs(p.vy);
    } else if (nextY > 0.85) {
      nextY = 0.85;
      nextVy = -Math.abs(p.vy);
    }

    const scale = 0.65 + (nextY - 0.34) * 0.9;
    updated.push({
      ...p,
      x: nextX,
      y: nextY,
      vx: nextVx,
      vy: nextVy,
      heading,
      width: 0.036 * scale,
      height: 0.135 * scale,
    });
  }

  // If crowd grew, spawn additional deterministic tracked passengers
  if (updated.length < targetVisualCount) {
    const seed = frameIndex + zone.passengerCount;
    const maxId = updated.reduce((m, item) => Math.max(m, item.trackingId), 100);
    for (let j = updated.length; j < targetVisualCount; j++) {
      const r1 = seededRandom(seed + j * 11);
      const r2 = seededRandom(seed + j * 13);
      const y = 0.36 + r2 * 0.46;
      const scale = 0.65 + (y - 0.34) * 0.9;
      const heading: 'left' | 'right' = r1 > 0.5 ? 'right' : 'left';
      updated.push({
        trackingId: maxId + (j - updated.length) + 1,
        x: heading === 'right' ? 0.08 : 0.88,
        y,
        width: 0.036 * scale,
        height: 0.135 * scale,
        vx: heading === 'right' ? 0.0018 : -0.0018,
        vy: (r1 - 0.5) * 0.0004,
        confidence: 0.91,
        clothingTone: CLOTHING_TONES[(seed + j) % CLOTHING_TONES.length],
        heading,
        phaseOffset: r2 * Math.PI * 2,
      });
    }
  }

  return {
    cameraId: zone.id,
    timestamp,
    frameIndex,
    detections: updated,
    isSimulated: true,
  };
}
