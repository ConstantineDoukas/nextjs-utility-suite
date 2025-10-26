import VideoTrimmerLoader from '@/components/VideoTrimmerLoader';
import Link from 'next/link'; // <-- ADD THIS IMPORT

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
          Video Trimmer
        </h1>
        <p className="text-lg text-gray-400">
          Cut and clip your video files.
        </p>
      </div>

      {/* 2. Render the loader component.*/}
      <VideoTrimmerLoader />
    </main>
  );
}
