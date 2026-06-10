# Analisis Data Peta Surabaya — `public/map-data/`

> Dokumen ini hanya membedah **struktur dan isi data** dari 5 file JSON peta Surabaya.
> Tidak ada rencana migrasi atau kode implementasi.

---

## Ringkasan Eksekutif

Kelima file adalah **heightmap/DEM grid 2D kustom** — **bukan GeoJSON**, bukan koordinat geografis (lat/long/UTM). Setiap file merepresentasikan satu **wilayah administratif** Surabaya (Barat, Pusat, Selatan, Timur, Utara) sebagai grid tile dengan **elevasi** dan **tier** (kelas ketinggian 0–9).

**Yang ada:** elevasi per tile (0–50, kuantisasi ~51 nilai), tier turunan, metadata area inti (`core*`) + padding.
**Yang tidak ada:** lat/long, nama jalan/kelurahan, jenis lahan, badan air berlabel, jaringan jalan, saluran drainase.

Data **cukup sebagai dasar terrain/elevasi** untuk grid game, tetapi **belum cukup sendiri** untuk simulasi banjir penuh — perlu inferensi badan air dari elevasi rendah dan sumber data tambahan (drainase, curah hujan, dll).

---

## 1. Format & Struktur Tiap File

### Format

| Aspek | Nilai |
|---|---|
| Format file | JSON tunggal (1 baris, tidak di-prettify) |
| Tipe data | **Heightmap grid 2D kustom** dengan array tile |
| Bukan | GeoJSON, Shapefile, raster GeoTIFF, CSV koordinat |

### Skema JSON root (sama di kelima file)

```json
{
  "width":      <integer>,   // lebar grid (jumlah kolom x)
  "height":     <integer>,   // tinggi grid (jumlah baris y)
  "tiles":      <array>,     // daftar tile, panjang = width × height
  "coreWidth":  <integer>,   // lebar area inti wilayah
  "coreHeight": <integer>,   // tinggi area inti wilayah
  "coreOffsetX": <integer>,  // offset x awal area inti
  "coreOffsetY": <integer>    // offset y awal area inti
}
```

**7 key di root**, tidak ada key lain.

### Skema objek tile (setiap elemen `tiles[]`)

```json
{
  "x":         <integer>,   // koordinat kolom grid (0-indexed)
  "y":         <integer>,   // koordinat baris grid (0-indexed)
  "elevation": <float>,    // ketinggian, rentang 0.0 – 50.0
  "tier":      <integer>   // kelas elevasi, rentang 0 – 9
}
```

**4 key per tile**, tidak ada key lain (tidak ada `type`, `road`, `water`, `name`, dll).

### Urutan penyimpanan `tiles[]`

Array disimpan dalam **column-major order**: `x` adalah loop luar, `y` loop dalam.

```
index → x = index // height
        y = index % height
```

Contoh (SBY_Pusat, `height=500`):
- `tiles[0]` → `{x:0, y:0}`
- `tiles[1]` → `{x:0, y:1}`
- `tiles[500]` → `{x:1, y:0}`

Grid **lengkap** — setiap kombinasi `(x, y)` untuk `0 ≤ x < width` dan `0 ≤ y < height` ada tepat satu entri, tanpa celah.

### Contoh entri nyata

**SBY_Pusat** — tile pertama (sudut kiri-atas):
```json
{"x": 0, "y": 0, "elevation": 11.960783958435059, "tier": 4}
```

**SBY_Timur** — area dataran rendah (kandidat genangan):
```json
{"x": 1, "y": 546, "elevation": 0.0, "tier": 0}
```

**SBY_Utara** — area tinggi:
```json
{"x": 46, "y": 449, "elevation": 43.92156982421875, "tier": 9}
```

### Ukuran file & jumlah tile per file

