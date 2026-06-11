/**
 * Simulasi banjir per-tile — FloodGuard Surabaya (Fase 4–5).
 * Cellular automaton dengan double-buffer (wajib — hindari bias iterasi).
 */

import { REGION_WIN_LOSE } from '@/lib/regionConfig';
import { floodTuning } from '@/lib/floodTuning';
import { getBuildingSize } from '@/lib/simulation';
import {
  FloodRegion,
  FloodStats,
  GameState,
  GameStatus,
  ServiceCoverage,
  Tile,
  WeatherEvent,
  WeatherState,
} from '@/types/game';

// =============================================================================
// Konstanta fisika — default; runtime via floodTuning (Dev Panel)
// =============================================================================

export const RAIN_ABSORPTION_FACTOR = 0.00012;
export const STATIC_WATER_OVERFLOW_RATE = 0.004;
export const GRAVITY_FLOW_FACTOR = 0.35;
export const INFILTRATION_RATE = 0.0018;
export const EVAPORATION_RATE = 0.0008;
export const FLOOD_THRESHOLD = 0.05;
export const RENDER_THRESHOLD = 0.03;
export const PUMP_DRAIN_RATE = 0.006;
export const RETENTION_ABSORB_RATE = 0.008;
export const RETENTION_CAPACITY = 0.5;
export const DRAIN_CHANNEL_INFILTRATION_MULT = 2.5;
export const CRITICAL_INFRA_PENALTY = 8;
export const EVACUATION_SAFETY_BONUS_MAX = 15;

/** Pengali intensitas hujan per wilayah (kesulitan). */
export const REGION_RAIN_INTENSITY: Record<FloodRegion, number> = {
  Barat: 0.75,
  Pusat: 0.88,
  Selatan: 1.0,
  Timur: 1.2,
  Utara: 1.35,
};

const CRITICAL_INFRA_TYPES = new Set([
  'hospital',
  'school',
  'flood_pump',
  'power_plant',
  'evacuation_post',
]);

const RAINY_MONTHS = new Set([11, 12, 1, 2, 3, 4]);

export function isRainySeasonMonth(month: number): boolean {
  return RAINY_MONTHS.has(month);
}

export function getDefaultFloodTuning() {
  return {
    rainAbsorption: RAIN_ABSORPTION_FACTOR,
    infiltration: INFILTRATION_RATE,
    gravityFlow: GRAVITY_FLOW_FACTOR,
    pumpDrain: PUMP_DRAIN_RATE,
    staticOverflow: STATIC_WATER_OVERFLOW_RATE,
    evaporation: EVAPORATION_RATE,
    retentionAbsorb: RETENTION_ABSORB_RATE,
    retentionCapacity: RETENTION_CAPACITY,
    drainChannelMultiplier: DRAIN_CHANNEL_INFILTRATION_MULT,
  };
}

export function createInitialWeatherState(month: number): WeatherState {
  return {
    rainfallRate: 0,
    currentEvent: 'cerah',
    forecastHours: [0, 0, 0, 0, 0, 0],
    durationTicks: 30,
    isRainySeason: isRainySeasonMonth(month),
  };
}

