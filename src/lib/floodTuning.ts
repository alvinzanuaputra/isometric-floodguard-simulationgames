/**
 * Konstanta fisika banjir — dapat diubah runtime via Dev Panel (Fase 5).
 * Nilai default disinkronkan dari floodSimulation.ts saat init.
 */

export interface FloodTuningParams {
  rainAbsorption: number;
  infiltration: number;
  gravityFlow: number;
  pumpDrain: number;
  staticOverflow: number;
  evaporation: number;
  retentionAbsorb: number;
  retentionCapacity: number;
  drainChannelMultiplier: number;
}

export const floodTuning: FloodTuningParams = {
  rainAbsorption: 0.00012,
  infiltration: 0.0018,
  gravityFlow: 0.35,
  pumpDrain: 0.006,
  staticOverflow: 0.004,
  evaporation: 0.0008,
  retentionAbsorb: 0.008,
  retentionCapacity: 0.5,
  drainChannelMultiplier: 2.5,
};

export function resetFloodTuningToDefaults(defaults: FloodTuningParams): void {
  Object.assign(floodTuning, defaults);
}