| File | Ukuran (bytes) | Ukuran (MB) | `width` × `height` | Jumlah tile |
|---|---|---|---|---|
| `SBY_Barat.json` | 20.152.108 | 19,2 | 600 × 600 | 360.000 |
| `SBY_Pusat.json` | 16.782.580 | 16,0 | 600 × 500 | 300.000 |
| `SBY_Selatan.json` | 27.766.184 | 26,5 | 1025 × 500 | 512.500 |
| `SBY_Timur.json` | 18.146.440 | 17,3 | 575 × 600 | 345.000 |
| `SBY_Utara.json` | 24.423.272 | 23,3 | 1025 × 475 | 486.875 |
| **Total** | **107.270.584** | **~102** | — | **2.004.375** |

### Metadata area inti (`core*`)

Setiap file memiliki **area inti** (`core`) yang di dalam grid penuh, dikelilingi **padding** (buffer di tepi):

| File | Grid penuh | Area inti (`core`) | Offset inti | Padding (kiri, atas, kanan, bawah) |
|---|---|---|---|---|
| SBY_Barat | 600×600 | 550×500 | (0, 50) | 0, 50, 50, 50 |
| SBY_Pusat | 600×500 | 500×400 | (50, 50) | 50, 50, 50, 50 |
| SBY_Selatan | 1025×500 | 1025×450 | (0, 0) | 0, 0, 0, 50 |
| SBY_Timur | 575×600 | 525×500 | (50, 50) | 50, 50, 0, 50 |
| SBY_Utara | 1025×475 | 1025×425 | (0, 50) | 0, 50, 0, 0 |

Area inti kemungkinan = batas geografis wilayah yang sebenarnya; padding = zona overlap/buffer untuk penyambungan antar wilayah.

---

## 2. Sistem Koordinat

### Jenis koordinat

| Pertanyaan | Jawaban |
|---|---|
| Lat/long (WGS84)? | **Tidak ada** — tidak ada field `lat`, `lng`, `latitude`, `longitude` |
| Proyeksi UTM / EPSG? | **Tidak ada** — tidak ada metadata proyeksi |
| Koordinat grid lokal? | **Ya** — `x` dan `y` adalah **indeks integer 0-indexed** dalam grid regional |

Koordinat `(x, y)` adalah posisi tile dalam **sistem lokal per-file**, dengan origin `(0, 0)` di sudut kiri-atas setiap grid regional. **Tidak ada metadata georeferensi** yang menghubungkan ke koordinat dunia nyata.

### Rentang nilai X dan Y per file

| File | X min–max | Y min–max |
|---|---|---|
| SBY_Barat | 0 – 599 | 0 – 599 |
| SBY_Pusat | 0 – 599 | 0 – 499 |
| SBY_Selatan | 0 – 1024 | 0 – 499 |
| SBY_Timur | 0 – 574 | 0 – 599 |
| SBY_Utara | 0 – 1024 | 0 – 474 |

### Apakah 5 wilayah saling bersambung?

**Tidak secara langsung dalam koordinat saat ini.** Bukti:

1. **Setiap file punya origin `(0,0)` sendiri** — tidak ada offset global atau ID peta induk.
2. **Perbandingan tepi antar wilayah yang bersebelahan** menunjukkan kecocokan sangat rendah:

| Pasangan tepi | Rentang overlap | Exact match (elevation + tier) | Rata-rata selisih elevasi |
|---|---|---|---|
| Barat-KANAN vs Pusat-KIRI | y: 50–449 (400 tile) | 2,8% | 11,50 |
| Pusat-KANAN vs Timur-KIRI | y: 50–449 (400 tile) | 2,5% | 9,60 |
| Utara-BAWAH vs Pusat-ATAS | x: 50–549 (500 tile) | 2,2% | 9,75 |
| Selatan-ATAS vs Pusat-BAWAH | x: 50–549 (500 tile) | 4,0% | 5,30 |

Match 2–4% ≈ kebetulan — **bukan desain seamless stitch**. Penyambungan membutuhkan **transformasi/offset eksplisit** yang tidak ada di file.

3. **Tepi void (tier=0, elevation=0)** di beberapa sisi menandai batas luar peta, bukan sambungan:
   - SBY_Selatan kolom kanan (`x=1024`): **500/500 tile void** (100%)
   - SBY_Timur kolom kanan (`x=574`): **600/600 tile void** (100%)
   - SBY_Utara kolom kanan: **412/475 tile void** (87%)

