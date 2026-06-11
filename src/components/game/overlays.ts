/**
 * Overlay mode utilities and configuration.
 * Handles visualization overlays for power, water, services, etc.
 */

import { Tile } from '@/types/game';
import { RENDER_THRESHOLD } from '@/lib/floodSimulation';
import { elevationToTier } from '@/lib/mapLoader';
import { OverlayMode } from './types';

// ============================================================================
// Types
// ============================================================================

/** Service coverage data for a tile */
export type ServiceCoverage = {
  rescue: number;
  evacuation: number;
  medical: number;
  preparedness: number;
  pump?: boolean;
  drain?: boolean;
};

/** Configuration for an overlay mode */
export type OverlayConfig = {
  /** Display label */
  label: string;
  /** Tooltip/title text */
  title: string;
  /** Button background color when active */
  activeColor: string;
  /** Button hover color when active */
  hoverColor: string;
};

// ============================================================================
// Overlay Configuration
// ============================================================================

/** Configuration for each overlay mode */
export const OVERLAY_CONFIG: Record<OverlayMode, OverlayConfig> = {
  none: {
    label: 'Tanpa',
    title: 'Tanpa Overlay',
    activeColor: '',
    hoverColor: '',
  },
  power: {
    label: 'Power',
    title: 'Power Grid',
    activeColor: 'bg-amber-500',
    hoverColor: 'hover:bg-amber-600',
  },
  water: {
    label: 'Water',
    title: 'Water System',
    activeColor: 'bg-blue-500',
    hoverColor: 'hover:bg-blue-600',
  },
  fire: {
    label: 'Penyelamatan',
    title: 'Cakupan Penyelamatan & SAR',
    activeColor: 'bg-red-500',
    hoverColor: 'hover:bg-red-600',
  },
  police: {
    label: 'Evakuasi',
    title: 'Cakupan Pos Evakuasi',
    activeColor: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700',
  },
  health: {
    label: 'Kesehatan',
    title: 'Cakupan Kesehatan',
    activeColor: 'bg-green-500',
    hoverColor: 'hover:bg-green-600',
  },
  education: {
    label: 'Pendidikan',
    title: 'Cakupan Pendidikan',
    activeColor: 'bg-purple-500',
    hoverColor: 'hover:bg-purple-600',
  },
  subway: {
    label: 'Subway',
    title: 'Subway Coverage',
    activeColor: 'bg-yellow-500',
    hoverColor: 'hover:bg-yellow-600',
  },
  terrain_elevation: {
    label: 'Elevasi',
    title: 'Kontur Elevasi (meter)',
    activeColor: 'bg-teal-600',
    hoverColor: 'hover:bg-teal-700',
  },
  flood_risk: {
    label: 'Risiko Banjir',
    title: 'Peta Risiko Banjir (elevasi rendah = merah)',
    activeColor: 'bg-red-600',
    hoverColor: 'hover:bg-red-700',
  },
  flood_level: {
    label: 'Genangan',
    title: 'Tingkat Genangan Air (runtime, meter)',
    activeColor: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700',
  },
  pump_coverage: {
    label: 'Pompa',
    title: 'Cakupan Pompa Banjir',
    activeColor: 'bg-sky-500',
    hoverColor: 'hover:bg-sky-600',
  },
  drain_coverage: {
    label: 'Drainase',
    title: 'Cakupan Saluran & Drainase',
    activeColor: 'bg-cyan-600',
    hoverColor: 'hover:bg-cyan-700',
  },
};

/** Mode overlay yang ditampilkan di UI FloodGuard (sembunyikan power/water/subway — §6.4). */
export const FLOODGUARD_OVERLAY_TOGGLE_MODES: OverlayMode[] = [
  'none',
  'terrain_elevation',
  'flood_risk',
  'flood_level',
  'pump_coverage',
  'drain_coverage',
  'fire',
  'police',
  'health',
  'education',
];

