/**
 * IsoCity Game State Types
 */

import { msg } from 'gt-next';
import { Building } from './buildings';
import { ZoneType } from './zones';
import { Stats, Budget, CityEconomy, HistoryPoint } from './economy';
import { ServiceCoverage } from './services';
import { FloodStats, GameStatus, WeatherState } from './weather';

export type Tool =
  | 'select' | 'bulldoze' | 'road' | 'rail' | 'subway'
  | 'expand_city' | 'shrink_city' | 'tree'
  | 'zone_residential' | 'zone_commercial' | 'zone_industrial' | 'zone_dezone'
  | 'zone_water' | 'zone_land'
  | 'police_station' | 'fire_station' | 'hospital' | 'school' | 'university'
  | 'park' | 'park_large' | 'tennis' | 'power_plant' | 'water_tower'
  | 'subway_station' | 'rail_station' | 'stadium' | 'museum' | 'airport'
  | 'space_program' | 'city_hall' | 'amusement_park'
  | 'basketball_courts' | 'playground_small' | 'playground_large'
  | 'baseball_field_small' | 'soccer_field_small' | 'football_field' | 'baseball_stadium'
  | 'community_center' | 'office_building_small' | 'swimming_pool' | 'skate_park'
  | 'mini_golf_course' | 'bleachers_field' | 'go_kart_track' | 'amphitheater'
  | 'greenhouse_garden' | 'animal_pens_farm' | 'cabin_house' | 'campground'
  | 'marina_docks_small' | 'pier_large' | 'roller_coaster_small'
  | 'community_garden' | 'pond_park' | 'park_gate' | 'mountain_lodge' | 'mountain_trailhead'
  | 'flood_pump' | 'levee' | 'retention_pond' | 'drain_channel' | 'evacuation_post';

export interface ToolInfo {
  name: string;
  cost: number;
  description: string;
  size?: number;
}

