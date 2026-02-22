import { JobSearchParams, RawJobListing, JobLocation } from '@/types';
import { RateLimiter, delay, parseRelativeDate, normalizeLocation } from '@/lib/utils';

/**
 * Base adapter class for job portal scrapers
 * All job portal adapters should extend this class
 */
export abstract class BaseJobAdapter {
    abstract readonly name: string;
    abstract readonly baseUrl: string;

    // Rate limit configuration - override in subclasses
    protected readonly rateLimitRequests: number = 5;
    protected readonly rateLimitPerSeconds: number = 1;

    protected rateLimiter: RateLimiter;

    constructor() {
        this.rateLimiter = new RateLimiter(
            this.rateLimitRequests,
            this.rateLimitPerSeconds * 1000
        );
    }

    /**
     * Search for jobs using the portal's API or scraping mechanism
     */
    abstract search(params: JobSearchParams): Promise<RawJobListing[]>;

    /**
     * Check if the adapter is available (API key present, etc.)
     */
    abstract isAvailable(): Promise<boolean>;

    /**
     * Make a rate-limited HTTP request
     */
    protected async rateLimitedFetch(
        url: string,
        options?: RequestInit
    ): Promise<Response> {
        return this.rateLimiter.withLimit(async () => {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    Accept: 'application/json, text/html',
                    ...options?.headers,
                },
            });

            // Handle rate limiting
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000;
                console.warn(`Rate limited on ${this.name}, waiting ${waitTime}ms`);
                await delay(waitTime);
                return this.rateLimitedFetch(url, options);
            }

            return response;
        });
    }

    /**
     * Parse a relative date string to a Date object
     */
    protected parseDate(text: string): Date {
        return parseRelativeDate(text);
    }

    /**
     * Normalize a location string to a structured format
     */
    protected normalizeLocation(raw: string): JobLocation {
        return normalizeLocation(raw);
    }

    /**
     * Build a search URL with query parameters
     */
    protected buildUrl(base: string, params: Record<string, string>): string {
        const url = new URL(base);
        Object.entries(params).forEach(([key, value]) => {
            if (value) url.searchParams.set(key, value);
        });
        return url.toString();
    }

    /**
     * Clean and normalize job description text
     */
    protected cleanDescription(html: string): string {
        // Remove HTML tags
        let text = html.replace(/<[^>]*>/g, ' ');
        // Normalize whitespace
        text = text.replace(/\s+/g, ' ').trim();
        // Remove special characters
        text = text.replace(/&nbsp;/g, ' ');
        text = text.replace(/&amp;/g, '&');
        text = text.replace(/&lt;/g, '<');
        text = text.replace(/&gt;/g, '>');
        return text;
    }
}

/**
 * Adapter registration and management
 */
export class AdapterRegistry {
    private adapters: Map<string, BaseJobAdapter> = new Map();

    register(adapter: BaseJobAdapter): void {
        this.adapters.set(adapter.name, adapter);
    }

    get(name: string): BaseJobAdapter | undefined {
        return this.adapters.get(name);
    }

    getAll(): BaseJobAdapter[] {
        return Array.from(this.adapters.values());
    }

    async getAvailable(): Promise<BaseJobAdapter[]> {
        const available: BaseJobAdapter[] = [];

        for (const adapter of this.adapters.values()) {
            try {
                if (await adapter.isAvailable()) {
                    available.push(adapter);
                }
            } catch {
                console.warn(`Adapter ${adapter.name} availability check failed`);
            }
        }

        return available;
    }
}

export const adapterRegistry = new AdapterRegistry();
