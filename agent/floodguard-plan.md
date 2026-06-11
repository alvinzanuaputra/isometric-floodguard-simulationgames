# FloodGuard Surabaya — Rencana Transformasi Detail (Revisi)

> **Status:** Rencana final — **belum ada kode implementasi.**
> Semua rujukan kode mengacu ke `agent/README.md` dan `agent/map-data-analysis.md`.
> Keputusan desain final tercatat di §Keputusan Final.

---

## Keputusan Final

Semua pertanyaan terbuka sudah terjawab. Ringkasan keputusan yang mengikat seluruh rencana:

| # | Topik | Keputusan |
|---|---|---|
| Q1 | Resolusi grid | Downsample **per-wilayah** mengikuti aspect ratio asli; referensi ~100 tile lebar, **bukan** dipaksa ke ukuran seragam |
| Q2 | IsoCoaster | Kode & route `/coaster` **tetap jalan**; **sembunyikan** dari UI (hapus link di landing) |
| Q3 | Co-op multiplayer | **Nonaktifkan dari UI** (sembunyikan tombol co-op/share); kode Supabase **tidak dihapus** |
| Q4 | Kondisi menang | Bertahan **N hari** event hujan; threshold % tergenang **berbeda per difficulty**; wilayah rawan = threshold longgar + durasi lebih lama |
| Q5 | Sub-grid air | **Tunda** keluar MVP; Fase 4 = air dinamis **per-tile** saja; sub-grid 4×4 → **Fase 8** terpisah |
| Q6 | Preprocessing | Jalankan **offline sekali manual**; **commit** `*_processed.json` ke repo; **jangan** masuk `npm run build` / Vercel |
| Q7 | Trigger hujan | Kalender musim Surabaya (Nov–Apr) + keacakan; pakai `year/month/day` (`game.ts:155-157`) |
| Q8 | Bahasa | **Bahasa Indonesia saja**; string baru ditulis langsung dalam ID |
| Q9 | Field data | **Tambah field baru** `elevation`, `waterLevel`, `flowDirection` di `Tile` (`game.ts:97-108`); `crime`/`traffic`/`landValue` **dibiarkan apa adanya** |
| Q10 | Asset | MVP = **reuse sprite + tinting canvas**; sprite sheet baru = pekerjaan terpisah di akhir |
| i18n | gt-next | **Tetap terpasang** (`GTProvider`, `withGTConfig`, pola `msg()`); locale disempitkan ke `["id"]`; `LanguageSelector` disembunyikan |

---

## 1. Ringkasan Transformasi

### Dari city-builder → flood management simulation

| Aspek | IsoCity (sekarang) | FloodGuard Surabaya (target) |
|---|---|---|
| **Tujuan player** | Tumbuhkan kota, raih populasi/kebahagiaan | Lindungi wilayah Surabaya dari banjir |
| **Sumber ketegangan** | Demand R/C/I, anggaran, polusi | Curah hujan musiman, ketinggian air, kapasitas drainase |
| **Kondisi menang** | Tidak ada — sandbox | Bertahan N hari event hujan tanpa melampaui threshold tergenang |
| **Kondisi kalah** | Tidak ada — sandbox | Area tergenang melebihi threshold wilayah terlalu lama |
| **Peta** | Generate acak `createInitialGameState` (`simulation.ts:1168`) | 5 peta mandiri dari `public/map-data/SBY_*.json` |
| **Terrain** | Flat (tidak ada elevasi) | Heightmap nyata via `Tile.elevation` (0–50), `tier` 0–9 |
| **Ancaman** | Kebakaran, kejahatan (visual saja) | Banjir dinamis per-tile — menyebar mengikuti gravitasi elevasi |
| **Bangunan utama** | Zona RCI + utilitas kota | Infrastruktur mitigasi banjir (pompa, tanggul, waduk) |
| **Metrik keberhasilan** | Populasi, happiness, uang | % wilayah aman (`safetyIndex`), anggaran darurat |
| **Bahasa** | 9 locale via gt-next | Bahasa Indonesia saja |

**Yang DIPERTAHANKAN dari IsoCity:**
- Seluruh engine canvas isometrik 6 layer (`CanvasIsometricGrid.tsx:3053-3090`)
- Sistem grid `Tile[][]`, context `GameContext`, tick loop (`GameContext.tsx:797-830`)
- Radix UI / shadcn komponen
- Infrastruktur gt-next (`GTProvider`, `withGTConfig`, pola `msg()`) — locale disempitkan ke ID
- Save/load lz-string + Web Worker (`saveWorker.ts`, `saveWorkerManager.ts`)
- Kode Supabase multiplayer (nonaktif di UI, bisa dihidupkan lagi)
- Route `/coaster` + kode coaster (nonaktif di UI)
- Aset sprite — reuse + tinting untuk MVP

**Yang DIBUANG/DIGANTI dari gameplay:**
- Mekanik tumbuh bangunan otonom (`evolveBuilding`, `simulation.ts:1518`)
- Zona R/C/I dan demand system
- Sistem kereta, pesawat komersial, truk cargo (dikurangi drastis)
- Tombol co-op/share di UI
- Link IsoCoaster di landing page
- `LanguageSelector` di UI

---

## 2. Pemetaan Mekanik: IsoCity → FloodGuard

### 2.1 Mekanik inti