4. **Dimensi core** mengindikasikan layout geografis yang disengaja, tetapi tanpa metadata stitch:

```
         ┌─────── Utara (1025×425 core) ───────┐
         │                                      │
  Barat  │           Pusat (500×400)            │  Timur
 (550×   │                                      │ (525×
  500)   │                                      │  500)
         │                                      │
         └────── Selatan (1025×450 core) ──────┘
```

Lebar Utara/Selatan (1025) ≈ Barat core (550) + Pusat core (500) − overlap (~25) → mengindikasikan **overlap zona buffer** sekitar 50 tile, tetapi tanpa data offset global.

**Kesimpulan konektivitas:** Wilayah-wilayah ini dirancang untuk disatukan secara geografis (nama + dimensi core + padding konsisten), tetapi **belum bisa langsung di-stitch** tanpa informasi offset/transformasi tambahan.

---

## 3. Atribut / Properti Data

### Properti yang ada

| Properti | Tipe | Rentang | Keterangan |
|---|---|---|---|
| `x` | integer | 0 – (width−1) | Posisi kolom grid lokal |
| `y` | integer | 0 – (height−1) | Posisi baris grid lokal |
| `elevation` | float | 0.0 – 50.0 | Ketinggian terkuantisasi (~48–51 nilai unik per file) |
| `tier` | integer | 0 – 9 | Kelas/decile elevasi (derived) |

### Properti yang **tidak ada**

| Data yang dicari | Ada? |
|---|---|
| Nama jalan | ❌ |
| Nama kelurahan/kecamatan | ❌ |
| Jenis penggunaan lahan | ❌ |
| Badan air berlabel (sungai, kali, saluran) | ❌ |
| Jaringan jalan | ❌ |
| Saluran drainase | ❌ |
| Koordinat geografis (lat/long) | ❌ |
| Curah hujan / data hidrologi | ❌ |
| Populasi / bangunan | ❌ |

### Data elevasi — **ADA** ✅

Ini adalah data utama dan **satu-satunya atribut terrain** di file.

| File | Min | Max | Rata-rata | Nilai unik |
|---|---|---|---|---|
| SBY_Barat | 0.0 | 50.0 | 13,2 | 51 |
| SBY_Pusat | 0.0 | 50.0 | 9,1 | 48 |
| SBY_Selatan | 0.0 | 50.0 | 8,7 | 51 |
| SBY_Timur | 0.0 | 46,1 | 3,8 | 44 |
| SBY_Utara | 0.0 | 50.0 | 6,9 | 51 |

**Pola kuantisasi:** nilai elevasi terkuantisasi ke ~51 level dalam rentang 0–50, dengan langkah dominan **~0,98** (kemungkinan `50/51 ≈ 0,9804`). Satuan kemungkinan **meter** (ketinggian DTM Surabaya yang tipikal 0–50 m dpl), tetapi **tidak ada metadata satuan eksplisit** di file.

### Relasi `tier` ↔ `elevation`

`tier` adalah **kelas bucket elevasi** (0 = terendah, 9 = tertinggi):

| Tier | Rentang elevasi (contoh dari SBY_Pusat) | Jumlah nilai unik |
|---|---|---|
| 0 | 0.0 (tepat) | 1 |
| 1 | 0,98 – 1,96 | 2 |
| 2 | 2,94 – 3,92 | 2 |
| 3 | 5,10 – 7,06 | 3 |
| 4 | 8,04 – 11,96 | 5 |
| 5 | 12,94 – 16,08 | 4 |
| 6 | 17,06 – 23,92 | 8 |
| 7 | 25,10 – 32,94 | 9 |
| 8 | 33,92 – 42,94 | 10 |
| 9 | 43,92 – 50,0 | 4 |

### Distribusi tier per wilayah