export const TOOL_INFO: Record<Tool, ToolInfo> = {
  select: { name: msg('Pilih'), cost: 0, description: msg('Klik untuk melihat info tile') },
  bulldoze: { name: msg('Bongkar'), cost: 10, description: msg('Hapus bangunan dan zona') },
  road: { name: msg('Jalan'), cost: 25, description: msg('Hubungkan wilayah') },
  rail: { name: msg('Rel Kereta'), cost: 40, description: msg('Bangun jalur kereta api') },
  subway: { name: msg('Metro Bawah Tanah'), cost: 50, description: msg('Transportasi bawah tanah') },
  expand_city: { name: msg('Perluas Kota'), cost: 0, description: msg('Tambah 15 tile di setiap tepi') },
  shrink_city: { name: msg('Perkecil Kota'), cost: 0, description: msg('Hapus 15 tile dari setiap tepi') },
  tree: { name: msg('Pohon'), cost: 15, description: msg('Tanam pohon untuk meningkatkan lingkungan') },
  zone_residential: { name: msg('Zona Permukiman'), cost: 50, description: msg('Zonasi untuk perumahan') },
  zone_commercial: { name: msg('Zona Komersial'), cost: 50, description: msg('Zonasi untuk toko dan kantor') },
  zone_industrial: { name: msg('Zona Industri'), cost: 50, description: msg('Zonasi untuk pabrik') },
  zone_dezone: { name: msg('Hapus Zonasi'), cost: 0, description: msg('Hapus zonasi') },
  zone_water: { name: msg('Terraform Air'), cost: 50000, description: msg('Ubah daratan menjadi air') },
  zone_land: { name: msg('Terraform Darat'), cost: 50000, description: msg('Ubah air menjadi daratan') },
  police_station: { name: msg('Kantor Polisi'), cost: 500, description: msg('Meningkatkan keamanan'), size: 1 },
  fire_station: { name: msg('Pos Pemadam'), cost: 500, description: msg('Memadamkan kebakaran'), size: 1 },
  hospital: { name: msg('Rumah Sakit'), cost: 1000, description: msg('Meningkatkan kesehatan (2×2)'), size: 2 },
  school: { name: msg('Sekolah'), cost: 400, description: msg('Pendidikan dasar (2×2)'), size: 2 },
  university: { name: msg('Universitas'), cost: 2000, description: msg('Pendidikan tinggi (3×3)'), size: 3 },
  park: { name: msg('Taman Kecil'), cost: 150, description: msg('Tingkatkan kebahagiaan dan nilai lahan (1×1)'), size: 1 },
  park_large: { name: msg('Taman Besar'), cost: 600, description: msg('Taman luas (3×3)'), size: 3 },
  tennis: { name: msg('Lapangan Tenis'), cost: 200, description: msg('Fasilitas rekreasi'), size: 1 },
  power_plant: { name: msg('Pembangkit Listrik'), cost: 3000, description: msg('Menghasilkan listrik (2×2)'), size: 2 },
  water_tower: { name: msg('Menara Air'), cost: 1000, description: msg('Menyediakan air bersih'), size: 1 },
  subway_station: { name: msg('Stasiun Metro'), cost: 750, description: msg('Akses jaringan metro bawah tanah'), size: 1 },
  rail_station: { name: msg('Stasiun Kereta'), cost: 1000, description: msg('Stasiun penumpang dan kargo'), size: 2 },
  stadium: { name: msg('Stadion'), cost: 5000, description: msg('Meningkatkan permintaan komersial (3×3)'), size: 3 },
  museum: { name: msg('Museum'), cost: 4000, description: msg('Meningkatkan permintaan komersial & permukiman (3×3)'), size: 3 },
  airport: { name: msg('Bandara'), cost: 10000, description: msg('Meningkatkan permintaan komersial & industri (4×4)'), size: 4 },
  space_program: { name: msg('Program Antariksa'), cost: 15000, description: msg('Meningkatkan permintaan industri & permukiman (3×3)'), size: 3 },
  city_hall: { name: msg('Balai Kota'), cost: 6000, description: msg('Meningkatkan semua jenis permintaan (2×2)'), size: 2 },
  amusement_park: { name: msg('Taman Hiburan'), cost: 12000, description: msg('Peningkatan besar permintaan komersial (4×4)'), size: 4 },
  basketball_courts: { name: msg('Lapangan Basket'), cost: 250, description: msg('Fasilitas basket outdoor'), size: 1 },
  playground_small: { name: msg('Taman Bermain Kecil'), cost: 200, description: msg('Taman bermain anak'), size: 1 },
  playground_large: { name: msg('Taman Bermain Besar'), cost: 350, description: msg('Taman bermain luas dengan lebih banyak peralatan (2×2)'), size: 2 },
  baseball_field_small: { name: msg('Lapangan Baseball'), cost: 800, description: msg('Lapangan baseball lokal (2×2)'), size: 2 },
  soccer_field_small: { name: msg('Lapangan Sepak Bola'), cost: 400, description: msg('Lapangan sepak bola'), size: 1 },
  football_field: { name: msg('Lapangan Football'), cost: 1200, description: msg('Stadion football (2×2)'), size: 2 },
  baseball_stadium: { name: msg('Stadion Baseball'), cost: 6000, description: msg('Venue baseball profesional (3×3)'), size: 3 },
  community_center: { name: msg('Pusat Komunitas'), cost: 500, description: msg('Pusat kegiatan warga'), size: 1 },
  office_building_small: { name: msg('Kantor Kecil'), cost: 600, description: msg('Gedung kantor kecil'), size: 1 },
  swimming_pool: { name: msg('Kolam Renang'), cost: 450, description: msg('Fasilitas renang umum'), size: 1 },
  skate_park: { name: msg('Taman Skate'), cost: 300, description: msg('Taman skateboard'), size: 1 },
  mini_golf_course: { name: msg('Mini Golf'), cost: 700, description: msg('Lapangan mini golf (2×2)'), size: 2 },
  bleachers_field: { name: msg('Lapangan Tribun'), cost: 350, description: msg('Lapangan olahraga dengan tribun'), size: 1 },
  go_kart_track: { name: msg('Sirkuit Go-Kart'), cost: 1000, description: msg('Hiburan balap (2×2)'), size: 2 },
  amphitheater: { name: msg('Amfiteater'), cost: 1500, description: msg('Venue pertunjukan outdoor (2×2)'), size: 2 },
  greenhouse_garden: { name: msg('Kebun Rumah Kaca'), cost: 800, description: msg('Rumah kaca botani (2×2)'), size: 2 },
  animal_pens_farm: { name: msg('Kandang Hewan'), cost: 400, description: msg('Peternakan / kebun binatang mini'), size: 1 },
  cabin_house: { name: msg('Rumah Kabin'), cost: 300, description: msg('Retret kabin pedesaan'), size: 1 },
  campground: { name: msg('Area Perkemahan'), cost: 250, description: msg('Area berkemah outdoor'), size: 1 },
  marina_docks_small: { name: msg('Marina'), cost: 1200, description: msg('Dermaga kapal (2×2, harus di tepi air)'), size: 2 },
  pier_large: { name: msg('Dermaga'), cost: 600, description: msg('Dermaga tepi air (harus di tepi air)'), size: 1 },
  roller_coaster_small: { name: msg('Roller Coaster'), cost: 3000, description: msg('Wahana mendebarkan (2×2)'), size: 2 },
  community_garden: { name: msg('Kebun Komunitas'), cost: 200, description: msg('Ruang berkebun bersama'), size: 1 },
  pond_park: { name: msg('Taman Kolam'), cost: 350, description: msg('Taman dengan kolam indah'), size: 1 },
  park_gate: { name: msg('Gerbang Taman'), cost: 150, description: msg('Pintu masuk taman dekoratif'), size: 1 },
  mountain_lodge: { name: msg('Penginapan Gunung'), cost: 1500, description: msg('Penginapan alam (2×2)'), size: 2 },
  mountain_trailhead: { name: msg('Pintu Jalur Pendakian'), cost: 400, description: msg('Pintu masuk jalur hiking (3×3)'), size: 3 },
  flood_pump: { name: msg('Pompa Banjir'), cost: 3000, description: msg('Memompa air dari area sekitar'), size: 2 },
  levee: { name: msg('Tanggul'), cost: 120, description: msg('Menahan aliran air gravitasi'), size: 1 },
  retention_pond: { name: msg('Waduk Penampung'), cost: 800, description: msg('Menampung kelebihan air (3×3)'), size: 3 },
  drain_channel: { name: msg('Saluran Drainase'), cost: 40, description: msg('Mempercepat pengaliran & peresapan air'), size: 1 },
  evacuation_post: { name: msg('Pos Evakuasi'), cost: 500, description: msg('Meningkatkan keselamatan warga di area sekitar'), size: 1 },
};

