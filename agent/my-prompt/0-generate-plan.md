You are analyzing a Next.js web game project called "isometric-floodguard-simulationgames".

Your ONLY task right now: deeply read and understand the entire codebase, 
then document what you found in `/agent/README.md`.

NO migration planning yet. Just pure understanding.

---

## READING PRIORITY (STRICT ORDER)

1. `package.json` (already provided)
2. `/src` directory — read ALL files recursively, this is the priority
3. Config files: `next.config.*`, `tailwind.config.*`, `tsconfig.json`
4. `/public` — inventory assets only (no need to open image files)
5. Root `README.md` if exists
6. **SKIP `/node_modules` entirely**

---

## WHAT TO DOCUMENT in `/agent/README.md`

### 1. Project Overview
- Apa yang dilakukan game ini secara keseluruhan?
- Tech stack dan versi yang digunakan

### 2. Full File Structure
- Annotated directory tree dari `/src` dan `/public`
- Jelaskan fungsi setiap folder dan file penting

### 3. Core Game Systems
- Bagaimana isometric grid di-render? (canvas / CSS / SVG?)
- Bagaimana game loop / tick system bekerja?
- Bagaimana tiles dan buildings ditempatkan?
- Sistem resource apa saja yang ada? (uang, populasi, dll)
- Bagaimana save/load bekerja? (lz-string terdeteksi di dependencies)

### 4. State Management
- Pattern apa yang dipakai? (useState, Context, Zustand, dll)
- Apa saja global state yang ada?

### 5. TypeScript Types & Data Models
- Semua interface dan type penting
- Relasi antar entitas (City, Tile, Building, dll)

### 6. UI Components
- Semua komponen Radix UI yang dipakai
- HUD, menu, panel, dialog apa saja yang ada

### 7. Supabase Integration
- Dipakai untuk apa? (leaderboard, save, auth?)

### 8. Asset Inventory
- Daftar semua asset di `/public`
- Kategorikan: buildings, terrain, UI, decorations

### 9. Scripts & Config
- Apa yang dilakukan `compress-images.mjs` dan `crop-screenshots.sh`?
- `gt-next` dipakai untuk apa? (i18n?)

---

## OUTPUT

Simpan semua hasil analisis ke `/agent/README.md`.
Tulis dalam Bahasa Indonesia.
Gunakan actual filename dan baris kode sebagai referensi.
Jangan buat asumsi — hanya tulis apa yang benar-benar ada di kode.