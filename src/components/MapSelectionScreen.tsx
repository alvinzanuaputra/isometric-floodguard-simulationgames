'use client';

import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FloodRegion } from '@/types/game';
import { REGION_CARD_INFO } from '@/lib/regionConfig';

interface MapSelectionScreenProps {
  onSelectRegion: (region: FloodRegion) => void;
  onBack: () => void;
  isLoading?: boolean;
  loadingRegion?: FloodRegion | null;
}

export function MapSelectionScreen({
  onSelectRegion,
  onBack,
  isLoading = false,
  loadingRegion = null,
}: MapSelectionScreenProps) {
  return (
    <main className="h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/10">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={isLoading}
          className="text-white/70 hover:text-white hover:bg-white/10 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Button>
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-light tracking-wide text-white/90">
            Pilih Wilayah
          </h1>
          <p className="text-sm text-white/45 mt-1">Kota Surabaya — simulasi manajemen banjir</p>
        </div>
        <div className="w-24" />
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-8 py-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {REGION_CARD_INFO.map((info) => {
            const isThisLoading = isLoading && loadingRegion === info.region;
            return (
              <Card
                key={info.region}
                className="bg-white/5 border-white/10 hover:border-white/25 transition-colors overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[4/3] bg-slate-900 border-b border-white/10">
                  <Image
                    src={info.thumbnailPath}
                    alt={`Peta ${info.displayName}`}
                    fill
                    className="object-contain p-2"
                    sizes="(max-width: 640px) 100vw, 33vw"
                    unoptimized
                  />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-white/90 text-lg font-medium tracking-wide">
                      {info.displayName}
                    </CardTitle>
                    <span
                      className={`shrink-0 text-xs font-medium px-2 py-1 rounded border ${info.badgeClassName}`}
                    >
                      {info.difficultyEmoji} {info.difficultyLabel}
                    </span>
                  </div>
                  <CardDescription className="text-white/50">
                    Wilayah {info.region}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-white/60">
                  <p>
                    Area rawan (tier-0):{' '}
                    <span className="text-white/80 font-medium">{info.tier0Percent.toFixed(1)}%</span>
                  </p>
                  <p>
                    Elevasi rata-rata:{' '}
                    <span className="text-white/80 font-medium">{info.avgElevationM.toFixed(1)} m</span>
                  </p>
                </CardContent>
                <CardFooter className="mt-auto pt-2">
                  <Button
                    className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-none"
                    disabled={isLoading}
                    onClick={() => onSelectRegion(info.region)}
                  >
                    {isThisLoading ? 'Memuat peta…' : 'Mulai'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
