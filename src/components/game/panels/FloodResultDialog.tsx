'use client';

import React from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
interface FloodResultDialogProps {
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function FloodResultDialog({ onPlayAgain, onMainMenu }: FloodResultDialogProps) {
  const { state } = useGame();
  const status = state.gameStatus;
  const stats = state.floodStats;

  if (!state.selectedRegion || (status !== 'won' && status !== 'lost')) {
    return null;
  }

  const isWon = status === 'won';
  const safetyPct = Math.round(stats?.safetyIndex ?? 0);
  const floodedPct = Math.round((stats?.floodedRatio ?? 0) * 100);
  const days = stats?.rainyDaysSurvived ?? 0;
  const target = stats?.winTargetDays ?? 0;

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{isWon ? 'Wilayah Aman!' : 'Banjir Meluap!'}</DialogTitle>
          <DialogDescription>
            {isWon
              ? `Anda berhasil melindungi wilayah selama ${days} hari hujan.`
              : 'Area tergenang terlalu lama — wilayah tidak dapat dilindungi.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-sm py-2">
          <div className="rounded-md bg-muted/50 p-3">
            <div className="text-muted-foreground text-xs">Hari hujan dilewati</div>
            <div className="font-mono font-semibold text-lg">
              {days} / {target}
            </div>
          </div>
          <div className="rounded-md bg-muted/50 p-3">
            <div className="text-muted-foreground text-xs">Indeks keselamatan</div>
            <div className="font-mono font-semibold text-lg">{safetyPct}%</div>
          </div>
          <div className="rounded-md bg-muted/50 p-3 col-span-2">
            <div className="text-muted-foreground text-xs">Area tergenang</div>
            <div className="font-mono font-semibold">{floodedPct}% petak dapat dimainkan</div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onMainMenu}>
            Kembali ke Menu
          </Button>
          <Button className="w-full sm:w-auto" onClick={onPlayAgain}>
            Main Lagi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
