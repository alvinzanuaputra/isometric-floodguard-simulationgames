/**
 * Preprocessing peta Surabaya — FloodGuard Surabaya (Fase 1).
 *
 * Mengubah file mentah public/map-data/SBY_*.json (16–27 MB per file) menjadi
 * public/map-data/SBY_*_processed.json yang ringkas (< 500 KB) dan siap dipakai
 * runtime oleh src/lib/mapLoader.ts.
 *
 * Pipeline (acuan: agent/floodguard-plan.md §3.2 + keputusan KD-1):
 *   Step 1: Crop area core (coreOffsetX/Y, coreWidth/Height)
 *   Step 2: Downsample RATA-RATA elevasi per blok (aspect ratio asli per wilayah)
 *   Step 3: Pad ke grid PERSEGI N×N (KD-1) — tile padding ditandai non-playable
 *   Step 4: Inferensi isWater dari tier-0 INTERIOR (flood-fill dari tepi = void/laut)
 *   Step 5: Tulis JSON compact (array flat row-major, index = y * N + x)
 *
 * Jalankan MANUAL sekali: `node scripts/preprocess-maps.mjs` atau
 * `npm run preprocess-maps`. JANGAN masukkan ke `npm run build` —
 * file mentah 102 MB tidak boleh masuk pipeline build/Vercel.
 */

