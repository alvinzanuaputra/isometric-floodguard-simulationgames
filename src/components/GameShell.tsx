'use client';

import { useGame } from '@/context/GameContext';
import Game from '@/components/Game';

interface GameShellProps {
  onExit: () => void;
  onPlayAgain?: () => void;
  loadingMessage?: string;
}

/** Menunggu isStateReady sebelum render kanvas — mencegah flash grid kosong saat peta async dimuat. */
export function GameShell({
  onExit,
  onPlayAgain,
  loadingMessage = 'Memuat permainan…',
}: GameShellProps) {
  const { isStateReady } = useGame();

  if (!isStateReady) {
    return (
      <main className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <p className="text-white/60 text-lg font-light tracking-wide animate-pulse">
          {loadingMessage}
        </p>
      </main>
    );
  }

  return <Game onExit={onExit} onPlayAgain={onPlayAgain} />;
}
