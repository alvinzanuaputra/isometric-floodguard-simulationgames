'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState } from '@/types/game';
import {
  FLOODGUARD_TIPS_DISABLED_KEY as STORAGE_KEY,
  FLOODGUARD_TIPS_SHOWN_KEY as SHOWN_TIPS_KEY,
} from '@/lib/storageKeys';
import { REGION_WIN_LOSE } from '@/lib/regionConfig';

// Tips mekanik FloodGuard — Bahasa Indonesia (Fase 7)
export type TipId =
  | 'selamat_datang'
  | 'overlay_risiko'
  | 'alat_mitigasi'
  | 'musim_hujan'
  | 'prakiraan_cuaca'
  | 'target_menang';

export interface TipDefinition {
  id: TipId;
  message: string;
  priority: number;
  check: (state: GameState) => boolean;
}

function hasBuildingType(state: GameState, type: string): boolean {
  for (let y = 0; y < state.gridSize; y++) {
    for (let x = 0; x < state.gridSize; x++) {
      if (state.grid[y][x].building.type === type) return true;
    }
  }
  return false;
}

function countMitigationTools(state: GameState): number {
  const types = new Set(['flood_pump', 'levee', 'retention_pond', 'drain_channel', 'evacuation_post']);
  let count = 0;
  for (let y = 0; y < state.gridSize; y++) {
    for (let x = 0; x < state.gridSize; x++) {
      if (types.has(state.grid[y][x].building.type)) count++;
    }
  }
  return count;
}

const TIP_DEFINITIONS: TipDefinition[] = [
  {
    id: 'selamat_datang',
    message:
      'Selamat datang di FloodGuard Surabaya! Pilih alat mitigasi banjir di sidebar, lalu bangun pompa, tanggul, dan saluran drainase di area rawan rendah.',
    priority: 0,
    check: (state) => {
      if (!state.selectedRegion) return false;
      return countMitigationTools(state) < 2;
    },
  },
  {
    id: 'overlay_risiko',
    message:
      'Buka overlay «Risiko Banjir» di bilah atas untuk melihat area rawan (merah) dan aman (hijau) berdasarkan elevasi wilayah.',
    priority: 1,
    check: (state) => {
      if (!state.selectedRegion) return false;
      return countMitigationTools(state) < 4;
    },
  },
  {
    id: 'alat_mitigasi',
    message:
      'Pompa menurunkan genangan di sekitarnya, tanggul menghalangi aliran air, waduk menampung kelebihan air, dan saluran drainase mempercepat resapan.',
    priority: 2,
    check: (state) => {
      if (!state.selectedRegion) return false;
      const hasPump = hasBuildingType(state, 'flood_pump');
      const hasLevee = hasBuildingType(state, 'levee');
      return !hasPump || !hasLevee;
    },
  },
  {
    id: 'musim_hujan',
    message:
      'Surabaya memasuki musim hujan Nov–Apr. Siapkan infrastruktur sebelum curah hujan naik — genangan menyebar mengikuti elevasi terrain.',
    priority: 3,
    check: (state) => {
      if (!state.selectedRegion) return false;
      return state.weatherState?.isRainySeason === true;
    },
  },
  {
    id: 'prakiraan_cuaca',
    message:
      'Perhatikan prakiraan cuaca 6 jam di bilah atas. Rencanakan penempatan pompa dan tanggul sebelum event Hujan atau Badai dimulai.',
    priority: 4,
    check: (state) => {
      if (!state.selectedRegion || !state.weatherState) return false;
      const forecast = state.weatherState.forecastHours ?? [];
      return forecast.some((h) => h >= 10);
    },
  },
  {
    id: 'target_menang',
    message:
      'Target menang: bertahan selama hari event hujan yang ditetapkan wilayah tanpa melampaui batas genangan. Cek Indeks Keselamatan di bilah atas.',
    priority: 5,
    check: (state) => {
      if (!state.selectedRegion || !state.floodStats) return false;
      const region = state.selectedRegion;
      const winDays = REGION_WIN_LOSE[region]?.winSurvivalDays ?? state.floodStats.winTargetDays;
      return state.floodStats.winTargetDays === winDays && state.gameStatus === 'playing';
    },
  },
];

