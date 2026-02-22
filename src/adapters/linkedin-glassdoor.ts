import { BaseJobAdapter } from './base';
import { JobSearchParams, RawJobListing } from '@/types';

/**
 * LinkedIn Europe-Wide Jobs Adapter
 * 
 * Scrapes publicly accessible job listings from LinkedIn's public job search
 * across all major European markets. Uses LinkedIn's guest API which doesn't
 * require authentication.
 * 
 * Covers 30+ European countries with pagination support for comprehensive results.
 */
export class LinkedInAdapter extends BaseJobAdapter {
    readonly name = 'linkedin';
    readonly baseUrl = 'https://www.linkedin.com';
    protected override readonly rateLimitRequests = 3;
    protected override readonly rateLimitPerSeconds = 5;

    // All European country-specific LinkedIn domains for better results
    private readonly europeanDomains: Record<string, string> = {
        // Western Europe
        'Netherlands': 'nl',
        'Belgium': 'be',
        'Luxembourg': 'lu',
        'Germany': 'de',
        'Austria': 'at',
        'Switzerland': 'ch',
        'France': 'fr',
        'UK': 'uk',
        'Ireland': 'ie',

        // Southern Europe
        'Spain': 'es',
        'Portugal': 'pt',
        'Italy': 'it',
        'Greece': 'gr',
        'Malta': 'mt',
        'Cyprus': 'cy',

        // Northern Europe
        'Sweden': 'se',
        'Norway': 'no',
        'Denmark': 'dk',
        'Finland': 'fi',
        'Iceland': 'is',

        // Eastern Europe
        'Poland': 'pl',
        'Czech Republic': 'cz',
        'Slovakia': 'sk',
        'Hungary': 'hu',
        'Romania': 'ro',
        'Bulgaria': 'bg',
        'Slovenia': 'si',
        'Croatia': 'hr',

        // Baltic States
        'Lithuania': 'lt',
        'Latvia': 'lv',
        'Estonia': 'ee',

        // Remote/General
        'Remote': 'www',
        'Europe': 'www',
    };

    // Primary European markets to search (most jobs)
    private readonly primaryEuropeanMarkets = [
        'Germany', 'Netherlands', 'UK', 'France', 'Ireland',
        'Spain', 'Italy', 'Poland', 'Sweden', 'Belgium',
        'Switzerland', 'Austria', 'Denmark', 'Finland', 'Portugal',
        'Czech Republic', 'Romania', 'Norway',
    ];

    // All European markets for comprehensive search
    private readonly allEuropeanMarkets = Object.keys(this.europeanDomains);

    async isAvailable(): Promise<boolean> {
        // Always available - no API key needed
        return true;
    }

