/**
 * Seeding kota awal untuk peta wilayah FloodGuard — bangunan + jalan otomatis.
 * Hanya dipanggil saat createRegionGameState; path IsoCity lama tidak terpengaruh.
 */

import { BUILDING_STATS } from '@/games/isocity/types/buildings';
import {
  Building,
  BuildingType,
  FloodMapData,
  FloodRegion,
  GameState,
  Tile,
  ZoneType,
} from '@/types/game';
import { getBuildingSize } from './simulation';

/** Kepadatan bangunan relatif per wilayah (0–1, fraksi tile dekat jalan yang dibangun). */
const REGION_FILL: Record<FloodRegion, number> = {
  Barat: 0.44,
  Pusat: 0.54,
  Selatan: 0.5,
  Timur: 0.47,
  Utara: 0.42,
};

const NO_CONSTRUCTION: BuildingType[] = ['grass', 'empty', 'water', 'road', 'bridge', 'tree', 'rail'];

function createSeededBuilding(type: BuildingType, level = 3): Building {
  return {
    type,
    level: NO_CONSTRUCTION.includes(type) ? 0 : level,
    population: 0,
    jobs: 0,
    powered: true,
    watered: true,
    onFire: false,
    fireProgress: 0,
    age: 40 + Math.floor(Math.random() * 80),
    constructionProgress: 100,
    abandoned: false,
    isSeeded: true,
  };
}

function applyPopJobs(building: Building): void {
  const stats = BUILDING_STATS[building.type];
  if (!stats) return;
  if (stats.maxPop > 0) {
    building.population = Math.floor(stats.maxPop * Math.max(1, building.level) * 0.75);
  }
  if (stats.maxJobs > 0) {
    building.jobs = Math.floor(stats.maxJobs * Math.max(1, building.level) * 0.75);
  }
}

function tileIndex(mapData: FloodMapData, x: number, y: number): number {
  return y * mapData.gridSize + x;
}

function isPlayableGrass(grid: Tile[][], mapData: FloodMapData, x: number, y: number): boolean {
  const tile = grid[y]?.[x];
  if (!tile?.playable || tile.building.type === 'water' || tile.building.type === 'empty') {
    return false;
  }
  const idx = tileIndex(mapData, x, y);
  if (mapData.water[idx] === 1) return false;
  return tile.building.type === 'grass' || tile.building.type === 'tree';
}

/** Hindari tier-0 (rawan banjir) untuk bangunan — sisakan area rendah untuk gameplay banjir. */
function isSafeForBuilding(mapData: FloodMapData, x: number, y: number): boolean {
  const idx = tileIndex(mapData, x, y);
  const tier = mapData.tier[idx];
  return tier >= 2;
}

function isRegionClear(
  grid: Tile[][],
  mapData: FloodMapData,
  x: number,
  y: number,
  w: number,
  h: number,
  requireSafeTier: boolean
): boolean {
  const n = mapData.gridSize;
  if (x < 0 || y < 0 || x + w > n || y + h > n) return false;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (!isPlayableGrass(grid, mapData, px, py)) return false;
      if (requireSafeTier && !isSafeForBuilding(mapData, px, py)) return false;
    }
  }
  return true;
}

function placeRoad(grid: Tile[][], mapData: FloodMapData, x: number, y: number): void {
  const tile = grid[y]?.[x];
  if (!tile?.playable || tile.building.type === 'water') return;
  tile.building = createSeededBuilding('road');
  tile.zone = 'none';
}

function placeRail(grid: Tile[][], mapData: FloodMapData, x: number, y: number): void {
  const tile = grid[y]?.[x];
  if (!tile?.playable || tile.building.type === 'water') return;
  if (tile.building.type === 'road') {
    tile.hasRailOverlay = true;
    return;
  }
  tile.building = createSeededBuilding('rail');
  tile.zone = 'none';
}

function placeZoned(
  grid: Tile[][],
  x: number,
  y: number,
  zone: ZoneType,
  buildingType: BuildingType
): void {
  const tile = grid[y]?.[x];
  if (!tile) return;
  tile.zone = zone;
  const building = createSeededBuilding(buildingType, 2 + Math.floor(Math.random() * 3));
  applyPopJobs(building);
  tile.building = building;
}

