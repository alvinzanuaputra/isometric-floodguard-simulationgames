IMPLEMENTASI FASE 3 — Overlay Terrain & Air Statis
Acuan: /agent/floodguard-plan.md §6.4 dan §10 Fase 3. Fase 1 & 2 selesai.

CATATAN PENTING: Air statis (building.type === 'water') SUDAH ter-render sejak Fase 1 
(bercak biru terlihat di game). Jadi Fase 3 fokus utama pada OVERLAY MODES baru, bukan 
membuat air muncul lagi. Jangan duplikasi kerja Fase 1.

Implementasi nyata — tulis kode. HANYA scope Fase 3. Jangan kerjakan fase lain.
Jangan baca node_modules. Prioritaskan /src. Teks UI BAHASA INDONESIA.

============================================================
SCOPE FASE 3 — yang harus dikerjakan
============================================================

1. OVERLAY MODE BARU — src/components/game/overlays.ts + types.ts
   Tambah ke OverlayMode (types.ts:530) dan OVERLAY_CONFIG (overlays.ts):
   
   a. terrain_elevation — gradasi warna kontur dari tile.elevation (0–50).
      Pakai skala warna kontinu (mis. biru-rendah → hijau → coklat-tinggi).
      Tile non-playable (elevation -1 / playable false) = netral/abu.
   
   b. flood_risk — heatmap risiko dari tier/elevation. Tile elevasi RENDAH = 
      merah (risiko tinggi), elevasi tinggi = transparan/hijau. Ini overlay paling 
      penting untuk gameplay — pemain harus bisa lihat "mana yang bakal kebanjiran".
   
   Gunakan pola overlay yang SUDAH ADA (OVERLAY_CONFIG, warna coverage) — jangan 
   bikin sistem baru. Lihat bagaimana overlay power/water lama bekerja sebagai contoh.

2. INTEGRASI TOGGLE — src/components/game/OverlayModeToggle.tsx
   - Tampilkan tombol untuk 2 mode baru
   - HAPUS/sembunyikan mode lama yang tidak relevan untuk FloodGuard: 
     power, water, subway (sesuai §6.4 plan). 
     Pertahankan: none/clear. (Mode fire/police/health BIARKAN dulu — di-rename baru 
     di Fase 5, jangan sentuh sekarang.)
   - Ikon + label Bahasa Indonesia (mis. "Elevasi", "Risiko Banjir")

3. MINIMAP — src/components/game/MiniMap.tsx
   - Ganti palet warna per tile agar mencerminkan elevation + air statis
   - Tile air = biru, elevasi rendah = warna rawan, elevasi tinggi = aman, 
     non-playable = gelap
   - Pertahankan fungsi viewport rect + klik-navigasi yang sudah ada

4. (OPSIONAL, jika perlu) Formalisasi inferensi air di mapLoader/preprocessing
   - HANYA jika ada masalah konsistensi air statis. Kalau air sudah tampil benar 
     sejak Fase 1, JANGAN sentuh — biarkan apa adanya.

============================================================
DI LUAR SCOPE FASE 3 (JANGAN kerjakan)
============================================================
- Simulasi air dinamis / waterLevel / weatherState (Fase 4)
- Overlay flood_level (butuh waterLevel runtime — itu Fase 4, BUKAN sekarang)
- Overlay pump_coverage / drain_coverage (butuh tools banjir — Fase 5)
- Rename mode fire/police/health (Fase 5)
- Tools banjir, kondisi menang/kalah (Fase 5)
- Reskin string, partikel hujan (Fase 6)

PENTING soal flood_level: §6.4 plan menyebut mode flood_level (gradient dari waterLevel), 
TAPI waterLevel belum disimulasikan sampai Fase 4. JANGAN buat flood_level sekarang — 
tidak ada datanya. Hanya terrain_elevation & flood_risk (keduanya pakai elevation/tier 
statis yang sudah ada).

============================================================
ATURAN
============================================================
- Additive only — jangan rusak rendering terrain Fase 1 atau alur menu Fase 2.
- Path IsoCity lama tetap jalan (tile elevation -1 tidak boleh error di overlay baru — 
  tangani sentinel -1 dengan warna netral).
- Pakai sistem OVERLAY_CONFIG yang ada; jangan reinvent.
- Rujuk file:line aktual. TypeScript strict, ESLint bersih, tsc --noEmit lulus.
- Di akhir: ringkas file dibuat/diubah + apa yang dicek manual (toggle 2 overlay baru, 
  lihat flood_risk menyorot dataran rendah, minimap warna baru, game lama tak rusak).