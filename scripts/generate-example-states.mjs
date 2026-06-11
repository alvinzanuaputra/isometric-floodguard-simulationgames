/**
 * Generate contoh save FloodGuard yang valid untuk public/example-states/.
 * Jalankan: node scripts/generate-example-states.mjs
 *
 * State dibangun dari map processed + struktur GameState yang sama dengan runtime.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAP_DIR = path.join(__dirname, '..', 'public', 'map-data');
const OUT_DIR = path.join(__dirname, '..', 'public', 'example-states');

const REGION_WIN_LOSE = {
  Barat: { winSurvivalDays: 5 },
  Pusat: { winSurvivalDays: 7 },
  Selatan: { winSurvivalDays: 10 },
  Timur: { winSurvivalDays: 14 },
};

const NO_CONSTRUCTION = new Set(['grass', 'empty', 'water', 'road', 'bridge', 'tree', 'drain_channel']);

function createBuilding(type) {
  return {
    type,
    level: type === 'grass' || type === 'empty' || type === 'water' ? 0 : 1,
    population: 0,
    jobs: 0,
    powered: true,
    watered: true,
    onFire: false,
    fireProgress: 0,
    age: 0,
    constructionProgress: NO_CONSTRUCTION.has(type) ? 100 : 100,
    abandoned: false,
  };
}

function createTile(x, y, buildingType = 'grass') {
  return {
    x,
    y,
    zone: 'none',
    building: createBuilding(buildingType),
    landValue: 50,
    pollution: 0,
    crime: 0,
    traffic: 0,
    hasSubway: false,
    elevation: -1,
    waterLevel: 0,
    flowDirection: 0,
    playable: true,
  };
}

function buildGridFromMapData(mapData) {
  const n = mapData.gridSize;
  const grid = [];
  for (let y = 0; y < n; y++) {
    const row = [];
    for (let x = 0; x < n; x++) {
      const idx = y * n + x;
      const isPlayable = mapData.playable[idx] === 1;
      const isWater = mapData.water[idx] === 1;
      const tile = createTile(x, y, isWater ? 'water' : isPlayable ? 'grass' : 'empty');
      tile.elevation = mapData.elevation[idx];
      tile.playable = isPlayable;
      row.push(tile);
    }
    grid.push(row);
  }
  return grid;
}

function createServiceCoverage(size) {
  const num = () => Array.from({ length: size }, () => Array(size).fill(0));
  const bool = () => Array.from({ length: size }, () => Array(size).fill(false));
  return {
    evacuation: num(),
    rescue: num(),
    medical: num(),
    preparedness: num(),
    pumpCoverage: bool(),
    drainCoverage: bool(),
  };
}

function createInitialBudget() {
  return {
    emergency_response: { name: 'Tanggap Darurat', funding: 100, cost: 0 },
    flood_rescue: { name: 'Penyelamatan Banjir', funding: 100, cost: 0 },
    medical_response: { name: 'Medis Darurat', funding: 100, cost: 0 },
    preparedness_training: { name: 'Kesiapsiagaan', funding: 100, cost: 0 },
    evacuation_transport: { name: 'Transport Evakuasi', funding: 100, cost: 0 },
    green_spaces: { name: 'Ruang Hijau', funding: 100, cost: 0 },
    pump_stations: { name: 'Stasiun Pompa', funding: 100, cost: 0 },
    drain_network: { name: 'Jaringan Drainase', funding: 100, cost: 0 },
  };
}

function createInitialStats(money = 120000) {
  return {
    population: 0,
    jobs: 0,
    money,
    income: 0,
    expenses: 0,
    happiness: 50,
    health: 50,
    education: 50,
    safety: 50,
    environment: 75,
    demand: { residential: 50, commercial: 30, industrial: 40 },
  };
}

function createWeatherState(month = 2) {
  const rainy = [11, 12, 1, 2, 3, 4].includes(month);
  return {
    rainfallRate: 0,
    currentEvent: 'cerah',
    forecastHours: rainy ? [0, 8, 15, 5, 0, 0] : [0, 0, 0, 0, 0, 0],
    durationTicks: 40,
    isRainySeason: rainy,
  };
}

function createFloodStats(winTargetDays) {
  return {
    floodedTileCount: 0,
    floodedRatio: 0,
    safetyIndex: 100,
    dangerPersistenceTicks: 0,
    maxWaterLevelTile: 0,
    totalRainfallThisGame: 0,
    rainyDaysSurvived: 0,
    winTargetDays,
    criticalInfraFlooded: 0,
  };
}

function computePlayableCount(grid) {
  let count = 0;
  for (const row of grid) {
    for (const tile of row) {
      if (tile.playable) count++;
    }
  }
  return count;
}

function canPlace(grid, x, y, w, h) {
  const n = grid.length;
  if (x < 0 || y < 0 || x + w > n || y + h > n) return false;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const t = grid[y + dy][x + dx];
      if (!t.playable || t.building.type === 'water' || t.building.type === 'empty') return false;
    }
  }
  return true;
}

function placeRect(grid, x, y, w, h, type) {
  if (!canPlace(grid, x, y, w, h)) return false;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const tile = grid[y + dy][x + dx];
      tile.building = createBuilding(type);
      tile.zone = 'none';
    }
  }
  return true;
}

function placeRoadLine(grid, x0, y0, x1, y1) {
  const dx = x1 > x0 ? 1 : x1 < x0 ? -1 : 0;
  const dy = y1 > y0 ? 1 : y1 < y0 ? -1 : 0;
  let x = x0;
  let y = y0;
  while (true) {
    if (grid[y]?.[x]?.playable && grid[y][x].building.type !== 'water') {
      grid[y][x].building = createBuilding('road');
    }
    if (x === x1 && y === y1) break;
    if (x !== x1) x += dx;
    else if (y !== y1) y += dy;
  }
}

/** Cari tile playable grass di area data (bukan padding). */
function anchor(mapData) {
  return {
    x: mapData.offsetX + Math.floor(mapData.dataWidth / 2),
    y: mapData.offsetY + Math.floor(mapData.dataHeight / 2),
  };
}

