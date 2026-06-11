/**
 * IsoCity Service Types
 */

export interface ServiceCoverage {
  /** Cakupan pos evakuasi (dulu police). */
  evacuation: number[][];
  /** Cakupan tim penyelamatan banjir (dulu fire). */
  rescue: number[][];
  /** Cakupan fasilitas medis (dulu health). */
  medical: number[][];
  /** Cakupan kesiapsiagaan (dulu education). */
  preparedness: number[][];
  /** Cakupan pompa aktif (dulu power). */
  pumpCoverage: boolean[][];
  /** Cakupan jaringan drainase (dulu water). */
  drainCoverage: boolean[][];
}
