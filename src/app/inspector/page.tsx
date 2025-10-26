    import SiteInspectorLoader from '@/components/SiteInspectorLoader';
    import Link from 'next/link';
    
    export default function Home() {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center p-12 bg-gray-950">
    
          <div className="w-full max-w-lg mb-4">
            <Link href="/">
              <span className="text-sm text-gray-400 hover:text-white transition duration-200">
                &larr; Back to Dean's Utility Suite
              </span>
            </Link>
          </div>
    
          <div className="relative z-10 text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Site Inspector
            </h1>
            <p className="text-lg text-gray-400">
              Inspect a URL to get its title, description, and headings.
            </p>
          </div>
    
          <SiteInspectorLoader /> 
        </main>
      );
    }
    
