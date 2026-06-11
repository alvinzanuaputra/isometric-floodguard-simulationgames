/**
 * Validasi visual Fase 1 (KD-3) — render heatmap PNG per wilayah dari
 * public/map-data/SBY_*_processed.json (file yang sama yang dipakai runtime,
 * sehingga sekaligus menguji format processed end-to-end).
 *
 * Warna mengikuti TERRAIN_TIER_COLORS di src/components/game/drawing.ts:
 *   - air statis: biru terang (#2563eb, sama dengan warna water in-game)
 *   - darat: ramp tier 0–9 (biru gelap → hijau → coklat/abu)
 *   - padding/void non-playable: gelap (#252b33)
 *
 * Jalankan manual: `node scripts/render-map-previews.mjs`
 * Output: agent/validation/SBY_*_heatmap.png
 */

import { readFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAP_DIR = path.join(__dirname, '..', 'public', 'map-data');
const OUT_DIR = path.join(__dirname, '..', 'agent', 'validation');
const REGIONS = ['Barat', 'Pusat', 'Selatan', 'Timur', 'Utara'];
const SCALE = 6; // perbesaran nearest-neighbor agar mudah dilihat

/** Nilai `top` dari TERRAIN_TIER_COLORS (drawing.ts) — jaga tetap sinkron. */
const TIER_TOP_COLORS = [
  '#2c4a6e', '#36597d', '#8a9a4a', '#7d944a', '#5a8f4f',
  '#4a7c3f', '#3f6a35', '#5d6238', '#6e5b44', '#7a7a72',
];
const WATER_COLOR = '#2563eb';
const VOID_COLOR = '#252b33';

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

mkdirSync(OUT_DIR, { recursive: true });

for (const region of REGIONS) {
  const data = JSON.parse(readFileSync(path.join(MAP_DIR, `SBY_${region}_processed.json`), 'utf8'));
  const n = data.gridSize;
  const px = Buffer.alloc(n * n * 3);

  for (let i = 0; i < n * n; i++) {
    let rgb;
    if (data.playable[i] !== 1) {
      rgb = hexToRgb(VOID_COLOR);
    } else if (data.water[i] === 1) {
      rgb = hexToRgb(WATER_COLOR);
    } else {
      rgb = hexToRgb(TIER_TOP_COLORS[data.tier[i]] ?? TIER_TOP_COLORS[9]);
    }
    px[i * 3] = rgb[0];
    px[i * 3 + 1] = rgb[1];
    px[i * 3 + 2] = rgb[2];
  }

  const outPath = path.join(OUT_DIR, `SBY_${region}_heatmap.png`);
  await sharp(px, { raw: { width: n, height: n, channels: 3 } })
    .resize(n * SCALE, n * SCALE, { kernel: 'nearest' })
    .png()
    .toFile(outPath);
  console.log(`✓ ${outPath}`);
}