| Mekanik IsoCity | File/Referensi | Padanan FloodGuard | Perubahan |
|---|---|---|---|
| Bangun zona R/C/I | `Tool` di `game.ts:14-15` | Bangun infrastruktur banjir | Ganti tool, pertahankan `placeAtTile` |
| Tumbuh bangunan otonom | `evolveBuilding` `simulation.ts:1518` | **Dihapus** | Bangunan ditempatkan manual |
| Anggaran kota | `Budget` `economy.ts:29-38` | Anggaran mitigasi bencana | Rename kategori (lihat §5) |
| Pajak warga | `taxRate`, `effectiveTaxRate` `game.ts:162-163` | Dana darurat pemerintah | Rename semantik, logika sama |
| Kepuasan warga (`happiness`) | `Stats.happiness` `economy.ts:5` | Keselamatan warga (`safetyIndex`) | Rename + kalkulasi dari % tergenang |
| `Tile.landValue` | `game.ts:102` | **Tidak dipakai** — dibiarkan apa adanya | Field legacy, tidak disentuh |
| `Tile.crime` | `game.ts:104` — diinisialisasi 0, tidak disimulasikan | **Tidak dipakai** — dibiarkan apa adanya | Field legacy |
| `Tile.traffic` | `game.ts:105` — diinisialisasi 0, tidak disimulasikan | **Tidak dipakai** — dibiarkan apa adanya | Field legacy |
| **`Tile.elevation`** (baru) | — | Ketinggian tile (0–50) dari peta | **Field baru** di `game.ts:97-108` |
| **`Tile.waterLevel`** (baru) | — | Volume genangan air per tile (0–255) | **Field baru**, disimulasikan tiap tick |
| **`Tile.flowDirection`** (baru) | — | Arah aliran dominan (0=none, 1=N, 2=E, 3=S, 4=W) | **Field baru** |
| `Tile.pollution` | `game.ts:103` | Kontaminasi air banjir (opsional) | Bisa dipakai ulang semantik, atau dibiarkan |
| Power/water coverage | `ServiceCoverage` `services.ts:5` | Coverage pompa & drainase | Rename field (lihat §5.5) |
| Insiden kebakaran | `incidentData.ts`, `onFire` `buildings.ts:44` | Insiden genangan kritis | Adaptasi mekanik alert |
| Siklus siang/malam + kalender | `year/month/day` `game.ts:155-157`, `lightingSystem.ts` | Musim hujan Surabaya (Nov–Apr) | Kalender mengontrol frekuensi hujan |
| Demand R/C/I | `Stats.demand` `economy.ts:17-19` | **Dihapus** | Ganti `rainfall_forecast` |
| Overlay mode | `overlays.ts`, `OverlayModeToggle.tsx` | Overlay banjir, risiko, elevasi | Tambah mode baru |
| MiniMap | `MiniMap.tsx` | Warna tile dari `elevation` + `waterLevel` | Ganti palet |
| Kendaraan | `vehicleSystems.ts`, `trainSystem.ts` | Truk evakuasi & perahu darurat saja | Nonaktifkan kereta, kurangi mobil |
| Pesawat | `aircraftSystems.ts` | Helikopter SAR | Reuse helikopter procedural |
| Pejalan kaki | `pedestrianSystem.ts` | Warga mengungsi | Reuse + modifikasi state machine |
| Kapal | `boatSystem.ts` | Perahu evakuasi | Reuse + tinting |
| Advisor | `AdvisorsPanel.tsx` | Panel BPBD / Koordinator Darurat | Ganti konten |
| Co-op multiplayer | `CoopModal.tsx`, `ShareModal.tsx` | **Disembunyikan dari UI** | Kode Supabase tetap ada |
| IsoCoaster link | `page.tsx` landing | **Disembunyikan dari UI** | Route `/coaster` tetap jalan |

### 2.2 Kondisi menang/kalah (struktur)

Struktur kondisi — angka konkret di-tuning saat playtesting:

- **Menang:** Bertahan **N hari** (game day) selama periode event hujan tanpa `floodedRatio` melampaui threshold wilayah
- **Kalah:** `floodedRatio` ≥ threshold wilayah selama `DANGER_PERSISTENCE_TICKS` tick berturut-turut
- **Metrik utama:** `safetyIndex` (0–100) menggantikan `happiness`

Detail threshold per difficulty: lihat §4.6.

---

## 3. Pipeline Data Peta (JSON → Grid Game)

### 3.1 Strategi umum

File mentah terlalu besar untuk dimuat di runtime browser (16–27 MB per file, total ~102 MB — `map-data-analysis.md §1`). Preprocessing **offline sekali**, hasil di-commit ke repo sebagai aset ringan.

**Penting:** File mentah `SBY_*.json` (102 MB) **tidak boleh** masuk pipeline `npm run build` / Vercel. Hanya `*_processed.json` yang di-fetch runtime.

### 3.2 Langkah pipeline (offline, manual sekali)

```
SBY_*.json (raw, 16-27 MB) — TIDAK di-commit ke build pipeline
    ↓ Step 1: Crop area core (buang padding)
    ↓ Step 2: Downsample per-wilayah (aspect ratio asli)
    ↓ Step 3: Inferensi tile type dari elevasi/tier
    ↓ Step 4: Serialize ke format ringkas
    ↓ Step 5: Commit hasil ke repo
public/map-data/SBY_*_processed.json (target: < 500 KB per file) — DI-COMMIT
```

