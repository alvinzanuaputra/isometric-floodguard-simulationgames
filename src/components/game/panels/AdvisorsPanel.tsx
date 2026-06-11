'use client';

import React, { useMemo } from 'react';
import { msg, useMessages } from 'gt-next';
import { useGame } from '@/context/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { REGION_WIN_LOSE } from '@/lib/regionConfig';
import {
  AdvisorIcon,
  InfoIcon,
  PowerIcon,
  WaterIcon,
  MoneyIcon,
  SafetyIcon,
  HealthIcon,
  EducationIcon,
  EnvironmentIcon,
  JobsIcon,
} from '@/components/ui/Icons';

const UI_LABELS = {
  cityAdvisors: msg('Penasihat Kota'),
  bpbdAdvisors: msg('Koordinator BPBD'),
  overallCityRating: msg('Peringkat Kota Keseluruhan'),
  overallSafetyRating: msg('Indeks Keselamatan Wilayah'),
  ratingDescription: msg('Berdasarkan kebahagiaan, kesehatan, pendidikan, keamanan & lingkungan'),
  safetyDescription: msg('Berdasarkan % wilayah tergenang dan kesiapan infrastruktur mitigasi'),
  noUrgentIssues: msg('Tidak ada masalah mendesak!'),
  cityRunningSmoothly: msg('Wilayah berjalan dengan baik.'),
  floodStable: msg('Situasi banjir terkendali.'),
};

const ADVISOR_ICON_MAP: Record<string, React.ReactNode> = {
  power: <PowerIcon size={18} />,
  water: <WaterIcon size={18} />,
  cash: <MoneyIcon size={18} />,
  shield: <SafetyIcon size={18} />,
  hospital: <HealthIcon size={18} />,
  education: <EducationIcon size={18} />,
  environment: <EnvironmentIcon size={18} />,
  planning: <AdvisorIcon size={18} />,
  jobs: <JobsIcon size={18} />,
};

import { GameState } from '@/types/game';

function countMitigation(state: GameState) {
  const types = new Set(['flood_pump', 'levee', 'retention_pond', 'drain_channel', 'evacuation_post']);
  let count = 0;
  for (let y = 0; y < state.gridSize; y++) {
    for (let x = 0; x < state.gridSize; x++) {
      const b = state.grid[y][x].building;
      if (types.has(b.type) && !b.isSeeded) count++;
    }
  }
  return count;
}

