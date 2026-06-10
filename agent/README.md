# Analisis Codebase — `isometric-floodguard-simulationgames`

> Dokumen ini adalah hasil **pemahaman murni** atas codebase (belum ada perencanaan migrasi).
> Semua pernyataan dirujuk ke `file:line` aktual. Tidak ada asumsi di luar kode.
>
> **Catatan penting tentang penamaan:** Branding di dokumentasi/package sudah diubah ke "FloodGuard Surabaya", tetapi **kode sumber masih memakai nama lama "IsoCity"/"IsoCoaster"** (mis. `src/app/layout.tsx:25`, `src/components/game/Sidebar.tsx:570`, key localStorage `isocity-*`, domain `iso-city.com`). Ini relevan saat migrasi nanti.

---

## 1. Project Overview

### Apa yang dilakukan game ini

Game simulasi pembangunan kota **isometrik** (city-builder, bergaya SimCity) yang berjalan di browser. Pemain membangun zona (residensial/komersial/industri), jalan, rel, jembatan, utilitas (listrik/air), layanan (polisi/pemadam/rumah sakit/sekolah), taman, dan bangunan spesial, lalu mengelola anggaran, pajak, serta tingkat kepuasan/kesehatan/keamanan/lingkungan. Simulasi menumbuhkan bangunan secara otonom, menjalankan kendaraan (mobil, bus, kereta, pesawat, helikopter, kapal, tongkang, seaplane) dan pejalan kaki, lengkap dengan siklus siang/malam.

Ada **dua game** dalam satu repo:
- **IsoCity** — city-builder utama, route `/` (fokus dokumen ini).
- **IsoCoaster** — pembangun taman hiburan/roller coaster, route `/coaster` (varian terpisah di `src/games/coaster/` dan `src/components/coaster/`).

Terdapat juga mode **Co-op multiplayer** realtime berbasis Supabase, fitur **share kota via URL**, **multi-save** di localStorage, dan **i18n 9 bahasa**.

### Tech stack & versi (dari `package.json`)

| Komponen | Versi | Catatan |
|---|---|---|
| Next.js | `^16.1.1` | App Router |
| React / React DOM | `^19.2.1` | React Compiler aktif (`next.config.js:6`) |
| TypeScript | `^5` | strict mode (`tsconfig.json:11`) |
| Tailwind CSS | `^3.4.14` | + `tailwindcss-animate` |
| Radix UI | berbagai `^1.x`/`^2.x` | dasar komponen shadcn/ui |
| `@supabase/supabase-js` | `^2.89.0` | multiplayer co-op |
| `gt-next` | `^6.12.3` | i18n (General Translation) |
| `lz-string` | `^1.5.0` | kompresi save/share |
| `lucide-react` | `^0.453.0` | ikon |
| `@vercel/analytics` | `^1.6.1` | analitik |
| `sharp` (dev) | `^0.34.5` | kompres gambar PNG→WebP |

**Grafik:** murni **HTML5 Canvas**, tanpa game engine eksternal.

---

## 2. Full File Structure

### `/src` (anotasi)

