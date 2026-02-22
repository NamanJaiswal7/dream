import { BaseJobAdapter } from './base';
import { JobSearchParams, RawJobListing } from '@/types';
import { ProfileExpander } from '@/services/profile-expander';

/**
 * European company career page database
 * Companies using common ATS platforms
 */
const EUROPEAN_COMPANIES: {
    name: string;
    platform: 'greenhouse' | 'lever' | 'workable' | 'smartrecruiters';
    boardToken: string;
    country: string;
}[] = [
        // Major European Tech Companies - Greenhouse
        { name: 'Spotify', platform: 'greenhouse', boardToken: 'spotify', country: 'Sweden' },
        { name: 'Klarna', platform: 'greenhouse', boardToken: 'klarna', country: 'Sweden' },
        { name: 'King', platform: 'greenhouse', boardToken: 'king', country: 'Sweden' },
        { name: 'Delivery Hero', platform: 'greenhouse', boardToken: 'deliveryhero', country: 'Germany' },
        { name: 'N26', platform: 'greenhouse', boardToken: 'n26', country: 'Germany' },
        { name: 'SoundCloud', platform: 'greenhouse', boardToken: 'soundcloud', country: 'Germany' },
        { name: 'Trade Republic', platform: 'greenhouse', boardToken: 'traderepublic', country: 'Germany' },
        { name: 'Personio', platform: 'greenhouse', boardToken: 'personio', country: 'Germany' },
        { name: 'Contentful', platform: 'greenhouse', boardToken: 'contentful', country: 'Germany' },
        { name: 'Zalando', platform: 'greenhouse', boardToken: 'zalando', country: 'Germany' },
        { name: 'HelloFresh', platform: 'greenhouse', boardToken: 'hellofreshgroup', country: 'Germany' },
        { name: 'Booking.com', platform: 'greenhouse', boardToken: 'bookingcom', country: 'Netherlands' },
        { name: 'Adyen', platform: 'greenhouse', boardToken: 'adyen', country: 'Netherlands' },
        { name: 'Messagebird', platform: 'greenhouse', boardToken: 'messagebird', country: 'Netherlands' },
        { name: 'Miro', platform: 'greenhouse', boardToken: 'miro', country: 'Netherlands' },
        { name: 'Mollie', platform: 'greenhouse', boardToken: 'mollie', country: 'Netherlands' },
        { name: 'Elastic', platform: 'greenhouse', boardToken: 'elastic', country: 'Netherlands' },
        { name: 'GitLab', platform: 'greenhouse', boardToken: 'gitlab', country: 'Netherlands' },
        { name: 'JetBrains', platform: 'greenhouse', boardToken: 'jetbrains', country: 'Czech Republic' },
        { name: 'Wise', platform: 'greenhouse', boardToken: 'transferwise', country: 'UK' },
        { name: 'Revolut', platform: 'greenhouse', boardToken: 'revolut', country: 'UK' },
        { name: 'Monzo', platform: 'greenhouse', boardToken: 'monzo', country: 'UK' },
        { name: 'Deliveroo', platform: 'greenhouse', boardToken: 'deliveroo', country: 'UK' },
        { name: 'Arm', platform: 'greenhouse', boardToken: 'arm', country: 'UK' },
        { name: 'Checkout.com', platform: 'greenhouse', boardToken: 'checkout', country: 'UK' },
        { name: 'Intercom', platform: 'greenhouse', boardToken: 'intercom', country: 'Ireland' },
        { name: 'Stripe', platform: 'greenhouse', boardToken: 'stripe', country: 'Ireland' },
        { name: 'Datadog', platform: 'greenhouse', boardToken: 'datadog', country: 'France' },
        { name: 'Doctolib', platform: 'greenhouse', boardToken: 'doctolib', country: 'France' },
        { name: 'BlaBlaCar', platform: 'greenhouse', boardToken: 'blablacar', country: 'France' },
        { name: 'Deezer', platform: 'greenhouse', boardToken: 'deezer', country: 'France' },
        { name: 'Criteo', platform: 'greenhouse', boardToken: 'criteo', country: 'France' },
        { name: 'Glovo', platform: 'greenhouse', boardToken: 'glovo', country: 'Spain' },
        { name: 'Cabify', platform: 'greenhouse', boardToken: 'cabify', country: 'Spain' },
        { name: 'Bolt', platform: 'greenhouse', boardToken: 'bolt', country: 'Estonia' },
        { name: 'Pipedrive', platform: 'greenhouse', boardToken: 'pipedrive', country: 'Estonia' },

        // Companies using Lever
        { name: 'Figma', platform: 'lever', boardToken: 'figma', country: 'UK' },
        { name: 'Notion', platform: 'lever', boardToken: 'notion', country: 'Ireland' },
        { name: 'Remote', platform: 'lever', boardToken: 'remote', country: 'Portugal' },
        { name: 'Hotjar', platform: 'lever', boardToken: 'hotjar', country: 'Malta' },
        { name: 'Hopin', platform: 'lever', boardToken: 'hopin', country: 'UK' },
        { name: 'OneTrust', platform: 'lever', boardToken: 'onetrust', country: 'UK' },
        { name: 'Snyk', platform: 'lever', boardToken: 'snyk', country: 'UK' },
        { name: 'Pleo', platform: 'lever', boardToken: 'pleo', country: 'Denmark' },
        { name: 'Superside', platform: 'lever', boardToken: 'superside', country: 'Norway' },

        // Companies using Workable
        { name: 'Taxfix', platform: 'workable', boardToken: 'taxfix', country: 'Germany' },
        { name: 'FINN', platform: 'workable', boardToken: 'finn', country: 'Germany' },
        { name: 'Grover', platform: 'workable', boardToken: 'grover', country: 'Germany' },
    ];