/** Overlay terrain menutupi seluruh grid, bukan hanya bangunan. */
export function isFullGridOverlayMode(mode: OverlayMode): boolean {
  return (
    mode === 'terrain_elevation' ||
    mode === 'flood_risk' ||
    mode === 'flood_level' ||
    mode === 'pump_coverage' ||
    mode === 'drain_coverage' ||
    mode === 'subway'
  );
}

/** Map of building tools to their corresponding overlay mode */
export const TOOL_TO_OVERLAY_MAP: Record<string, OverlayMode> = {
  power_plant: 'power',
  water_tower: 'water',
  fire_station: 'fire',
  police_station: 'police',
  hospital: 'health',
  school: 'education',
  university: 'education',
  subway_station: 'subway',
  subway: 'subway',
  flood_pump: 'pump_coverage',
  drain_channel: 'drain_coverage',
};

/** Get the button class name for an overlay button */
export function getOverlayButtonClass(mode: OverlayMode, isActive: boolean): string {
  if (!isActive || mode === 'none') return '';
  const config = OVERLAY_CONFIG[mode];
  return `${config.activeColor} ${config.hoverColor}`;
}

// ============================================================================
// Overlay Fill Style Calculation
// ============================================================================

/** Tiles that don't need service coverage (natural/infrastructure) */
const NON_BUILDING_TYPES = new Set([
  'empty', 'grass', 'water', 'road', 'rail', 'tree'
]);

/** Check if a tile has a building that needs service coverage */
function tileNeedsCoverage(tile: Tile): boolean {
  return !NON_BUILDING_TYPES.has(tile.building.type);
}

/** Warning color for uncovered buildings */
const UNCOVERED_WARNING = 'rgba(239, 68, 68, 0.45)'; // Red tint

/** No overlay needed (transparent) */
const NO_OVERLAY = 'rgba(0, 0, 0, 0)';

/** Warna netral untuk tile tanpa data elevasi (padding / peta IsoCity lama). */
const NON_PLAYABLE_OVERLAY = 'rgba(55, 60, 70, 0.55)';