export interface Tile {
  x: number;
  y: number;
  zone: ZoneType;
  building: Building;
  landValue: number;
  pollution: number;
  crime: number;
  traffic: number;
  hasSubway: boolean;
  hasRailOverlay?: boolean;
  /**
   * Elevasi permukaan tanah dalam METER (rentang data Surabaya: 0–50).
   * Sentinel -1 = tidak ada data elevasi (peta procedural IsoCity lama).
   */
  elevation: number;
  /**
   * Ketinggian genangan air di atas permukaan tanah, dalam METER —
   * SATUAN SAMA dengan `elevation` (bukan 0–255). Aliran gravitasi
   * membandingkan `elevation + waterLevel` antar tile. 0 = kering.
   * (Belum disimulasikan di Fase 1; simulasi banjir masuk Fase 4.)
   */
  waterLevel: number;
  /**
   * Arah aliran air dominan: 0 = tidak ada, 1 = utara (-y),
   * 2 = timur (+x), 3 = selatan (+y), 4 = barat (-x).
   */
  flowDirection: number;
  /**
   * false = tile padding/void di luar area data wilayah (laut/batas peta) —
   * tidak bisa dibangun dan tidak ikut perhitungan playableTileCount.
   * Peta procedural IsoCity lama: selalu true.
   */
  playable: boolean;
}