```
src/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout: font, metadata, GTProvider, Analytics
│   ├── page.tsx                      # Landing + game utama (route /)
│   ├── globals.css                   # CSS variables tema dark, animasi, util mobile
│   ├── icon.png, opengraph-image.png # Aset metadata
│   ├── coop/[roomCode]/              # Co-op via URL langsung
│   │   ├── page.tsx                  # CoopPage (buka CoopModal dgn pendingRoomCode)
│   │   └── layout.tsx                # generateMetadata "Join co-op {CODE}"
│   ├── thumbnail/                    # Preview kartu OG (noindex)
│   │   ├── page.tsx, layout.tsx
│   └── coaster/                      # Game IsoCoaster (varian terpisah)
│       ├── page.tsx, layout.tsx, opengraph-image.png
│       └── coop/[roomCode]/page.tsx
│
├── components/
│   ├── Game.tsx                      # Shell game utama: rangkai canvas + UI, fork mobile/desktop
│   ├── VinnieDialog.tsx              # Dialog cheat "Cousin Vinnie"
│   ├── buildings/
│   │   └── IsometricBuildings.tsx
│   ├── game/                         # Sistem & UI game IsoCity
│   │   ├── CanvasIsometricGrid.tsx   # ★ Engine render isometrik (canvas), 6 layer, RAF loops
│   │   ├── Sidebar.tsx, TopBar.tsx, MiniMap.tsx, OverlayModeToggle.tsx
│   │   ├── constants.ts, types.ts, utils.ts, index.ts
│   │   ├── drawing.ts, renderHelpers.ts, imageLoader.ts, placeholders.ts
│   │   ├── buildingSprite.ts, buildingHelpers.ts
│   │   ├── roadDrawing.ts, bridgeDrawing.ts, bridgeSystem.ts
│   │   ├── trafficSystem.ts, vehicleSystems.ts
│   │   ├── trainSystem.ts, railSystem.ts
│   │   ├── aircraftSystems.ts, drawAircraft.ts, seaplaneSystem.ts
│   │   ├── boatSystem.ts, bargeSystem.ts
│   │   ├── pedestrianSystem.ts, drawPedestrians.ts
│   │   ├── effectsSystems.ts, lightingSystem.ts, overlays.ts
│   │   ├── gridFinders.ts, incidentData.ts
│   │   └── panels/                   # Dialog/panel: Budget, Statistics, Advisors,
│   │       │                         #   Settings, TileInfo, SpriteTest, index
│   ├── mobile/                       # MobileToolbar.tsx, MobileTopBar.tsx
│   ├── multiplayer/                  # CoopModal.tsx, ShareModal.tsx
│   ├── coaster/                      # UI & sistem IsoCoaster (terpisah)
│   └── ui/                           # shadcn/Radix: badge,button,card,dialog,dropdown-menu,
│                                     #   input,label,progress,scroll-area,separator,slider,
│                                     #   switch,tabs,tooltip + Icons,CommandMenu,
│                                     #   LanguageSelector,TipToast
│
├── context/
│   ├── GameContext.tsx               # ★ State global game (useState + refs), autosave, multi-save
│   ├── MultiplayerContext.tsx        # State co-op (room, players, broadcast)
│   └── CoasterContext.tsx            # State game coaster
│
├── core/                             # Engine generik (reusable antar-game)
│   ├── index.ts
│   └── types/  (entities.ts, grid.ts, rendering.ts, index.ts)
│
├── games/                            # Model data per-game
│   ├── index.ts                      # export * as isocity / coaster
│   ├── isocity/
│   │   ├── index.ts
│   │   └── types/  (buildings,economy,services,zones,game,index)
│   └── coaster/  (index, saveUtils, lib/coasterRenderConfig, types/*)
│
├── hooks/
│   ├── useCheatCodes.ts              # Konami/motherlode/fund/vinnie
│   ├── useTipSystem.ts               # Tips pemula
│   ├── useMobile.ts                  # Deteksi mobile/tablet/touch
│   ├── useMultiplayerSync.ts         # Sinkronisasi state co-op
│   ├── useCoasterMultiplayerSync.ts
│   └── useCopyRoomLink.ts
│
├── lib/
│   ├── simulation.ts                 # ★ Mesin simulasi IsoCity (tick, growth, ekonomi)
│   ├── renderConfig.ts               # Konfigurasi sprite pack (peta building→sprite)
│   ├── cityManager.ts                # Multi-kota dalam satu peta (ekonomi per sub-kota)
│   ├── performanceUtils.ts           # SpatialGrid, LOD, culling, cache, chunk renderer
│   ├── saveWorker.ts                 # Web Worker kompresi/dekompresi
│   ├── saveWorkerManager.ts          # Manajer worker + fallback main-thread
│   ├── shareState.ts                 # Encode/decode state ke URL (#s=...)
│   ├── names.ts                      # Generator nama kota & badan air
│   ├── utils.ts                      # cn() util (clsx + tailwind-merge)
│   └── multiplayer/  (database.ts, supabaseProvider.ts, types.ts)
│
├── types/game.ts                     # Re-export @/games/isocity/types (backward compat)
├── loadTranslations.js               # Loader terjemahan gt-next
└── proxy.ts                          # Rewrite iso-coaster.com → /coaster
```

### `/public` (ringkasan; detail di §8)

```
public/
├── _gt/                 # 8 file JSON terjemahan gt-next (tanpa en)
├── assets/              # Sprite sheet utama (PNG+WebP) + subfolder:
│   ├── buildings/       #   24 ikon bangunan individual
│   ├── ages/            #   5 sprite era (legacy, tak dipakai)
│   └── coaster/         #   12 sprite sheet mode coaster
├── example-states/      # 12 JSON save IsoCity
├── example-states-coaster/  # 2 JSON save coaster
├── games/               # 9 screenshot iPhone (.PNG) — sumber crop-screenshots.sh
├── map-data/            # SBY_Barat/Pusat/Selatan/Timur/Utara.json (BELUM dipakai di src)
├── og-image.png, readme-image.png, readme-coaster.png
```

