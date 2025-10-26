// 1. Import our new "Loader" component
import VideoConverterLoader from '@/components/VideoConverterLoader';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-12 bg-gray-950">

      {/* --- ADD THIS NAVIGATION LINK --- */}
      <div className="w-full max-w-lg mb-4">
        <Link href="/">
          <span className="text-sm text-gray-400 hover:text-white transition duration-200">
            &larr; Back to Dean's Utility Suite
          </span>
        </Link>
      </div>
      {/* --- END NAVIGATION LINK --- */}

      <div className="relative z-10 text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          MP4 to MP3 Converter
        </h1>
        <p className="text-lg text-gray-400">
          Powered by Next.js, Tailwind CSS, and FFmpeg.wasm
        </p>
      </div>

      {/* 2. Render the loader component.*/}
      <VideoConverterLoader />
    </main>
  );
}
