import { adapterRegistry } from '@/adapters';
import { storageService } from '@/services/storage';
import { Job, JobSearchParams, RawJobListing } from '@/types';
import { generateJobHash, normalizeLocation } from '@/lib/utils';

/**
 * Scraper Service
 * Orchestrates job fetching from multiple adapters
 */

export interface FetchJobsResult {
    totalFetched: number;
    newJobs: number;
    duplicatesSkipped: number;
    errors: string[];
    bySource: Record<string, { fetched: number; new: number }>;
}

/**
 * Fetch jobs from all available adapters
 */
export async function fetchJobsFromAllSources(
    params: JobSearchParams
): Promise<FetchJobsResult> {
    const result: FetchJobsResult = {
        totalFetched: 0,
        newJobs: 0,
        duplicatesSkipped: 0,
        errors: [],
        bySource: {},
    };

    // Get available adapters
    const adapters = await adapterRegistry.getAvailable();
    console.log(`Found ${adapters.length} available adapters`);

    // Get existing job hashes for deduplication
    const existingHashes = await storageService.getExistingHashes();
    console.log(`Found ${existingHashes.size} existing jobs`);

    // Fetch from each adapter
    for (const adapter of adapters) {
        try {
            console.log(`Fetching jobs from ${adapter.name}...`);
            const rawJobs = await adapter.search(params);

            result.bySource[adapter.name] = { fetched: rawJobs.length, new: 0 };
            result.totalFetched += rawJobs.length;

            // Process and deduplicate jobs
            const newJobs: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>[] = [];

            for (const rawJob of rawJobs) {
                const hash = generateJobHash(rawJob.title, rawJob.company, rawJob.description);

                if (existingHashes.has(hash)) {
                    result.duplicatesSkipped++;
                    continue;
                }

                // Add hash to set to avoid duplicates within this batch
                existingHashes.add(hash);

                // Convert to Job format
                const job = rawJobToJob(rawJob, hash);
                newJobs.push(job);
            }

            if (newJobs.length > 0) {
                await storageService.createJobs(newJobs);
                result.newJobs += newJobs.length;
                result.bySource[adapter.name].new = newJobs.length;
            }

            console.log(`${adapter.name}: ${rawJobs.length} fetched, ${newJobs.length} new`);
        } catch (error) {
            const errorMessage = `Error fetching from ${adapter.name}: ${error}`;
            console.error(errorMessage);
            result.errors.push(errorMessage);
        }
    }

    return result;
}

/**
 * Fetch jobs from a specific source
 */
export async function fetchJobsFromSource(
    sourceName: string,
    params: JobSearchParams
): Promise<FetchJobsResult> {
    const adapter = adapterRegistry.get(sourceName);

    if (!adapter) {
        return {
            totalFetched: 0,
            newJobs: 0,
            duplicatesSkipped: 0,
            errors: [`Adapter "${sourceName}" not found`],
            bySource: {},
        };
    }

    const isAvailable = await adapter.isAvailable();
    if (!isAvailable) {
        return {
            totalFetched: 0,
            newJobs: 0,
            duplicatesSkipped: 0,
            errors: [`Adapter "${sourceName}" is not available`],
            bySource: {},
        };
    }

    const result: FetchJobsResult = {
        totalFetched: 0,
        newJobs: 0,
        duplicatesSkipped: 0,
        errors: [],
        bySource: {},
    };

    try {
        const rawJobs = await adapter.search(params);
        const existingHashes = await storageService.getExistingHashes();

        result.totalFetched = rawJobs.length;
        result.bySource[sourceName] = { fetched: rawJobs.length, new: 0 };

        const newJobs: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>[] = [];

        for (const rawJob of rawJobs) {
            const hash = generateJobHash(rawJob.title, rawJob.company, rawJob.description);

            if (existingHashes.has(hash)) {
                result.duplicatesSkipped++;
                continue;
            }

            existingHashes.add(hash);
            const job = rawJobToJob(rawJob, hash);
            newJobs.push(job);
        }

        if (newJobs.length > 0) {
            await storageService.createJobs(newJobs);
            result.newJobs = newJobs.length;
            result.bySource[sourceName].new = newJobs.length;
        }
    } catch (error) {
        result.errors.push(`Error: ${error}`);
    }

    return result;
}

/**
 * Convert raw job listing to Job format
 */
function rawJobToJob(raw: RawJobListing, hash: string): Omit<Job, 'id' | 'createdAt' | 'updatedAt'> {
    const location = normalizeLocation(raw.location);

    return {
        externalId: raw.externalId,
        title: raw.title,
        company: raw.company,
        description: raw.description,
        location,
        source: raw.source,
        sourceUrl: raw.url,
        postedAt: raw.postedAt || new Date(),
        fetchedAt: new Date(),
        deduplicationHash: hash,
        status: 'active',
    };
}

/**
 * Get default search parameters from environment
 */
export function getDefaultSearchParams(): JobSearchParams {
    const titles = process.env.DEFAULT_JOB_TITLES?.split(',').map(t => t.trim()) || [
        'Software Engineer',
        'Full Stack Developer',
        'Frontend Developer',
    ];

    const locations = process.env.DEFAULT_LOCATIONS?.split(',').map(l => l.trim()) || [
        'Lithuania',
        'Remote',
        'European Union',
    ];

    return {
        titles,
        locations,
        remoteOnly: false,
        datePosted: 'week',
        maxResults: 50,
    };
}

/**
 * Get list of available sources
 */
export async function getAvailableSources(): Promise<string[]> {
    const adapters = await adapterRegistry.getAvailable();
    return adapters.map(a => a.name);
}

/**
 * Get list of all registered sources
 */
export function getAllSources(): string[] {
    return adapterRegistry.getAll().map(a => a.name);
}