> **Total `/public`:** ~172 file. **`favicon.ico` & `opengraph-image.png` tidak ada di disk** meski dirujuk metadata (`layout.tsx:36,46`); file yang ada adalah `og-image.png`.

---

## 3. Core Game Systems

### 3.1 Rendering grid isometrik — **HTML5 Canvas**

Entry: `CanvasIsometricGrid` (`src/components/game/CanvasIsometricGrid.tsx:126`).

**Dimensi tile** (`src/components/game/types.ts:6-9`):
- `TILE_WIDTH = 64`, `HEIGHT_RATIO = 0.60`, `TILE_HEIGHT = 38.4`, `KEY_PAN_SPEED = 520`.

**Konversi koordinat** (`src/components/game/utils.ts:405-424`) — proyeksi isometrik 2:1:
- `gridToScreen`: `screenX = (x−y)·(w/2)`, `screenY = (x+y)·(h/2)`.
- `screenToGrid`: invers + `Math.round`.

**Depth sorting:** kunci utama `depth = x + y` (multi-tile: `+ width + height − 2`). Iterasi mengikuti diagonal band `sum = x+y` (`CanvasIsometricGrid.tsx:1667-1672`), lalu `insertionSortByDepth` (`1057-1070`). Culling diagonal di `1028-1032`.

**6 canvas berlapis** (`CanvasIsometricGrid.tsx:3053-3090`):
1. `canvasRef` — terrain, air, jalan, rel, base.
2. `hoverCanvasRef` — highlight hover/seleksi.
3. `carsCanvasRef` — mobil, bus, kereta, kapal, pejalan kaki.
4. `buildingsCanvasRef` — sprite bangunan + overlay layanan.
5. `airCanvasRef` — pesawat, kembang api, indikator insiden.
6. `lightingCanvasRef` — overlay siang/malam (`mixBlendMode: multiply`).

**Zoom & pan:** `ZOOM_MIN=0.3`, `ZOOM_MAX=5` (`constants.ts:62-63`); default zoom mobile `0.6`/desktop `1`. Wheel zoom anchor ke kursor (`2852-2898`), keyboard WASD/panah (`604-672`), touch pan + pinch (`2915-2977`). **LOD** di `performanceUtils.ts:116-177`.

### 3.2 Game loop / tick system

**Simulasi** dijalankan oleh `setInterval` di **GameContext** (bukan canvas) (`src/context/GameContext.tsx:797-830`):

| Speed | Interval desktop | Interval mobile |
|---|---|---|
| 0 | pause | pause |
| 1 | 500 ms | 750 ms |
| 2 | 300 ms | 450 ms |
| 3 | 200 ms | 300 ms |

Tiap interval memanggil `simulateTick()` → tulis ke `latestStateRef`; React `setState` di-throttle **500 ms** agar UI tidak memblok render.

**Render** memakai **3 loop `requestAnimationFrame`** independen di `CanvasIsometricGrid.tsx`: sync ref (`483-507`), render terrain/bangunan (`968-2171`), animasi kendaraan target 16ms desktop/33ms mobile (`2380-2517`).

**Waktu game** (`src/lib/simulation.ts:2437-2454`): **30 tick = 1 hari**; **450 tick = 1 siklus siang/malam visual** (15 hari); tiap hari ke-7 deposit `(income − expenses)/4`.

### 3.3 Mesin simulasi (`src/lib/simulation.ts`)

`DEFAULT_GRID_SIZE = isMobile ? 50 : 70` (`:29`).

Fungsi inti: `createInitialGameState` (`:1168`), `simulateTick` (`:2152`), `calculateServiceCoverage` (`:1255`), `evolveBuilding` (`:1518`), `calculateStats` (`:1757`), `updateBudgetCosts` (`:1965`), `placeBuilding` (`:2771`), `bulldozeTile` (`:3064`), `getBuildingSize` (`:2552`), `upgradeServiceBuilding` (`:1351`).

