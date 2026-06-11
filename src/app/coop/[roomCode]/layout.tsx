import type { Metadata } from 'next';

interface Props {
  params: Promise<{ roomCode: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { roomCode } = await params;
  const code = roomCode.toUpperCase();
  
  const title = `Join co-op ${code}`;
  const fullTitle = `FloodGuard Surabaya — ${title}`;
  const description = `Anda diundang bermain co-op FloodGuard! Gabung ruang ${code} untuk mulai bermain.`;

  return {
    title,
    description,
    openGraph: {
      title: fullTitle,
      description,
      siteName: 'FloodGuard Surabaya',
      images: ['/opengraph-image.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: ['/opengraph-image.png'],
    },
  };
}

export default function CoopRoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