**Step 1 — Crop area core:**

Gunakan metadata `coreOffsetX/Y`, `coreWidth/Height` (`map-data-analysis.md §1`).

| File | Grid penuh | Core setelah crop |
|---|---|---|
| SBY_Barat | 600×600 | 550×500 |
| SBY_Pusat | 600×500 | 500×400 |
| SBY_Selatan | 1025×500 | 1025×450 |
| SBY_Timur | 575×600 | 525×500 |
| SBY_Utara | 1025×475 | 1025×425 |

**Step 2 — Downsample per-wilayah (aspect ratio asli):**

Metode: **rata-rata elevasi per blok** (bukan nearest-neighbor).

Prinsip: setiap wilayah punya `gridSize` sendiri yang mempertahankan aspect ratio core. Referensi lebar ~100 tile; wilayah lebar (Selatan/Utara, core 1025) proporsional lebih lebar.

| File | Core (W×H) | Rasio aspect | Target grid (W×H) | Faktor DS |
|---|---|---|---|---|
| SBY_Barat | 550×500 | 1,10 : 1 | **100×91** | ~5,5× |
| SBY_Pusat | 500×400 | 1,25 : 1 | **100×80** | 5× |
| SBY_Selatan | 1025×450 | 2,28 : 1 | **103×45** | ~10× |
| SBY_Timur | 525×500 | 1,05 : 1 | **100×95** | ~5,25× |
| SBY_Utara | 1025×425 | 2,41 : 1 | **103×42** | ~10× |

`GameState.gridSize` = nilai W dari tabel di atas (grid tidak persegi — sesuai wilayah).

**Step 3 — Inferensi `building.type` dari elevasi/tier:**

| Kondisi | Building type | Logika |
|---|---|---|
| `tier == 0` AND interior (bukan tepi void) | `water` | Badan air statis — sungai/rawa/kali |
| `tier == 0` AND tepi grid (void) | `empty` | Batas non-playable / laut |
| `tier >= 1` | `grass` | Default — player bisa membangun |
| Cluster `water` besar (> 10 tile kontigu) | `water` | Dikonfirmasi sebagai sungai |

**Step 4 — Format output ringkas:**

Array flat `[elevation, tier, isWater]` per tile. Target < 500 KB per wilayah. Tidak menyimpan `x` & `y` — direkonstruksi dari indeks column-major (`index = x * height + y`, `map-data-analysis.md §1`).

**Step 5 — Script preprocessing & commit:**

- Buat `scripts/preprocess-maps.mjs` (sejajar dengan `scripts/compress-images.mjs`)
- Dijalankan **sekali secara manual** oleh developer: `node scripts/preprocess-maps.mjs`
- Output `SBY_*_processed.json` **di-commit ke repo**
- **Tidak** ditambahkan ke `npm run build` (`package.json` build script tetap `compress-images && next build`)
- File mentah `SBY_*.json` boleh tetap di repo untuk regenerasi, tapi **tidak pernah di-fetch runtime**

### 3.3 Loader runtime

Fungsi baru `loadMapData(region: string)` di `src/lib/mapLoader.ts` (file baru):
- Fetch `public/map-data/SBY_{region}_processed.json` (bukan file mentah)
- Rekonstruksi `Tile[][]` dengan:
  - `tile.elevation` ← nilai elevasi dari peta
  - `tile.waterLevel = 0` (inisialisasi)
  - `tile.flowDirection = 0` (inisialisasi)
  - `isWater → building.type = 'water'`, else `grass`
- Set `gridSize` sesuai dimensi processed file
- Dipanggil dari `createInitialGameState` (`simulation.ts:1168`) saat user memilih wilayah

---

## 4. Sistem Air & Simulasi Banjir (Desain Inti)

### 4.1 Dua jenis air

**a) Air statis (sungai/kali/rawa)**
- Ditentukan saat load dari inferensi tier-0 interior (`map-data-analysis.md §3`)
- `building.type = 'water'` — mekanisme render sudah ada (`CanvasIsometricGrid.tsx` layer `canvasRef`)
- Tidak bergerak; menjadi sumber banjir saat curah hujan tinggi

**b) Genangan banjir dinamis (MVP: per-tile)**
- Disimulasikan per tick di `simulateTick` (`simulation.ts:2152`)
- Disimpan di **`Tile.waterLevel`** (field baru, `game.ts:97-108`)
- Arah aliran di **`Tile.flowDirection`** (field baru)
- Gravitasi mengacu **`Tile.elevation`** (field baru) — bukan `landValue`
- Air mengisi **seluruh tile** pada MVP (sub-grid ditunda ke Fase 8)

### 4.2 Sub-grid air — DITUNDA (bukan MVP)

> **Keputusan Q5:** Sub-grid 4×4 **tidak** masuk MVP. Fisika air per-tile harus solid dulu sebelum sub-grid ditambahkan.

Rencana masa depan (Fase 8):
- Setiap tile (64×38.4 px, `types.ts:6-9`) dipecah 4×4 sub-cell
- `FloodGrid` sebagai `Float32Array` terpisah di ref `GameContext` (`GameContext.tsx:713-715`)
- Memungkinkan air merembes di tepi jalan tanpa mengisi tile penuh

**MVP tidak memerlukan `src/lib/floodGrid.ts`.** Semua data air di `Tile.waterLevel`.

