// src/app/trimmer/page.tsx

import Link from 'next/link';
import VideoTrimmerLoader from '@/components/VideoTrimmerLoader';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-12 bg-gray-950">
      <div className="w-full max-w-lg mb-4">
        {/* --- THIS IS THE FIX --- */}
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
          &larr; Back to Dean&apos;s Utility Suite
        </Link>
        {/* --- END OF FIX --- */}
      </div>
      <div className="relative z-10 text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Video Trimmer
        </h1>
        <p className="text-lg text-gray-400">
          Cut and clip your video files.
        </p>
      </div>
      <VideoTrimmerLoader />
    </main>
  );
}