**Resource:**
- **Uang:** `income = floor(pop·tax·0.1 + jobs·tax·0.05)` (`:1896-1907`); pengeluaran per departemen × funding.
- **Populasi/jobs:** `efficiency = (powered?0.5)+(watered?0.5)`, `pop = floor(maxPop·level·eff·0.8)` (`:1742-1750`).
- **Power/water:** coverage radius Euclidean dari `SERVICE_CONFIG` (power 15, water 12, police 13, fire 18, hospital 24, school 11, university 19) (`:1303-1323`).
- **Pollution:** `pollution = max(0, pollution·0.95 + BUILDING_STATS.pollution)` per tick (`:2302-2304`); dibersihkan green amenities.
- **Crime & traffic:** field `Tile.crime`/`Tile.traffic` **diinisialisasi 0 dan TIDAK disimulasikan** di `simulateTick`. Crime hanya **visual** di render layer (`vehicleSystems.ts`). Rating "safety" dihitung dari coverage polisi/pemadam (`:1915`).
- **Land value:** default 50 (naik ke 60 dekat air saat generate); dibaca untuk level, **tidak di-update dinamis per tick**.
- **Demand R/C/I:** dari rasio jobs/populasi + bonus bangunan + pajak (`:1881-1894`), smoothing 12%/tick.

**Pertumbuhan bangunan:** spawn di tile zona berumput dgn akses jalan (BFS max 8 tile); list pertumbuhan di `buildings.ts:58-60`; `targetLevel = min(5, floor(landValue/24 + coverage/28 + age/60 + demandBoost))` (`:1668-1670`). Konstruksi 24–36%/tick; abandonment saat demand sangat negatif & tua.

### 3.4 Penempatan & rendering sprite

- **Konfigurasi sprite** `src/lib/renderConfig.ts`: interface `SpritePack` (`:8-179`), pack default `SPRITE_PACK_SPRITES4` grid 5×6 `globalScale 0.8` (`:228-231`), `getSpriteCoords()` (`:819-886`).
- **`buildingSprite.ts`:** `selectSpriteSource` (`:76`), `calculateSpriteCoords` (`:280`), `calculateSpriteScale` (`:514`), `calculateSpriteOffsets` (`:631`), `getSpriteRenderInfo` (`:767`). Varian deterministik via seed `(x·31 + y·17) % n`.
- **`imageLoader.ts`:** `loadImage` cache + prefer WebP (`:95-122`); `loadSpriteImage` **menghapus background merah RGB(255,0,0)** threshold 155 (`:210-226`).
- **`drawing.ts`:** grass/grey base, foundation plot, pantai digambar procedural (bukan file gambar).
- **`roadDrawing.ts`** (lane/trotoar/lampu), **`bridgeDrawing.ts`** (deck 3D + menara suspension).

### 3.5 Sistem kendaraan & agen

| File | Peran ringkas |
|---|---|
| `trafficSystem.ts` | Deteksi avenue/highway, lampu lalu lintas (hijau 3s/kuning 0.8s) |
| `vehicleSystems.ts` | Mobil dekoratif (max 800), bus (min pop 600), insiden kriminal (visual), kendaraan darurat, pejalan kaki (max 560) |
| `trainSystem.ts` | Kereta (min 6 tile rel, max 35/8), spawn dari stasiun, collision avoidance |
| `railSystem.ts` | Render rel, perlintasan + gerbang, BFS jalur rel |
| `aircraftSystems.ts` + `drawAircraft.ts` | Pesawat (pop≥2000 + airport), helikopter (pop≥3000) — gerak di screen space |
| `seaplaneSystem.ts` | Seaplane (pop≥3000, bay≥12 tile air) |
| `boatSystem.ts` | Perahu dari marina/pier |
| `bargeSystem.ts` | Tongkang kargo ($500–$5000) dari marina terhubung laut |
| `bridgeSystem.ts` | Deteksi peluang jembatan saat drag jalan (max span 14) |
| `pedestrianSystem.ts` + `drawPedestrians.ts` | Pejalan kaki: state machine, path jalan, ke taman/pantai |

Pathfinding: `pickNextDirection` (random walk hindari U-turn) & `findPathOnRoads` (BFS 4-arah) di `utils.ts`.

### 3.6 Efek & overlay

- `effectsSystems.ts`: kembang api (malam, dekat stadium/amusement_park), asap pabrik, awan.
- `lightingSystem.ts`: `getDarkness(hour)`, ambient color, lampu jendela; overlay multiply.
- `overlays.ts`: `OVERLAY_CONFIG`, map tool→overlay, warna coverage. Mode: `none|power|water|fire|police|health|education|subway` (`types.ts:530`).
- `incidentData.ts`: `CrimeType` + `CRIME_DATA`, deskripsi kebakaran.

### 3.7 Save / load (lz-string)