export function AdvisorsPanel() {
  const { state, setActivePanel } = useGame();
  const { advisorMessages, stats, selectedRegion, floodStats, weatherState } = state;
  const m = useMessages();
  const isFloodGuard = !!selectedRegion;

  const floodAdvice = useMemo(() => {
    if (!isFloodGuard || !floodStats || !selectedRegion) return [];
    const messages: { name: string; icon: string; messages: string[]; priority: 'high' | 'medium' | 'low' }[] = [];
    const threshold = REGION_WIN_LOSE[selectedRegion].floodedRatioThreshold;
    const floodedPct = Math.round(floodStats.floodedRatio * 100);
    const thresholdPct = Math.round(threshold * 100);
    const mitCount = countMitigation(state);

    if (floodedPct >= thresholdPct * 0.85) {
      messages.push({
        name: 'Peringatan Genangan',
        icon: 'shield',
        priority: 'high',
        messages: [
          `Wilayah tergenang ${floodedPct}% — mendekati batas ${thresholdPct}%.`,
          'Segera pasang pompa tambahan atau perkuat tanggul di area rawan.',
        ],
      });
    }

    if (mitCount < 3) {
      messages.push({
        name: 'Infrastruktur Mitigasi',
        icon: 'planning',
        priority: 'medium',
        messages: [
          `Hanya ${mitCount} infrastruktur mitigasi terpasang.`,
          'Kombinasikan pompa, tanggul, waduk, dan saluran drainase di dataran rendah.',
        ],
      });
    }

    if (weatherState?.isRainySeason && (weatherState.rainfallRate ?? 0) > 20) {
      messages.push({
        name: 'Musim Hujan Aktif',
        icon: 'water',
        priority: 'medium',
        messages: [
          `Curah hujan ${Math.round(weatherState.rainfallRate)}% — genangan akan menyebar ke elevasi rendah.`,
          'Aktifkan overlay Risiko Banjir untuk merencanakan penempatan alat.',
        ],
      });
    }

    if (floodStats.safetyIndex >= 75 && floodedPct < thresholdPct * 0.5) {
      messages.push({
        name: 'Status Aman',
        icon: 'environment',
        priority: 'low',
        messages: [
          `Indeks keamanan ${Math.round(floodStats.safetyIndex)}% — wilayah terkendali.`,
          `Progress menang: ${floodStats.rainyDaysSurvived}/${floodStats.winTargetDays} hari hujan.`,
        ],
      });
    }

    return messages;
  }, [isFloodGuard, floodStats, selectedRegion, state, weatherState]);

  const avgRating = isFloodGuard && floodStats
    ? floodStats.safetyIndex
    : (stats.happiness + stats.health + stats.education + stats.safety + stats.environment) / 5;

  const grade = avgRating >= 90 ? 'A+' : avgRating >= 80 ? 'A' : avgRating >= 70 ? 'B' : avgRating >= 60 ? 'C' : avgRating >= 50 ? 'D' : 'F';
  const gradeColor = avgRating >= 70 ? 'text-green-400' : avgRating >= 50 ? 'text-amber-400' : 'text-red-400';

  const displayMessages = isFloodGuard
    ? floodAdvice
    : advisorMessages.map((a) => ({
        name: a.name,
        icon: a.icon,
        messages: a.messages,
        priority: a.priority as 'high' | 'medium' | 'low',
      }));

  return (
    <Dialog open={true} onOpenChange={() => setActivePanel('none')}>
      <DialogContent className="max-w-[500px] max-h-[600px]">
        <DialogHeader>
          <DialogTitle>{isFloodGuard ? m(UI_LABELS.bpbdAdvisors) : m(UI_LABELS.cityAdvisors)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="flex items-center gap-4 p-4 bg-primary/10 border-primary/30">
            <div
              className={`w-16 h-16 flex items-center justify-center text-3xl font-black rounded-md ${gradeColor} bg-primary/20`}
            >
              {grade}
            </div>
            <div>
              <div className="text-foreground font-semibold">
                {isFloodGuard ? m(UI_LABELS.overallSafetyRating) : m(UI_LABELS.overallCityRating)}
              </div>
              <div className="text-muted-foreground text-sm">
                {isFloodGuard ? m(UI_LABELS.safetyDescription) : m(UI_LABELS.ratingDescription)}
              </div>
            </div>
          </Card>

          <ScrollArea className="max-h-[350px]">
            <div className="space-y-3">
              {displayMessages.length === 0 ? (
                <Card className="text-center py-8 text-muted-foreground bg-primary/10 border-primary/30">
                  <AdvisorIcon size={32} className="mx-auto mb-3 opacity-50" />
                  <div className="text-sm">
                    {isFloodGuard ? m(UI_LABELS.floodStable) : m(UI_LABELS.noUrgentIssues)}
                  </div>
                  <div className="text-xs mt-1">{m(UI_LABELS.cityRunningSmoothly)}</div>
                </Card>
              ) : (
                displayMessages.map((advisor, idx) => (
                  <Card key={idx} className="p-4 bg-card/50">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-primary">
                        {ADVISOR_ICON_MAP[advisor.icon] ?? <InfoIcon size={18} />}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{advisor.name}</span>
                          <Badge
                            variant={
                              advisor.priority === 'high'
                                ? 'destructive'
                                : advisor.priority === 'medium'
                                  ? 'secondary'
                                  : 'outline'
                            }
                            className="text-[10px]"
                          >
                            {advisor.priority === 'high' ? 'Mendesak' : advisor.priority === 'medium' ? 'Perhatian' : 'Info'}
                          </Badge>
                        </div>
                        {advisor.messages.map((line, i) => (
                          <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
