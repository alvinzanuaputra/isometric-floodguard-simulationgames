/**
 * Loader runtime peta wilayah Surabaya — FloodGuard Surabaya (Fase 1).
 *
 * HANYA mem-fetch file hasil preprocessing `SBY_{region}_processed.json`
 * (~100 KB) — TIDAK PERNAH file mentah `SBY_{region}.json` (16–27 MB).
 * File processed dihasilkan offline oleh `scripts/preprocess-maps.mjs`
 * dan di-commit ke repo (floodguard-plan.md §3.2 Step 5).
 */

import { FloodMapData, FloodRegion, GameState } from '@/types/game';
import { REGION_WIN_LOSE } from './regionConfig';
import {
  advanceWeatherState,
  createInitialFloodStats,
  createInitialWeatherState,
} from './floodSimulation';
import { applyCitySeedToState } from './citySeeding';
import { createInitialGameState } from './simulation';

/**
 * Konversi elevasi (meter) → tier 0–9 untuk pewarnaan terrain.
 * HARUS konsisten dengan tierFromElevation di scripts/preprocess-maps.mjs.
 */
const TIER_BOUNDS = [0.5, 2.5, 4.5, 7.5, 12.5, 16.5, 24.5, 33.5, 43.5];
export function elevationToTier(elevation: number): number {
  for (let t = 0; t < TIER_BOUNDS.length; t++) {
    if (elevation < TIER_BOUNDS[t]) return t;
  }
  return 9;
}

/**
 * Fetch & validasi data peta wilayah yang sudah di-preprocess.
 * Index array flat: row-major, `index = y * gridSize + x`.
 */
export async function loadMapData(region: FloodRegion): Promise<FloodMapData> {
  const url = `/map-data/SBY_${region}_processed.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Gagal memuat peta wilayah ${region}: ${res.status} ${res.statusText} (${url})`);
  }
  const data = (await res.json()) as FloodMapData;

  const expectedLength = data.gridSize * data.gridSize;
  if (
    data.version !== 1 ||
    data.elevation?.length !== expectedLength ||
    data.tier?.length !== expectedLength ||
    data.water?.length !== expectedLength ||
    data.playable?.length !== expectedLength
  ) {
    throw new Error(`Format peta wilayah ${region} tidak valid — jalankan ulang scripts/preprocess-maps.mjs`);
  }

  return data;
}

/** Statistik peta hasil preprocessing — UT-1: basis floodedRatio di Fase 4-5. */
export interface RegionMapStats {
  /** Jumlah tile playable (tile.playable === true), BUKAN gridSize² */
  playableTileCount: number;
  /** Persen tile playable ber-tier 0 atau ber-flag air */
  tier0PlayablePercent: number;
  /** Elevasi rata-rata tile playable (meter) */
  avgElevationM: number;
}

/**
 * Hitung statistik dari file processed. Dipakai saat inisialisasi game & kartu wilayah.
 *
 * UT-1 — floodedRatio (Fase 4-5) HARUS memakai `playableTileCount` sebagai penyebut:
 *   floodedRatio = floodedTileCount / playableTileCount
 * Bukan gridSize × gridSize (banyak padding non-playable di grid N=104).
 */
export function computeMapStats(mapData: FloodMapData): RegionMapStats {
  let playableTileCount = 0;
  let tier0Count = 0;
  let elevSum = 0;

  for (let i = 0; i < mapData.playable.length; i++) {
    if (mapData.playable[i] !== 1) continue;
    playableTileCount++;
    if (mapData.tier[i] === 0 || mapData.water[i] === 1) tier0Count++;
    if (mapData.elevation[i] >= 0) elevSum += mapData.elevation[i];
  }

  return {
    playableTileCount,
    tier0PlayablePercent:
      playableTileCount > 0 ? (tier0Count / playableTileCount) * 100 : 0,
    avgElevationM: playableTileCount > 0 ? elevSum / playableTileCount : 0,
  };
}

/**
 * Buat GameState baru untuk satu wilayah Surabaya.
 * Wrapper async di atas `createInitialGameState` (simulation.ts) karena
 * data peta harus di-fetch dulu; path IsoCity lama tetap sinkron tanpa wilayah.
 */
export async function createRegionGameState(
  region: FloodRegion,
  cityName: string = `Surabaya ${region}`
): Promise<GameState> {
  const mapData = await loadMapData(region);
  const stats = computeMapStats(mapData);
  const baseState = createInitialGameState(mapData.gridSize, cityName, mapData);
  const state = applyCitySeedToState(baseState, mapData, region);
  const initialWeather = createInitialWeatherState(state.month);
  return {
    ...state,
    selectedRegion: region,
    playableTileCount: stats.playableTileCount,
    weatherState: advanceWeatherState(
      initialWeather,
      state.month,
      region,
      state.disastersEnabled
    ),
    floodStats: createInitialFloodStats(REGION_WIN_LOSE[region].winSurvivalDays),
    gameStatus: 'playing' as const,
  };
}
