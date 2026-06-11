'use client';

import { useState, useEffect, useCallback } from 'react';
import { FloodRegion, GameState } from '@/types/game';
import { createRegionGameState } from '@/lib/mapLoader';

/** Wilayah valid untuk query dev `?region=` / `?wilayah=` (Fase 2 menggantikan ini). */
export const DEV_REGIONS: readonly FloodRegion[] = ['Barat', 'Pusat', 'Selatan', 'Timur', 'Utara'] as const;

export function parseDevRegionParam(search: string): FloodRegion | null {
  const params = new URLSearchParams(search);
  const raw = params.get('region') ?? params.get('wilayah');
  if (!raw) return null;
  const match = DEV_REGIONS.find((r) => r.toLowerCase() === raw.trim().toLowerCase());
  return match ?? null;
}

export function getInvalidDevRegionParam(search: string): string | null {
  const params = new URLSearchParams(search);
  const raw = params.get('region') ?? params.get('wilayah');
  if (!raw) return null;
  return parseDevRegionParam(search) ? null : raw.trim();
}

/**
 * Hook dev sementara — muat peta wilayah Surabaya dari `?region=Timur`
 * (alias `?wilayah=Utara`). Hanya untuk pengujian Fase 1 sebelum MapSelectionScreen.
 */
export function useDevRegion() {
  const [region, setRegion] = useState<FloodRegion | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRegion = useCallback(async (target: FloodRegion) => {
    setIsLoading(true);
    setError(null);
    setRegion(target);
    try {
      const state = await createRegionGameState(target, `Surabaya ${target}`);
      setGameState(state);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Gagal memuat peta wilayah';
      setError(message);
      setGameState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const invalid = getInvalidDevRegionParam(window.location.search);
    if (invalid) {
      setError(
        `Wilayah "${invalid}" tidak dikenal. Pilihan: ${DEV_REGIONS.join(', ')}`
      );
      return;
    }

    const parsed = parseDevRegionParam(window.location.search);
    if (parsed) {
      loadRegion(parsed);
    }
  }, [loadRegion]);

  const clearRegion = useCallback(() => {
    setRegion(null);
    setGameState(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    region,
    gameState,
    isLoading,
    error,
    loadRegion,
    clearRegion,
    hasDevParam: parseDevRegionParam(
      typeof window !== 'undefined' ? window.location.search : ''
    ) !== null || getInvalidDevRegionParam(
      typeof window !== 'undefined' ? window.location.search : ''
    ) !== null,
  };
}
