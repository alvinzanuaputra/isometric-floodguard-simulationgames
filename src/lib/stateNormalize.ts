/**
 * Normalisasi save lama IsoCity → field ServiceCoverage/Budget baru.
 */

import { Budget, ServiceCoverage } from '@/types/game';

export function normalizeServiceCoverage(raw: ServiceCoverage | Record<string, unknown>): ServiceCoverage {
  const s = raw as Record<string, unknown>;
  if ('pumpCoverage' in s && s.pumpCoverage) {
    return raw as ServiceCoverage;
  }
  return {
    evacuation: (s.police ?? s.evacuation) as number[][],
    rescue: (s.fire ?? s.rescue) as number[][],
    medical: (s.health ?? s.medical) as number[][],
    preparedness: (s.education ?? s.preparedness) as number[][],
    pumpCoverage: (s.power ?? s.pumpCoverage) as boolean[][],
    drainCoverage: (s.water ?? s.drainCoverage) as boolean[][],
  };
}

export function normalizeBudget(raw: Budget | Record<string, unknown>): Budget {
  const b = raw as Record<string, unknown>;
  if ('emergency_response' in b && b.emergency_response) {
    return raw as Budget;
  }
  const pick = (oldKey: string, newKey: keyof Budget, defaultName: string) => {
    const cat = b[oldKey] as Budget[keyof Budget] | undefined;
    return cat ?? { name: defaultName, funding: 100, cost: 0 };
  };
  return {
    emergency_response: pick('police', 'emergency_response', 'Tanggap Darurat'),
    flood_rescue: pick('fire', 'flood_rescue', 'Penyelamatan Banjir'),
    medical_response: pick('health', 'medical_response', 'Medis Darurat'),
    preparedness_training: pick('education', 'preparedness_training', 'Kesiapsiagaan'),
    evacuation_transport: pick('transportation', 'evacuation_transport', 'Transport Evakuasi'),
    green_spaces: pick('parks', 'green_spaces', 'Ruang Hijau'),
    pump_stations: pick('power', 'pump_stations', 'Stasiun Pompa'),
    drain_network: pick('water', 'drain_network', 'Jaringan Drainase'),
  };
}
