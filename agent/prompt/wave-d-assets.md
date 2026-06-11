GELOMBANG D — Asset Pipeline (Opsional)
Acuan: plan FloodGuard Coherence §Gelombang D, floodguard-plan.md Fase 9.

Gunakan skill `.cursor/skills/isometric-asset-sheets/SKILL.md` untuk generate sprite.

============================================================
SCOPE
============================================================

1. Sprite sheet infrastruktur banjir (pompa, tanggul, waduk, pos evakuasi)
2. Integrasi `renderConfig.ts` + pipeline compress
3. Opsional: demo pompa/tanggul di `citySeeding.ts` area rawan

============================================================
ATURAN ASSET
============================================================
- Background merah #FF0000 untuk sheet (filter `imageLoader`)
- Preload di useEffect, bukan render loop
- Player-placed only untuk asset khusus; seeded tetap sprite lama

============================================================
CEK MANUAL
============================================================
1. Bangunan player tanpa tepi merah
2. Ukuran pas di footprint tile
