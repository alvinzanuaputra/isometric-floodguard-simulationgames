/**
 * Asset PNG individual untuk bangunan infrastruktur banjir yang dipasang pemain.
 * Bangunan seeded tetap memakai sprite sheet — tidak diubah.
 */

import { BuildingType, Tile } from '@/types/game';
import { getBuildingSize } from '@/lib/simulation';
import { getCachedImage, loadImage } from '@/components/game/imageLoader';
import { TILE_WIDTH, TILE_HEIGHT } from './types';

export interface FloodBuildingAssetConfig {
  /** Path ke PNG di public/assets/buildings/ */
  src: string;
  /** Pengali lebar dasar (tileWidth × 1.2 × scale) */
  scale: number;
  /** Offset vertikal dalam tinggi tile (negatif = naik) */
  verticalOffset: number;
  horizontalOffset: number;
}

/**
 * Pemetaan BuildingType → file individual (berdasarkan nama file).
 * drain_channel: tidak ada file cocok — tetap procedural (drawRoad).
 */
export const PLAYER_FLOOD_BUILDING_ASSETS: Partial<Record<BuildingType, FloodBuildingAssetConfig>> = {
  flood_pump: {
    src: '/assets/buildings/powerplant.png',
    scale: 1.05,
    verticalOffset: -0.42,
    horizontalOffset: 0,
  },
  levee: {
    src: '/assets/buildings/industrial.png',
    scale: 0.8,
    verticalOffset: -0.38,
    horizontalOffset: 0,
  },
  retention_pond: {
    src: '/assets/buildings/park_large.png',
    scale: 0.9,
    verticalOffset: -0.68,
    horizontalOffset: 0,
  },
  evacuation_post: {
    src: '/assets/buildings/police_station.png',
    scale: 0.86,
    verticalOffset: -0.3,
    horizontalOffset: 0,
  },
};

const FLOOD_ASSET_TYPES = Object.keys(PLAYER_FLOOD_BUILDING_ASSETS) as BuildingType[];

export function isPlayerFloodAssetType(type: BuildingType): boolean {
  return FLOOD_ASSET_TYPES.includes(type);
}

/** Hanya bangunan player-placed (bukan seeded) yang punya asset individual. */
export function shouldUsePlayerFloodAsset(tile: Tile): boolean {
  if (tile.building.isSeeded) return false;
  return isPlayerFloodAssetType(tile.building.type);
}

export function preloadPlayerFloodBuildingAssets(): void {
  for (const config of Object.values(PLAYER_FLOOD_BUILDING_ASSETS)) {
    if (config) {
      loadImage(config.src).catch(console.error);
    }
  }
}

export function getPlayerFloodBuildingImage(buildingType: BuildingType): HTMLImageElement | undefined {
  const config = PLAYER_FLOOD_BUILDING_ASSETS[buildingType];
  if (!config) return undefined;
  return getCachedImage(config.src, false);
}

/**
 * Gambar bangunan banjir dari file PNG individual.
 * @returns true jika berhasil digambar
 */
export function drawPlayerFloodBuilding(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  tile: Tile,
  tileW: number = TILE_WIDTH,
  tileH: number = TILE_HEIGHT
): boolean {
  const buildingType = tile.building.type;
  const config = PLAYER_FLOOD_BUILDING_ASSETS[buildingType];
  if (!config) return false;

  const img = getPlayerFloodBuildingImage(buildingType);
  if (!img || (!img.naturalWidth && !img.width)) return false;

  const buildingSize = getBuildingSize(buildingType);
  const isMultiTile = buildingSize.width > 1 || buildingSize.height > 1;

  let drawPosX = screenX;
  let drawPosY = screenY;
  if (isMultiTile) {
    const frontmostOffsetX = buildingSize.width - 1;
    const frontmostOffsetY = buildingSize.height - 1;
    drawPosX += (frontmostOffsetX - frontmostOffsetY) * (tileW / 2);
    drawPosY += (frontmostOffsetX + frontmostOffsetY) * (tileH / 2);
  }

  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  const destWidth = tileW * 1.2 * config.scale;
  const destHeight = destWidth * (imgH / imgW);

  const drawX = drawPosX + tileW / 2 - destWidth / 2 + config.horizontalOffset * tileW;

  let verticalPush: number;
  if (isMultiTile) {
    const footprintDepth = buildingSize.width + buildingSize.height - 2;
    verticalPush = footprintDepth * tileH * 0.25;
  } else {
    verticalPush = destHeight * 0.15;
  }
  verticalPush += config.verticalOffset * tileH;

  const drawY = drawPosY + tileH - destHeight + verticalPush;

  const mirrorSeed = (tile.x * 47 + tile.y * 83) % 100;
  const shouldFlip = mirrorSeed < 50;

  if (shouldFlip) {
    ctx.save();
    const centerX = Math.round(drawX + destWidth / 2);
    ctx.translate(centerX, 0);
    ctx.scale(-1, 1);
    ctx.translate(-centerX, 0);
    ctx.drawImage(
      img,
      Math.round(drawX),
      Math.round(drawY),
      Math.round(destWidth),
      Math.round(destHeight)
    );
    ctx.restore();
  } else {
    ctx.drawImage(
      img,
      Math.round(drawX),
      Math.round(drawY),
      Math.round(destWidth),
      Math.round(destHeight)
    );
  }

  return true;
}