### 4.3 Algoritma aliran air per-tile (MVP)

Pendekatan: **Cellular Automaton sederhana** — O(W×H) per tick.

Per `simulateTick` (`simulation.ts:2152`), tambahkan fase `simulateFloodTick(grid, rainfallRate)`:

**Langkah tiap tick:**

1. **Input hujan:** `tile.waterLevel += rainfallRate * rainAbsorptionFactor` untuk setiap tile darat
2. **Input badan air statis:** tile `building.type === 'water'` bocorkan air ke tetangga darat saat `rainfallRate > 0`
3. **Aliran gravitasi:** hitung `totalHeight = tile.elevation + tile.waterLevel`; transfer ke tetangga 4-arah dengan `totalHeight` lebih rendah, proporsional selisih
4. **Update `flowDirection`:** arah ke tetangga yang menerima transfer terbesar
5. **Drain/pompa:** tile dalam `pumpCoverage` kurangi `waterLevel` per kapasitas pompa
6. **Tanggul (`levee`):** tile tanggul memblokir transfer air melintasi
7. **Penguapan:** `waterLevel *= 0.98` per tick saat `rainfallRate == 0`

**Performa:** O(W×H). Grid terbesar Selatan 103×45 = 4.635 tile — trivial. Grid terkecil pun < 10.000 tile.

### 4.4 Curah hujan — kalender musim Surabaya + keacakan

Ditambahkan ke `GameState` sebagai `weatherState`. Memanfaatkan field waktu yang sudah ada: `year`, `month`, `day` (`game.ts:155-157`).

**Musim hujan Surabaya:** November–April (`month` 11, 12, 1, 2, 3, 4)
**Musim kemarau:** Mei–Oktober (`month` 5–10)

```
weatherState: {
  rainfallRate: number,        // 0–100, intensitas saat ini
  currentEvent: WeatherEvent,  // 'cerah' | 'gerimis' | 'hujan' | 'badai'
  forecastHours: number[],     // prakiraan 6 jam ke depan (untuk UI)
  durationTicks: number,         // durasi event berjalan
  isRainySeason: boolean        // derived dari month
}
```

**Logika di `simulation.ts`:**

- Setiap `weatherChangeTicks` (mis. 30 tick = 1 game day, `simulation.ts:2437-2454`):
  - Hitung `isRainySeason` dari `state.month`
  - **Musim hujan:** probabilitas event hujan 60–80%; intensitas dasar lebih tinggi
  - **Musim kemarau:** probabilitas 10–20%; intensitas rendah
  - **Keacakan:** roll random menentukan event spesifik — tidak bisa dihafal sempurna
  - **Difficulty modifier:** wilayah rawan (Utara/Timur) dapat intensitas lebih tinggi dalam musim hujan
  - Event ekstrem (`badai`) dipicu `disastersEnabled` (`game.ts:172`) + musim hujan

### 4.5 Infrastruktur drainase (mekanik player)

Player menempatkan tool banjir → coverage dihitung `calculateServiceCoverage` (`simulation.ts:1255`):

| Bangunan | Coverage | Efek simulasi |
|---|---|---|
| Pompa air (`flood_pump`) | `pumpCoverage: boolean[][]` | Drain `waterLevel` dalam radius per tick |
| Tanggul (`levee`) | — | Blokir aliran air melintasi tile |
| Waduk (`retention_pond`) | `retentionCoverage: boolean[][]` | Serap kelebihan `waterLevel` dari sekitar |
| Saluran (`drain_channel`) | — | Percepat drain, perkuat `flowDirection` |
| Pos evakuasi (`evacuation_post`) | `evacuationCoverage: number[][]` | Metrik keselamatan warga |

### 4.6 Kondisi menang/kalah — struktur per difficulty

Dihitung di `calculateStats` (`simulation.ts:1757`):

```
floodedTileCount = count(tile where tile.waterLevel > FLOOD_THRESHOLD)
floodedRatio     = floodedTileCount / playableTileCount
safetyIndex      = 100 - (floodedRatio * 100) - (criticalInfraFlooded * penalty)
```

**Struktur threshold & durasi per wilayah** (angka di-tuning belakangan):

| Wilayah | Label | Threshold tergenang | Hari bertahan (N) | Catatan |
|---|---|---|---|---|
| SBY Barat | 🟢 PEMULA | Ketat (~20%) | Pendek (~5 hari hujan) | Elevasi tinggi, sedikit tier-0 |
| SBY Pusat | 🟡 MUDAH | Ketat (~25%) | Sedang (~7 hari) | Kota pusat, manageable |
| SBY Selatan | 🟠 MENENGAH | Sedang (~30%) | Sedang (~10 hari) | 16% tier-0 |
| SBY Timur | 🔴 SULIT | Longgar (~40%) | Panjang (~14 hari) | 29% tier-0, elevasi rendah |
| SBY Utara | ⚫ EKSTREM | Longgar (~45%) | Panjang (~18 hari) | 44% tier-0, paling rawan |

**Logika:**
- Wilayah **lebih rawan** (Utara/Timur) = threshold **lebih longgar** (boleh lebih banyak genangan) tetapi harus **bertahan lebih lama** (N lebih besar) — mencerminkan tantangan geografis nyata
- Wilayah **mudah** (Barat/Pusat) = threshold **ketat** + durasi **pendek** — reward pemula
- **Menang:** selesaikan N hari event hujan tanpa `floodedRatio` ≥ threshold
- **Kalah:** `floodedRatio` ≥ threshold selama `DANGER_PERSISTENCE_TICKS` tick berturut-turut

