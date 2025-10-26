'use client';

import dynamic from 'next/dynamic';

// We will dynamically import the SiteInspector
// just like we do for the other tools.
const SiteInspector = dynamic(
  () => import('@/components/SiteInspector'),
  {
    ssr: false, // Keep it client-side
    loading: () => (
      // A generic loading state
      <div className="w-full max-w-lg p-8 space-y-6 bg-gray-900 rounded-xl shadow-lg text-white text-center">
        <p>Loading tool...</p>
      </div>
    ),
  }
);

export default function SiteInspectorLoader() {
  return <SiteInspector />;
}

