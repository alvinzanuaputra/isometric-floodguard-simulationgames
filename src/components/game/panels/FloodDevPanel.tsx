'use client';

import React, { useCallback, useState } from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { floodTuning } from '@/lib/floodTuning';
import { getDefaultFloodTuning, WEATHER_EVENT_LABELS } from '@/lib/floodSimulation';
import { WeatherEvent } from '@/types/game';

const TUNING_SLIDERS: {
  key: keyof typeof floodTuning;
  label: string;
  min: number;
  max: number;
  step: number;
  scale: number;
}[] = [
  { key: 'rainAbsorption', label: 'Serapan Hujan', min: 0.00002, max: 0.0004, step: 0.00001, scale: 100000 },
  { key: 'infiltration', label: 'Peresapan Tanah', min: 0.0005, max: 0.006, step: 0.0001, scale: 10000 },
  { key: 'gravityFlow', label: 'Aliran Gravitasi', min: 0.1, max: 0.8, step: 0.05, scale: 100 },
  { key: 'pumpDrain', label: 'Drainase Pompa', min: 0.001, max: 0.02, step: 0.001, scale: 1000 },
];

export function FloodDevPanel() {
  const { state, devForceWeather, devForceGameStatus } = useGame();
  const [, bump] = useState(0);
  const refresh = useCallback(() => bump((n) => n + 1), []);

  if (!state.selectedRegion) return null;

  const setTuning = (key: keyof typeof floodTuning, value: number) => {
    floodTuning[key] = value;
    refresh();
  };

  const forceWeather = (event: WeatherEvent) => devForceWeather(event);
  const forceStatus = (status: 'won' | 'lost') => devForceGameStatus(status);

  const resetTuning = () => {
    Object.assign(floodTuning, getDefaultFloodTuning());
    refresh();
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="text-[10px] text-amber-500 uppercase tracking-wider font-bold">
        Dev Panel Banjir (Fase 5)
      </div>

      <div className="space-y-3">
        {TUNING_SLIDERS.map(({ key, label, min, max, step }) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-xs">
              <Label>{label}</Label>
              <span className="font-mono text-muted-foreground">
                {floodTuning[key].toFixed(key === 'gravityFlow' ? 2 : 4)}
              </span>
            </div>
            <Slider
              value={[floodTuning[key]]}
              onValueChange={(v) => setTuning(key, v[0])}
              min={min}
              max={max}
              step={step}
            />
          </div>
        ))}
        <Button variant="outline" size="sm" className="w-full" onClick={resetTuning}>
          Reset Konstanta
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Paksa Cuaca</Label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(WEATHER_EVENT_LABELS) as WeatherEvent[]).map((ev) => (
            <Button key={ev} variant="secondary" size="sm" onClick={() => forceWeather(ev)}>
              {WEATHER_EVENT_LABELS[ev]}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Tes Menang / Kalah</Label>
        <div className="flex gap-2">
          <Button variant="default" size="sm" className="flex-1" onClick={() => forceStatus('won')}>
            Menang
          </Button>
          <Button variant="destructive" size="sm" className="flex-1" onClick={() => forceStatus('lost')}>
            Kalah
          </Button>
        </div>
      </div>
    </div>
  );
}