### 4.7 Beban performa & throttle

Simulasi banjir per-tile di `simulateTick` — interval sudah ada (`GameContext.tsx:797-830`):
- Speed 1 = 500 ms desktop / 750 ms mobile
- Fase banjir O(W×H) ≤ 10.000 tile → dapat disisipkan tanpa throttle terpisah
- React `setState` tetap di-throttle 500 ms (`GameContext.tsx:818-828`)
- Render `floodCanvasRef` adalah bottleneck utama (lihat §6.2, §11)

---

## 5. Perubahan Model Data (Types)

### 5.1 `src/games/isocity/types/game.ts` — `Tile`

**Field baru ditambahkan** (`game.ts:97-108`):

| Field baru | Tipe | Rentang | Sumber |
|---|---|---|---|
| `elevation` | `number` | 0–50 | `SBY_*.json` via preprocessing |
| `waterLevel` | `number` | 0–255 | Simulasi banjir per tick |
| `flowDirection` | `number` | 0–4 | Simulasi aliran (0=none, 1=N, 2=E, 3=S, 4=W) |

**Field lama — dibiarkan apa adanya, tidak direpurpose:**

| Field | Status |
|---|---|
| `landValue` | Tetap ada, tidak diisi dari peta, tidak dipakai simulasi banjir |
| `crime` | Tetap ada, tidak disimulasikan |
| `traffic` | Tetap ada, tidak disimulasikan |
| `pollution` | Tetap ada; opsional dipakai untuk kontaminasi air nanti |

**Field `GameState` yang diubah** (`game.ts:150-176`):

| Perubahan | Field |
|---|---|
| Tambah | `weatherState: WeatherState` |
| Tambah | `selectedRegion: FloodRegion` |
| Tambah | `floodStats: FloodStats` |
| Ganti | `stats.demand` → hapus, ganti `rainfall_forecast` |
| Ganti | `stats.happiness` → `stats.safetyIndex` |
| Pertahankan | `year`, `month`, `day`, `hour`, `tick`, `speed`, `disastersEnabled` |
| Pertahankan | `stats.money`, `budget`, `services` (rename kategori) |

### 5.2 Type baru

**`WeatherState`:**
```
{ rainfallRate, currentEvent, forecastHours[], durationTicks, isRainySeason }
```

**`FloodStats`:**
```
{ floodedTileCount, floodedRatio, safetyIndex, dangerPersistenceTicks,
  maxWaterLevelTile, totalRainfallThisGame, daysSurvived, winTargetDays }
```

**`FloodRegion`:**
```
type FloodRegion = 'Barat' | 'Pusat' | 'Selatan' | 'Timur' | 'Utara'
```

### 5.3–5.5 Buildings, Economy, Services

(Sama seperti rencana sebelumnya — BuildingType baru: `flood_pump`, `levee`, `retention_pond`, `drain_channel`, `evacuation_post`. Budget & ServiceCoverage direname sesuai §5 di revisi sebelumnya.)

### 5.6 Kompatibilitas re-export

`src/types/game.ts` (`game.ts:16-17`) re-export via `@/games/isocity/types` — **tidak perlu diubah**.

Save lama IsoCity tidak dimigrasi — key prefix berganti ke `floodguard-*`.

---

## 6. Perubahan Rendering (Canvas)

### 6.1 Layer canvas

Engine 6 layer (`CanvasIsometricGrid.tsx:3053-3090`) + **1 layer baru**:

```
canvasRef (terrain + air statis)     z-index: 0
floodCanvasRef (genangan dinamis)    z-index: 1  ← BARU (MVP: per-tile)
hoverCanvasRef                       z-index: 2
carsCanvasRef (evakuasi)             z-index: 3
buildingsCanvasRef (infrastruktur)   z-index: 4
airCanvasRef (hujan, helikopter)     z-index: 5
lightingCanvasRef (siang/malam)      z-index: 6
```

### 6.2 Render genangan dinamis — per-tile (MVP)

Dalam loop RAF animasi (`CanvasIsometricGrid.tsx:2380-2517`):

- Loop tile yang `waterLevel > threshold` (mis. > 5)
- Posisi via `gridToScreen` (`utils.ts:405`)
- Gambar ellipse isometrik semi-transparan biru:
  - `alpha = waterLevel / 255`
  - Ukuran penuh tile (MVP — tidak ada sub-cell)
- LOD: zoom < 0.5 → skip tile dengan `waterLevel` rendah
- `ChunkRenderer` (`performanceUtils.ts`) untuk batch render

> Sub-grid render (4×4 sub-ellipse per tile) ditunda ke **Fase 8**.

### 6.3 Terrain berbasis elevasi

Modifikasi `drawing.ts:drawGreenBaseTile` — parameter `tier`/`elevation`:
- tier 0–1: biru gelap (air/rendah)
- tier 2–3: hijau kekuningan (rawan)
- tier 4–5: hijau (normal)
- tier 6–7: hijau tua / coklat (aman)
- tier 8–9: coklat / abu (tinggi)

### 6.4 Overlay mode baru

Tambah ke `OVERLAY_CONFIG` (`overlays.ts`) dan `OverlayMode` (`types.ts:530`):