function buildFloodGuardState(region, cityName, placements, month = 2) {
  const mapPath = path.join(MAP_DIR, `SBY_${region}_processed.json`);
  const mapData = JSON.parse(readFileSync(mapPath, 'utf8'));
  const grid = buildGridFromMapData(mapData);
  const n = mapData.gridSize;
  const { x: cx, y: cy } = anchor(mapData);

  placeRoadLine(grid, cx - 8, cy, cx + 8, cy);
  placeRoadLine(grid, cx, cy - 6, cx, cy + 6);

  for (const p of placements) {
    const px = cx + p.dx;
    const py = cy + p.dy;
    placeRect(grid, px, py, p.w ?? 1, p.h ?? 1, p.type);
  }

  const playableTileCount = computePlayableCount(grid);
  const winDays = REGION_WIN_LOSE[region].winSurvivalDays;

  return {
    id: randomUUID(),
    grid,
    gridSize: n,
    cityName,
    year: 2024,
    month,
    day: 15,
    hour: 10,
    tick: 0,
    speed: 1,
    selectedTool: 'select',
    taxRate: 9,
    effectiveTaxRate: 9,
    stats: createInitialStats(),
    budget: createInitialBudget(),
    services: createServiceCoverage(n),
    notifications: [],
    advisorMessages: [],
    history: [],
    activePanel: 'none',
    disastersEnabled: true,
    adjacentCities: [
      { id: 'city-north', name: 'Kota Utara', direction: 'north', connected: false, discovered: false },
      { id: 'city-south', name: 'Kota Selatan', direction: 'south', connected: false, discovered: false },
      { id: 'city-east', name: 'Kota Timur', direction: 'east', connected: false, discovered: false },
      { id: 'city-west', name: 'Kota Barat', direction: 'west', connected: false, discovered: false },
    ],
    waterBodies: [],
    gameVersion: 0,
    cities: [{
      id: randomUUID(),
      name: cityName,
      bounds: { minX: 0, minY: 0, maxX: n - 1, maxY: n - 1 },
      economy: { population: 0, jobs: 0, income: 0, expenses: 0, happiness: 50, lastCalculated: 0 },
      color: '#3b82f6',
    }],
    selectedRegion: region,
    playableTileCount,
    weatherState: createWeatherState(month),
    floodStats: createFloodStats(winDays),
    gameStatus: 'playing',
  };
}

