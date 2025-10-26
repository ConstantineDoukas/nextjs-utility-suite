// src/app/api/audit/route.ts

import { NextResponse } from 'next/server';

const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY;
const PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

// --- Types ---
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

/**
 * Helper to get score
 */
const getScore = (data: PageSpeedResponse, category: 'performance' | 'accessibility' | 'seo'): number => {
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

    // --- THIS IS THE FIX ---
    // Check if the response seems like valid JSON before parsing
    const contentType = response.headers.get("content-type");
    if (!response.ok || !contentType || !contentType.includes("application/json")) {
      // It's likely an error page or empty response from Google
      const errorText = await response.text(); // Get the raw text
      console.error("PageSpeed API returned non-JSON response:", response.status, errorText);
      // Try to parse Google's specific error format if possible
      try {
         const errorJson = JSON.parse(errorText);
         throw new Error(errorJson.error.message || `PageSpeed API failed with status ${response.status}`);
      } catch (parseError) {
         // If parsing fails, use a generic error
         throw new Error(`PageSpeed API failed with status ${response.status}. Response was not valid JSON.`);
      }
    }
    // --- END OF FIX ---

    // Now it should be safe to parse
    const data: PageSpeedResponse = await response.json();

    // Check if lighthouseResult exists (it might be missing if the audit failed internally)
    if (!data.lighthouseResult || !data.lighthouseResult.categories) {
       console.error("PageSpeed API response missing lighthouseResult:", data);
       throw new Error("PageSpeed audit completed but returned incomplete data.");
    }

    const results = {
      performance: getScore(data, 'performance'),
      accessibility: getScore(data, 'accessibility'),
      seo: getScore(data, 'seo'),
    };

    return NextResponse.json(results);

  } catch (error) {
    let errorMessage = 'An unknown error occurred during the audit.';
    if (error instanceof Error) {
      // Use the specific error message we generated above
      errorMessage = error.message;
    }
    console.error("Error in PageSpeed audit function:", errorMessage);
    // Send the clear error message back to the frontend
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}