| Mode | Visualisasi |
|---|---|
| `flood_level` | Gradient biru dari `waterLevel` |
| `flood_risk` | Heatmap merah dari `tier` 0–2 |
| `pump_coverage` | Lingkaran coverage pompa |
| `drain_coverage` | Lingkaran coverage drainase |
| `terrain_elevation` | Gradasi kontur dari `elevation` |

### 6.5–6.6 Efek cuaca & partikel hujan

- Partikel hujan procedural di `airCanvasRef` saat `rainfallRate > 0` (`effectsSystems.ts`)
- Kegelapan tambahan dari `rainfallRate` di `lightingCanvasRef` (`lightingSystem.ts:20`)
- Cap 500 partikel desktop / 100 mobile

---

## 7. Main Menu & Map Selection (UI Baru)

### 7.1 Alur baru

```
Buka / (page.tsx:319-697)
    ↓
Landing FloodGuard (tanpa link coaster, tanpa tombol co-op)
    ↓ "Permainan Baru"
MapSelectionScreen — 5 kartu wilayah + difficulty
    ↓ "Mulai"
GameProvider(startFresh=true, selectedRegion) → loadMapData(region)
    ↓
Game.tsx
```

### 7.2 Komponen: `MapSelectionScreen.tsx` (baru)

- Grid 5 kartu wilayah
- Tiap kartu: nama, label difficulty, badge warna, % tier-0, elevasi rata-rata, thumbnail heatmap
- Tombol "Mulai" / "Kembali"
- Semua teks **Bahasa Indonesia**

### 7.3 Tingkat kesulitan per wilayah

| Wilayah | % tier-0 | Elevasi avg | Label |
|---|---|---|---|
| SBY Utara | 44,0% | 6,9 m | ⚫ EKSTREM |
| SBY Timur | 29,2% | 3,8 m | 🔴 SULIT |
| SBY Selatan | 15,9% | 8,7 m | 🟠 MENENGAH |
| SBY Pusat | 2,2% | 9,1 m | 🟡 MUDAH |
| SBY Barat | 1,1% | 13,2 m | 🟢 PEMULA |

### 7.4 Integrasi `page.tsx`

Perubahan di `page.tsx:319-697`:
- Tambah state `showMapSelection`
- **Hapus** link/tombol IsoCoaster dari landing
- **Hapus/sembunyikan** tombol Co-op (`CoopModal`) dan Share dari landing
- "Permainan Baru" → `MapSelectionScreen`
- "Lanjutkan" (load save) tetap ada

### 7.5 Inisialisasi `GameState`

`createInitialGameState` (`simulation.ts:1168`) terima `region`:
- `loadMapData(region)` → `Tile[][]`
- `tile.elevation` ← elevasi peta
- `tile.waterLevel = 0`, `tile.flowDirection = 0`
- `building.type = 'water'` untuk tile inferensi air
- `gridSize` = dimensi per-wilayah (lihat §3.2)

### 7.6 Saved Games

`SavedCityMeta` (`game.ts:178`) — tambah `selectedRegion?: FloodRegion`. Key prefix `floodguard-*` (`GameContext.tsx:40-45`).

---

## 8. Tools & Bangunan Baru

### 8.1 Tools dinonaktifkan dari palette

Zona R/C/I, subway, rel, stadium, space_program, mall, factory_*, apartment_*, office_*, shop_*, house_*, mansion — tetap di type (`game.ts:11-26`), tidak muncul di Sidebar.

### 8.2 Tools dipertahankan & direname

`select`, `bulldoze`, `road`, `bridge`, `tree`, `park`, `park_large`, `hospital`, `school`, `airport`

Rename: `fire_station`→`rescue_station`, `police_station`→`emergency_post`, `power_plant`→`flood_pump`, `water_tower`→`drain_hub`, `museum`→`coordination_center`

### 8.3 Tools baru

`levee`, `retention_pond`, `drain_channel`, `evacuation_post`, `rain_gauge`

### 8.4 Asset MVP — reuse + tinting (bukan sprite baru)

**Keputusan Q10:** MVP memakai sprite lama dengan tinting warna di canvas. Sprite sheet baru = pekerjaan terpisah (Fase 9).

| Entitas | Strategi MVP | Warna tint |
|---|---|---|
| Pompa banjir | Reuse `power_plant` / sheet `services` | Biru |
| Tanggul | Reuse `rail` sprite | Abu-abu |
| Waduk | Reuse `park_large` | Biru tua |
| Saluran drainase | Reuse `road` procedural | Biru muda |
| Pos evakuasi | Reuse `police_station` | Oranye |
| Perahu evakuasi | Reuse `boatSystem.ts` | Merah-putih |
| Helikopter SAR | Reuse `drawHelicopters` (`drawAircraft.ts:603`) | Oranye |
| Truk BPBD | Reuse car procedural (`vehicleSystems.ts`) | Kuning |
| Partikel hujan | Baru — procedural (`effectsSystems.ts`) | Abu transparan |
| Genangan air | Baru — ellipse biru di `floodCanvasRef` | Biru semi-transparan |

Tinting via `ctx.globalCompositeOperation` + `fillStyle` overlay di canvas, atau `ctx.filter` — tanpa modifikasi file sprite.

---

## 9. Reskin & Penamaan

### 9.1 String & metadata