function buildLegacyIsoCityState() {
  const size = 32;
  const grid = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      row.push(createTile(x, y, 'grass'));
    }
    grid.push(row);
  }
  for (let x = 8; x < 24; x++) {
    grid[16][x].building = createBuilding('road');
    grid[16][x].building.constructionProgress = 100;
  }
  for (let y = 10; y < 22; y++) {
    grid[y][16].building = createBuilding('road');
    grid[y][16].building.constructionProgress = 100;
  }
  grid[12][12].building = createBuilding('park');
  grid[12][12].building.constructionProgress = 100;

  return {
    id: randomUUID(),
    grid,
    gridSize: size,
    cityName: 'Surabaya',
    year: 2024,
    month: 6,
    day: 1,
    hour: 12,
    tick: 0,
    speed: 1,
    selectedTool: 'select',
    taxRate: 9,
    effectiveTaxRate: 9,
    stats: createInitialStats(100000),
    budget: createInitialBudget(),
    services: createServiceCoverage(size),
    notifications: [],
    advisorMessages: [],
    history: [],
    activePanel: 'none',
    disastersEnabled: true,
    adjacentCities: [
      { id: 'city-north', name: 'Pelabuhan', direction: 'north', connected: false, discovered: false },
      { id: 'city-south', name: 'Pedesaan', direction: 'south', connected: false, discovered: false },
      { id: 'city-east', name: 'Industri', direction: 'east', connected: false, discovered: false },
      { id: 'city-west', name: 'Pantai', direction: 'west', connected: false, discovered: false },
    ],
    waterBodies: [],
    gameVersion: 0,
    cities: [{
      id: randomUUID(),
      name: 'Surabaya',
      bounds: { minX: 0, minY: 0, maxX: size - 1, maxY: size - 1 },
      economy: { population: 0, jobs: 0, income: 0, expenses: 0, happiness: 50, lastCalculated: 0 },
      color: '#3b82f6',
    }],
  };
}

mkdirSync(OUT_DIR, { recursive: true });

const examples = [
  {
    file: 'floodguard_barat.json',
    state: buildFloodGuardState('Barat', 'Contoh — Surabaya Barat', [
      { dx: -2, dy: -2, w: 2, h: 2, type: 'flood_pump' },
      { dx: 4, dy: -1, type: 'levee' },
      { dx: -4, dy: 2, type: 'levee' },
      { dx: 2, dy: 3, type: 'evacuation_post' },
      { dx: -6, dy: 0, type: 'drain_channel' },
    ]),
  },
  {
    file: 'floodguard_pusat.json',
    state: buildFloodGuardState('Pusat', 'Contoh — Surabaya Pusat', [
      { dx: -2, dy: -2, w: 2, h: 2, type: 'flood_pump' },
      { dx: 3, dy: -3, w: 3, h: 3, type: 'retention_pond' },
      { dx: -5, dy: 1, type: 'levee' },
      { dx: 5, dy: 1, type: 'levee' },
      { dx: 0, dy: 4, type: 'evacuation_post' },
      { dx: -3, dy: -5, type: 'drain_channel' },
      { dx: 3, dy: -5, type: 'drain_channel' },
    ], 11),
  },
  {
    file: 'floodguard_timur.json',
    state: buildFloodGuardState('Timur', 'Contoh — Surabaya Timur', [
      { dx: -2, dy: -2, w: 2, h: 2, type: 'flood_pump' },
      { dx: 4, dy: -4, w: 3, h: 3, type: 'retention_pond' },
      { dx: -6, dy: -2, type: 'levee' },
      { dx: -6, dy: 0, type: 'levee' },
      { dx: 6, dy: 2, type: 'levee' },
      { dx: 0, dy: 5, type: 'evacuation_post' },
      { dx: -4, dy: 4, type: 'drain_channel' },
      { dx: 4, dy: 4, type: 'drain_channel' },
      { dx: 0, dy: -6, type: 'hospital' },
    ], 1),
  },
  {
    file: 'isocity_legacy.json',
    state: buildLegacyIsoCityState(),
  },
];

for (const { file, state } of examples) {
  const outPath = path.join(OUT_DIR, file);
  writeFileSync(outPath, JSON.stringify(state));
  const kb = (Buffer.byteLength(JSON.stringify(state)) / 1024).toFixed(1);
  console.log(`✓ ${file} (${kb} KB, grid ${state.gridSize}×${state.gridSize}${state.selectedRegion ? `, ${state.selectedRegion}` : ''})`);
}

console.log('\nSelesai — contoh save ditulis ke public/example-states/');