/** Lima wilayah peta Surabaya (sumber: public/map-data/SBY_*_processed.json). */
export type FloodRegion = 'Barat' | 'Pusat' | 'Selatan' | 'Timur' | 'Utara';

/**
 * Format file hasil preprocessing peta (scripts/preprocess-maps.mjs).
 * Semua array flat berukuran gridSize*gridSize, row-major: index = y * gridSize + x.
 */
export interface FloodMapData {
  version: number;
  region: FloodRegion;
  /** N — grid persegi N×N (semua wilayah di-pad ke ukuran sama). */
  gridSize: number;
  /** Dimensi area data asli (sebelum padding) di dalam grid N×N. */
  dataWidth: number;
  dataHeight: number;
  /** Offset penempatan area data di dalam grid N×N (padding terdistribusi merata). */
  offsetX: number;
  offsetY: number;
  /** Elevasi dalam METER (0–50), dibulatkan 1 desimal. -1 untuk tile padding/void. */
  elevation: number[];
  /** Tier elevasi 0–9 (derived dari elevation). */
  tier: number[];
  /** 1 = badan air statis (tier-0 interior), 0 = bukan. */
  water: (0 | 1)[];
  /** 1 = playable, 0 = padding/void (laut atau luar area data). */
  playable: (0 | 1)[];
}

export interface City {
  id: string;
  name: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  economy: CityEconomy;
  color: string;
}

export interface AdjacentCity {
  id: string;
  name: string;
  direction: 'north' | 'south' | 'east' | 'west';
  connected: boolean;
  discovered: boolean;
}

export interface WaterBody {
  id: string;
  name: string;
  type: 'lake' | 'ocean';
  tiles: { x: number; y: number }[];
  centerX: number;
  centerY: number;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  icon: string;
  timestamp: number;
}

export interface AdvisorMessage {
  name: string;
  icon: string;
  messages: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface GameState {
  id: string;
  grid: Tile[][];
  gridSize: number;
  cityName: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  tick: number;
  speed: 0 | 1 | 2 | 3;
  selectedTool: Tool;
  taxRate: number;
  effectiveTaxRate: number;
  stats: Stats;
  budget: Budget;
  services: ServiceCoverage;
  notifications: Notification[];
  advisorMessages: AdvisorMessage[];
  history: HistoryPoint[];
  activePanel: 'none' | 'budget' | 'statistics' | 'advisors' | 'settings';
  disastersEnabled: boolean;
  adjacentCities: AdjacentCity[];
  waterBodies: WaterBody[];
  gameVersion: number;
  cities: City[];
  /** Wilayah Surabaya yang dipilih (peta FloodGuard). Opsional — save lama tidak punya field ini. */
  selectedRegion?: FloodRegion;
  /**
   * Jumlah tile playable (tile.playable === true) saat peta wilayah dimuat.
   * UT-1: penyebut floodedRatio di Fase 4-5 — BUKAN gridSize².
   */
  playableTileCount?: number;
  /** Cuaca aktif — hanya disimulasikan bila selectedRegion ada (Fase 4). */
  weatherState?: WeatherState;
  /** Statistik genangan — dihitung tiap tick saat simulasi banjir aktif. */
  floodStats?: FloodStats;
  /** Menang/kalah — hanya untuk mode FloodGuard. */
  gameStatus?: GameStatus;
}

export interface SavedCityMeta {
  id: string;
  cityName: string;
  population: number;
  money: number;
  year: number;
  month: number;
  gridSize: number;
  savedAt: number;
  roomCode?: string;
  /** Wilayah asal permainan FloodGuard, bila ada */
  selectedRegion?: FloodRegion;
}
