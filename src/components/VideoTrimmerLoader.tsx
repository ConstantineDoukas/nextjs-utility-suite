'use client'; 

import dynamic from 'next/dynamic';

const VideoTrimmer = dynamic(
  () => import('@/components/VideoTrimmer'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-lg p-8 space-y-6 bg-gray-900 rounded-xl shadow-lg text-white text-center">
        <p>Loading trimmer...</p>
      </div>
    ),
  }
);

export default function VideoTrimmerLoader() {
  return <VideoTrimmer />;
}