import { readFileSync, writeFileSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAP_DIR = path.join(__dirname, '..', 'public', 'map-data');

/** Grid persegi seragam untuk semua wilayah (KD-1): maks dimensi 103 → N = 104. */
const GRID_N = 104;

/** Target downsample per wilayah (floodguard-plan.md §3.2 — aspect ratio asli). */
const REGIONS = {
  Barat: { w: 100, h: 91 },
  Pusat: { w: 100, h: 80 },
  Selatan: { w: 103, h: 45 },
  Timur: { w: 100, h: 95 },
  Utara: { w: 103, h: 42 },
};

/** Fraksi minimal sel air dalam satu blok agar tile hasil downsample jadi air. */
const WATER_BLOCK_THRESHOLD = 0.35;
/** Fraksi minimal sel void dalam satu blok agar tile hasil downsample jadi void. */
const VOID_BLOCK_THRESHOLD = 0.5;
/** Cluster air lebih kecil dari ini dianggap noise → dikembalikan jadi darat. */
const MIN_WATER_CLUSTER = 3;

/**
 * Konversi elevasi (meter) → tier 0–9.
 * Batas diambil dari distribusi tier data mentah (agent/map-data-analysis.md §3):
 * tier mentah adalah bucket elevasi; batas di bawah memetakan kembali nilai
 * rata-rata blok ke bucket yang sama.
 * HARUS konsisten dengan elevationToTier di src/lib/mapLoader.ts.
 */
const TIER_BOUNDS = [0.5, 2.5, 4.5, 7.5, 12.5, 16.5, 24.5, 33.5, 43.5];
function tierFromElevation(elev) {
  for (let t = 0; t < TIER_BOUNDS.length; t++) {
    if (elev < TIER_BOUNDS[t]) return t;
  }
  return 9;
}

function processRegion(region, target) {
  const rawPath = path.join(MAP_DIR, `SBY_${region}.json`);
  const raw = JSON.parse(readFileSync(rawPath, 'utf8'));

  const { width, height, coreWidth, coreHeight, coreOffsetX, coreOffsetY } = raw;
  console.log(`\n=== SBY_${region} ===`);
  console.log(`  Raw: ${width}x${height}, core: ${coreWidth}x${coreHeight} @ (${coreOffsetX},${coreOffsetY})`);

  // Index elevasi & tier mentah dengan koordinat eksplisit tiap tile
  // (tidak mengandalkan urutan array — data mentah column-major, tapi ini lebih aman).
  const rawElev = new Float64Array(width * height);
  const rawTier = new Int8Array(width * height);
  for (const t of raw.tiles) {
    const idx = t.y * width + t.x;
    rawElev[idx] = t.elevation;
    rawTier[idx] = t.tier;
  }

  // --- Step 1: Crop area core ---
  const cw = coreWidth;
  const ch = coreHeight;
  const coreElev = new Float64Array(cw * ch);
  const coreTier = new Int8Array(cw * ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const srcIdx = (y + coreOffsetY) * width + (x + coreOffsetX);
      coreElev[y * cw + x] = rawElev[srcIdx];
      coreTier[y * cw + x] = rawTier[srcIdx];
    }
  }

  // --- Step 4 (di resolusi mentah): pisahkan void (laut/tepi) vs air interior ---
  // Flood-fill BFS dari semua sel tier-0 di tepi core: itu void/laut (non-playable).
  // Sel tier-0 yang TIDAK terhubung ke tepi = badan air interior (sungai/rawa).
  const VOID = 1;
  const voidMask = new Uint8Array(cw * ch);
  const queue = [];
  for (let x = 0; x < cw; x++) {
    if (coreTier[x] === 0) { voidMask[x] = VOID; queue.push(x); }
    const b = (ch - 1) * cw + x;
    if (coreTier[b] === 0 && !voidMask[b]) { voidMask[b] = VOID; queue.push(b); }
  }
  for (let y = 0; y < ch; y++) {
    const l = y * cw;
    if (coreTier[l] === 0 && !voidMask[l]) { voidMask[l] = VOID; queue.push(l); }
    const r = y * cw + (cw - 1);
    if (coreTier[r] === 0 && !voidMask[r]) { voidMask[r] = VOID; queue.push(r); }
  }
  while (queue.length > 0) {
    const idx = queue.pop();
    const x = idx % cw;
    const y = (idx - x) / cw;
    const neighbors = [
      x > 0 ? idx - 1 : -1,
      x < cw - 1 ? idx + 1 : -1,
      y > 0 ? idx - cw : -1,
      y < ch - 1 ? idx + cw : -1,
    ];
    for (const n of neighbors) {
      if (n >= 0 && coreTier[n] === 0 && !voidMask[n]) {
        voidMask[n] = VOID;
        queue.push(n);
      }
    }
  }

  let rawVoid = 0;
  let rawWater = 0;
  for (let i = 0; i < cw * ch; i++) {
    if (coreTier[i] === 0) {
      if (voidMask[i]) rawVoid++;
      else rawWater++;
    }
  }
  console.log(`  Raw tier-0: void/laut ${rawVoid} sel, air interior ${rawWater} sel`);

  // --- Step 2: Downsample rata-rata elevasi per blok ---
  const tw = target.w;
  const th = target.h;
  const sx = cw / tw;
  const sy = ch / th;
  console.log(`  Downsample: ${cw}x${ch} -> ${tw}x${th} (faktor ~${sx.toFixed(2)}x${sy.toFixed(2)})`);

  // Kelas per tile hasil downsample: 0 = void, 1 = darat, 2 = air
  const dsElev = new Float64Array(tw * th);
  const dsClass = new Uint8Array(tw * th);
  for (let ty = 0; ty < th; ty++) {
    const y0 = Math.floor(ty * sy);
    const y1 = Math.max(y0 + 1, Math.floor((ty + 1) * sy));
    for (let tx = 0; tx < tw; tx++) {
      const x0 = Math.floor(tx * sx);
      const x1 = Math.max(x0 + 1, Math.floor((tx + 1) * sx));

      let total = 0;
      let voidCount = 0;
      let waterCount = 0;
      let elevSum = 0;
      let elevCount = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const idx = y * cw + x;
          total++;
          if (voidMask[idx]) {
            voidCount++;
          } else {
            if (coreTier[idx] === 0) waterCount++;
            elevSum += coreElev[idx];
            elevCount++;
          }
        }
      }

      const di = ty * tw + tx;
      // Sungai tipis (1–2 sel) ikut dipertahankan: blok dianggap air bila
      // jumlah sel air cukup untuk "melintasi" blok (>= sisi blok terpendek),
      // meski fraksinya di bawah threshold mayoritas.
      const riverCrossesBlock = waterCount >= Math.min(sx, sy);
      if (voidCount / total >= VOID_BLOCK_THRESHOLD || elevCount === 0) {
        dsClass[di] = 0;
        dsElev[di] = -1;
      } else if (waterCount / elevCount >= WATER_BLOCK_THRESHOLD || riverCrossesBlock) {
        dsClass[di] = 2;
        dsElev[di] = elevSum / elevCount;
      } else {
        dsClass[di] = 1;
        dsElev[di] = elevSum / elevCount;
      }
    }
  }

  // Bersihkan cluster air terlalu kecil (noise downsampling) → jadikan darat
  removeSmallWaterClusters(dsClass, tw, th);

  // --- Step 3: Pad ke grid persegi N×N (KD-1), area data di tengah ---
  const N = GRID_N;
  const offsetX = Math.floor((N - tw) / 2);
  const offsetY = Math.floor((N - th) / 2);

  const elevation = new Array(N * N).fill(-1);
  const tier = new Array(N * N).fill(0);
  const water = new Array(N * N).fill(0);
  const playable = new Array(N * N).fill(0);

  let waterTiles = 0;
  let playableTiles = 0;
  for (let ty = 0; ty < th; ty++) {
    for (let tx = 0; tx < tw; tx++) {
      const di = ty * tw + tx;
      if (dsClass[di] === 0) continue; // void → biarkan sebagai padding

      const gi = (ty + offsetY) * N + (tx + offsetX);
      const e = Math.max(0, Math.round(dsElev[di] * 10) / 10);
      elevation[gi] = e;
      tier[gi] = dsClass[di] === 2 ? 0 : tierFromElevation(e);
      water[gi] = dsClass[di] === 2 ? 1 : 0;
      playable[gi] = 1;
      playableTiles++;
      if (dsClass[di] === 2) waterTiles++;
    }
  }

  console.log(`  Hasil: ${N}x${N}, playable ${playableTiles} (${(playableTiles / (N * N) * 100).toFixed(1)}%), air ${waterTiles} (${(waterTiles / playableTiles * 100).toFixed(1)}% dari playable)`);

  const out = {
    version: 1,
    region,
    gridSize: N,
    dataWidth: tw,
    dataHeight: th,
    offsetX,
    offsetY,
    elevation,
    tier,
    water,
    playable,
  };

  const outPath = path.join(MAP_DIR, `SBY_${region}_processed.json`);
  writeFileSync(outPath, JSON.stringify(out));
  const kb = statSync(outPath).size / 1024;
  console.log(`  Output: ${path.basename(outPath)} (${kb.toFixed(1)} KB)${kb < 500 ? ' ✓ < 500 KB' : ' ✗ MELEBIHI 500 KB!'}`);
  return kb;
}