- **Autosave** tiap 5 detik ke `localStorage['isocity-game-state']` (`GameContext.tsx:748-780`), dikompres `compressToUTF16`.
- Sebelum save: `optimizeStateForSave` (kosongkan notifikasi, potong history ke 50) (`:307-323`); limit 5MB; cleanup quota.
- **Web Worker** `saveWorker.ts` + `saveWorkerManager.ts`: `serializeAndCompressAsync` (JSON.stringify → ArrayBuffer transferable → worker compress), fallback main-thread bila worker gagal/timeout 15s.
- **Migrasi saat load** (`:208-288`): `park_medium`→`park_large`, isi `gameVersion`, generate UUID, dll.

---

## 4. State Management

**Pola:** **React Context + `useState`** (bukan Redux/Zustand/useReducer).

- `GameProvider` (`src/context/GameContext.tsx:648`) menyimpan `useState<GameState>` (`:649`) + `latestStateRef` (`:713-715`) untuk canvas; React state di-throttle 500ms.
- Tipe nilai context `GameContextValue` (`:57-106`), provider value (`:1631-1678`), hook `useGame()` (`:1683-1688`).
- **Fungsi yang diekspor** (ringkas): `setTool`, `setSpeed`, `setTaxRate`, `setActivePanel`, `setBudgetFunding`, `placeAtTile`, `upgradeServiceBuilding`, `newGame`, `loadState`, `exportState`, `generateRandomCity`, `expandCity`/`shrinkCity`, `addMoney`, `addNotification`, multi-save (`saveCity`/`loadSavedCity`/`deleteSavedCity`/`renameSavedCity`), sprite pack & day/night, callback multiplayer (`setPlaceCallback`/`setBridgeCallback`).

**Provider tree saat game aktif** (`page.tsx:454-468`):
```
MultiplayerContextProvider → GameProvider(startFresh?) → <Game />
```

**localStorage keys (IsoCity):**

| Key | Isi |
|---|---|
| `isocity-game-state` | Autosave game aktif (LZ-UTF16) |
| `isocity-saved-cities-index` | Index `SavedCityMeta[]` |
| `isocity-city-{id}` | Slot save per kota |
| `isocity-saved-city` | Backup sebelum lihat shared city |
| `isocity-sprite-pack` | Preferensi sprite pack |
| `isocity-day-night-mode` | `auto\|day\|night` |
| `isocity-tips-disabled`, `isocity-tips-shown` | Preferensi tips |

> `cityManager.ts` BUKAN sistem save — ia mengelola **sub-kota dalam satu peta** (ekonomi per kota, cache O(1)). Game coaster memakai key terpisah `coaster-*` (`src/games/coaster/saveUtils.ts:5-7`).

---

## 5. TypeScript Types & Data Models

> Tidak ada type bernama `Cell`. Unit grid = **`Tile`**. Sumber kanonik: `src/games/isocity/types/*`; `src/types/game.ts` hanya re-export (`:16-17`).

### Entitas inti (`src/games/isocity/types/game.ts`)

**`GameState`** (`:150-176`): `id`, `grid: Tile[][]`, `gridSize`, `cityName`, `year/month/day/hour/tick`, `speed: 0|1|2|3`, `selectedTool: Tool`, `taxRate`, `effectiveTaxRate`, `stats: Stats`, `budget: Budget`, `services: ServiceCoverage`, `notifications[]`, `advisorMessages[]`, `history[]`, `activePanel`, `disastersEnabled`, `adjacentCities[]`, `waterBodies[]`, `gameVersion`, `cities: City[]`.

**`Tile`** (`:97-108`): `x`, `y`, `zone: ZoneType`, `building: Building`, `landValue`, `pollution`, `crime`, `traffic`, `hasSubway`, `hasRailOverlay?`.

**`Building`** (`buildings.ts:35-56`): `type: BuildingType`, `level`, `population`, `jobs`, `powered`, `watered`, `onFire`, `fireProgress`, `age`, `constructionProgress`, `abandoned`, + opsional `flipped?`, `cityId?`, dan metadata jembatan (`bridgeType?`, `bridgeOrientation?`, `bridgeVariant?`, `bridgePosition?`, `bridgeIndex?`, `bridgeSpan?`, `bridgeTrackType?`).

**`City`** (`:110-116`), **`AdjacentCity`** (`:118-124`), **`WaterBody`** (`:126-133`), **`Notification`** (`:135-141`), **`AdvisorMessage`** (`:143-148`), **`SavedCityMeta`** (`:178-188`, ada `roomCode?`).

### BuildingType — **66 nilai** (`buildings.ts:5-29`)

