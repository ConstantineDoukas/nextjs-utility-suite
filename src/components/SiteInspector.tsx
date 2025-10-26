// src/components/SiteInspector.tsx

'use client';

import { useState } from 'react';

// --- (Types and Helper Component are the same) ---
interface InspectionResults {
  title: string;
  aiSummary: string;
  imageBase64: string | null;
  imageMimeType: string | null;
}
interface AuditResults {
  performance: number;
  accessibility: number;
  seo: number;
}
function ScoreCircle({ score }: { score: number }) {
  let colorClass = 'bg-red-500';
  if (score >= 90) {
    colorClass = 'bg-green-500';
  } else if (score >= 50) {
    colorClass = 'bg-yellow-500';
  }
  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center ${colorClass}`}>
        <span className="text-3xl font-bold text-white">{score}</span>
      </div>
    </div>
  );
}

export default function SiteInspector() {
  // --- (State is the same) ---
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<InspectionResults | null>(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditResults, setAuditResults] = useState<AuditResults | null>(null);

  // --- (handleSubmit is the same) ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 
    setIsLoading(true);
    setError(null);
    setResults(null);
    setIsSummaryExpanded(false);
    setAuditResults(null);
    setAuditError(null);
    setIsAuditing(false);

    if (!url) {
       setError('Please enter a URL');
       setIsLoading(false);
       return;
    }
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `https://${url}`;
      setUrl(fullUrl); 
    }

    try {
      const response = await fetch('/api/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fullUrl }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch the URL');
      }
      const data: InspectionResults = await response.json();
      setResults(data);
    } catch (err) {
       if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    }
    finally {
      setIsLoading(false);
    }
  };

  // --- (handleRunAudit is the same) ---
  const handleRunAudit = async () => {
    if (!url) return;
    setIsAuditing(true);
    setAuditError(null);
    setAuditResults(null);
    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Audit failed');
      }
      const data: AuditResults = await response.json();
      setAuditResults(data);
    } catch (err) {
      if (err instanceof Error) {
        setAuditError(err.message);
      } else {
        setAuditError('An unknown audit error occurred.');
      }
    } finally {
      setIsAuditing(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="w-full max-w-lg p-8 space-y-6 bg-gray-900 rounded-xl shadow-lg text-white">
      
      {/* 1. The Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
         <div>
          <label htmlFor="url-input" className="block text-sm font-medium text-gray-300 mb-1">
            Enter a URL to inspect
          </label>
          <input
            id="url-input"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="e.g., vercel.com"
            className="w-full px-4 py-2 font-mono text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg 
                     hover:bg-blue-700 transition duration-300
                     disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Analyzing...' : 'Inspect Site'}
        </button>
      </form>

      {/* 2. Status Messages */}
      {error && (
        <div className="p-4 text-center text-red-300 bg-red-900/50 rounded-lg">
          <p>{error}</p>
        </div>
      )}

      {/* 3. The Results Display */}
      {results && (
        <div className="space-y-6 pt-4 border-t border-gray-700">
          
          {/* AI Analysis Card */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">AI Analysis</h3>
            <div className="flex gap-4">
              <div className="w-24 flex-shrink-0">
                {results.imageBase64 && results.imageMimeType ? (
                  // --- THIS IS THE FIX ---
                  // We're disabling the lint rule for this one line
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={`data:${results.imageMimeType};base64,${results.imageBase64}`} 
                    alt="Site Preview" 
                    className="w-full h-24 object-cover rounded-lg border border-gray-700"
                  />
                  // --- END OF FIX ---
                ) : (
                  <div className="w-full h-24 flex items-center justify-center bg-gray-800 rounded-lg border-gray-700">
                    <p className="text-xs text-gray-500">No Image</p>
                  </div>
                )}
              </div>
              <div className="flex-grow min-w-0">
                <h4 className="text-lg text-white font-semibold truncate" title={results.title || ''}>
                  {results.title || '(No title found)'}
                </h4>
                <p className={`text-sm text-gray-300 ${isSummaryExpanded ? '' : 'line-clamp-3'}`}>
                  {results.aiSummary}
                </p>
                {results.aiSummary.length > 150 && (
                  <button
                    onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 mt-1"
                  >
                    {isSummaryExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* "Run Audit" Button */}
          <div className="pt-6 border-t border-gray-700">
            {!auditResults && !isAuditing && (
              <button
                onClick={handleRunAudit}
                className="w-full px-6 py-3 font-semibold text-white bg-green-600 rounded-lg 
                           hover:bg-green-700 transition duration-300"
              >
                Run Full Site Audit (Lighthouse)
              </button>
            )}

            {isAuditing && (
              <div className="text-center p-4">
                <p className="text-lg text-gray-300 animate-pulse">Running Lighthouse audit...</p>
                <p className="text-sm text-gray-500">(This can take up to 30 seconds)</p>
              </div>
            )}

            {auditError && (
              <div className="p-4 text-center text-red-300 bg-red-900/50 rounded-lg">
                <p className="font-semibold">Audit Failed</p>
                <p className="text-sm">{auditError}</p>
              </div>
            )}

            {/* "Site Audit" Results */}
            {auditResults && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Lighthouse Audit Scores (Mobile)</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <ScoreCircle score={auditResults.performance} />
                    <p className="text-sm text-gray-400 mt-2">Performance</p>
                  </div>
                  <div>
                    <ScoreCircle score={auditResults.accessibility} />
                    <p className="text-sm text-gray-400 mt-2">Accessibility</p>
                  </div>
                  <div>
                    <ScoreCircle score={auditResults.seo} />
                    <p className="text-sm text-gray-400 mt-2">SEO</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
        </div>
      )}
    </div>
  );
}