| Lokasi | Lama | Baru |
|---|---|---|
| `layout.tsx:25` | `'ISOCITY — Metropolis Builder'` | `'FloodGuard Surabaya'` |
| `layout.tsx:33` | `'IsoCity'` | `'FloodGuard Surabaya'` |
| `layout.tsx:23` | `https://iso-city.com` | `https://floodguard-surabaya.vercel.app` |
| `Sidebar.tsx:570` | `'ISOCITY'` | `'FLOODGUARD'` |
| `GameContext.tsx:650,1130` | `'IsoCity'` | `'Surabaya'` |
| `page.tsx` landing | Link coaster, tombol co-op | **Dihapus dari UI** |
| `LanguageSelector.tsx` | Tampil di landing/TopBar | **Disembunyikan** |
| Semua label UI baru | — | **Bahasa Indonesia langsung** (bukan via gt terjemahan multi-bahasa) |

### 9.2 i18n — gt-next tetap terpasang, locale ID saja

- `gt.config.json`: `locales: ["id"]`, `defaultLocale: "id"`
- `GTProvider` + `withGTConfig` + pola `msg()` **tetap dipakai** — infrastruktur tidak dicabut
- String baru ditulis langsung dalam Bahasa Indonesia di source code
- `public/_gt/*.json` bahasa lain dibiarkan (bersihkan nanti, tidak mendesak)
- `LanguageSelector` disembunyikan dari semua UI

### 9.3 localStorage key migration

| Lama | Baru |
|---|---|
| `isocity-game-state` | `floodguard-game-state` |
| `isocity-saved-cities-index` | `floodguard-saved-maps-index` |
| `isocity-city-{id}` | `floodguard-map-{id}` |
| `isocity-saved-city` | `floodguard-saved-map` |
| `isocity-sprite-pack` | `floodguard-sprite-pack` |
| `isocity-day-night-mode` | `floodguard-day-night-mode` |
| `isocity-tips-disabled` | `floodguard-tips-disabled` |
| `isocity-tips-shown` | `floodguard-tips-shown` |

Konstanta di `GameContext.tsx:40-45`. Save lama tidak dimigrasi.

### 9.4 Aset visual

| Kategori | MVP (Fase 1–7) | Pasca-MVP (Fase 9) |
|---|---|---|
| Sprite bangunan banjir | Reuse + tinting canvas | Sprite sheet baru (opsional) |
| Terrain procedural | Gradasi warna per `tier`/`elevation` | — |
| Water tile (`water.webp`) | Dipakai ulang | — |
| Kendaraan evakuasi | Tinting procedural | — |
| Partikel hujan & genangan | Baru — procedural canvas | — |

---

## 10. Roadmap Bertahap

### Fase 1 — Fondasi Terrain & Preprocessing

**Deliverable:** Script preprocessing jalan; `*_processed.json` di-commit; grid game terisi elevasi dari peta; terrain berwarna per tier.

**File:**
- `scripts/preprocess-maps.mjs` — **baru**; jalankan manual sekali; output di-commit
- `public/map-data/SBY_*_processed.json` — **baru** (5 file, < 500 KB masing-masing)
- `src/lib/mapLoader.ts` — **baru**; fetch processed JSON, isi `Tile.elevation`
- `src/lib/simulation.ts:1168` — `createInitialGameState` terima `region`
- `src/games/isocity/types/game.ts:97-108` — tambah field `elevation`, `waterLevel`, `flowDirection`
- `src/components/game/drawing.ts:171-208` — `drawGreenBaseTile` pakai parameter tier/elevation

**Catatan:** File mentah 102 MB **tidak** masuk build pipeline.

---

### Fase 2 — Main Menu & Map Selection

**Deliverable:** Layar pemilihan 5 wilayah + difficulty; pilih → game dengan terrain wilayah tersebut.

**File:**
- `src/app/page.tsx:319-697` — state `showMapSelection`; hapus link coaster & tombol co-op
- `src/components/MapSelectionScreen.tsx` — **baru**
- `src/games/isocity/types/game.ts` — `FloodRegion`, `selectedRegion` di `GameState`
- `src/context/GameContext.tsx:648-650` — pass `region`

---

### Fase 3 — Air Statis & Overlay Terrain

**Deliverable:** Sungai/rawa (`building.type = 'water'`) dari inferensi tier-0; overlay elevasi & risiko.

**File:**
- `src/lib/mapLoader.ts` — inferensi tile `water`
- `src/components/game/overlays.ts` — mode `flood_risk`, `terrain_elevation`
- `src/components/game/types.ts:530` — `OverlayMode` baru
- `src/components/game/OverlayModeToggle.tsx`, `MiniMap.tsx` — palet baru

---

### Fase 4 — Banjir Dinamis Per-Tile (MVP)

**Deliverable:** Hujan musiman memunculkan genangan; air mengalir gravitasi; pompa mengurangi; render `floodCanvasRef`. **Tanpa sub-grid.**

**File:**
- `src/lib/simulation.ts:2152` — `simulateFloodTick()` per-tile via `Tile.waterLevel` / `Tile.elevation`
- `src/games/isocity/types/game.ts` — `weatherState`, `floodStats`
- `src/components/game/CanvasIsometricGrid.tsx:3053-3090` — tambah `floodCanvasRef`
- `src/components/game/CanvasIsometricGrid.tsx:2380-2517` — render ellipse per-tile

**Tidak ada:** `src/lib/floodGrid.ts` (ditunda Fase 8).

