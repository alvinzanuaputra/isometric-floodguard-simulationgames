'use client';

import React from 'react';
import { Droplets, Mountain, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  CloseIcon,
  FireIcon,
  SafetyIcon,
  HealthIcon,
  EducationIcon,
} from '@/components/ui/Icons';
import { OverlayMode } from './types';
import {
  FLOODGUARD_OVERLAY_TOGGLE_MODES,
  OVERLAY_CONFIG,
  getOverlayButtonClass,
} from './overlays';

// ============================================================================
// Types
// ============================================================================

export interface OverlayModeToggleProps {
  overlayMode: OverlayMode;
  setOverlayMode: (mode: OverlayMode) => void;
}

// ============================================================================
// Icon Mapping
// ============================================================================

const OVERLAY_ICONS: Partial<Record<OverlayMode, React.ReactNode>> = {
  none: <CloseIcon size={14} />,
  terrain_elevation: <Mountain size={14} />,
  flood_risk: <Waves size={14} />,
  flood_level: <Droplets size={14} />,
  fire: <FireIcon size={14} />,
  police: <SafetyIcon size={14} />,
  health: <HealthIcon size={14} />,
  education: <EducationIcon size={14} />,
};

// ============================================================================
// Component
// ============================================================================

/**
 * Toggle overlay peta FloodGuard — mode terrain & risiko banjir + layanan legacy.
 * Mode power/water/subway disembunyikan (§6.4); kode overlay lama tetap ada.
 */
export const OverlayModeToggle = React.memo(function OverlayModeToggle({
  overlayMode,
  setOverlayMode,
}: OverlayModeToggleProps) {
  return (
    <Card className="fixed bottom-4 left-[240px] p-2 shadow-lg bg-card/90 border-border/70 z-50">
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-2">
        Overlay Peta
      </div>
      <div className="flex flex-wrap gap-1 max-w-[320px]">
        {FLOODGUARD_OVERLAY_TOGGLE_MODES.map((mode) => {
          const config = OVERLAY_CONFIG[mode];
          const isActive = overlayMode === mode;
          const label = mode === 'none' ? 'Matikan' : config.label;

          return (
            <Button
              key={mode}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setOverlayMode(mode)}
              className={`h-8 px-2 gap-1.5 ${getOverlayButtonClass(mode, isActive)}`}
              title={config.title}
            >
              {OVERLAY_ICONS[mode]}
              <span className="text-[10px] font-medium">{label}</span>
            </Button>
          );
        })}
      </div>
    </Card>
  );
});
