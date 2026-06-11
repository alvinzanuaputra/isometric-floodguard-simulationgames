/**
 * Aturan render genangan permukaan (floodCanvasRef) — murni tampilan, bukan simulasi.
 * waterLevel tetap dihitung di semua tile; hanya ellipse biru yang di-skip di footprint bangunan.
 */

import { BuildingType, Tile } from '@/types/game';

/** Permukaan terbuka: genangan tampil di tanah/jalan, bukan di atas sprite bangunan. */
const OPEN_FLOOD_SURFACE_TYPES = new Set<BuildingType>([
  'grass',
  'road',
  'bridge',
  'rail',
  'tree',
  'drain_channel',
]);

/**
 * Apakah genangan permukaan (ellipse biru di floodCanvasRef) boleh digambar di tile ini.
 * Bangunan padat & tile 'empty' (footprint multi-tile) di-skip agar air tidak menutupi sprite.
 */
export function shouldRenderSurfaceFlood(tile: Tile): boolean {
  return OPEN_FLOOD_SURFACE_TYPES.has(tile.building.type);
}