export function createInitialFloodStats(winTargetDays = 10): FloodStats {
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

function rollWeatherEvent(isRainySeason: boolean): WeatherEvent {
  const r = Math.random();
  if (isRainySeason) {
    if (r < 0.15) return 'cerah';
    if (r < 0.4) return 'gerimis';
    if (r < 0.82) return 'hujan';
    return 'badai';
  }
  if (r < 0.7) return 'cerah';
  if (r < 0.9) return 'gerimis';
  return 'hujan';
}

function eventToRainfall(event: WeatherEvent, regionMult: number): number {
  let base: number;
  switch (event) {
    case 'cerah':
      base = 0;
      break;
    case 'gerimis':
      base = 12 + Math.random() * 18;
      break;
    case 'hujan':
      base = 35 + Math.random() * 35;
      break;
    case 'badai':
      base = 75 + Math.random() * 25;
      break;
  }
  return Math.min(100, base * regionMult);
}

function buildForecast(isRainySeason: boolean, regionMult: number): number[] {
  const forecast: number[] = [];
  for (let i = 0; i < 6; i++) {
    const ev = rollWeatherEvent(isRainySeason);
    forecast.push(eventToRainfall(ev, regionMult));
  }
  return forecast;
}

/** Perbarui cuaca saat pergantian hari game (~tick 0). */
export function advanceWeatherState(
  weather: WeatherState,
  month: number,
  region?: FloodRegion,
  disastersEnabled = true
): WeatherState {
  const isRainySeason = isRainySeasonMonth(month);
  const regionMult = region ? REGION_RAIN_INTENSITY[region] : 1;
  let event = rollWeatherEvent(isRainySeason);
  if (event === 'badai' && (!disastersEnabled || !isRainySeason)) {
    event = 'hujan';
  }
  const rainfallRate = eventToRainfall(event, regionMult);
  return {
    rainfallRate,
    currentEvent: event,
    forecastHours: buildForecast(isRainySeason, regionMult),
    durationTicks: 20 + Math.floor(Math.random() * 25),
    isRainySeason,
  };
}

/** Override cuaca untuk dev panel / tes. */
export function forceWeatherEvent(
  event: WeatherEvent,
  region?: FloodRegion
): WeatherState {
  const regionMult = region ? REGION_RAIN_INTENSITY[region] : 1;
  return {
    rainfallRate: eventToRainfall(event, regionMult),
    currentEvent: event,
    forecastHours: buildForecast(isRainySeasonMonth(11), regionMult),
    durationTicks: 30,
    isRainySeason: true,
  };
}

function tilePlayable(tile: Tile): boolean {
  return tile.playable !== false && (tile.elevation ?? -1) >= 0;
}

function tileIsLand(tile: Tile): boolean {
  return tilePlayable(tile) && tile.building.type !== 'water';
}

/**
 * Satu tick simulasi air — double-buffer.
 * Mutasi waterLevel, flowDirection, storedVolume pada grid.
 */
export function simulateFloodTick(
  grid: Tile[][],
  size: number,
  weather: WeatherState,
  services: ServiceCoverage
): void {
  const n = size * size;
  const newWater = new Float32Array(n);
  const elevation = new Float32Array(n);
  const playable = new Uint8Array(n);
  const isWater = new Uint8Array(n);
  const isLand = new Uint8Array(n);
  const isLevee = new Uint8Array(n);
  const isDrainChannel = new Uint8Array(n);
  const isRetention = new Uint8Array(n);
  const hasPump = new Uint8Array(n);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const tile = grid[y][x];
      const bt = tile.building.type;
      newWater[idx] = tile.waterLevel;
      elevation[idx] = tile.elevation >= 0 ? tile.elevation : 0;
      const p = tilePlayable(tile) ? 1 : 0;
      playable[idx] = p;
      isWater[idx] = bt === 'water' ? 1 : 0;
      isLand[idx] = p && !isWater[idx] ? 1 : 0;
      isLevee[idx] = bt === 'levee' ? 1 : 0;
      isDrainChannel[idx] = bt === 'drain_channel' ? 1 : 0;
      isRetention[idx] = bt === 'retention_pond' ? 1 : 0;
      hasPump[idx] = services.pumpCoverage[y][x] ? 1 : 0;
    }
  }

  // Waduk 3×3: tandai seluruh footprint (tile 'empty' ikut)
  const pondSize = getBuildingSize('retention_pond');
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x].building.type !== 'retention_pond') continue;
      for (let dy = 0; dy < pondSize.height; dy++) {
        for (let dx = 0; dx < pondSize.width; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < size && nx < size) {
            isRetention[ny * size + nx] = 1;
          }
        }
      }
    }
  }

  const rainMeters = weather.rainfallRate * floodTuning.rainAbsorption;

  // (a) Input hujan
  if (rainMeters > 0) {
    for (let i = 0; i < n; i++) {
      if (playable[i]) newWater[i] += rainMeters;
    }
  }

  // (b) Luapan air statis
  if (weather.rainfallRate > 0) {
    const overflow = floodTuning.staticOverflow * (weather.rainfallRate / 100);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = y * size + x;
        if (!isWater[idx]) continue;
        const neighbors: number[] = [];
        if (y > 0) neighbors.push(idx - size);
        if (x < size - 1) neighbors.push(idx + 1);
        if (y < size - 1) neighbors.push(idx + size);
        if (x > 0) neighbors.push(idx - 1);
        let landNeighbors = 0;
        for (const ni of neighbors) {
          if (isLand[ni]) landNeighbors++;
        }
        if (landNeighbors === 0) continue;
        const share = overflow / landNeighbors;
        for (const ni of neighbors) {
          if (isLand[ni]) newWater[ni] += share;
        }
      }
    }
  }

  // (c) Aliran gravitasi — double-buffer via delta[]
  const delta = new Float32Array(n);
  const outflowDir = new Uint8Array(n);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      if (isLevee[idx]) continue;
      const w = newWater[idx];
      if (w <= 0.0001 || !playable[idx]) continue;

      const totalH = elevation[idx] + w;
      const neighbors: { ni: number; dir: number; diff: number }[] = [];

      if (y > 0 && playable[idx - size] && !isLevee[idx - size]) {
        const ni = idx - size;
        const diff = totalH - (elevation[ni] + newWater[ni]);
        if (diff > 0.0001) neighbors.push({ ni, dir: 1, diff });
      }
      if (x < size - 1 && playable[idx + 1] && !isLevee[idx + 1]) {
        const ni = idx + 1;
        const diff = totalH - (elevation[ni] + newWater[ni]);
        if (diff > 0.0001) neighbors.push({ ni, dir: 2, diff });
      }
      if (y < size - 1 && playable[idx + size] && !isLevee[idx + size]) {
        const ni = idx + size;
        const diff = totalH - (elevation[ni] + newWater[ni]);
        if (diff > 0.0001) neighbors.push({ ni, dir: 3, diff });
      }
      if (x > 0 && playable[idx - 1] && !isLevee[idx - 1]) {
        const ni = idx - 1;
        const diff = totalH - (elevation[ni] + newWater[ni]);
        if (diff > 0.0001) neighbors.push({ ni, dir: 4, diff });
      }

      if (neighbors.length === 0) continue;

      let totalDiff = 0;
      for (const nb of neighbors) totalDiff += nb.diff;

      const flowMult = isDrainChannel[idx] ? floodTuning.drainChannelMultiplier : 1;
      const maxTransfer = w * floodTuning.gravityFlow * flowMult;
      let remaining = maxTransfer;
      let maxOut = 0;
      let maxDir = 0;

      for (const nb of neighbors) {
        const share = (nb.diff / totalDiff) * maxTransfer;
        const amount = Math.min(share, remaining);
        if (amount <= 0) continue;
        delta[idx] -= amount;
        delta[nb.ni] += amount;
        remaining -= amount;
        if (amount > maxOut) {
          maxOut = amount;
          maxDir = nb.dir;
        }
      }
      if (maxDir > 0) outflowDir[idx] = maxDir;
    }
  }

  for (let i = 0; i < n; i++) {
    newWater[i] = Math.max(0, newWater[i] + delta[i]);
  }

  // (d) Waduk penampung — serap dari tetangga (seluruh perimeter footprint 3×3)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x].building.type !== 'retention_pond') continue;
      const originTile = grid[y][x];
      let stored = originTile.building.storedVolume ?? 0;
      const cap = floodTuning.retentionCapacity;
      if (stored >= cap) continue;

      const absorbCells: number[] = [];
      for (let dy = 0; dy < pondSize.height; dy++) {
        for (let dx = 0; dx < pondSize.width; dx++) {
          absorbCells.push((y + dy) * size + (x + dx));
        }
      }

      let absorbed = 0;
      for (const cellIdx of absorbCells) {
        const cx = cellIdx % size;
        const cy = Math.floor(cellIdx / size);
        const neighbors: number[] = [];
        if (cy > 0) neighbors.push(cellIdx - size);
        if (cx < size - 1) neighbors.push(cellIdx + 1);
        if (cy < size - 1) neighbors.push(cellIdx + size);
        if (cx > 0) neighbors.push(cellIdx - 1);
        for (const ni of neighbors) {
          if (isRetention[ni]) continue;
          if (!isLand[ni]) continue;
          const take = Math.min(
            floodTuning.retentionAbsorb,
            newWater[ni],
            cap - stored - absorbed
          );
          if (take > 0) {
            newWater[ni] -= take;
            absorbed += take;
          }
        }
      }
      if (absorbed > 0) {
        originTile.building.storedVolume = stored + absorbed;
      }
    }
  }

  // (e) Peresapan — saluran drainase mempercepat
  for (let i = 0; i < n; i++) {
    if (!isLand[i]) continue;
    const rate = isDrainChannel[i]
      ? floodTuning.infiltration * floodTuning.drainChannelMultiplier
      : floodTuning.infiltration;
    newWater[i] = Math.max(0, newWater[i] - rate);
  }

  // (f) Pompa — kurangi waterLevel dalam pumpCoverage
  for (let i = 0; i < n; i++) {
    if (!hasPump[i]) continue;
    newWater[i] = Math.max(0, newWater[i] - floodTuning.pumpDrain);
  }

  // (g) Penguapan saat tidak hujan
  if (weather.rainfallRate <= 0) {
    for (let i = 0; i < n; i++) {
      if (!playable[i]) continue;
      newWater[i] = Math.max(0, newWater[i] - floodTuning.evaporation);
    }
  }

  // Tulis kembali ke grid
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const tile = grid[y][x];
      tile.waterLevel = newWater[idx];
      tile.flowDirection = outflowDir[idx] || 0;
    }
  }
}

