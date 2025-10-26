// src/app/page.tsx

import Link from 'next/link';

const tools = [
  {
    name: "MP4 to MP3 Converter",
    description: "Extract high-quality audio from your video files.",
    href: "/converter",
    status: "live",
  },
  {
    name: "Video Trimmer",
    description: "Quickly trim, cut, and clip your videos.",
    href: "/trimmer",
    status: "live",
  },
  {
    name: "AI Site Inspector",
    description: "Get an AI summary and Lighthouse audit for any site.",
    href: "/inspector",
    status: "live",
  }
];

export default function SuiteHome() {
  return (
    <main className="flex min-h-screen flex-col items-center p-12 md:p-24 bg-gray-950">
      <div className="relative z-10 text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Dean&apos;s Utility Suite
        </h1>
        <p className="text-lg text-gray-400">
          A collection of useful, client-side web tools.
        </p>
      </div>

      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {tools.map((tool) => (
          <div key={tool.name}>
            {tool.status === 'live' ? (
              <Link href={tool.href}>
                <span className="flex flex-col justify-between h-full p-6 bg-gray-900 rounded-xl shadow-lg text-white hover:bg-gray-800 transition-all duration-200 cursor-pointer border border-gray-800 hover:border-blue-600">
                  <div>
                    <h2 className="text-xl font-semibold mb-2">{tool.name}</h2>
                    <p className="text-gray-400 text-sm">{tool.description}</p>
                  </div>
                </span>
              </Link>
            ) : (
              <div className="flex flex-col justify-between h-full p-6 bg-gray-900 rounded-xl shadow-lg text-gray-700 border border-gray-800 opacity-60">
                 <div>
                    <h2 className="text-xl font-semibold mb-2 text-gray-500">{tool.name}</h2>
                    <p className="text-gray-600 text-sm">{tool.description}</p>
                  </div>
                  <p className="text-right text-xs font-medium text-blue-500/50 mt-4">COMING SOON</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}