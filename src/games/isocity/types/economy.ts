/**
 * IsoCity Economy Types
 */

export interface Stats {
  population: number;
  jobs: number;
  money: number;
  income: number;
  expenses: number;
  happiness: number;
  health: number;
  education: number;
  safety: number;
  environment: number;
  demand: {
    residential: number;
    commercial: number;
    industrial: number;
  };
}

export interface BudgetCategory {
  name: string;
  funding: number;
  cost: number;
}

export interface Budget {
  emergency_response: BudgetCategory;
  flood_rescue: BudgetCategory;
  medical_response: BudgetCategory;
  preparedness_training: BudgetCategory;
  evacuation_transport: BudgetCategory;
  green_spaces: BudgetCategory;
  pump_stations: BudgetCategory;
  drain_network: BudgetCategory;
}

export interface CityEconomy {
  population: number;
  jobs: number;
  income: number;
  expenses: number;
  happiness: number;
  lastCalculated: number;
}

export interface HistoryPoint {
  year: number;
  month: number;
  population: number;
  money: number;
  happiness: number;
  /** Indeks keselamatan banjir (FloodGuard). */
  safetyIndex?: number;
  /** Rasio tergenang 0–1 (FloodGuard). */
  floodedRatio?: number;
}
