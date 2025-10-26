// src/app/converter/page.tsx

import Link from 'next/link';
import VideoConverterLoader from '@/components/VideoConverterLoader';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-12 bg-gray-950">
      <div className="w-full max-w-lg mb-4">
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
          &larr; Back to Dean&apos;s Utility Suite
        </Link>
      </div>
      <div className="relative z-10 text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          MP4 to MP3 Converter
        </h1>
        <p className="text-lg text-gray-400">
          Powered by Next.js, Tailwind CSS, and FFmpeg.wasm
        </p>
      </div>
      <VideoConverterLoader />
    </main>
  );
}