/**
 * Career Pages Adapter
 * Scrapes jobs from company career pages via ATS platform APIs
 */
export class CareerPagesAdapter extends BaseJobAdapter {
    readonly name = 'career-pages';
    readonly baseUrl = 'https://boards.greenhouse.io';
    protected override readonly rateLimitRequests = 5;
    protected override readonly rateLimitPerSeconds = 10;

    async isAvailable(): Promise<boolean> {
        return true; // Always available - no API key needed
    }

    async search(params: JobSearchParams): Promise<RawJobListing[]> {
        const jobs: RawJobListing[] = [];
        const seenIds = new Set<string>();

        // Get profile and expand to related titles
        const profile = params.titles[0] || 'software engineer';
        const searchKeywords = ProfileExpander.getKeywords(profile);

        console.log(`[CareerPages] Searching for profile: ${profile}`);
        console.log(`[CareerPages] Expanded keywords: ${searchKeywords.join(', ')}`);

        // Filter companies by location if specified
        const targetCountries = params.locations.length > 0 ? params.locations : [];
        const companiesToSearch = targetCountries.length > 0
            ? EUROPEAN_COMPANIES.filter(c => targetCountries.some(loc =>
                c.country.toLowerCase().includes(loc.toLowerCase()) ||
                loc.toLowerCase().includes(c.country.toLowerCase())
            ))
            : EUROPEAN_COMPANIES;

        console.log(`[CareerPages] Searching ${companiesToSearch.length} companies`);

        // Group by platform for efficient batching
        const greenhouseCompanies = companiesToSearch.filter(c => c.platform === 'greenhouse');
        const leverCompanies = companiesToSearch.filter(c => c.platform === 'lever');

        // Fetch from Greenhouse
        const greenhouseJobs = await this.fetchGreenhouseJobs(greenhouseCompanies, profile, params.maxResults || 100);
        for (const job of greenhouseJobs) {
            if (!seenIds.has(job.externalId)) {
                seenIds.add(job.externalId);
                jobs.push(job);
            }
        }

        // Fetch from Lever
        const leverJobs = await this.fetchLeverJobs(leverCompanies, profile, params.maxResults || 100);
        for (const job of leverJobs) {
            if (!seenIds.has(job.externalId)) {
                seenIds.add(job.externalId);
                jobs.push(job);
            }
        }

        console.log(`[CareerPages] Total jobs found: ${jobs.length}`);
        return jobs.slice(0, params.maxResults || 100);
    }

