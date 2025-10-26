import { NextResponse } from 'next/server';

const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY;
const PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/**
 * Helper to get score from the Lighthouse report
 */
const getScore = (data: any, category: string): number => {
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

    // We'll test the mobile strategy, as it's the most common
    // We request the three most important categories
    const categories = ['PERFORMANCE', 'ACCESSIBILITY', 'SEO'];
    
    const queryParams = new URLSearchParams({
      url: url,
      key: PAGESPEED_API_KEY,
      strategy: 'mobile',
    });
    categories.forEach(category => queryParams.append('category', category));

    const fullApiUrl = `${PAGESPEED_API_URL}?${queryParams.toString()}`;

    // Make the call to Google's API
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

    const data = await response.json();

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
