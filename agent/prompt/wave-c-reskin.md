GELOMBANG C — Reskin & Polish UX
Acuan: plan FloodGuard Coherence §Gelombang C, floodguard-plan.md §6.5–6.6.

HANYA scope Gelombang C. Guard `selectedRegion`. UI Bahasa Indonesia.

============================================================
SCOPE
============================================================

1. `AdvisorsPanel.tsx` → saran BPBD (genangan, pompa, tanggul)
2. `StatisticsPanel.tsx` → riwayat floodedRatio, safetyIndex
3. Rename overlay: Pemadam→Penyelamatan, Polisi→Evakuasi, dll.
4. Sembunyikan Share/Co-op di `Game.tsx` saat `selectedRegion`
5. Example states 5 wilayah di `public/example-states/`
6. `useTipSystem.ts` — tips tier rendah, musim hujan

============================================================
CEK MANUAL
============================================================
1. Advisor menampilkan saran banjir, bukan kota
2. Statistik menampilkan metrik banjir saat FloodGuard
3. Tombol share/co-op tidak terlihat di mode wilayah