    /**
     * Fetch jobs from Greenhouse boards
     */
    private async fetchGreenhouseJobs(
        companies: typeof EUROPEAN_COMPANIES,
        profile: string,
        maxResults: number
    ): Promise<RawJobListing[]> {
        const jobs: RawJobListing[] = [];

        for (const company of companies) {
            if (jobs.length >= maxResults) break;

            try {
                const url = `https://boards-api.greenhouse.io/v1/boards/${company.boardToken}/jobs`;
                console.log(`[Greenhouse] Fetching ${company.name}...`);

                const response = await this.rateLimitedFetch(url, {
                    headers: {
                        'Accept': 'application/json',
                    },
                });

                if (!response.ok) {
                    console.warn(`[Greenhouse] ${company.name}: HTTP ${response.status}`);
                    continue;
                }

                const data = await response.json() as {
                    jobs?: Array<{
                        id: number;
                        title: string;
                        location?: { name?: string };
                        absolute_url?: string;
                        updated_at?: string;
                    }>
                };

                if (!data.jobs) continue;

                // Filter jobs matching the profile
                for (const job of data.jobs) {
                    if (ProfileExpander.matches(job.title, profile)) {
                        jobs.push({
                            externalId: `gh-${company.boardToken}-${job.id}`,
                            title: job.title,
                            company: company.name,
                            description: '',
                            location: job.location?.name || company.country,
                            url: job.absolute_url || `https://boards.greenhouse.io/${company.boardToken}/jobs/${job.id}`,
                            postedAt: job.updated_at ? new Date(job.updated_at) : new Date(),
                            source: 'greenhouse',
                        });
                    }
                }

                console.log(`[Greenhouse] ${company.name}: Found ${jobs.length} matching jobs`);

            } catch (error) {
                console.error(`[Greenhouse] Error fetching ${company.name}:`, error);
            }
        }

        return jobs;
    }

    /**
     * Fetch jobs from Lever boards
     */
    private async fetchLeverJobs(
        companies: typeof EUROPEAN_COMPANIES,
        profile: string,
        maxResults: number
    ): Promise<RawJobListing[]> {
        const jobs: RawJobListing[] = [];

        for (const company of companies) {
            if (jobs.length >= maxResults) break;

            try {
                const url = `https://api.lever.co/v0/postings/${company.boardToken}?mode=json`;
                console.log(`[Lever] Fetching ${company.name}...`);

                const response = await this.rateLimitedFetch(url, {
                    headers: {
                        'Accept': 'application/json',
                    },
                });

                if (!response.ok) {
                    console.warn(`[Lever] ${company.name}: HTTP ${response.status}`);
                    continue;
                }

                const data = await response.json() as Array<{
                    id: string;
                    text: string;
                    categories?: { location?: string; team?: string };
                    hostedUrl?: string;
                    createdAt?: number;
                }>;

                if (!Array.isArray(data)) continue;

                // Filter jobs matching the profile
                for (const job of data) {
                    if (ProfileExpander.matches(job.text, profile)) {
                        jobs.push({
                            externalId: `lever-${company.boardToken}-${job.id}`,
                            title: job.text,
                            company: company.name,
                            description: '',
                            location: job.categories?.location || company.country,
                            url: job.hostedUrl || `https://jobs.lever.co/${company.boardToken}/${job.id}`,
                            postedAt: job.createdAt ? new Date(job.createdAt) : new Date(),
                            source: 'lever',
                        });
                    }
                }

                console.log(`[Lever] ${company.name}: Found ${jobs.length} matching jobs`);

            } catch (error) {
                console.error(`[Lever] Error fetching ${company.name}:`, error);
            }
        }

        return jobs;
    }
}