| Tier | Barat | Pusat | Selatan | Timur | Utara |
|---|---|---|---|---|---|
| 0 (terendah) | 1,1% | 2,2% | 15,9% | 29,2% | 44,0% |
| 1 | 2,3% | 6,2% | 9,8% | 13,7% | 6,5% |
| 2 | 7,1% | 14,6% | 11,6% | 18,6% | 12,4% |
| 3 | 21,9% | 32,1% | 18,5% | 26,0% | 13,9% |
| 4 | 26,9% | 23,6% | 21,2% | 9,8% | 6,2% |
| 5 | 10,9% | 6,1% | 7,1% | 0,7% | 3,6% |
| 6 | 17,2% | 10,4% | 9,0% | 1,6% | 4,8% |
| 7 | 9,5% | 4,4% | 5,4% | 0,3% | 2,6% |
| 8 | 2,6% | 0,4% | 1,3% | 0,01% | 2,1% |
| 9 (tertinggi) | 0,5% | 0,002% | 0,3% | 0,0003% | 3,8% |

**Pola geografis masuk akal:**
- **Timur & Utara** dominan tier rendah (dataran rendah pesisir/kawasan Surabaya timur dan utara — rawa, pelabuhan, muara).
- **Barat** lebih tinggi (perbukitan barat Surabaya).
- **Pusat** elevasi menengah (kota pusat).

### Badan air eksisting — **tidak berlabel, tapi bisa diinferensi** ⚠️

Tidak ada field `water`, `river`, `canal`, atau sejenisnya. Namun:

- **`tier = 0` + `elevation = 0.0`** kemungkinan besar merepresentasikan **area terendah** — kandidat sungai, rawa, genangan, atau laut.
- Tile `tier=0` di **interior** (bukan tepi void):

| File | Interior tier-0 | % dari total |
|---|---|---|
| SBY_Barat | 3.795 | 1,1% |
| SBY_Pusat | 6.390 | 2,1% |
| SBY_Selatan | 80.489 | 15,7% |
| SBY_Timur | 99.666 | 28,9% |
| SBY_Utara | 213.538 | 43,9% |

Cluster interior tier-0 di Timur/Utara/Selatan kemungkinan mengikuti **alur sungai/kali dan kawasan pesisir** Surabaya (Kalimas, Sungai Mas, dll.), tetapi ini **inferensi** — tidak ada label eksplisit.

### Jaringan jalan — **tidak ada** ❌

Tidak ada atribut jalan di level tile maupun sebagai layer terpisah.

---

## 4. Kesimpulan Kelayakan

### Apakah cukup untuk grid game isometrik?

| Aspek | Penilaian |
|---|---|
| Terrain heightmap | ✅ **Ya** — elevasi per-tile siap di-map ke tile game |
| Skala grid | ⚠️ **Perlu downsampling** — grid terkecil 300.000 tile vs game default 4.900 (70×70), ~61× lebih besar |
| Penyambungan 5 wilayah | ⚠️ **Perlu offset manual** — tidak ada metadata stitch, tepi tidak seamless |
| Visual isometrik | ⚠️ **Perlu interpretasi** — hanya elevasi, belum ada `building.type`/`zone` seperti format `GameState.grid` |
| Performa | ⚠️ **Perlu strategi** — total 2 juta tile mentah; harus di-downsample atau chunk |

**Kesimpulan:** Data **cukup sebagai sumber terrain/elevasi** untuk membangun grid, tetapi membutuhkan pipeline konversi: downsample → mapping `elevation`/`tier` → `Tile` game (`building.type`, `zone`, `landValue`, dll).

### Data yang ADA vs HILANG untuk simulasi banjir