    async search(params: JobSearchParams): Promise<RawJobListing[]> {
        const jobs: RawJobListing[] = [];
        const seenIds = new Set<string>();

        console.log(`[LinkedIn] Starting Europe-wide job search for: ${params.titles.join(', ')}`);

        // Determine which markets to search
        const marketsToSearch = params.locations.length > 0
            ? params.locations
            : this.primaryEuropeanMarkets;

        // Unlimited mode: when maxResults is undefined, -1, or 0
        const requestedMaxResults = params.maxResults ?? 0;
        const isUnlimited = requestedMaxResults <= 0;
        const totalMaxResults = isUnlimited ? Infinity : requestedMaxResults;

        // Maximum pages to fetch per market (LinkedIn returns 25 per page)
        // In unlimited mode, keep fetching until no more results
        const maxPagesPerMarket = isUnlimited ? 100 : Math.ceil(requestedMaxResults / 25 / marketsToSearch.length) + 1;

        console.log(`[LinkedIn] Mode: ${isUnlimited ? 'UNLIMITED' : `Limited to ${totalMaxResults}`}, Max pages per market: ${maxPagesPerMarket}`);

        for (const title of params.titles) {
            for (const location of marketsToSearch) {
                if (!isUnlimited && jobs.length >= totalMaxResults) break;

                try {
                    let consecutiveEmptyPages = 0;

                    // Continue pagination until no more results or limit reached
                    for (let page = 0; page < maxPagesPerMarket; page++) {
                        if (!isUnlimited && jobs.length >= totalMaxResults) break;

                        const startIndex = page * 25;
                        const searchUrl = this.buildSearchUrl(title, location, params.remoteOnly, startIndex);

                        console.log(`[LinkedIn] Fetching ${location} page ${page + 1}: ${title} (start: ${startIndex})`);

                        const response = await this.rateLimitedFetch(searchUrl, {
                            headers: {
                                'Accept': 'text/html,application/xhtml+xml,application/xml',
                                'Accept-Language': 'en-US,en;q=0.9',
                                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            },
                        });

                        if (!response.ok) {
                            console.warn(`[LinkedIn] ${location}: HTTP ${response.status}`);
                            break; // Move to next market
                        }

                        const html = await response.text();
                        const pageJobs = this.parseJobListings(html, location);

                        if (pageJobs.length === 0) {
                            consecutiveEmptyPages++;
                            console.log(`[LinkedIn] ${location}: Empty page ${page + 1} (consecutive: ${consecutiveEmptyPages})`);

                            // Stop after 2 consecutive empty pages
                            if (consecutiveEmptyPages >= 2) {
                                console.log(`[LinkedIn] ${location}: No more results, moving to next market`);
                                break;
                            }
                            continue;
                        }

                        consecutiveEmptyPages = 0; // Reset on non-empty page

                        // Add unique jobs
                        let newJobsThisPage = 0;
                        for (const job of pageJobs) {
                            const shouldAdd = isUnlimited || jobs.length < totalMaxResults;
                            if (!seenIds.has(job.externalId) && shouldAdd) {
                                seenIds.add(job.externalId);
                                jobs.push(job);
                                newJobsThisPage++;
                            }
                        }

                        console.log(`[LinkedIn] ${location}: Page ${page + 1} - Found ${pageJobs.length} jobs, ${newJobsThisPage} new (total: ${jobs.length})`);

                        // If we got fewer than expected jobs on a page, we might be near the end
                        if (pageJobs.length < 20) {
                            console.log(`[LinkedIn] ${location}: Partial page detected, likely end of results`);
                            break;
                        }

                        // Brief pause between pages to avoid rate limiting
                        await new Promise(r => setTimeout(r, 800));
                    }
                } catch (error) {
                    console.error(`[LinkedIn] Error for "${title}" in ${location}:`, error);
                }

                // Pause between markets
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        console.log(`[LinkedIn] Search complete. Total unique jobs found: ${jobs.length}`);
        return jobs;
    }

    /**
     * Search all European markets comprehensively
     * Use this for full Europe-wide job discovery
     * Set maxResults to 0 or leave unspecified for unlimited fetching
     */
    async searchAllEurope(titles: string[], maxResults: number = 0): Promise<RawJobListing[]> {
        return this.search({
            titles,
            locations: this.allEuropeanMarkets,
            remoteOnly: false,
            maxResults, // 0 = unlimited
        });
    }

    private buildSearchUrl(keyword: string, location: string, remoteOnly?: boolean, start: number = 0): string {
        const domain = this.europeanDomains[location] || 'www';

        const params = new URLSearchParams({
            keywords: keyword,
            location: location === 'Remote' ? '' : location,
            trk: 'public_jobs_jobs-search-bar_search-submit',
            position: '1',
            pageNum: '0',
            start: start.toString(),
        });

        if (remoteOnly || location === 'Remote') {
            params.set('f_WT', '2'); // Remote filter
        }

        // Use LinkedIn's guest job search API
        return `https://${domain}.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params.toString()}`;
    }

    private parseJobListings(html: string, defaultLocation: string): RawJobListing[] {
        const jobs: RawJobListing[] = [];

        // Parse JSON-LD structured data first
        const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
        let jsonLdMatch;
        while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
            try {
                const data = JSON.parse(jsonLdMatch[1]);
                if (data['@type'] === 'JobPosting') {
                    jobs.push(this.parseJsonLdJob(data, defaultLocation));
                }
            } catch {
                // Skip invalid JSON
            }
        }

        // Parse HTML job cards
        const jobCardPatterns = [
            /<li[^>]*>[\s\S]*?<div[^>]*class="[^"]*base-card[^"]*"[\s\S]*?<\/li>/gi,
            /<div[^>]*class="[^"]*job-search-card[^"]*"[\s\S]*?<\/div>/gi,
        ];

        for (const pattern of jobCardPatterns) {
            const matches = html.match(pattern) || [];

            for (const match of matches) {
                try {
                    const job = this.parseJobCard(match, defaultLocation);
                    if (job) {
                        jobs.push(job);
                    }
                } catch {
                    // Skip malformed entries
                }
            }
        }

        return jobs;
    }

    private parseJobCard(html: string, defaultLocation: string): RawJobListing | null {
        // Extract title
        const titlePatterns = [
            /<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([^<]+)<\/h3>/i,
            /<a[^>]*class="[^"]*base-card__full-link[^"]*"[^>]*title="([^"]+)"/i,
            /<span[^>]*class="[^"]*sr-only[^"]*"[^>]*>([^<]+)<\/span>/i,
        ];

