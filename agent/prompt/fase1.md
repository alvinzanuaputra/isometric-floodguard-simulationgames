IMPLEMENTASI FASE 1 — Fondasi Terrain & Preprocessing
Acuan: /agent/floodguard-plan.md (sudah final & disetujui). Baca §3, §5.1, §7.5, 
§10 Fase 1, dan §11 Risiko sebelum mulai.

Ini IMPLEMENTASI nyata — tulis kode. Tapi HANYA scope Fase 1. Jangan kerjakan fase lain.
Jangan baca node_modules. Prioritaskan /src.

============================================================
KEPUTUSAN TAMBAHAN UNTUK FASE 1 (terapkan ini)
============================================================

KD-1 — GRID PERSEGI (PAD), bukan non-persegi:
Untuk menghindari pembongkaran asumsi grid persegi yang tertanam dalam di engine 
(depth sort, culling, minimap, save), SETIAP wilayah di-pad ke grid PERSEGI berukuran 
sama. Ambil dimensi maksimum dari semua wilayah hasil downsample (lihat tabel §3.2, 
maks ~103), bulatkan ke satu nilai N (mis. N=104). Semua 5 wilayah jadi N×N. 
Tile di luar area data asli wilayah = `building.type = 'empty'` dan ditandai 
NON-PLAYABLE (tidak bisa dibangun, tidak ikut hitung playableTileCount). 
Tambahkan field `tile.playable: boolean` ke Tile untuk menandai ini.

KD-2 — SKALA waterLevel: 
Putuskan satuan eksplisit sekarang supaya konsisten ke depan: `waterLevel` dan 
`elevation` PAKAI SATUAN SAMA (meter, rentang 0–50+). Bukan 0–255. Aliran gravitasi 
nanti membandingkan `elevation + waterLevel` dalam satuan yang sama. Dokumentasikan 
satuan ini sebagai komentar di definisi field. (Fase 1 belum simulasi air, tapi tipe 
field harus benar dari awal.)

KD-3 — VALIDASI VISUAL di akhir Fase 1:
Sebelum dianggap selesai, hasilkan output visual untuk verifikasi mata: render terrain 
elevasi + tile air hasil inferensi tier-0, supaya saya bisa cek apakah masuk akal 
sebagai peta Surabaya (terutama Utara yang 44% tier-0 — pastikan bukan "danau" aneh).

============================================================
SCOPE FASE 1 — yang harus dikerjakan
============================================================

1. PREPROCESSING SCRIPT — `scripts/preprocess-maps.mjs` (baru)
   - Baca 5 file public/map-data/SBY_*.json (file lokal, tidak butuh jaringan)
   - Step 1: Crop area core pakai coreOffsetX/Y, coreWidth/Height (tabel §3.2)
   - Step 2: Downsample metode RATA-RATA elevasi per blok
   - Step 3: Pad ke grid persegi N×N (per KD-1), tandai tile playable vs padding
   - Step 4: Inferensi isWater dari tier-0 interior (bukan tepi void) — §3.2 Step 3
   - Step 5: Output public/map-data/SBY_*_processed.json compact, < 500 KB/file
   - Sertakan field: per-tile [elevation, tier, isWater, playable]
   - Format compact: array flat, rekonstruksi dari index (jangan simpan x,y)
   - Script dijalankan MANUAL sekali. JANGAN tambahkan ke npm run build.
   - Tambahkan npm script opsional "preprocess-maps" di package.json (manual run saja)
   - Setelah selesai, JALANKAN script-nya, hasilkan ke-5 file processed, verifikasi 
     ukuran < 500 KB.

2. LOADER RUNTIME — `src/lib/mapLoader.ts` (baru)
   - `loadMapData(region: FloodRegion): Promise<...>` — fetch *_processed.json 
     (BUKAN file mentah; ini guard penting dari §11)
   - Rekonstruksi struktur tile: elevation, tier, isWater, playable
   - Helper untuk dipakai createInitialGameState

3. TYPES — `src/games/isocity/types/game.ts:97-108`
   - Tambah ke Tile: `elevation: number` (meter 0–50+), `waterLevel: number` 
     (meter, satuan sama dgn elevation — KD-2), `flowDirection: number` (0–4), 
     `playable: boolean` (KD-1)
   - JANGAN sentuh/repurpose landValue/crime/traffic (biarkan apa adanya — §5.1)
   - Tambah type `FloodRegion = 'Barat'|'Pusat'|'Selatan'|'Timur'|'Utara'`
   - Komentari satuan & rentang tiap field baru

4. INISIALISASI — `src/lib/simulation.ts:1168`
   - `createInitialGameState` terima parameter `region?: FloodRegion`
   - Bila region ada: panggil loadMapData, isi grid dari hasil (elevation, isWater→
     building.type='water', playable, waterLevel=0, flowDirection=0)
   - Bila tidak ada region: pertahankan perilaku lama (jangan rusak path IsoCity lama)
   - Set gridSize = N (persegi)

5. RENDER TERRAIN — `src/components/game/drawing.ts:171-208`
   - Modifikasi drawGreenBaseTile (dan/atau grey) terima parameter tier/elevation
   - Warna per tier (§6.3): tier0-1 biru gelap, 2-3 hijau kekuningan, 4-5 hijau, 
     6-7 hijau tua/coklat, 8-9 coklat/abu
   - Tile non-playable (padding): render netral/gelap atau skip

============================================================
DI LUAR SCOPE FASE 1 (JANGAN kerjakan)
============================================================
- Simulasi air / weatherState / floodStats (Fase 4)
- floodGrid.ts / sub-grid (Fase 8)
- MapSelectionScreen / main menu (Fase 2) — region boleh hardcode dulu untuk tes
- Tools banjir, rename budget/services (Fase 5)
- Reskin string, localStorage key, partikel hujan (Fase 6)
- Overlay mode baru (Fase 3)

============================================================
ATURAN
============================================================
- Jaga path IsoCity lama tetap berfungsi (createInitialGameState tanpa region).
- Rujuk file:line aktual; jangan mengarang struktur.
- TypeScript strict — tidak ada `any` yang tidak perlu.
- Di akhir: jalankan preprocessing, tunjukkan ukuran 5 file output, dan hasilkan 
  validasi visual (KD-3) — boleh berupa screenshot render, atau script yang meng-output 
  gambar PNG heatmap elevasi+air per wilayah ke disk supaya saya bisa lihat.
- Setelah selesai, ringkas: file apa dibuat/diubah, dan apa yang harus saya cek manual.