function placeMultiTile(
  grid: Tile[][],
  mapData: FloodMapData,
  x: number,
  y: number,
  type: BuildingType,
  zone: ZoneType = 'none',
  requireSafeTier = true
): boolean {
  const size = getBuildingSize(type);
  if (!isRegionClear(grid, mapData, x, y, size.width, size.height, requireSafeTier)) {
    return false;
  }
  for (let dy = 0; dy < size.height; dy++) {
    for (let dx = 0; dx < size.width; dx++) {
      const tile = grid[y + dy][x + dx];
      tile.zone = zone;
      if (dx === 0 && dy === 0) {
        const building = createSeededBuilding(type, 2 + Math.floor(Math.random() * 2));
        applyPopJobs(building);
        tile.building = building;
      } else {
        tile.building = createSeededBuilding('empty');
      }
    }
  }
  return true;
}

function nearRoad(grid: Tile[][], x: number, y: number, radius = 2): boolean {
  const n = grid.length;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const t = grid[y + dy]?.[x + dx];
      if (t?.building.type === 'road' || t?.building.type === 'rail') return true;
    }
  }
  return false;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface SeedResult {
  population: number;
  jobs: number;
}

/**
 * Sebar bangunan & jalan di grid wilayah yang sudah dimuat.
 * Mengembalikan total populasi/jobs untuk inisialisasi stats.
 */
