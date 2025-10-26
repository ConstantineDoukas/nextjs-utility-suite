// src/app/api/audit/route.ts

import { NextResponse } from 'next/server';

const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY;
const PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

// --- THIS IS THE FIX ---
// We create a type for the API response to avoid using 'any'
interface LighthouseCategory {
  score: number;
}
interface LighthouseResult {
  categories: {
    performance: LighthouseCategory;
    accessibility: LighthouseCategory;
    seo: LighthouseCategory;
  };
}
interface PageSpeedResponse {
  lighthouseResult: LighthouseResult;
}
// --- END OF FIX ---


/**
 * Helper to get score from the Lighthouse report
 */
// --- THIS IS THE FIX ---
// We use our new type here
const getScore = (data: PageSpeedResponse, category: 'performance' | 'accessibility' | 'seo'): number => {
// --- END OF FIX ---
  // Multiply by 100 and round to a whole number
  return Math.round(data.lighthouseResult.categories[category].score * 100);
};

export async function POST(request: Request) {
  if (!PAGESPEED_API_KEY) {
    console.error("Server is missing PageSpeed API key.");
    return NextResponse.json({ error: 'Server is missing PageSpeed API key.' }, { status: 500 });
  }

  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const categories = ['PERFORMANCE', 'ACCESSIBILITY', 'SEO'];
    const queryParams = new URLSearchParams({
      url: url,
      key: PAGESPEED_API_KEY,
      strategy: 'mobile',
    });
    categories.forEach(category => queryParams.append('category', category));

    const fullApiUrl = `${PAGESPEED_API_URL}?${queryParams.toString()}`;

    const response = await fetch(fullApiUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("PageSpeed API Error:", errorData);
      throw new Error(errorData.error.message || 'PageSpeed API request failed');
    }

    // --- THIS IS THE FIX ---
    // We cast the response JSON to our new type
    const data: PageSpeedResponse = await response.json();
    // --- END OF FIX ---

    // Extract the scores we care about
    const results = {
      performance: getScore(data, 'performance'),
      accessibility: getScore(data, 'accessibility'),
      seo: getScore(data, 'seo'),
    };

    return NextResponse.json(results);

  } catch (error) {
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Error in PageSpeed audit function:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}