| Kebutuhan simulasi banjir | Status | Keterangan |
|---|---|---|
| **Elevasi/ketinggian tanah** | ✅ **ADA** | `elevation` 0–50 per tile, 2 juta+ data point |
| **Kelas ketinggian (tier)** | ✅ **ADA** | `tier` 0–9, derived bucket |
| **Peta wilayah (5 zona)** | ✅ **ADA** | 5 file = 5 wilayah Surabaya |
| **Metadata area inti** | ✅ **ADA** | `coreWidth/Height/OffsetX/Y` untuk crop |
| **Badan air (sungai, kali)** | ⚠️ **Inferensi** | Bisa diinferensi dari cluster `tier=0` interior, tapi tidak berlabel |
| **Saluran drainase** | ❌ **HILANG** | Perlu sumber data terpisah (PUPR, OpenStreetMap) |
| **Jaringan jalan** | ❌ **HILANG** | Perlu OSM atau sumber lain |
| **Curah hujan / intensitas hujan** | ❌ **HILANG** | Perlu data BMKG atau parameter game |
| **Koordinat geografis** | ❌ **HILANG** | Tidak bisa overlay langsung ke peta nyata |
| **Penyambungan antar wilayah** | ❌ **HILANG** | Perlu offset stitch manual |
| **Jenis tanah / infiltrasi** | ❌ **HILANG** | Perlu asumsi atau data tambahan |
| **Bangunan / infrastruktur banjir** | ❌ **HILANG** | Pompa, tanggul, waduk — perlu ditambah di game |
| **Populasi / zonasi** | ❌ **HILANG** | Game engine sudah punya, tapi tidak dari peta ini |

### Tabel: properti tersedia → potensi pemakaian di game

| Properti data | Potensi di game FloodGuard Surabaya |
|---|---|
| `elevation` | → `Tile.landValue` proxy, tinggi render isometrik, arah aliran air (water flow downhill), threshold genangan |
| `tier` | → Klasifikasi zona risiko banjir (tier 0–2 = tinggi, 7–9 = aman), warna overlay, LOD terrain |
| `x`, `y` | → Posisi tile di grid regional; perlu mapping ke `Tile.x`, `Tile.y` global setelah stitch |
| `coreWidth/Height/Offset` | → Crop wilayah aktif, buang padding overlap saat stitch |
| `width`, `height` | → Ukuran grid per wilayah, input untuk kalkulasi downsample |
| Cluster `tier=0` interior | → Inferensi tile `building.type = 'water'` (sungai, rawa, muara) |
| Selisih elevasi antar tile | → Simulasi gravitasi air, kecepatan drainase, area genangan |
| Tepi void (`tier=0` di kolom/baris tepi) | → Batas peta / laut / area di luar wilayah — tile non-playable |
| *(tidak ada)* jalan | → Generate dari OSM, atau biarkan player bangun sendiri |
| *(tidak ada)* drainase | → Tambah sebagai mekanik game (player bangun saluran) |
| *(tidak ada)* curah hujan | → Parameter event bencana di `simulateTick` |

### Perbandingan dengan format grid game saat ini

Grid game (`GameState.grid`) menggunakan `Tile` dengan field:

```
x, y, zone, building{type,level,...}, landValue, pollution, crime, traffic, hasSubway
```

Peta Surabaya hanya menyediakan **`x`, `y`, `elevation`, `tier`** — sekitar **30% field** yang dibutuhkan `Tile`. Sisanya (zone, building, utilitas, populasi) harus di-generate, di-assign default, atau ditambah dari sumber lain.

---

## Catatan Teknis Tambahan

1. **Ukuran file besar** (16–27 MB per file, total ~102 MB JSON mentah). Pertimbangkan konversi ke format biner (ArrayBuffer/typed array) atau kompresi saat runtime.
2. **Downsample ratio yang masuk akal:** dari 600×500 ke 70×70 ≈ faktor **8,6×** per sumbu → cukup untuk grid game default. Atau pertahankan resolusi lebih tinggi (150×125) untuk detail banjir.
3. **SBY_Timur** memiliki rata-rata elevasi terendah (3,8) dan 29,2% tier-0 — konsisten dengan kawasan pesisir/timur Surabaya yang rawan banjir.
4. **SBY_Utara** memiliki 44% tier-0 — perlu investigasi apakah ini muara sungai, pelabuhan, atau artefak data (banyak void di tepi kanan).
5. Tidak ada file README atau metadata pendamping di `public/map-data/` yang menjelaskan sumber data, satuan, resolusi spasial (meter per tile), atau cara stitch.

---

*Analisis berdasarkan pembacaan langsung 5 file JSON. Semua angka diverifikasi via script Python terhadap data aktual.*
