/**
 * Web search integration using You.com API
 * This provides server-side web search capabilities for the exam research agent
 */

interface YouSearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface YouSearchResponse {
  results: YouSearchResult[];
}

export async function searchYouApi(query: string, apiKey: string): Promise<YouSearchResult[]> {
  try {
    // You.com Search API endpoint (using the standard search API)
    const response = await fetch(`https://api.you.com/search?query=${encodeURIComponent(query)}&num_web_results=10`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('You.com API error response:', errorText);
      throw new Error(`You.com API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // You.com API might return results in different formats
    // Try to extract results from common response structures
    if (data.hits && Array.isArray(data.hits)) {
      return data.hits.map((hit: any) => ({
        title: hit.title || hit.name || '',
        url: hit.url || hit.link || '',
        snippet: hit.snippet || hit.description || hit.abstract || '',
      }));
    }
    
    if (data.results && Array.isArray(data.results)) {
      return data.results;
    }
    
    if (data.web && Array.isArray(data.web.results)) {
      return data.web.results;
    }
    
    console.warn('Unexpected You.com API response format:', data);
    return [];
  } catch (error) {
    console.error('You.com search error:', error);
    throw new Error('Failed to search with You.com API');
  }
}

/**
 * Fetch and extract text content from a URL
 */
export async function fetchWebPageContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    const html = await response.text();
    
    // Basic HTML text extraction
    // In production, you might want to use a library like cheerio for better parsing
    const text = html
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text.slice(0, 50000); // Limit to 50k characters
  } catch (error) {
    console.error('Web fetch error:', error);
    throw new Error(`Failed to fetch content from ${url}`);
  }
}

/**
 * Search for official exam specification with priority domains
 */
export async function searchOfficialSpecification(
  examName: string,
  youApiKey: string
): Promise<{ url: string; title: string } | null> {
  const searchQueries = [
    `${examName} official specification syllabus`,
    `${examName} exam board format`,
    `${examName} paper structure timing`,
    `${examName} specification document`,
  ];

  const officialDomains = [
    'collegeboard.org',
    'cambridgeinternational.org', 
    'edexcel.com',
    'aqa.org.uk',
    'ocr.org.uk',
    'pearson.com',
    'gov.uk',
    'gov'
  ];

  for (const query of searchQueries) {
    try {
      const results = await searchYouApi(query, youApiKey);
      
      if (!results || results.length === 0) {
        continue;
      }
      
      // Prioritize results from official domains
      for (const result of results) {
        try {
          const url = new URL(result.url);
          if (officialDomains.some(domain => url.hostname.includes(domain))) {
            return { url: result.url, title: result.title };
          }
        } catch (e) {
          // Invalid URL, skip this result
          continue;
        }
      }
      
      // If no official domain found, return first valid result
      for (const result of results) {
        try {
          new URL(result.url); // Validate URL
          return { url: result.url, title: result.title };
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      console.error(`Search failed for query: ${query}`, error);
      continue;
    }
  }

  return null;
}