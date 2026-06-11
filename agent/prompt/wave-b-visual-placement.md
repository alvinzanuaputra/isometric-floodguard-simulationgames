GELOMBANG B — Visual & Penempatan Bangunan
Acuan: plan FloodGuard Coherence §Gelombang B, floodguard-plan.md §Q10.

HANYA scope Gelombang B. Guard `selectedRegion`. UI Bahasa Indonesia.

============================================================
SCOPE
============================================================

1. ASSET BANGUNAN PLAYER:
   - Opsi A: sprite sheet + canvas tint (`renderConfig.ts`, `drawBuilding`)
   - Opsi B: PNG individual di `public/assets/buildings/` + `floodBuildingAssets.ts`
   - Jangan panggil `loadSpriteImage` di render loop

2. IDENTITAS VISUAL:
   - `levee`: bukan sprite `rail` — procedural/tint barrier
   - `drain_channel`: procedural biru, kontras jalan
   - Skala multi-tile 2×2 / 3×3

3. OVERLAY COVERAGE — `overlays.ts`, `OverlayModeToggle.tsx`:
   - `pump_coverage`, `drain_coverage`
   - Preview radius hover tool + select bangunan player

4. PLACEMENT UX — `CanvasIsometricGrid.tsx`:
   - Tooltip peringatan tile rawan / non-playable
   - Highlight validitas footprint hijau/merah

5. MINIMAP — `MiniMap.tsx`: warna dari `waterLevel` runtime saat FloodGuard

============================================================
CEK MANUAL
============================================================
1. Pasang pompa/tanggul/waduk — sprite bersih, ukuran pas
2. Overlay pompa menunjukkan radius
3. Tooltip placement informatif
4. Minimap menunjukkan genangan runtime