function avgEvacuationCoverage(services: ServiceCoverage, size: number): number {
  let sum = 0;
  let count = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      sum += services.evacuation[y][x];
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

export function calculateFloodStats(
  grid: Tile[][],
  size: number,
  playableTileCount: number,
  prevStats: FloodStats,
  services: ServiceCoverage,
  region?: FloodRegion
): FloodStats {
  let floodedTileCount = 0;
  let maxWaterLevelTile = 0;
  let criticalInfraFlooded = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = grid[y][x];
      if (!tilePlayable(tile)) continue;
      if (tile.waterLevel > FLOOD_THRESHOLD) floodedTileCount++;
      if (tile.waterLevel > maxWaterLevelTile) maxWaterLevelTile = tile.waterLevel;
      if (
        CRITICAL_INFRA_TYPES.has(tile.building.type) &&
        tile.waterLevel > FLOOD_THRESHOLD
      ) {
        criticalInfraFlooded++;
      }
    }
  }

  const floodedRatio =
    playableTileCount > 0 ? floodedTileCount / playableTileCount : 0;

  const evacuationBonus =
    (avgEvacuationCoverage(services, size) / 100) * EVACUATION_SAFETY_BONUS_MAX;

  let safetyIndex =
    100 -
    floodedRatio * 100 -
    criticalInfraFlooded * CRITICAL_INFRA_PENALTY +
    evacuationBonus;
  safetyIndex = Math.max(0, Math.min(100, safetyIndex));

  const threshold =
    region != null ? REGION_WIN_LOSE[region].floodedRatioThreshold : 0.15;

  let dangerPersistenceTicks = prevStats.dangerPersistenceTicks;
  if (floodedRatio >= threshold) {
    dangerPersistenceTicks++;
  } else {
    dangerPersistenceTicks = 0;
  }

  return {
    floodedTileCount,
    floodedRatio,
    safetyIndex,
    dangerPersistenceTicks,
    maxWaterLevelTile,
    totalRainfallThisGame: prevStats.totalRainfallThisGame,
    rainyDaysSurvived: prevStats.rainyDaysSurvived,
    winTargetDays: prevStats.winTargetDays,
    criticalInfraFlooded,
  };
}

