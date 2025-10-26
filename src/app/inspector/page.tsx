// src/app/inspector/page.tsx

import Link from 'next/link';
import SiteInspectorLoader from '@/components/SiteInspectorLoader';

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
          AI Site Inspector
        </h1>
        <p className="text-lg text-gray-400">
          Get an AI summary and Lighthouse audit for any site.
        </p>
      </div>
      <SiteInspectorLoader />
    </main>
  );
}