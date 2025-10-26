// src/app/api/inspect/route.ts

import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
// We don't need the custom bufferToBase64 helper anymore

// --- (Gemini Configuration is the same) ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;
const GEMINI_SYSTEM_PROMPT = "You are an expert web analyst. A user will provide you with the raw text content of a webpage. Your job is to return a concise, one-paragraph summary of the website's purpose, written in a professional and informative tone. Start directly with the summary, do not add 'This website is about...'";


// --- HELPER FUNCTIONS (Complete) ---

/**
 * Scrapes text from a Cheerio object
 */
function scrapeText(selector: string, $: cheerio.CheerioAPI): string[] {
  const texts: string[] = [];
  $(selector).each((i, el) => {
    texts.push($(el).text().trim());
  });
  return texts;
}

/**
 * Calls the Gemini API to get a summary
 */
async function getAiSummary(text: string): Promise<string> {
  const truncatedText = text.substring(0, 100000);
  const payload = {
    contents: [{ parts: [{ text: `Here is the website text: "${truncatedText}"` }] }],
    systemInstruction: { parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
    generationConfig: { temperature: 0.2, maxOutputTokens: 800 }
  };
  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.error("Gemini API Error Response (Not OK):", await response.text());
      throw new Error(`AI analysis failed: ${response.statusText}`);
    }
    const result = await response.json();
    const candidate = result.candidates?.[0];
    if (candidate && candidate.content?.parts?.[0]?.text) {
      return candidate.content.parts[0].text.trim();
    } else {
      console.error("Gemini API returned an unexpected structure:", JSON.stringify(result, null, 2));
      if (candidate?.finishReason === 'SAFETY') return "(AI summary was blocked by content safety filters.)";
      if (candidate?.finishReason === 'MAX_TOKENS') return "(AI summary failed: Model ran out of tokens.)";
      throw new Error("Invalid response structure from AI.");
    }
  } catch (e) {
    console.error("Error in getAiSummary function:", e);
    return "(AI summary could not be generated.)";
  }
}

/**
 * Broken Link Checker Function
 */
async function checkLinks(links: string[]): Promise<string[]> {
  const brokenLinks: string[] = [];
  const results = await Promise.allSettled(
    links.map(link => 
      fetch(link, { 
        method: 'HEAD', 
        redirect: 'follow', 
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        }
      }).then(res => ({ url: link, status: res.status }))
    )
  );
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (result.value.status >= 400) {
        brokenLinks.push(`${result.value.url} (Error: ${result.value.status})`);
      }
    } else {
      brokenLinks.push(`${links[index]} (Error: Failed to connect)`);
    }
  });
  return brokenLinks;
}

// --- Main API Function (UPDATED) ---
export async function POST(request: Request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Server is missing API key.' }, { status: 500 });
  }

  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `https://${url}`;
    }

    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
      },
    });

    if (!response.ok) throw new Error(`Failed to fetch URL: ${response.statusText}`);

    const html = await response.text();
    const $ = cheerio.load(html);
    const baseUrl = new URL(fullUrl).origin;
    const title = $('title').first().text();
    
    // --- 1. UPDATED: Image Search ---
    let ogImage: string | null = null;
    const ogImageTag = $('meta[property="og:image"]').attr('content');
    const twitterImageTag = $('meta[name="twitter:image"]').attr('content');
    const appleIconTag = $('link[rel="apple-touch-icon"]').attr('href');
    const iconTag = $('link[rel="icon"]').attr('href');
    const shortcutIconTag = $('link[rel="shortcut icon"]').attr('href');

    // --- THIS IS THE FIX ---
    // The correct priority: social media > apple icon > other icons
    const imageUrl = ogImageTag || twitterImageTag || appleIconTag || iconTag || shortcutIconTag;

    console.log("DEBUG: Found image URL in HTML:", imageUrl);

    if (imageUrl) {
      try {
        ogImage = new URL(imageUrl, baseUrl).href;
        console.log("DEBUG: Resolved image URL to:", ogImage);
      } catch (e) {
        console.error("DEBUG: Invalid image URL found:", e);
        ogImage = null;
      }
    }
    
    // --- 2. Fetch Image as Base64 ---
    let imageBase64: string | null = null;
    let imageMimeType: string | null = null;
    if (ogImage) {
      try {
        const imageResponse = await fetch(ogImage, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
          }
        });
        
        console.log(`DEBUG: Image fetch status for ${ogImage}: ${imageResponse.status}`);
        
        if (imageResponse.ok) {
          const buffer = await imageResponse.arrayBuffer();
          // --- THIS IS THE FIX ---
          // Use Node.js's built-in Buffer to correctly convert to base64
          imageBase64 = Buffer.from(buffer).toString('base64');
          imageMimeType = imageResponse.headers.get('content-type') || 'image/png';
          console.log(`DEBUG: Successfully converted image to Base64. Mime: ${imageMimeType}`);
        } else {
          console.error(`DEBUG: Failed to fetch image. Status: ${imageResponse.status}, URL: ${ogImage}`);
        }

      } catch (imgError) {
        console.error("DEBUG: Failed to fetch proxy image. Reason:", imgError);
      }
    }

    // --- 3. Link Analysis ---
    let internalLinksCount = 0, externalLinksCount = 0;
    const allLinks = $('a');
    const internalLinksToCheck = new Set<string>();
    allLinks.each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        if (href.startsWith('http')) {
          if (href.startsWith(baseUrl)) {
            internalLinksCount++;
            internalLinksToCheck.add(href);
          } else {
            externalLinksCount++;
          }
        } else if (href.startsWith('/')) {
          internalLinksCount++;
          internalLinksToCheck.add(`${baseUrl}${href}`);
        }
      }
    });
    const linksToScan = Array.from(internalLinksToCheck).slice(0, 50);
    const brokenLinks = await checkLinks(linksToScan);

    // --- 4. AI Summary ---
    $('script, style, nav, footer, aside').remove();
    const allText = [
      ...scrapeText('h1', $),
      ...scrapeText('h2', $),
      ...scrapeText('h3', $),
      ...scrapeText('p', $),
      ...scrapeText('li', $)
    ].join(' ').replace(/\s\s+/g, ' '); 
    const aiSummary = await getAiSummary(allText);

    // --- 5. Assemble Final Results ---
    const results = {
      title: title || '',
      aiSummary: aiSummary,
      ogImage: null,
      imageBase64: imageBase64,
      imageMimeType: imageMimeType,
      links: {
        total: allLinks.length,
        internal: internalLinksCount,
        external: externalLinksCount,
        broken: brokenLinks
      }
    };

    return NextResponse.json(results);

  } catch (error) {
    // --- Full Error Handling ---
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    if (errorMessage.includes('Failed to fetch')) {
      errorMessage = "Could not reach the URL. Make sure it's correct and the site is online.";
    }
    console.error("Error in POST function:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}