function evaluateGameStatus(
  floodStats: FloodStats,
  region: FloodRegion,
  gameStatus: GameStatus,
  dayWasRainy: boolean,
  dayFloodedBelowThreshold: boolean
): { floodStats: FloodStats; gameStatus: GameStatus } {
  if (gameStatus !== 'playing') {
    return { floodStats, gameStatus };
  }

  const config = REGION_WIN_LOSE[region];
  let stats = floodStats;

  if (dayWasRainy && dayFloodedBelowThreshold) {
    stats = {
      ...stats,
      rainyDaysSurvived: stats.rainyDaysSurvived + 1,
    };
  }

  if (stats.rainyDaysSurvived >= config.winSurvivalDays) {
    return { floodStats: stats, gameStatus: 'won' };
  }

  if (stats.dangerPersistenceTicks >= config.dangerPersistenceTicks) {
    return { floodStats: stats, gameStatus: 'lost' };
  }

  return { floodStats: stats, gameStatus: 'playing' };
}

/** Jalankan simulasi banjir + cuaca + menang/kalah untuk satu tick FloodGuard. */
export function runFloodSimulationStep(
  state: GameState,
  dayJustAdvanced: boolean,
  prevDayRainfallRate = 0
): {
  weatherState: WeatherState;
  floodStats: FloodStats;
  gameStatus: GameStatus;
} {
  let weatherState = state.weatherState ?? createInitialWeatherState(state.month);
  let floodStats = state.floodStats ?? createInitialFloodStats();
  let gameStatus: GameStatus = state.gameStatus ?? 'playing';

  if (gameStatus !== 'playing') {
    return { weatherState, floodStats, gameStatus };
  }

  if (dayJustAdvanced) {
    weatherState = advanceWeatherState(
      weatherState,
      state.month,
      state.selectedRegion,
      state.disastersEnabled
    );
  } else if (weatherState.durationTicks > 0) {
    weatherState = { ...weatherState, durationTicks: weatherState.durationTicks - 1 };
  }

  weatherState = {
    ...weatherState,
    isRainySeason: isRainySeasonMonth(state.month),
  };

  simulateFloodTick(state.grid, state.gridSize, weatherState, state.services);

  const playableCount =
    state.playableTileCount ??
    state.grid.flat().filter((t) => tilePlayable(t)).length;

  floodStats = calculateFloodStats(
    state.grid,
    state.gridSize,
    playableCount,
    floodStats,
    state.services,
    state.selectedRegion
  );
  floodStats = {
    ...floodStats,
    totalRainfallThisGame:
      floodStats.totalRainfallThisGame + weatherState.rainfallRate,
  };

  if (state.selectedRegion) {
    const dayWasRainy = dayJustAdvanced && prevDayRainfallRate > 0;
    const threshold = REGION_WIN_LOSE[state.selectedRegion].floodedRatioThreshold;
    const dayFloodedBelowThreshold =
      dayJustAdvanced && floodStats.floodedRatio < threshold;
    ({ floodStats, gameStatus } = evaluateGameStatus(
      floodStats,
      state.selectedRegion,
      gameStatus,
      dayWasRainy,
      dayFloodedBelowThreshold
    ));
  }

  return { weatherState, floodStats, gameStatus };
}

/** Label cuaca Bahasa Indonesia untuk UI. */
export const WEATHER_EVENT_LABELS: Record<WeatherEvent, string> = {
  cerah: 'Cerah',
  gerimis: 'Gerimis',
  hujan: 'Hujan',
  badai: 'Badai',
};
