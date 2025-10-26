// src/app/api/audit/route.ts

import { NextResponse } from 'next/server';

const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY;
const PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

// --- Types ---
interface LighthouseCategory { score: number; }
interface LighthouseResult { categories: { performance: LighthouseCategory; accessibility: LighthouseCategory; seo: LighthouseCategory; }; }
interface PageSpeedResponse { lighthouseResult: LighthouseResult; }

/** Helper to get score */
const getScore = (data: PageSpeedResponse, category: 'performance' | 'accessibility' | 'seo'): number => {
  return Math.round((data.lighthouseResult?.categories?.[category]?.score || 0) * 100);
};

export async function POST(request: Request) {
  if (!PAGESPEED_API_KEY) {
    console.error("Server is missing PageSpeed API key.");
    return NextResponse.json({ error: 'Server is missing PageSpeed API key.' }, { status: 500 });
  }

  let url: string | undefined;

  try {
    const body = await request.json();
    url = body.url;
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const categories = ['PERFORMANCE', 'ACCESSIBILITY', 'SEO'];
    
    // --- THIS IS THE FIX ---
    // Added '!' to assert that PAGESPEED_API_KEY is not undefined here,
    // because we already checked it at the start of the function.
    const queryParams = new URLSearchParams({ 
      url: url, 
      key: PAGESPEED_API_KEY!, // Add the '!' here
      strategy: 'mobile' 
    });
    // --- END OF FIX ---

    categories.forEach(category => queryParams.append('category', category));
    const fullApiUrl = `${PAGESPEED_API_URL}?${queryParams.toString()}`;

    console.log(`DEBUG: Calling PageSpeed API for ${url}...`); 

    const response = await fetch(fullApiUrl, { headers: { 'Accept': 'application/json' } });

    if (!response.ok) {
      const errorText = await response.text(); 
      console.error(`PageSpeed API Error: Status ${response.status}`, errorText); 
      let errorMessage = `PageSpeed API failed with status ${response.status}.`;
      try {
         const errorJson = JSON.parse(errorText);
         errorMessage = errorJson.error.message || errorMessage; 
      } catch (parseError) {
         console.warn("Could not parse PageSpeed error response as JSON.");
      }
      throw new Error(errorMessage); 
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
       const responseText = await response.text();
       console.error(`PageSpeed API returned non-JSON content-type: ${contentType}`, responseText);
       throw new Error(`PageSpeed API returned unexpected content type: ${contentType}.`);
    }

    const data: PageSpeedResponse = await response.json();

    if (!data.lighthouseResult || !data.lighthouseResult.categories) {
       console.error("PageSpeed API response missing lighthouseResult:", JSON.stringify(data, null, 2));
       throw new Error("PageSpeed audit completed but returned incomplete data.");
    }

    const results = {
      performance: getScore(data, 'performance'),
      accessibility: getScore(data, 'accessibility'),
      seo: getScore(data, 'seo'),
    };

    console.log(`DEBUG: PageSpeed API success for ${url}. Scores:`, results); 
    return NextResponse.json(results);

  } catch (error) {
    let errorMessage = 'An unknown error occurred during the audit.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error(`Error in audit function for URL: ${url || 'unknown'}. Final error:`, errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}