export function seedFloodGuardCity(
  grid: Tile[][],
  mapData: FloodMapData,
  region: FloodRegion
): SeedResult {
  const n = mapData.gridSize;
  const minX = mapData.offsetX;
  const minY = mapData.offsetY;
  const maxX = minX + mapData.dataWidth - 1;
  const maxY = minY + mapData.dataHeight - 1;
  const centerX = minX + Math.floor(mapData.dataWidth / 2);
  const centerY = minY + Math.floor(mapData.dataHeight / 2);
  const fillRate = REGION_FILL[region];
  const roadSpacing = 6;

  // Jaringan jalan grid di area data
  for (let y = minY; y <= maxY; y += roadSpacing) {
    for (let x = minX; x <= maxX; x++) {
      placeRoad(grid, mapData, x, y);
    }
  }
  for (let x = minX; x <= maxX; x += roadSpacing) {
    for (let y = minY; y <= maxY; y++) {
      placeRoad(grid, mapData, x, y);
    }
  }

  // Rel utama (2 garis) — untuk kereta
  for (let x = minX; x <= maxX; x++) {
    placeRail(grid, mapData, x, centerY - 3);
    placeRail(grid, mapData, x, centerY + 3);
  }
  for (let y = minY; y <= maxY; y++) {
    placeRail(grid, mapData, centerX - 3, y);
  }

  // Layanan & infrastruktur kritis (bisa tergenang → penalti safetyIndex)
  const services: Array<{ type: BuildingType; count: number }> = [
    { type: 'hospital', count: 2 },
    { type: 'school', count: 3 },
    { type: 'fire_station', count: 2 },
    { type: 'police_station', count: 2 },
    { type: 'university', count: 1 },
  ];
  for (const svc of services) {
    let placed = 0;
    for (let attempt = 0; placed < svc.count && attempt < 400; attempt++) {
      const x = minX + Math.floor(Math.random() * mapData.dataWidth);
      const y = minY + Math.floor(Math.random() * mapData.dataHeight);
      if (placeMultiTile(grid, mapData, x, y, svc.type)) placed++;
    }
  }

  // Bandara (picu pesawat bila populasi cukup)
  for (let attempt = 0; attempt < 200; attempt++) {
    const x = minX + Math.floor(Math.random() * (mapData.dataWidth - 4));
    const y = minY + Math.floor(Math.random() * (mapData.dataHeight - 4));
    if (placeMultiTile(grid, mapData, x, y, 'airport')) break;
  }

  // Taman & pohon
  const parks: BuildingType[] = ['park', 'park_large', 'playground_small', 'community_garden', 'tree'];
  for (let i = 0; i < 18 + Math.floor(Math.random() * 10); i++) {
    const x = minX + Math.floor(Math.random() * mapData.dataWidth);
    const y = minY + Math.floor(Math.random() * mapData.dataHeight);
    placeMultiTile(grid, mapData, x, y, pick(parks));
  }

  // Marina di tepi air (picu kapal)
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!isPlayableGrass(grid, mapData, x, y)) continue;
      const neighbors = [
        grid[y - 1]?.[x], grid[y + 1]?.[x], grid[y]?.[x - 1], grid[y]?.[x + 1],
      ];
      if (neighbors.some((t) => t?.building.type === 'water')) {
        if (Math.random() < 0.08) {
          placeMultiTile(grid, mapData, x, y, 'marina_docks_small', 'none', false);
        }
      }
    }
  }

  // Bangunan zona di sekitar jalan
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!isPlayableGrass(grid, mapData, x, y)) continue;
      if (!isSafeForBuilding(mapData, x, y)) continue;
      if (!nearRoad(grid, x, y)) continue;
      if (Math.random() > fillRate) continue;

      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const maxDist = Math.max(mapData.dataWidth, mapData.dataHeight) * 0.45;
      const norm = dist / maxDist;
      const rand = Math.random();

      let zone: ZoneType;
      let buildingType: BuildingType;

      if (norm < 0.35) {
        if (rand < 0.55) {
          zone = 'commercial';
          buildingType = pick(['shop_small', 'shop_medium', 'office_low'] as const);
        } else {
          zone = 'residential';
          buildingType = pick(['apartment_low', 'house_medium'] as const);
        }
      } else if (norm < 0.65) {
        if (rand < 0.45) {
          zone = 'residential';
          buildingType = pick(['house_small', 'house_medium', 'mansion'] as const);
        } else if (rand < 0.75) {
          zone = 'commercial';
          buildingType = pick(['shop_small', 'shop_medium'] as const);
        } else {
          zone = 'industrial';
          buildingType = pick(['factory_small', 'factory_medium', 'warehouse'] as const);
        }
      } else {
        if (rand < 0.5) {
          zone = 'residential';
          buildingType = pick(['house_small', 'house_medium'] as const);
        } else if (rand < 0.75) {
          zone = 'industrial';
          buildingType = pick(['factory_small', 'warehouse'] as const);
        } else {
          zone = 'commercial';
          buildingType = 'shop_small';
        }
      }

      const size = getBuildingSize(buildingType);
      if (size.width > 1 || size.height > 1) {
        placeMultiTile(grid, mapData, x, y, buildingType, zone);
      } else {
        placeZoned(grid, x, y, zone, buildingType);
      }
    }
  }

  // Demo infrastruktur mitigasi di area rawan (tier rendah) — panduan visual pemain
  for (let attempt = 0; attempt < 120; attempt++) {
    const x = minX + Math.floor(Math.random() * Math.max(1, mapData.dataWidth - 2));
    const y = minY + Math.floor(Math.random() * Math.max(1, mapData.dataHeight - 2));
    const idx = tileIndex(mapData, x, y);
    if (mapData.tier[idx] > 1) continue;
    if (!nearRoad(grid, x, y)) continue;
    if (!isPlayableGrass(grid, mapData, x, y)) continue;
    if (placeMultiTile(grid, mapData, x, y, 'flood_pump', 'none', false)) {
      const origin = grid[y][x].building;
      origin.isSeeded = false;
      origin.constructionProgress = 100;
      break;
    }
  }
  for (let attempt = 0; attempt < 80; attempt++) {
    const x = minX + Math.floor(Math.random() * mapData.dataWidth);
    const y = minY + Math.floor(Math.random() * mapData.dataHeight);
    const idx = tileIndex(mapData, x, y);
    if (mapData.tier[idx] > 2) continue;
    if (!nearRoad(grid, x, y)) continue;
    if (!isPlayableGrass(grid, mapData, x, y)) continue;
    const tile = grid[y][x];
    tile.building = createSeededBuilding('levee', 1);
    tile.building.isSeeded = false;
    tile.building.constructionProgress = 100;
    tile.zone = 'none';
    break;
  }

  let population = 0;
  let jobs = 0;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const b = grid[y][x].building;
      population += b.population;
      jobs += b.jobs;
    }
  }

  return { population, jobs };
}

/** Terapkan hasil seeding ke GameState wilayah (stats + grid). */
export function applyCitySeedToState(state: GameState, mapData: FloodMapData, region: FloodRegion): GameState {
  const grid = state.grid.map((row) =>
    row.map((t) => ({ ...t, building: { ...t.building } }))
  );
  const { population, jobs } = seedFloodGuardCity(grid, mapData, region);
  const taxRate = state.taxRate;
  return {
    ...state,
    grid,
    stats: {
      ...state.stats,
      population,
      jobs,
      income: Math.floor(population * taxRate * 0.1 + jobs * taxRate * 0.05),
      expenses: Math.floor((population + jobs) * 0.15),
      happiness: 62,
      health: 58,
      education: 55,
      safety: 58,
      environment: 52,
    },
  };
}
