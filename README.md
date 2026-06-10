# FloodGuard Surabaya

Simulasi manajemen banjir berbasis isometrik untuk kota Surabaya. Dibangun dengan Next.js, TypeScript, dan HTML5 Canvas sebagai proyek komunitas kampus.

**Play:** [floodguard-surabaya.vercel.app](https://floodguard-surabaya.vercel.app/)

<img src="public/readme-image.png" width="100%" alt="FloodGuard Surabaya — screenshot simulasi isometrik">

## Tentang Proyek

FloodGuard Surabaya adalah game simulasi isometrik yang mengajak pemain merancang, mengelola, dan melindungi wilayah perkotaan dari risiko banjir. Pemain dapat membangun infrastruktur, mengatur utilitas, dan mengamati dinamika kota dalam perspektif isometrik.

Proyek ini dikembangkan sebagai bagian dari komunitas **Institut Teknologi Sepuluh Nopember (ITS)**.

| | |
|---|---|
| **Developer** | Alvin Zanua Putra |
| **Komunitas** | Kampus Institut Teknologi Sepuluh Nopember |
| **Repository** | [github.com/alvinzanuaputra/isometric-floodguard-simulationgames](https://github.com/alvinzanuaputra/isometric-floodguard-simulationgames) |
| **Live Demo** | [floodguard-surabaya.vercel.app](https://floodguard-surabaya.vercel.app/) |

## Fitur

- **Rendering Isometrik**: Engine HTML5 Canvas (`CanvasIsometricGrid`) dengan depth sorting, layer management, dan dukungan sprite gambar maupun canvas.
- **Simulasi Dinamis**:
    - **Sistem Lalu Lintas**: Kendaraan otonom — mobil, kereta, pesawat, bus, dan seaplane.
    - **Infrastruktur Kota**: Jembatan, bus, kapal tongkang, dan kendaraan yang menghormati lampu lalu lintas.
    - **Sistem Pejalan Kaki**: Pathfinding dan simulasi kerumunan penduduk kota.
    - **Ekonomi & Sumber Daya**: Manajemen sumber daya, zonasi (Residential, Commercial, Industrial), dan logika pertumbuhan kota.
- **Grid Interaktif**: Sistem penempatan tile untuk bangunan, jalan, rel, taman, utilitas, dan lainnya.
- **Penyimpanan State**: Fitur save dan load untuk beberapa kota.
- **Desain Responsif**: Antarmuka ramah mobile dengan kontrol sentuh, drawer, dan toolbar.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Graphics**: HTML5 Canvas (tanpa game engine eksternal; implementasi native murni)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v18 atau lebih baru)
- npm

### Installation

1. **Clone repository**
    ```bash
    git clone https://github.com/alvinzanuaputra/isometric-floodguard-simulationgames.git
    cd isometric-floodguard-simulationgames
    ```

2. **Install dependencies**
    ```bash
    npm install
    ```

3. **Jalankan development server**
    ```bash
    npm run dev
    ```

4. **Buka game**
    Kunjungi [http://localhost:3000](http://localhost:3000) untuk memainkan FloodGuard Surabaya.

## Deployment

Game ini di-deploy di Vercel dengan nama **FloodGuard Surabaya**:

- Production: [https://floodguard-surabaya.vercel.app/](https://floodguard-surabaya.vercel.app/)

## Kontribusi

Kontribusi, laporan bug, dan saran fitur dipersilakan melalui [GitHub Issues](https://github.com/alvinzanuaputra/isometric-floodguard-simulationgames/issues).

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.

---

Dikembangkan oleh **Alvin Zanua Putra** · Dari Kampus Institut Teknologi Sepuluh Nopember
