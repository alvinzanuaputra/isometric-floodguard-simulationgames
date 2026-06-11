/**
 * Label melayang di atas bangunan yang dipasang pemain (infrastruktur banjir).
 * Bangunan seeded (kota default) tidak diberi label — hindari kepadatan teks.
 */

import { BuildingType, Tile, Tool, TOOL_INFO } from '@/types/game';
import { TILE_WIDTH } from './types';

export const BUILDING_LABEL_MIN_ZOOM = 0.55;

const PLAYER_LABEL_BUILDINGS: BuildingType[] = [
  'flood_pump',
  'levee',
  'retention_pond',
  'drain_channel',
  'evacuation_post',
];

const BUILDING_TO_TOOL: Partial<Record<BuildingType, Tool>> = {
  flood_pump: 'flood_pump',
  levee: 'levee',
  retention_pond: 'retention_pond',
  drain_channel: 'drain_channel',
  evacuation_post: 'evacuation_post',
};

export function shouldShowBuildingLabel(tile: Tile, zoom: number): boolean {
  if (zoom < BUILDING_LABEL_MIN_ZOOM) return false;
  if (tile.building.isSeeded) return false;
  return PLAYER_LABEL_BUILDINGS.includes(tile.building.type);
}

export function getPlayerBuildingLabel(
  buildingType: BuildingType,
  m: (text: string) => string
): string | null {
  const tool = BUILDING_TO_TOOL[buildingType];
  if (!tool) return null;
  const info = TOOL_INFO[tool];
  if (!info) return null;
  return m(String(info.name));
}

/** Gambar label di puncak sprite isometrik dengan latar kontras. */
export function drawBuildingLabel(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  text: string,
  zoom: number
): void {
  const fontSize = Math.max(8, Math.min(11, 10 * zoom));
  ctx.save();
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  const cx = screenX + TILE_WIDTH / 2;
  const cy = screenY - 4;
  const metrics = ctx.measureText(text);
  const padX = 4;
  const padY = 2;
  const boxW = metrics.width + padX * 2;
  const boxH = fontSize + padY * 2;
  const boxX = cx - boxW / 2;
  const boxY = cy - boxH;

  ctx.fillStyle = 'rgba(10, 14, 20, 0.82)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 3);
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.strokeText(text, cx, cy);
  ctx.fillStyle = '#f1f5f9';
  ctx.fillText(text, cx, cy);
  ctx.restore();
}