Terrain/infra (7): `empty, grass, water, road, bridge, rail, tree`. Residential (5), Commercial (5), Industrial (4), Services (8: police_station, fire_station, hospital, school, university, park, park_large, tennis), Utilities (2: power_plant, water_tower), Transport (2: subway_station, rail_station), Special (6: stadium, museum, airport, space_program, city_hall, amusement_park), Parks/rekreasi (27). Daftar pertumbuhan di `buildings.ts:58-60` (catatan: `factory_large` duplikat di array industrial). `BUILDING_STATS` (`:62-129`) = `{maxPop, maxJobs, pollution, landValue}` per type.

### Zona, Ekonomi, Layanan, Tools

- **`ZoneType`** (`zones.ts:5`): `none | residential | commercial | industrial`.
- **`Stats`** (`economy.ts:5-21`): population, jobs, money, income, expenses, happiness, health, education, safety, environment, `demand{residential,commercial,industrial}`. (pollution/crime/traffic/landValue ada di **Tile**, bukan di Stats.)
- **`Budget`** (`economy.ts:29-38`): 8 kategori `BudgetCategory{name,funding,cost}` — police, fire, health, education, transportation, parks, power, water. Plus `CityEconomy` (`:40-47`), `HistoryPoint` (`:49-55`).
- **`ServiceCoverage`** (`services.ts:5-12`): `police/fire/health/education: number[][]`, `power/water: boolean[][]`.
- **`Tool`** — **59 nilai** (`game.ts:11-26`); `ToolInfo{name,cost,description,size?}` + `TOOL_INFO: Record<Tool,ToolInfo>` (`:28-95`).

### Arsitektur layering types

- **`src/core/types/*`** = engine **generik** (reusable): `grid.ts` (`GridPosition`, `BaseTile{x,y}`, `BaseBuilding{type}`, `Grid<T>`), `entities.ts` (`BaseEntity`, `GridEntity`, particles), `rendering.ts` (`CameraState`, `gridToScreen`/`screenToGrid` default 64×38.4). **Tidak** memuat GameState/Tile/Building IsoCity.
- **`src/games/isocity/types/*`** = model **spesifik IsoCity** (kaya field).
- **Rantai re-export:** `src/types/game.ts` → `@/games/isocity/types` → barrel `index.ts` → buildings/zones/economy/services/game. `src/games/index.ts` meng-`export * as isocity`.

---

## 6. UI Components

### Halaman & shell

- **`layout.tsx`**: font Playfair/DM Sans (`:8-20`), metadata (`:22-56`), `lang` dari `getLocale()`, `<GTProvider>` + `<Analytics>` (`:69-87`).
- **`page.tsx` → `HomePage`** (`:319-697`): spinner → game (`<Game>` dibungkus provider) → landing. Landing punya `SpriteGallery`, `SavedCityCard` (max 5), tombol Continue/New/Co-op/Load Example, `LanguageSelector`, `CoopModal`. Redirect legacy `?room=` → `/coop/{code}`.
- **`Game.tsx`**: fork **mobile vs desktop** (`useMobile`). Hooks: `useGame`, `useCheatCodes`, `useTipSystem`, `useMultiplayerSync`, `useCopyRoomLink`, `useGT`. Sistem kendaraan hidup di dalam `CanvasIsometricGrid` (Game hanya `handleBargeDelivery`). Keyboard: Esc, `B` bulldoze, `P` pause.

**Desktop:** `Sidebar` (w-56) + `TopBar` + `StatsPanel` + Canvas + `OverlayModeToggle` + `MiniMap` + panels.
**Mobile:** `MobileTopBar` + Canvas (padding 72/76px) + `MobileToolbar` + panels (tanpa Sidebar/MiniMap/CommandMenu).

### Komponen kunci

- **`Sidebar.tsx`**: header "ISOCITY" + search ⌘K + invite + exit; tool palette **berbasis teks** (`TOOL_INFO[tool].name` + harga), kategori via `HoverSubmenu`; footer 4 panel.
- **`TopBar.tsx`**: cityName, tanggal, ikon waktu, 4 tombol speed, populasi/jobs/funds, net bulanan, demand R/C/I, slider pajak, `LanguageSelector`. `StatsPanel`: happiness/health/education/safety/environment.
- **Panels** (`Dialog`): `BudgetPanel` (slider funding 8 kategori), `StatisticsPanel` (chart canvas dari history), `AdvisorsPanel` (grade A+–F), `SettingsPanel` (disasters, sprite pack, multi-save, export/import, dev tools/example states, day/night), `TileInfoPanel` (info tile + upgrade service; dirender dari canvas, bukan Game.tsx), `SpriteTestPanel` (dev).

