'use client';

import React from 'react';
import { msg, useMessages } from 'gt-next';
import { useGame } from '@/context/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Budget } from '@/types/game';

const UI_LABELS = {
  budget: msg('Anggaran'),
  income: msg('Pemasukan'),
  expenses: msg('Pengeluaran'),
  net: msg('Bersih'),
};

const BUDGET_KEYS: (keyof Budget)[] = [
  'emergency_response',
  'flood_rescue',
  'medical_response',
  'preparedness_training',
  'evacuation_transport',
  'green_spaces',
  'pump_stations',
  'drain_network',
];

export function BudgetPanel() {
  const { state, setActivePanel, setBudgetFunding } = useGame();
  const { budget, stats } = state;
  const m = useMessages();

  const categories = BUDGET_KEYS.map((key) => ({ key, ...budget[key] }));

  return (
    <Dialog open={true} onOpenChange={() => setActivePanel('none')}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{m(UI_LABELS.budget)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4 pb-4 border-b border-border">
            <div>
              <div className="text-muted-foreground text-xs mb-1">{m(UI_LABELS.income)}</div>
              <div className="text-green-400 font-mono">${stats.income.toLocaleString()}/mo</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-1">{m(UI_LABELS.expenses)}</div>
              <div className="text-red-400 font-mono">${stats.expenses.toLocaleString()}/mo</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-1">{m(UI_LABELS.net)}</div>
              <div className={`font-mono ${stats.income - stats.expenses >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${(stats.income - stats.expenses).toLocaleString()}/mo
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat.key} className="flex items-center gap-4">
                <Label className="w-36 text-sm shrink-0">{cat.name}</Label>
                <Slider
                  value={[cat.funding]}
                  onValueChange={(value) => setBudgetFunding(cat.key, value[0])}
                  min={0}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="w-12 text-right font-mono text-sm">{cat.funding}%</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
