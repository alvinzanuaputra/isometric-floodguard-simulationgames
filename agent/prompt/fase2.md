IMPLEMENTASI FASE 2 — Main Menu & Map Selection
Acuan: /agent/floodguard-plan.md §7 dan §10 Fase 2. Fase 1 sudah selesai & 
terverifikasi (terrain peta jalan, createRegionGameState siap dipanggil).

Ini implementasi nyata — tulis kode. HANYA scope Fase 2. Jangan kerjakan fase lain.
Jangan baca node_modules. Prioritaskan /src. Semua teks UI BAHASA INDONESIA.

============================================================
SCOPE FASE 2 — yang harus dikerjakan
============================================================

1. KOMPONEN BARU — src/components/MapSelectionScreen.tsx
   - Tampilkan 5 kartu wilayah Surabaya (Barat, Pusat, Selatan, Timur, Utara)
   - Tiap kartu menampilkan (data dari §7.3 plan):
     * Nama wilayah (mis. "Surabaya Utara")
     * Label kesulitan + badge warna:
       Barat = 🟢 PEMULA, Pusat = 🟡 MUDAH, Selatan = 🟠 MENENGAH,
       Timur = 🔴 SULIT, Utara = ⚫ EKSTREM
     * Statistik singkat: % area rawan (tier-0), elevasi rata-rata
     * Thumbnail/preview peta wilayah
   - Tombol "Mulai" per kartu, dan tombol "Kembali" ke landing
   - Pakai komponen UI yang sudah ada (Card, Button dari src/components/ui/)
   - Konsisten dengan tema dark game yang ada
   - Untuk thumbnail: pilihan paling murah & aman — reuse heatmap PNG yang sudah 
     dihasilkan scripts/render-map-previews.mjs di Fase 1 (taruh di public/ bila perlu), 
     ATAU render mini-canvas dari *_processed.json. Pilih yang lebih sederhana; 
     jangan fetch file mentah.

2. INTEGRASI ALUR — src/app/page.tsx (sekitar :319-697, HomePage state machine)
   - Tambah state showMapSelection
   - Tombol "Permainan Baru" / "New Game" → buka MapSelectionScreen (BUKAN langsung game)
   - Pilih wilayah di MapSelectionScreen → set selectedRegion → masuk game dengan 
     terrain wilayah itu (panggil createRegionGameState(region) dari mapLoader.ts)
   - "Lanjutkan"/"Continue" (load save) tetap ada, perilaku lama tidak berubah
   - HAPUS dari UI landing (keputusan Q2 & Q3 — kode JANGAN dihapus, hanya UI):
     * Link/tombol ke IsoCoaster (/coaster)
     * Tombol Co-op (CoopModal) dan Share
   - Catatan: jika landing sebelumnya punya redirect ?room= atau tombol co-op, 
     sembunyikan tombolnya saja; route /coop/[roomCode] & /coaster biarkan tetap jalan

3. TYPES & STATE — src/games/isocity/types/game.ts
   - Pastikan FloodRegion sudah ada (dari Fase 1) — kalau belum, tambah
   - Tambah selectedRegion?: FloodRegion ke GameState (opsional, agar save lama valid)
   - SavedCityMeta: tambah selectedRegion?: FloodRegion (opsional)

4. CONTEXT WIRING — src/context/GameContext.tsx (sekitar :648-650)
   - Provider bisa menerima region awal, teruskan ke createRegionGameState
   - Karena createRegionGameState async, tangani loading state dengan benar 
     (spinner saat peta di-fetch sebelum game tampil) — jangan render game dengan 
     grid kosong

============================================================
CATATAN UTANG TEKNIS DARI FASE 1 (kerjakan di Fase 2 ini)
============================================================

UT-1 — playableTileCount:
Grid persegi N=104 banyak berisi padding non-playable (Utara hanya 22,3% playable, 
Selatan 38%). Saat menampilkan statistik di kartu wilayah, dan NANTI saat menghitung 
floodedRatio (Fase 4-5), basis hitungan HARUS jumlah tile playable (tile.playable === 
true), BUKAN 104×104 total. Di Fase 2 ini: simpan/expose playableTileCount per wilayah 
(bisa dari metadata processed file atau dihitung saat load) supaya siap dipakai Fase 4-5 
dan supaya statistik kartu akurat. Tambahkan komentar penanda di tempat floodedRatio 
akan dihitung nanti.

============================================================
DI LUAR SCOPE FASE 2 (JANGAN kerjakan)
============================================================
- Simulasi air, weatherState, floodStats (Fase 4)
- Tools banjir, rename budget/services, kondisi menang/kalah (Fase 5)
- Overlay mode baru (Fase 3)
- Reskin string "IsoCity"→"FloodGuard", localStorage key, partikel hujan (Fase 6)
- gt-next locale ke ID saja (Fase 7)
Sidebar MASIH boleh menampilkan tool lama IsoCity — itu Fase 5. Fokus Fase 2 cuma 
alur menu → pilih wilayah → game tampil dengan terrain wilayah benar.

============================================================
ATURAN
============================================================
- Path IsoCity lama tetap berfungsi: "Lanjutkan"/load save tidak boleh rusak.
- createInitialGameState sinkron lama JANGAN diubah signature-nya (sudah benar di Fase 1).
- Rujuk file:line aktual; jangan mengarang struktur.
- TypeScript strict, ESLint bersih, tsc --noEmit lulus.
- Tangani loading async peta dengan spinner — jangan flash grid kosong.
- Di akhir: ringkas file dibuat/diubah, dan apa yang harus saya cek manual 
  (terutama: alur New Game → pilih 5 wilayah → game tampil dengan terrain benar, 
  dan pastikan tombol coaster/co-op sudah hilang dari UI).