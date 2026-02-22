/**
 * Job Description Scraper Service
 * 
 * Fetches job descriptions from various job posting sources (LinkedIn, Greenhouse, etc.)
 * by visiting the original job URL and extracting the description content.
 */

interface ScrapedDescription {
    description: string;
    requirements?: string[];
    benefits?: string[];
}

// Source-specific selectors for extracting job descriptions
const SOURCE_SELECTORS: Record<string, {
    descriptionSelectors: string[];
    requirementsSelectors?: string[];
    benefitsSelectors?: string[];
}> = {
    linkedin: {
        descriptionSelectors: [
            'script[type="application/ld+json"]', // JSON-LD (preferred)
            '.description__text',
            '.show-more-less-html__markup',
            '[class*="description"]',
        ],
    },
    greenhouse: {
        descriptionSelectors: [
            '#content',
            '.content',
            '[data-automation="job-description"]',
            '.job-description',
            '#app_body',
        ],
    },
    lever: {
        descriptionSelectors: [
            '.section-wrapper',
            '.content',
            '[data-qa="job-description"]',
        ],
    },
    workday: {
        descriptionSelectors: [
            '[data-automation-id="jobPostingDescription"]',
            '.job-description',
        ],
    },
    default: {
        descriptionSelectors: [
            'script[type="application/ld+json"]',
            '[class*="job-description"]',
            '[class*="description"]',
            '[id*="description"]',
            'article',
            'main',
        ],
    },
};

/**
 * Detect the job source from the URL
 */
function detectSource(url: string): string {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('linkedin.com')) return 'linkedin';
    if (urlLower.includes('greenhouse.io') || urlLower.includes('boards.greenhouse')) return 'greenhouse';
    if (urlLower.includes('lever.co')) return 'lever';
    if (urlLower.includes('workday.com') || urlLower.includes('myworkdayjobs')) return 'workday';
    if (urlLower.includes('jobs.elastic.co')) return 'greenhouse'; // Elastic uses Greenhouse

    return 'default';
}

/**
 * Clean and format extracted description text
 */
function cleanDescription(html: string): string {
    // Remove script and style tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Convert common block elements to newlines
    text = text.replace(/<\/?(p|div|br|li|h[1-6]|ul|ol)[^>]*>/gi, '\n');

    // Remove remaining HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&rsquo;/g, "'");
    text = text.replace(/&lsquo;/g, "'");
    text = text.replace(/&rdquo;/g, '"');
    text = text.replace(/&ldquo;/g, '"');
    text = text.replace(/&mdash;/g, '—');
    text = text.replace(/&ndash;/g, '–');
    text = text.replace(/&bull;/g, '•');

    // Normalize whitespace
    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/\n\s*\n/g, '\n\n');
    text = text.replace(/[ \t]+/g, ' ');
    text = text.split('\n').map(line => line.trim()).join('\n');
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
}

/**
 * Extract JSON-LD job posting data if available
 */
function extractJsonLd(html: string): string | null {
    // First, check for Greenhouse's __remixContext data
    const remixContextMatch = html.match(/window\.__remixContext\s*=\s*({[\s\S]*?});?\s*<\/script>/);
    if (remixContextMatch) {
        try {
            const remixData = JSON.parse(remixContextMatch[1]);
            // Navigate the structure to find job description
            const loaderData = remixData?.state?.loaderData;
            if (loaderData) {
                for (const key of Object.keys(loaderData)) {
                    const data = loaderData[key];
                    if (data?.job_post?.content) {
                        return cleanDescription(data.job_post.content);
                    }
                    // Try alternative structure
                    if (data?.content) {
                        return cleanDescription(data.content);
                    }
                }
            }
        } catch (e) {
            console.log('[JobScraper] Failed to parse __remixContext:', e);
        }
    }

    // Standard JSON-LD extraction
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = jsonLdRegex.exec(html)) !== null) {
        try {
            const data = JSON.parse(match[1]);

            // Handle array of JSON-LD objects
            const items = Array.isArray(data) ? data : [data];

            for (const item of items) {
                if (item['@type'] === 'JobPosting' && item.description) {
                    return cleanDescription(String(item.description));
                }
            }
        } catch {
            // Invalid JSON, continue
        }
    }

    return null;
}

/**
 * Extract description using CSS selectors
 */
function extractWithSelectors(html: string, selectors: string[]): string | null {
    // Simple regex-based extraction (works without a DOM parser)
    for (const selector of selectors) {
        // Handle class selectors
        if (selector.startsWith('.')) {
            const className = selector.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`<[^>]+class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/`, 'i');
            const match = html.match(regex);
            if (match && match[1].length > 100) {
                return cleanDescription(match[1]);
            }
        }

        // Handle ID selectors
        if (selector.startsWith('#')) {
            const id = selector.slice(1);
            const regex = new RegExp(`<[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/`, 'i');
            const match = html.match(regex);
            if (match && match[1].length > 100) {
                return cleanDescription(match[1]);
            }
        }

        // Handle attribute contains selectors [class*="value"]
        if (selector.includes('[') && selector.includes('*=')) {
            const attrMatch = selector.match(/\[([^*]+)\*=["']([^"']+)["']\]/);
            if (attrMatch) {
                const [, attr, value] = attrMatch;
                const regex = new RegExp(`<[^>]+${attr}=["'][^"']*${value}[^"']*["'][^>]*>([\\s\\S]*?)<\\/`, 'i');
                const match = html.match(regex);
                if (match && match[1].length > 100) {
                    return cleanDescription(match[1]);
                }
            }
        }
    }

    return null;
}

/**
 * Fetch job description from a URL
 */
export async function fetchJobDescription(url: string): Promise<ScrapedDescription> {
    if (!url || url === '#') {
        throw new Error('Invalid job URL');
    }

    console.log(`[JobScraper] Fetching description from: ${url}`);

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch job page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const source = detectSource(url);
    const selectors = SOURCE_SELECTORS[source] || SOURCE_SELECTORS.default;

    console.log(`[JobScraper] Detected source: ${source}, HTML length: ${html.length}`);

    // Try JSON-LD first (most reliable)
    let description = extractJsonLd(html);

    // Fall back to CSS selectors
    if (!description) {
        description = extractWithSelectors(html, selectors.descriptionSelectors);
    }

    // Fall back to default selectors if source-specific didn't work
    if (!description && source !== 'default') {
        description = extractWithSelectors(html, SOURCE_SELECTORS.default.descriptionSelectors);
    }

    // Last resort: extract from body/main content
    if (!description) {
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
            const cleaned = cleanDescription(bodyMatch[1]);
            // Only use if it looks like a job description (has enough content)
            if (cleaned.length > 200) {
                description = cleaned.substring(0, 5000); // Limit length
            }
        }
    }

    if (!description) {
        throw new Error('Could not extract job description from page');
    }

    console.log(`[JobScraper] Extracted description: ${description.length} characters`);

    return {
        description: description.substring(0, 10000), // Limit to 10k chars
    };
}
