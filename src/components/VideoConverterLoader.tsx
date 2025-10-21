'use client'; 

import dynamic from 'next/dynamic';

const VideoConverter = dynamic(
  () => import('@/components/VideoConverter'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-lg p-8 space-y-6 bg-gray-900 rounded-xl shadow-lg text-white text-center">
        <p>Loading converter...</p>
      </div>
    ),
  }
);

export default function VideoConverterLoader() {
  return <VideoConverter />;
}