const MIN_TIP_INTERVAL_MS = 15000;
const TIP_CHECK_INTERVAL_MS = 5000;
const INITIAL_TIP_DELAY_MS = 3000;

interface UseTipSystemReturn {
  currentTip: string | null;
  isVisible: boolean;
  onContinue: () => void;
  onSkipAll: () => void;
  tipsEnabled: boolean;
  setTipsEnabled: (enabled: boolean) => void;
}

export function useTipSystem(state: GameState): UseTipSystemReturn {
  const [tipsEnabled, setTipsEnabledState] = useState(true);
  const [currentTip, setCurrentTip] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shownTips, setShownTips] = useState<Set<TipId>>(new Set());
  const lastTipTimeRef = useRef<number>(0);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasLoadedRef = useRef(false);

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const disabled = localStorage.getItem(STORAGE_KEY);
      if (disabled === 'true') {
        setTipsEnabledState(false);
      }

      const shown = localStorage.getItem(SHOWN_TIPS_KEY);
      if (shown) {
        const parsed = JSON.parse(shown);
        if (Array.isArray(parsed)) {
          setShownTips(new Set(parsed as TipId[]));
        }
      }
    } catch (e) {
      console.error('Gagal memuat preferensi tips:', e);
    }

    hasLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(SHOWN_TIPS_KEY, JSON.stringify(Array.from(shownTips)));
    } catch (e) {
      console.error('Gagal menyimpan tips yang sudah ditampilkan:', e);
    }
  }, [shownTips]);

  const setTipsEnabled = useCallback((enabled: boolean) => {
    setTipsEnabledState(enabled);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, enabled ? 'false' : 'true');
      } catch (e) {
        console.error('Gagal menyimpan preferensi tips:', e);
      }
    }
    if (!enabled) {
      setIsVisible(false);
      setCurrentTip(null);
    }
  }, []);

  const shownTipsRef = useRef<Set<TipId>>(new Set());

  useEffect(() => {
    shownTipsRef.current = shownTips;
  }, [shownTips]);

  const checkAndShowTip = useCallback(() => {
    if (!hasLoadedRef.current) return;
    if (!tipsEnabled) return;
    if (isVisible) return;

    const now = Date.now();
    if (lastTipTimeRef.current > 0 && now - lastTipTimeRef.current < MIN_TIP_INTERVAL_MS) {
      return;
    }

    const currentState = stateRef.current;
    if (!currentState.selectedRegion) return;

    const currentShownTips = shownTipsRef.current;
    const applicableTips = TIP_DEFINITIONS
      .filter((tip) => !currentShownTips.has(tip.id) && tip.check(currentState))
      .sort((a, b) => a.priority - b.priority);

    if (applicableTips.length > 0) {
      const tip = applicableTips[0];
      setCurrentTip(tip.message);
      setIsVisible(true);
      lastTipTimeRef.current = now;
      setShownTips((prev) => new Set([...prev, tip.id]));
    }
  }, [tipsEnabled, isVisible]);

  useEffect(() => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }

    if (!tipsEnabled) return;

    const initialTimeout = setTimeout(() => {
      checkAndShowTip();
    }, INITIAL_TIP_DELAY_MS);

    checkIntervalRef.current = setInterval(checkAndShowTip, TIP_CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [tipsEnabled, checkAndShowTip]);

  const onContinue = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentTip(null);
    }, 300);
  }, []);

  const onSkipAll = useCallback(() => {
    setTipsEnabled(false);
    setIsVisible(false);
    setCurrentTip(null);
  }, [setTipsEnabled]);

  return {
    currentTip,
    isVisible,
    onContinue,
    onSkipAll,
    tipsEnabled,
    setTipsEnabled,
  };
}
