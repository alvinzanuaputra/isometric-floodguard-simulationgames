/**
 * Cuaca & statistik banjir — FloodGuard Surabaya (Fase 4).
 */

/** Jenis event cuaca aktif. */
export type WeatherEvent = 'cerah' | 'gerimis' | 'hujan' | 'badai';

export interface WeatherState {
  /**
   * Intensitas hujan saat ini, skala 0–100 (bukan mm/jam langsung).
   * Dikonversi ke meter/tick via RAIN_ABSORPTION_FACTOR di floodSimulation.ts.
   */
  rainfallRate: number;
  currentEvent: WeatherEvent;
  /** Prakiraan intensitas 6 jam ke depan (untuk UI). */
  forecastHours: number[];
  /** Sisa durasi event berjalan (tick). */
  durationTicks: number;
  /** true jika month 11, 12, 1, 2, 3, 4 (musim hujan Surabaya). */
  isRainySeason: boolean;
}

/** Status permainan FloodGuard — hanya aktif bila selectedRegion ada. */
export type GameStatus = 'playing' | 'won' | 'lost';

export interface FloodStats {
  /** Tile playable dengan waterLevel > FLOOD_THRESHOLD. */
  floodedTileCount: number;
  /**
   * floodedTileCount / playableTileCount (0–1).
   * UT-1: penyebut HARUS playableTileCount, BUKAN gridSize².
   */
  floodedRatio: number;
  /** Indeks keselamatan 0–100 (100 = tidak ada genangan signifikan). */
  safetyIndex: number;
  /** Tick berturut-turut dengan floodedRatio tinggi (untuk Fase 5 game over). */
  dangerPersistenceTicks: number;
  /** waterLevel maksimum di peta (meter). */
  maxWaterLevelTile: number;
  /** Akumulasi intensitas hujan sepanjang permainan (skala rainfallRate·tick). */
  totalRainfallThisGame: number;
  /** Hari event hujan berhasil dilewati tanpa melampaui threshold (menuju menang). */
  rainyDaysSurvived: number;
  /** Target hari hujan untuk menang — dari regionConfig per wilayah. */
  winTargetDays: number;
  /** Tile infrastruktur kritis yang tergenang (penalti safetyIndex). */
  criticalInfraFlooded: number;
}
