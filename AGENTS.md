# AGENTS.md

## Commands
- `npm run dev` - Start development server
- `npm run build` - Production build (also type-checks)
- `npm run lint` - Run ESLint
- `node scripts/preprocess-maps.mjs` - Regenerate `public/map-data/SBY_*_processed.json` (offline, manual)
- `node scripts/render-map-previews.mjs` - Heatmap previews for map selection
- No test framework configured

## Architecture

Next.js 16 + React 19 isometric **dual-mode** game:
- **FloodGuard Surabaya** — flood management when `state.selectedRegion` is set
- **IsoCity legacy** — original city-builder when `!selectedRegion`

### Directories
- `src/app/` - Next.js App Router pages
- `src/components/` - React (`Game.tsx` entry, `game/` canvas UI, `mobile/`, `ui/`)
- `src/context/` - `GameContext.tsx` (global state, saves `floodguard-*` keys)
- `src/hooks/` - Custom hooks
- `src/lib/` - `simulation.ts`, `floodSimulation.ts`, `mapLoader.ts`, `regionConfig.ts`, `floodTools.ts`, `citySeeding.ts`
- `src/games/isocity/types/` - `Tile`, `GameState`, `weather.ts`, `buildings.ts`
- `agent/` - Design docs (`floodguard-plan.md`) and wave prompts (`agent/prompt/`)

### Canvas layers (z-index)
| Layer | Ref | z-index |
|-------|-----|---------|
| Terrain | `canvasRef` | auto |
| Flood water | `floodCanvasRef` | 1 |
| Vehicles | `carsCanvasRef` | 2 |
| Buildings | `buildingsCanvasRef` | 4 |
| Hover/select | `hoverCanvasRef` | 5 |
| Air (planes, rain) | `airCanvasRef` | 6 |
| Lighting | `lightingCanvasRef` | 7 (multiply) |

Main file: `src/components/game/CanvasIsometricGrid.tsx`

### FloodGuard guard pattern
```typescript
if (state.selectedRegion) { /* FloodGuard only */ }
```

### Implementation phases (see `agent/floodguard-plan.md`)
1. Terrain/preprocessing — Done
2. Map selection — Done
3. Static overlays — Done
4. Dynamic flood sim — Done
5. Flood tools & win/lose — Partial
6. Visual reskin — Partial
7. Polish — Partial
8. Sub-grid air — Deferred
9. New sprites — Optional

Wave prompts: `agent/prompt/wave-a-stabilitas.md` through `wave-d-assets.md`

## Code Style
- TypeScript strict; `@/*` path alias
- React functional components with `'use client'`
- shadcn/ui + Radix UI + Tailwind CSS
- ESLint with eslint-config-next

## Project Info
- **Game**: FloodGuard Surabaya
- **Developer**: Alvin Zanua Putra
- **Community**: Institut Teknologi Sepuluh Nopember (ITS)
- **Live**: https://floodguard-surabaya.vercel.app/