### shadcn / Radix UI

Wrapper di `src/components/ui/`: `dialog` (`@radix-ui/react-dialog`), `dropdown-menu`, `label`, `progress`, `scroll-area`, `separator`, `slider`, `switch`, `tabs`, `tooltip`, `button` (`react-slot`); `CommandMenu` pakai `react-visually-hidden`. Tanpa Radix: `badge`, `card`, `input`. Kustom: `Icons.tsx` (SVG + `ToolIcons`), `CommandMenu.tsx` (⌘K, desktop only), `LanguageSelector.tsx` (9 bahasa, dropdown/drawer), `TipToast.tsx`.

`MiniMap.tsx`: canvas 140×140, warna per zona/building, viewport rect, klik→navigasi. `OverlayModeToggle.tsx`: tombol tiap mode overlay.

---

## 7. Supabase Integration

Dipakai **hanya untuk Co-op multiplayer realtime**. Client lazy-init; bila env kosong, multiplayer dimatikan (`createMultiplayerProvider` throw — `supabaseProvider.ts:64-66`).

**Env vars** (`src/lib/multiplayer/database.ts:40-46`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

**Skema** (SQL inline `database.ts:5-33`) — tabel **`game_rooms`**: `room_code` (PK, 5 char), `city_name`, `game_state` (LZ URI-safe), `created_at`, `updated_at`, `player_count`. RLS public read/write; limit 20MB (`CitySizeLimitError`).

**Fungsi DB:** `createGameRoom` (`:91-127`), `loadGameRoom` (`:132-160`), `updateGameRoom` (`:167-198`), `roomExists` (`:203-216`), `updatePlayerCount` (`:221-234`).

**Realtime** (`supabaseProvider.ts`): channel `room-{code}` (`:86-91`); **Presence** (daftar player), **Broadcast** `action` (aksi game) & `state-sync` (state ke pemain baru); persist throttle 3 detik. `isHost` selalu `false` (`MultiplayerContext.tsx:260`) — simulasi tetap jalan lokal di tiap klien.

**Sinkronisasi** (`useMultiplayerSync.ts`): `applyRemoteAction` (place/placeBatch/bulldoze/tax/budget/speed/disasters/createBridges), broadcast placement di-batch 100ms (max 100), sync DB throttle 2s. Catatan: komentar "only host runs tick" (`:58`) **tidak diimplementasikan**.

**UI:** `CoopModal.tsx` (create/join, auto-join dari `/coop/{code}`, timeout 15s), `ShareModal.tsx` (auto-create room + copy link).

> **Share via URL** (`shareState.ts`) terpisah dari Supabase: encode state ke `#s=...` (`compressToEncodedURIComponent`). Utility lengkap, tetapi loader URL hash **belum ter-wire** ke komponen manapun (`getStateFromUrl`/`decompressGameState` tidak di-import di tempat lain).

---

## 8. Asset Inventory (`/public`)

Total ~172 file (144 gambar, 27 JSON). **Semua file di `public/assets/` punya pasangan `.png` + `.webp`** (runtime prefer WebP via `imageLoader.ts:95-121`).

### Sprite sheet bangunan utama (`public/assets/`, dikonfigurasi `renderConfig.ts:184-741`)
Aktif: `sprites_red_water_new` (base), `_construction`, `_abandoned`, `_dense`, `_modern`, `_farm`, `_shops`, `_stations`, `_services`, `_services-2`, `_parks`, `_parks_construction`, tema `_harry*` & `_china`, `mansion_alternates`.
Tidak direferensikan di `src/`: `sprites_red_water1`, `sprites_red_water_new_1`, `sprites_red_water_new_parks_abandoned`.

### Subfolder
- **`assets/buildings/`** — 24 ikon individual (hanya `residential.png` dipakai, sebagai apple-touch-icon `layout.tsx:72`).
- **`assets/ages/`** — 5 era (`classics, enlightenment, industrial, medeival, modern`), **tak dipakai** di `src/`.
- **`assets/coaster/`** — 12 sheet mode coaster.

### Terrain & kendaraan
- **Terrain:** `water`/`water2`/`water3` (hanya `water` aktif, `constants.ts:177`); **grass & beach digambar procedural** (`drawing.ts`), bukan file.
- **Kendaraan:** hanya **pesawat/seaplane** punya sheet (`sprites_red_water_new_planes`); mobil, kereta, kapal, helikopter, tongkang **digambar procedural** di canvas.

### Data & lainnya
- `public/example-states/` — 12 JSON (IsoCity), dimuat via `fetch` di Settings/landing.
- `public/example-states-coaster/` — 2 JSON.
- `public/map-data/SBY_*.json` — 5 wilayah Surabaya (Barat/Pusat/Selatan/Timur/Utara), **belum di-wire ke `src/`** (relevan untuk migrasi FloodGuard).
- `public/games/IMG_69xx.PNG` — 9 screenshot iPhone (target `crop-screenshots.sh`).
- `public/_gt/*.json` — 8 locale terjemahan.

---

## 9. Scripts & Config

### npm scripts (`package.json`)
| Script | Perintah | Fungsi |
|---|---|---|
| `dev` | `next dev` | Dev server |
| `build` | `npm run compress-images && next build` | Kompres PNG→WebP **lebih dulu** agar WebP siap saat produksi, lalu build + type-check |
| `start` | `next start` | Serve produksi |
| `lint` | `eslint .` | ESLint |
| `crop-screenshots` | `bash scripts/crop-screenshots.sh` | Crop screenshot iPhone |
| `compress-images` | `node scripts/compress-images.mjs` | Konversi PNG→WebP |

### Scripts
- **`scripts/compress-images.mjs`**: pakai `sharp`, scan `public/assets/` rekursif, output `.webp` (quality 80, lossless false), skip bila WebP lebih baru dari PNG.
- **`scripts/crop-screenshots.sh`**: pakai ImageMagick `magick`, chop 450px atas + 700px bawah dari `public/games/*.PNG` (in-place).

### i18n — gt-next (General Translation)
- **9 locale** (`gt.config.json`): `en` (default/sumber), `es, zh, ja, fr, de, pt-BR, it, tr`; output `public/_gt/[locale].json` (8 file, tanpa en).
- `src/loadTranslations.js` memuat JSON locale; `next.config.js` membungkus `withGTConfig`.
- **Pola terjemahan:** `msg('...')` (string statis, mis. `TOOL_INFO` di `game.ts:36+`), `useMessages()`→`m(...)` (label UI), `<T>...</T>` (JSX), `useGT()`→`gt('...')` (dinamis), `<Var>`/`<Plural>` (interpolasi).
- Pemilih bahasa: `LanguageSelector.tsx` (custom, `useLocale`/`useSetLocale`) + `LocaleSelector` (gt-next) di Settings.

### Build & lint config
- **`next.config.js`**: `reactStrictMode: true`, `reactCompiler: true`, dibungkus `withGTConfig`. Tidak ada konfigurasi `images`.
- **`tsconfig.json`**: target ES2017, `strict`, `moduleResolution: bundler`, path alias `@/* → ./src/*`.
- **`tailwind.config.js`**: `darkMode: class`, warna dari CSS variables (`--background`, `--sidebar`, dll.), plugin `tailwindcss-animate`. (Catatan: `fontFamily` merujuk `--font-geist-*` padahal layout memuat Playfair/DM Sans via `--font-display`/`--font-sans`.)
- **`postcss.config.js`**: `tailwindcss` + `autoprefixer`.
- **`eslint.config.mjs`**: flat config minimal `[...eslint-config-next]`.
- **`src/proxy.ts`**: rewrite domain `iso-coaster.com` → `/coaster`; matcher kecualikan static assets.

---

## Lampiran — Temuan penting untuk migrasi (FloodGuard Surabaya)

1. **Nama lama "IsoCity" masih di kode** (UI string, key localStorage `isocity-*`, domain `iso-city.com`, `proxy.ts` untuk `iso-coaster.com`).
2. **`public/map-data/SBY_*.json`** (5 wilayah Surabaya) sudah ada tapi **belum dipakai** — kandidat sumber peta nyata untuk simulasi banjir.
3. **Field `crime` & `traffic` per-tile ada di model tapi tidak disimulasikan** — slot data yang bisa dipakai ulang (mis. untuk genangan/ketinggian air).
4. **Aset kendaraan & terrain mayoritas procedural** (canvas), hanya pesawat & sebagian sprite bangunan dari sheet — memudahkan reskin tematik.
5. **`landValue` & `pollution` per-tile** sudah ada sebagai contoh field skalar per-tile yang dirender via overlay — pola yang bisa ditiru untuk layer "risiko banjir".
6. Arsitektur sudah dipisah **`core` (generik) vs `games/isocity` (spesifik)** — migrasi idealnya menambah modul game baru, bukan menimpa IsoCity.

---

*Dokumen analisis dibuat untuk dibahas lebih lanjut. Belum mencakup rencana migrasi (sesuai instruksi).*