        let title = '';
        for (const pattern of titlePatterns) {
            const match = html.match(pattern);
            if (match) {
                title = this.cleanText(match[1]);
                break;
            }
        }

        if (!title) return null;

        // Extract URL
        const urlMatch = html.match(/href="(https:\/\/[^"]*linkedin\.com\/jobs\/view\/[^"]+)"/i);
        const url = urlMatch ? urlMatch[1].split('?')[0] : '';

        if (!url) return null;

        // Extract company
        const companyPatterns = [
            /<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[\s\S]*?<a[^>]*>([^<]+)<\/a>/i,
            /<a[^>]*class="[^"]*hidden-nested-link[^"]*"[^>]*>([^<]+)<\/a>/i,
        ];

        let company = 'Unknown';
        for (const pattern of companyPatterns) {
            const match = html.match(pattern);
            if (match) {
                company = this.cleanText(match[1]);
                break;
            }
        }

        // Extract location
        const locationMatch = html.match(/<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([^<]+)<\/span>/i);
        const location = locationMatch ? this.cleanText(locationMatch[1]) : defaultLocation;

        // Extract date
        const dateMatch = html.match(/<time[^>]*datetime="([^"]+)"/i);
        const postedAt = dateMatch ? new Date(dateMatch[1]) : new Date();

        // Extract job ID
        const jobId = this.extractJobId(url);

        return {
            externalId: jobId,
            title,
            company,
            description: '',
            location,
            url,
            postedAt,
            source: this.name,
        };
    }

    private parseJsonLdJob(data: Record<string, unknown>, defaultLocation: string): RawJobListing {
        const location = data.jobLocation as { address?: { addressLocality?: string; addressCountry?: string } };
        const locationStr = location?.address
            ? `${location.address.addressLocality || ''}, ${location.address.addressCountry || ''}`.trim().replace(/^,\s*/, '').replace(/,\s*$/, '')
            : defaultLocation;

        return {
            externalId: (data.identifier as { value?: string })?.value || this.extractJobId(String(data.url || '')),
            title: String(data.title || ''),
            company: (data.hiringOrganization as { name?: string })?.name || 'Unknown',
            description: String(data.description || '').substring(0, 500),
            location: locationStr || defaultLocation,
            url: String(data.url || ''),
            postedAt: data.datePosted ? new Date(String(data.datePosted)) : new Date(),
            source: this.name,
        };
    }

    private extractJobId(url: string): string {
        const match = url.match(/jobs\/view\/[^/]*-(\d+)/);
        if (match) return match[1];

        const altMatch = url.match(/(\d{10,})/);
        if (altMatch) return altMatch[1];

        return `linkedin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    private cleanText(text: string): string {
        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }
}
