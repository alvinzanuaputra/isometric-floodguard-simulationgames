/**
 * Metadata kartu wilayah untuk MapSelectionScreen (floodguard-plan.md §7.3).
 * Statistik tier-0 & elevasi dari analisis data mentah; thumbnail dari heatmap Fase 1.
 */

import { FloodRegion } from '@/types/game';

/** Konfigurasi menang/kalah per wilayah — §4.6 (mudah di-tuning). */
export interface RegionWinLoseConfig {
  /** floodedRatio di atas ini = zona bahaya (0–1). */
  floodedRatioThreshold: number;
  /** Hari event hujan yang harus dilewati untuk menang. */
  winSurvivalDays: number;
  /** Tick berturut-turut di atas threshold sebelum kalah. */
  dangerPersistenceTicks: number;
}

export const REGION_WIN_LOSE: Record<FloodRegion, RegionWinLoseConfig> = {
  Barat: { floodedRatioThreshold: 0.2, winSurvivalDays: 5, dangerPersistenceTicks: 150 },
  Pusat: { floodedRatioThreshold: 0.25, winSurvivalDays: 7, dangerPersistenceTicks: 150 },
  Selatan: { floodedRatioThreshold: 0.3, winSurvivalDays: 10, dangerPersistenceTicks: 150 },
  Timur: { floodedRatioThreshold: 0.4, winSurvivalDays: 14, dangerPersistenceTicks: 180 },
  Utara: { floodedRatioThreshold: 0.45, winSurvivalDays: 18, dangerPersistenceTicks: 200 },
};

export interface RegionCardInfo {
  region: FloodRegion;
  displayName: string;
  difficultyLabel: string;
  difficultyEmoji: string;
  /** Persen area rawan (tier-0) dari total playable — acuan §7.3 */
  tier0Percent: number;
  /** Elevasi rata-rata wilayah (meter) — acuan §7.3 */
  avgElevationM: number;
  badgeClassName: string;
  thumbnailPath: string;
}

/** Urutan tampil: PEMULA → EKSTREM */
export const REGION_CARD_INFO: RegionCardInfo[] = [
  {
    region: 'Barat',
    displayName: 'Surabaya Barat',
    difficultyLabel: 'PEMULA',
    difficultyEmoji: '🟢',
    tier0Percent: 1.1,
    avgElevationM: 13.2,
    badgeClassName: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
    thumbnailPath: '/map-previews/SBY_Barat_heatmap.png',
  },
  {
    region: 'Pusat',
    displayName: 'Surabaya Pusat',
    difficultyLabel: 'MUDAH',
    difficultyEmoji: '🟡',
    tier0Percent: 2.2,
    avgElevationM: 9.1,
    badgeClassName: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/35',
    thumbnailPath: '/map-previews/SBY_Pusat_heatmap.png',
  },
  {
    region: 'Selatan',
    displayName: 'Surabaya Selatan',
    difficultyLabel: 'MENENGAH',
    difficultyEmoji: '🟠',
    tier0Percent: 15.9,
    avgElevationM: 8.7,
    badgeClassName: 'bg-orange-500/15 text-orange-300 border-orange-500/35',
    thumbnailPath: '/map-previews/SBY_Selatan_heatmap.png',
  },
  {
    region: 'Timur',
    displayName: 'Surabaya Timur',
    difficultyLabel: 'SULIT',
    difficultyEmoji: '🔴',
    tier0Percent: 29.2,
    avgElevationM: 3.8,
    badgeClassName: 'bg-red-500/15 text-red-300 border-red-500/35',
    thumbnailPath: '/map-previews/SBY_Timur_heatmap.png',
  },
  {
    region: 'Utara',
    displayName: 'Surabaya Utara',
    difficultyLabel: 'EKSTREM',
    difficultyEmoji: '⚫',
    tier0Percent: 44.0,
    avgElevationM: 6.9,
    badgeClassName: 'bg-violet-500/15 text-violet-200 border-violet-500/35',
    thumbnailPath: '/map-previews/SBY_Utara_heatmap.png',
  },
];
