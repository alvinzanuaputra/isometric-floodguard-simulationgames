/**
 * Visual layer genangan — interpolasi level air & animasi aliran gravitasi.
 * Murni tampilan; tidak mengubah simulasi di floodSimulation.ts.
 */

import { Tile } from '@/types/game';
import { RENDER_THRESHOLD } from '@/lib/floodSimulation';
import { shouldRenderSurfaceFlood } from '@/components/game/floodRender';
import { TILE_WIDTH, TILE_HEIGHT } from '@/components/game/types';
import { gridToScreen } from '@/components/game/utils';

export interface FloodWaterViewBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface FloodWaterVisualState {
  displayWater: Float32Array;
  gridSize: number;
}

/** Kecepatan visual naik (hujan / aliran masuk). */
const LERP_RISE_PER_SEC = 5.5;
/** Lebih lambat turun agar penyerapan/resapan terlihat jelas. */
const LERP_FALL_PER_SEC = 2.0;

/** Arah aliran sim → vektor layar isometrik (1=N, 2=E, 3=S, 4=W). */
const FLOW_SCREEN_DIR: ReadonlyArray<[number, number]> = [
  [0, 0],
  [0.48, -0.34],
  [0.48, 0.34],
  [-0.48, 0.34],
  [-0.48, -0.34],
];

export function createFloodWaterVisualState(gridSize: number): FloodWaterVisualState {
  return {
    gridSize,
    displayWater: new Float32Array(gridSize * gridSize),
  };
}

export function ensureFloodWaterVisualState(
  state: FloodWaterVisualState | null,
  gridSize: number
): FloodWaterVisualState {
  if (!state || state.gridSize !== gridSize) {
    return createFloodWaterVisualState(gridSize);
  }
  return state;
}

/** Lerp displayWater → waterLevel aktual setiap frame. */
export function updateFloodWaterVisuals(
  visual: FloodWaterVisualState,
  grid: Tile[][],
  gridSize: number,
  dtSeconds: number
): void {
  const { displayWater } = visual;
  const riseStep = LERP_RISE_PER_SEC * dtSeconds;
  const fallStep = LERP_FALL_PER_SEC * dtSeconds;
  const eps = 0.00015;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const idx = y * gridSize + x;
      const target = grid[y][x].waterLevel;
      const current = displayWater[idx];

      if (Math.abs(current - target) <= eps) {
        displayWater[idx] = target;
        continue;
      }

      if (target > current) {
        displayWater[idx] = Math.min(target, current + riseStep);
      } else {
        displayWater[idx] = Math.max(target, current - fallStep);
      }
    }
  }
}

function puddleMetrics(wl: number): { alpha: number; scale: number } {
  return {
    alpha: Math.min(0.78, wl * 6),
    scale: Math.min(1, 0.35 + wl * 2.5),
  };
}

function drawPuddleEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  fillStyle: string
): void {
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.ellipse(
    cx,
    cy,
    TILE_WIDTH * 0.38 * scale,
    TILE_HEIGHT * 0.28 * scale,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

/** Gelombang cincin saat air surut (penyerapan / pompa / resapan). */
function drawRecedingRipple(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  phase: number,
  intensity: number
): void {
  const pulse = (Math.sin(phase * 4.2) + 1) * 0.5;
  const ringScale = 0.55 + pulse * 0.35 * intensity;
  const alpha = 0.08 + pulse * 0.14 * intensity;

  ctx.strokeStyle = `rgba(160, 220, 255, ${alpha})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(
    cx,
    cy,
    TILE_WIDTH * 0.38 * ringScale,
    TILE_HEIGHT * 0.28 * ringScale,
    0,
    0,
    Math.PI * 2
  );
  ctx.stroke();
}

/** Ripple saat genangan naik (hujan / aliran masuk). */
function drawFillRipple(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  timeMs: number,
  wl: number
): void {
  const phase = timeMs * 0.003 + cx * 0.02;
  const pulse = (Math.sin(phase * 3.5) + 1) * 0.5;
  const ringScale = 0.3 + pulse * 0.25;
  const alpha = 0.06 + pulse * 0.1 * Math.min(1, wl * 4);

  ctx.strokeStyle = `rgba(80, 180, 255, ${alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(
    cx,
    cy,
    TILE_WIDTH * 0.38 * ringScale,
    TILE_HEIGHT * 0.28 * ringScale,
    0,
    0,
    Math.PI * 2
  );
  ctx.stroke();
}

/** Streak animasi mengikuti arah gravitasi (flowDirection). */
function drawFlowStreaks(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  flowDir: number,
  timeMs: number,
  wl: number
): void {
  const [dx, dy] = FLOW_SCREEN_DIR[flowDir] ?? [0, 0];
  if (dx === 0 && dy === 0) return;

  const travel = TILE_WIDTH * 0.42;
  const streakLen = TILE_WIDTH * 0.14;
  const intensity = Math.min(1, wl * 3);
  const baseAlpha = 0.18 + intensity * 0.35;

  for (let i = 0; i < 3; i++) {
    const phase = (timeMs * 0.0018 + i * 0.34) % 1;
    const px = cx + dx * travel * (phase - 0.5);
    const py = cy + dy * travel * (phase - 0.5);

    const fade = Math.sin(phase * Math.PI);
    const alpha = baseAlpha * fade;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(dy * TILE_WIDTH, dx * TILE_WIDTH));
    ctx.fillStyle = `rgba(180, 230, 255, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, streakLen, streakLen * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Panah arah aliran tipis
  const tipX = cx + dx * travel * 0.38;
  const tipY = cy + dy * travel * 0.38;
  const tailX = cx - dx * travel * 0.12;
  const tailY = cy - dy * travel * 0.12;

  ctx.strokeStyle = `rgba(200, 240, 255, ${baseAlpha * 0.7})`;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
}

export function drawFloodWaterLayer(
  ctx: CanvasRenderingContext2D,
  grid: Tile[][],
  gridSize: number,
  visual: FloodWaterVisualState,
  bounds: FloodWaterViewBounds,
  options: {
    waterCutoff: number;
    timeMs: number;
  }
): void {
  const { displayWater } = visual;
  const { waterCutoff, timeMs } = options;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const tile = grid[y][x];
      if (tile.playable === false || (tile.elevation ?? -1) < 0) continue;
      if (!shouldRenderSurfaceFlood(tile)) continue;

      const idx = y * gridSize + x;
      const displayWl = displayWater[idx];
      const actualWl = tile.waterLevel;

      if (displayWl <= waterCutoff && actualWl <= waterCutoff) continue;

      const { screenX, screenY } = gridToScreen(x, y, 0, 0);
      if (
        screenX + TILE_WIDTH < bounds.left ||
        screenX > bounds.right ||
        screenY + TILE_HEIGHT < bounds.top ||
        screenY > bounds.bottom
      ) {
        continue;
      }

      const cx = screenX + TILE_WIDTH / 2;
      const cy = screenY + TILE_HEIGHT * 0.62;
      const draining = displayWl > actualWl + 0.003;
      const filling = actualWl > displayWl + 0.003;
      const renderWl = displayWl > waterCutoff ? displayWl : actualWl;

      // Lapisan hantu — jejak air yang masih surut (belum terserap sepenuhnya)
      if (draining && displayWl > waterCutoff) {
        const ghostAlpha = Math.min(0.4, (displayWl - actualWl) * 4);
        const { scale } = puddleMetrics(displayWl);
        drawPuddleEllipse(
          ctx,
          cx,
          cy,
          scale * 1.08,
          `rgba(130, 200, 245, ${ghostAlpha})`
        );
        drawRecedingRipple(
          ctx,
          cx,
          cy,
          timeMs * 0.002 + x * 0.4 + y * 0.3,
          Math.min(1, (displayWl - actualWl) * 8)
        );
      }

      // Genangan utama — level interpolasi
      if (renderWl > waterCutoff) {
        const { alpha, scale } = puddleMetrics(renderWl);
        const r = draining ? 45 : 30;
        const g = draining ? 155 : 130;
        const b = draining ? 210 : 230;
        drawPuddleEllipse(ctx, cx, cy, scale, `rgba(${r}, ${g}, ${b}, ${alpha})`);
      }

      // Aliran gravitasi ke tile lebih rendah
      const flowDir = tile.flowDirection;
      if (flowDir >= 1 && flowDir <= 4 && renderWl > waterCutoff) {
        drawFlowStreaks(ctx, cx, cy, flowDir, timeMs + x * 97 + y * 53, renderWl);
      }

      if (filling && actualWl > waterCutoff) {
        drawFillRipple(ctx, cx, cy, timeMs + x * 41, actualWl);
      }
    }
  }
}

/** Cutoff render konsisten dengan layer canvas. */
export function getFloodWaterCutoff(zoom: number): number {
  return zoom < 0.5 ? 0.08 : RENDER_THRESHOLD;
}