/** Hapus cluster air kontigu (4-arah) lebih kecil dari MIN_WATER_CLUSTER → darat. */
function removeSmallWaterClusters(dsClass, w, h) {
  const visited = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (dsClass[i] !== 2 || visited[i]) continue;
    const cluster = [i];
    visited[i] = 1;
    for (let head = 0; head < cluster.length; head++) {
      const idx = cluster[head];
      const x = idx % w;
      const y = (idx - x) / w;
      const neighbors = [
        x > 0 ? idx - 1 : -1,
        x < w - 1 ? idx + 1 : -1,
        y > 0 ? idx - w : -1,
        y < h - 1 ? idx + w : -1,
      ];
      for (const n of neighbors) {
        if (n >= 0 && dsClass[n] === 2 && !visited[n]) {
          visited[n] = 1;
          cluster.push(n);
        }
      }
    }
    if (cluster.length < MIN_WATER_CLUSTER) {
      for (const idx of cluster) dsClass[idx] = 1;
    }
  }
}

console.log(`FloodGuard Surabaya — preprocessing peta (N=${GRID_N})`);
let allOk = true;
for (const [region, target] of Object.entries(REGIONS)) {
  const kb = processRegion(region, target);
  if (kb >= 500) allOk = false;
}
console.log(allOk ? '\nSemua file < 500 KB ✓' : '\nADA FILE MELEBIHI 500 KB — perlu kompaksi tambahan!');
