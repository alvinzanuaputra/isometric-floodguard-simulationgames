/**
 * Palette tool FloodGuard vs IsoCity — Fase 5 §8.1
 */

import { Tool } from '@/types/game';

/** Tool yang ditampilkan saat selectedRegion ada (mode FloodGuard). */
export const FLOODGUARD_PALETTE: Tool[] = [
  'select',
  'bulldoze',
  'road',
  'tree',
  'park',
  'park_large',
  'flood_pump',
  'levee',
  'retention_pond',
  'drain_channel',
  'evacuation_post',
];

/** Kategori sidebar FloodGuard — Bahasa Indonesia. */
export const FLOODGUARD_SIDEBAR = {
  tools: ['select', 'bulldoze', 'road', 'tree'] as Tool[],
  infra: ['flood_pump', 'levee', 'retention_pond', 'drain_channel', 'evacuation_post'] as Tool[],
  green: ['park', 'park_large'] as Tool[],
};