/** Gradasi elevasi 0–50 m: biru rendah → hijau → coklat tinggi. */
function elevationToOverlayRgba(elevation: number, alpha = 0.65): string {
  const t = Math.max(0, Math.min(1, elevation / 50));
  let r: number;
  let g: number;
  let b: number;
  if (t < 0.5) {
    const u = t * 2;
    r = Math.round(25 + u * 55);
    g = Math.round(70 + u * 130);
    b = Math.round(190 - u * 110);
  } else {
    const u = (t - 0.5) * 2;
    r = Math.round(80 + u * 110);
    g = Math.round(200 - u * 130);
    b = Math.round(70 - u * 50);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Gradasi biru dari waterLevel runtime (meter). */
function floodLevelToOverlayRgba(tile: Tile): string {
  const w = tile.waterLevel;
  if (w <= RENDER_THRESHOLD) return NO_OVERLAY;
  const t = Math.min(1, w / 0.5);
  const alpha = 0.25 + t * 0.6;
  const b = Math.round(180 + t * 55);
  return `rgba(29, 78, ${b}, ${alpha})`;
}

/** Heatmap risiko banjir statis dari tier/elevasi (bukan waterLevel — Fase 3). */
function floodRiskToOverlayRgba(tile: Tile): string {
  if (tile.building.type === 'water') {
    return 'rgba(220, 38, 38, 0.82)';
  }
  const tier = elevationToTier(tile.elevation);
  if (tier <= 1) return 'rgba(239, 68, 68, 0.72)';
  if (tier === 2) return 'rgba(251, 146, 60, 0.58)';
  if (tier === 3) return 'rgba(250, 204, 21, 0.38)';
  return 'rgba(34, 197, 94, 0.22)';
}

/**
 * Warna pixel minimap untuk peta dengan data elevasi (FloodGuard).
 * Air = biru, rendah = merah/oranye, tinggi = hijau/coklat, padding = gelap.
 */
export function getMinimapTerrainColor(tile: Tile): string {
  if (tile.playable === false || (tile.elevation ?? -1) < 0) {
    return '#1e293b';
  }
  if (tile.building.type === 'water') {
    return '#0ea5e9';
  }
  if (tile.building.type === 'road' || tile.building.type === 'bridge') {
    return '#64748b';
  }
  const elev = tile.elevation;
  if (elev < 3) return '#dc2626';
  if (elev < 7) return '#ea580c';
  if (elev < 12) return '#ca8a04';
  if (elev < 20) return '#65a30d';
  if (elev < 30) return '#16a34a';
  return '#78716c';
}

/**
 * Calculate the fill style color for an overlay tile.
 * 
 * New simplified logic:
 * - Buildings without coverage get a red warning tint
 * - Covered buildings and non-building tiles get no tint
 * - Radius circles are drawn separately to show coverage areas
 * 
 * @param mode - The current overlay mode
 * @param tile - The tile being rendered
 * @param coverage - Service coverage values for the tile
 * @returns CSS color string for the overlay fill
 */
export function getOverlayFillStyle(
  mode: OverlayMode,
  tile: Tile,
  coverage: ServiceCoverage
): string {
  // Only show warning on tiles that have buildings needing coverage
  const needsCoverage = tileNeedsCoverage(tile);
  
  switch (mode) {
    case 'power':
      // Red warning only on unpowered buildings
      if (!needsCoverage) return NO_OVERLAY;
      return tile.building.powered ? NO_OVERLAY : UNCOVERED_WARNING;

    case 'water':
      // Red warning only on buildings without water
      if (!needsCoverage) return NO_OVERLAY;
      return tile.building.watered ? NO_OVERLAY : UNCOVERED_WARNING;

    case 'fire':
      if (!needsCoverage) return NO_OVERLAY;
      return coverage.rescue > 0 ? NO_OVERLAY : UNCOVERED_WARNING;

    case 'police':
      if (!needsCoverage) return NO_OVERLAY;
      return coverage.evacuation > 0 ? NO_OVERLAY : UNCOVERED_WARNING;

    case 'health':
      if (!needsCoverage) return NO_OVERLAY;
      return coverage.medical > 0 ? NO_OVERLAY : UNCOVERED_WARNING;

    case 'education':
      if (!needsCoverage) return NO_OVERLAY;
      return coverage.preparedness > 0 ? NO_OVERLAY : UNCOVERED_WARNING;

    case 'subway':
      // Underground view overlay - keep existing behavior
      return tile.hasSubway
        ? 'rgba(245, 158, 11, 0.7)'  // Bright amber for existing subway
        : 'rgba(40, 30, 20, 0.4)';   // Dark brown tint for "underground" view

    case 'terrain_elevation': {
      if (tile.playable === false || (tile.elevation ?? -1) < 0) {
        return NON_PLAYABLE_OVERLAY;
      }
      return elevationToOverlayRgba(tile.elevation);
    }

    case 'flood_risk': {
      if (tile.playable === false || (tile.elevation ?? -1) < 0) {
        return NON_PLAYABLE_OVERLAY;
      }
      return floodRiskToOverlayRgba(tile);
    }

    case 'flood_level': {
      if (tile.playable === false || (tile.elevation ?? -1) < 0) {
        return NON_PLAYABLE_OVERLAY;
      }
      return floodLevelToOverlayRgba(tile);
    }

    case 'pump_coverage':
      return coverage.pump ? 'rgba(56, 189, 248, 0.42)' : NO_OVERLAY;

    case 'drain_coverage':
      return coverage.drain ? 'rgba(34, 211, 238, 0.38)' : NO_OVERLAY;

    case 'none':
    default:
      return NO_OVERLAY;
  }
}

/**
 * Get the overlay mode that should be shown for a given tool.
 * Returns 'none' if the tool doesn't have an associated overlay.
 */
export function getOverlayForTool(tool: string): OverlayMode {
  return TOOL_TO_OVERLAY_MAP[tool] ?? 'none';
}

/** List of all overlay modes (for iteration) */
export const OVERLAY_MODES: OverlayMode[] = [
  'none', 'power', 'water', 'fire', 'police', 'health', 'education', 'subway',
  'terrain_elevation', 'flood_risk', 'flood_level', 'pump_coverage', 'drain_coverage',
];

// ============================================================================
// Service Radius Overlay Helpers
// ============================================================================

/** Map overlay modes to their corresponding service building types */
export const OVERLAY_TO_BUILDING_TYPES: Record<OverlayMode, string[]> = {
  none: [],
  power: ['power_plant'],
  water: ['water_tower'],
  fire: ['fire_station'],
  police: ['police_station'],
  health: ['hospital'],
  education: ['school', 'university'],
  subway: ['subway_station'],
  terrain_elevation: [],
  flood_risk: [],
  flood_level: [],
  pump_coverage: ['flood_pump'],
  drain_coverage: ['drain_channel', 'flood_pump'],
};

/** Overlay circle stroke colors (light/visible colors) */
export const OVERLAY_CIRCLE_COLORS: Record<OverlayMode, string> = {
  none: 'transparent',
  power: 'rgba(251, 191, 36, 0.8)',    // Amber
  water: 'rgba(96, 165, 250, 0.8)',    // Blue
  fire: 'rgba(248, 113, 113, 0.8)',    // Light red
  police: 'rgba(147, 197, 253, 0.8)',  // Light blue
  health: 'rgba(134, 239, 172, 0.8)',  // Light green
  education: 'rgba(196, 181, 253, 0.8)', // Light purple
  subway: 'rgba(253, 224, 71, 0.8)',   // Yellow
  terrain_elevation: 'transparent',
  flood_risk: 'transparent',
  flood_level: 'transparent',
  pump_coverage: 'rgba(56, 189, 248, 0.85)',
  drain_coverage: 'rgba(34, 211, 238, 0.85)',
};

/** Building highlight glow colors */
export const OVERLAY_HIGHLIGHT_COLORS: Record<OverlayMode, string> = {
  none: 'transparent',
  power: 'rgba(251, 191, 36, 1)',      // Amber
  water: 'rgba(96, 165, 250, 1)',      // Blue  
  fire: 'rgba(239, 68, 68, 1)',        // Red
  police: 'rgba(59, 130, 246, 1)',     // Blue
  health: 'rgba(34, 197, 94, 1)',      // Green
  education: 'rgba(168, 85, 247, 1)',  // Purple
  subway: 'rgba(234, 179, 8, 1)',      // Yellow
  terrain_elevation: 'transparent',
  flood_risk: 'transparent',
  flood_level: 'transparent',
  pump_coverage: 'rgba(56, 189, 248, 1)',
  drain_coverage: 'rgba(34, 211, 238, 1)',
};

/** Overlay circle fill colors (subtle, for area visibility) */
export const OVERLAY_CIRCLE_FILL_COLORS: Record<OverlayMode, string> = {
  none: 'transparent',
  power: 'rgba(251, 191, 36, 0.12)',
  water: 'rgba(96, 165, 250, 0.12)',
  fire: 'rgba(248, 113, 113, 0.12)',
  police: 'rgba(147, 197, 253, 0.12)',
  health: 'rgba(134, 239, 172, 0.12)',
  education: 'rgba(196, 181, 253, 0.12)',
  subway: 'rgba(253, 224, 71, 0.12)',
  terrain_elevation: 'transparent',
  flood_risk: 'transparent',
  flood_level: 'transparent',
  pump_coverage: 'rgba(56, 189, 248, 0.14)',
  drain_coverage: 'rgba(34, 211, 238, 0.12)',
};
