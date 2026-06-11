GELOMBANG A — Stabilitas & Koherensi Gameplay
Acuan: plan FloodGuard Coherence, agent/floodguard-plan.md §10 Fase 5–6.

HANYA scope Gelombang A. Jangan kerjakan Gelombang B/C/D.
Teks UI BAHASA INDONESIA. Guard `selectedRegion` untuk semua perubahan FloodGuard.

============================================================
SCOPE
============================================================

1. GATE LEGACY SIM — `src/lib/simulation.ts` saat `selectedRegion`:
   - Skip zone auto-spawn (grass → building)
   - Skip fire spread
   - Skip/throttle demand & happiness updates

2. GATE INSIDEN — `vehicleSystems.ts`, `CanvasIsometricGrid.tsx`, `aircraftSystems.ts`:
   - `spawnCrimeIncidents` off di FloodGuard
   - Adjacent-city dialog off
   - Pesawat komersial off; helikopter SAR tetap

3. HUD BANJIR — `TopBar.tsx`, `MobileTopBar.tsx`, `FloodProgressBar.tsx` (baru):
   - safetyIndex, % tergenang, hari hujan / target menang, bar bahaya
   - Sembunyikan demand R/C/I & happiness saat FloodGuard

4. BUG SIMULASI:
   - Retention pond 3×3 footprint di `floodSimulation.ts`
   - `canPlaceMultiTileBuilding`: cek `tile.playable !== false`
   - Flood tools: konstruksi instant (`constructionProgress: 100`)

============================================================
DI LUAR SCOPE
============================================================
- Asset visual / tint (Gelombang B)
- Overlay coverage (Gelombang B)
- Advisors reskin (Gelombang C)

============================================================
CEK MANUAL
============================================================
1. Main wilayah FloodGuard — tidak ada insiden polisi/kebakaran
2. HUD menunjukkan metrik banjir
3. Waduk 3×3 menyerap air di seluruh footprint
4. Pompa aktif segera setelah pasang
5. Path IsoCity lama (`!selectedRegion`) tidak rusak
