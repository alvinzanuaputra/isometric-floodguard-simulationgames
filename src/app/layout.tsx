import type { Metadata, Viewport } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { getLocale } from "gt-next/server";
import { GTProvider } from "gt-next";

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900']
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700']
});

export const metadata: Metadata = {
  metadataBase: new URL('https://floodguard-surabaya.vercel.app'),
  title: {
    default: 'FloodGuard Surabaya',
    template: 'FloodGuard Surabaya — %s',
  },
  description: 'Simulasi manajemen banjir isometrik untuk wilayah Surabaya. Bangun infrastruktur mitigasi, kelola curah hujan, dan lindungi warga dari genangan air.',
  openGraph: {
    title: 'FloodGuard Surabaya',
    description: 'Simulasi manajemen banjir isometrik untuk wilayah Surabaya. Bangun infrastruktur mitigasi, kelola curah hujan, dan lindungi warga dari genangan air.',
    type: 'website',
    siteName: 'FloodGuard Surabaya',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1179,
        height: 1406,
        type: 'image/png',
        alt: 'FloodGuard Surabaya — simulasi banjir isometrik'
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FloodGuard Surabaya',
    description: 'Simulasi manajemen banjir isometrik untuk wilayah Surabaya.',
    images: ['/opengraph-image.png'],
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FloodGuard Surabaya'
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0f1219'
};

export default async function RootLayout({ children }: {children: React.ReactNode;}) {
  return (
  <html className={`dark ${playfair.variable} ${dmSans.variable}`} lang={await getLocale()}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon.png" />
        {/* Preload critical game assets - WebP for browsers that support it */}
        <link
        rel="preload"
        href="/assets/sprites_red_water_new.webp"
        as="image"
        type="image/webp" />

        <link
        rel="preload"
        href="/assets/water.webp"
        as="image"
        type="image/webp" />

      </head>
      <body className="bg-background text-foreground antialiased font-sans overflow-hidden"><GTProvider>{children}<Analytics /></GTProvider></body>
    </html>
  );
}