---

### Fase 5 — Tools Banjir & Kondisi Menang/Kalah

**Deliverable:** Player pasang pompa/tanggul/waduk; coverage berfungsi; struktur menang/kalah per difficulty aktif.

**File:**
- `src/games/isocity/types/buildings.ts:5-29` — `BuildingType` baru
- `src/games/isocity/types/game.ts:11-26` — `Tool` baru
- `src/lib/simulation.ts:1255` — coverage pompa/drainase
- `src/lib/simulation.ts:1757` — `safetyIndex`, game over, win check
- `src/lib/renderConfig.ts:184-741` — mapping sprite + tinting
- `src/components/game/Sidebar.tsx` — palette banjir (tanpa R/C/I)
- `src/components/game/panels/BudgetPanel.tsx` — rename kategori

---

### Fase 6 — Efek Visual & Reskin

**Deliverable:** Partikel hujan, langit mendung, tinting kendaraan evakuasi, string "FloodGuard Surabaya", key localStorage baru.

**File:**
- `src/components/game/effectsSystems.ts` — `updateRain`/`drawRain`
- `src/components/game/lightingSystem.ts` — kegelapan dari `rainfallRate`
- `src/app/layout.tsx:22-56` — metadata
- `src/components/game/Sidebar.tsx:570` — "FLOODGUARD"
- `src/context/GameContext.tsx:40-45` — key prefix `floodguard-*`
- Semua label UI → Bahasa Indonesia

**Tidak termasuk:** sprite sheet baru (Fase 9).

---

### Fase 7 — Polish & Deploy

**Deliverable:** Tips banjir, example states FloodGuard, benchmark performa, deploy Vercel.

**File:**
- `src/hooks/useTipSystem.ts` — tips mekanik banjir (Bahasa Indonesia)
- `gt.config.json` — `locales: ["id"]`
- `public/example-states/` — save contoh FloodGuard
- `src/app/layout.tsx` — metadata final
- `README.md` — dokumentasi

---

### Fase 8 — Sub-Grid Air (Pasca-MVP)

**Deliverable:** Air merembes di tepi jalan via sub-grid 4×4 per tile; render sub-ellipse.

**Prasyarat:** Fisika air per-tile (Fase 4) terbukti benar di playtesting.

**File:**
- `src/lib/floodGrid.ts` — **baru**; `Float32Array` sub-grid di ref
- `src/context/GameContext.tsx:713-715` — `floodGridRef`
- `src/lib/simulation.ts` — distribusi air ke sub-cell
- `src/components/game/CanvasIsometricGrid.tsx` — render sub-ellipse

---

### Fase 9 — Sprite Sheet Baru (Opsional)

**Deliverable:** Asset visual khusus infrastruktur banjir menggantikan tinting.

**File:**
- `public/assets/` — sheet baru (via pipeline `compress-images.mjs`)
- `src/lib/renderConfig.ts` — mapping `BuildingType` → sprite baru
- Menggunakan skill `isometric-asset-sheets` jika diperlukan

---

## 11. Risiko Teknis

| Risiko | Dampak | Kemungkinan | Mitigasi |
|---|---|---|---|
| **Render `floodCanvasRef` lambat** — ribuan tile `waterLevel > 0` tiap frame | FPS < 30 | Tinggi | Hanya render `waterLevel > threshold`; LOD zoom < 0.5; throttle render tiap 2 RAF |
| **Simulasi banjir O(W×H) per tick** | Tick lag | Rendah | Grid max ~10.000 tile; O(W×H) trivial di JS modern |
| **Load file mentah 16–27 MB** | Mobile gagal | Tinggi (jika salah fetch) | **Wajib** fetch hanya `*_processed.json`; guard di `mapLoader.ts` |
| **Ukuran grid berbeda per wilayah** | Logic asumsi grid persegi rusak | Sedang | `gridSize` = `{ width, height }` per region; audit semua loop W×H |
| **React Compiler + RAF loops** | Auto-memo rusak | Rendah | `"use no memo"` pada komponen canvas |
| **`evolveBuilding` tidak dinonaktifkan** | Bangunan tumbuh sendiri | Rendah | Guard: skip `evolveBuilding` jika `selectedRegion` ada |
| **`spawnCrimeIncidents` aktif** | Visual crime tidak relevan | Rendah | Nonaktifkan di `vehicleSystems.ts` saat mode FloodGuard |
| **Key localStorage berganti** | Save IsoCity lama hilang | Rendah | Disengaja — user FloodGuard = user baru |
| **File `SBY_*.json` berubah** | Data tidak sesuai | Rendah | Regenerasi via `preprocess-maps.mjs`; processed di-commit |
| **Game state size naik** (3 field baru per tile) | Melebihi 5MB localStorage | Rendah–Sedang | `waterLevel`/`flowDirection` di `Tile` ikut save; monitor ukuran; grid max ~10K tile masih aman |
| **gt-next locale tunggal** | String lama multi-bahasa tidak konsisten | Rendah | Tulis string baru langsung ID; bersihkan `_gt/*.json` nanti |
| **IsoCoaster/co-op tersembunyi tapi route aktif** | User akses `/coaster` atau `/coop/XXX` langsung | Rendah | Tidak masalah untuk MVP; bisa redirect nanti |

---

*Rencana revisi ini siap menjadi acuan implementasi. Mulai dari Fase 1.*
