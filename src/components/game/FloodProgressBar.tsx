'use client';

import React from 'react';
import { useGame } from '@/context/GameContext';
import { REGION_WIN_LOSE } from '@/lib/regionConfig';

/**
 * Bar progress menang/kalah — tampil saat mode FloodGuard aktif.
 */
export function FloodProgressBar() {
  const { state } = useGame();
  const { selectedRegion, floodStats, weatherState } = state;

  if (!selectedRegion || !floodStats) return null;

  const config = REGION_WIN_LOSE[selectedRegion];
  const floodedPct = Math.round(floodStats.floodedRatio * 100);
  const thresholdPct = Math.round(config.floodedRatioThreshold * 100);
  const safetyPct = Math.round(floodStats.safetyIndex);
  const daysDone = floodStats.rainyDaysSurvived;
  const daysTarget = floodStats.winTargetDays;
  const dangerPct = Math.min(
    100,
    Math.round((floodStats.dangerPersistenceTicks / config.dangerPersistenceTicks) * 100)
  );
  const isRaining = (weatherState?.rainfallRate ?? 0) > 0;

  const floodBarColor =
    floodedPct >= thresholdPct
      ? 'bg-red-500'
      : floodedPct >= thresholdPct * 0.7
        ? 'bg-amber-500'
        : 'bg-sky-500';

  const dangerBarColor = dangerPct >= 80 ? 'bg-red-600' : dangerPct >= 40 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="h-7 bg-secondary/40 border-b border-border flex items-center gap-4 px-4 text-xs shrink-0">
      <div className="flex items-center gap-1.5 min-w-[88px]">
        <span className="text-muted-foreground">Keamanan</span>
        <span className={`font-mono tabular-nums font-semibold ${safetyPct >= 70 ? 'text-emerald-400' : safetyPct >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
          {safetyPct}%
        </span>
      </div>

      <div className="flex items-center gap-2 flex-1 max-w-[200px]">
        <span className="text-muted-foreground whitespace-nowrap">Tergenang</span>
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${floodBarColor}`}
            style={{ width: `${Math.min(100, floodedPct)}%` }}
          />
        </div>
        <span className="font-mono tabular-nums text-foreground w-10 text-right">{floodedPct}%</span>
        <span className="text-muted-foreground text-[10px]">/ {thresholdPct}%</span>
      </div>

      <div className="flex items-center gap-2 flex-1 max-w-[180px]">
        <span className="text-muted-foreground whitespace-nowrap">Bahaya</span>
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${dangerBarColor}`}
            style={{ width: `${dangerPct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 min-w-[120px]">
        <span className="text-muted-foreground">Hari hujan</span>
        <span className="font-mono tabular-nums text-foreground">
          {daysDone}/{daysTarget}
        </span>
        {isRaining && (
          <span className="text-sky-400 text-[10px]">● hujan</span>
        )}
      </div>
    </div>
  );
}
