import { NextResponse } from 'next/server';
import { LinkedInAdapter } from '@/adapters/linkedin-glassdoor';
import { storageService } from '@/services/storage';
import { Job, RawJobListing } from '@/types';
import { createHash } from 'crypto';

/**
 * Bulk LinkedIn Job Fetcher API
 * 
 * POST /api/jobs/bulk-fetch
 * 
 * Fetches all available jobs from LinkedIn across specified markets
 * and stores them in the database with deduplication.
 * 
 * Request Body:
 * {
 *   titles: string[]           - Job titles to search for
 *   locations?: string[]       - Markets to search (defaults to all European markets)
 *   remoteOnly?: boolean       - Only fetch remote jobs
 *   maxResults?: number        - Limit results (0 = unlimited, default)
 * }
 */

interface BulkFetchRequest {
    titles: string[];
    locations?: string[];
    remoteOnly?: boolean;
    maxResults?: number;
}

interface BulkFetchResult {
    success: boolean;
    totalFetched: number;
    newJobs: number;
    duplicates: number;
    errors: number;
    durationMs: number;
    jobs: Array<{
        id: string;
        title: string;
        company: string;
        location: string;
        url: string;
        isNew: boolean;
    }>;
}

/**
 * Generate a deduplication hash for a job
 */
function generateDeduplicationHash(job: RawJobListing): string {
    const content = `${job.title.toLowerCase()}-${job.company.toLowerCase()}-${job.externalId}`;
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Convert RawJobListing to Job format
 */
function rawToJob(raw: RawJobListing, hash: string): Omit<Job, 'id' | 'createdAt' | 'updatedAt'> {
    return {
        externalId: raw.externalId,
        title: raw.title,
        company: raw.company,
        description: raw.description || '',
        location: {
            type: raw.location?.toLowerCase().includes('remote') ? 'remote' : 'onsite',
            country: raw.location || '',
        },
        source: raw.source || 'linkedin',
        sourceUrl: raw.url,
        postedAt: raw.postedAt || new Date(),
        fetchedAt: new Date(),
        deduplicationHash: hash,
        status: 'active',
    };
}

export async function POST(request: Request) {
    const startTime = Date.now();

    try {
        const body = await request.json() as BulkFetchRequest;
        const {
            titles = ['Software Engineer'],
            locations = [], // Empty = all European markets
            remoteOnly = false,
            maxResults = 0, // 0 = unlimited
        } = body;

        if (!titles || titles.length === 0) {
            return NextResponse.json(
                { error: 'At least one job title is required' },
                { status: 400 }
            );
        }

        console.log(`[BulkFetch] Starting bulk fetch for titles: ${titles.join(', ')}`);
        console.log(`[BulkFetch] Locations: ${locations.length > 0 ? locations.join(', ') : 'All European markets'}`);
        console.log(`[BulkFetch] Remote only: ${remoteOnly}, Max results: ${maxResults || 'unlimited'}`);

        // Initialize the LinkedIn adapter
        const linkedInAdapter = new LinkedInAdapter();

        // Fetch jobs from LinkedIn
        const rawJobs = await linkedInAdapter.search({
            titles,
            locations,
            remoteOnly,
            maxResults,
        });

        console.log(`[BulkFetch] Fetched ${rawJobs.length} jobs from LinkedIn`);

        // Get existing hashes for deduplication
        const existingHashes = await storageService.getExistingHashes();
        console.log(`[BulkFetch] Found ${existingHashes.size} existing jobs in database`);

        // Process and deduplicate jobs
        const newJobs: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>[] = [];
        const duplicateJobs: RawJobListing[] = [];
        const results: BulkFetchResult['jobs'] = [];
        let errorCount = 0;

        for (const rawJob of rawJobs) {
            try {
                const hash = generateDeduplicationHash(rawJob);
                const isNew = !existingHashes.has(hash);

                if (isNew) {
                    const job = rawToJob(rawJob, hash);
                    newJobs.push(job);
                    existingHashes.add(hash); // Prevent duplicates within this batch
                } else {
                    duplicateJobs.push(rawJob);
                }

                results.push({
                    id: rawJob.externalId,
                    title: rawJob.title,
                    company: rawJob.company,
                    location: rawJob.location,
                    url: rawJob.url,
                    isNew,
                });
            } catch (error) {
                console.error(`[BulkFetch] Error processing job:`, error);
                errorCount++;
            }
        }

        console.log(`[BulkFetch] New jobs: ${newJobs.length}, Duplicates: ${duplicateJobs.length}`);

        // Store new jobs in database (in batches of 500)
        let storedCount = 0;
        const BATCH_SIZE = 500;

        for (let i = 0; i < newJobs.length; i += BATCH_SIZE) {
            const batch = newJobs.slice(i, i + BATCH_SIZE);
            try {
                await storageService.createJobs(batch);
                storedCount += batch.length;
                console.log(`[BulkFetch] Stored batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} jobs (total: ${storedCount})`);
            } catch (error) {
                console.error(`[BulkFetch] Error storing batch:`, error);
                errorCount += batch.length;
            }
        }

        const durationMs = Date.now() - startTime;

        console.log(`[BulkFetch] Complete! Stored ${storedCount} new jobs in ${durationMs}ms`);

        const response: BulkFetchResult = {
            success: true,
            totalFetched: rawJobs.length,
            newJobs: storedCount,
            duplicates: duplicateJobs.length,
            errors: errorCount,
            durationMs,
            jobs: results,
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('[BulkFetch] Error:', error);
        return NextResponse.json(
            {
                error: 'Bulk fetch failed',
                details: error instanceof Error ? error.message : String(error),
                durationMs: Date.now() - startTime,
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/jobs/bulk-fetch
 * 
 * Returns information about the bulk fetch endpoint
 */
export async function GET() {
    try {
        // Get current job count from database
        const jobs = await storageService.getJobs({ limit: 1 });

        return NextResponse.json({
            endpoint: '/api/jobs/bulk-fetch',
            method: 'POST',
            description: 'Bulk fetch jobs from LinkedIn and store in database',
            currentJobCount: jobs.pagination.total,
            requestBody: {
                titles: {
                    type: 'string[]',
                    required: true,
                    description: 'Job titles to search for',
                    example: ['Software Engineer', 'Frontend Developer'],
                },
                locations: {
                    type: 'string[]',
                    required: false,
                    description: 'Markets to search (empty = all European markets)',
                    example: ['Germany', 'Netherlands', 'Remote'],
                },
                remoteOnly: {
                    type: 'boolean',
                    required: false,
                    default: false,
                    description: 'Only fetch remote jobs',
                },
                maxResults: {
                    type: 'number',
                    required: false,
                    default: 0,
                    description: 'Maximum jobs to fetch (0 = unlimited)',
                },
            },
            response: {
                success: 'boolean',
                totalFetched: 'number - Total jobs fetched from LinkedIn',
                newJobs: 'number - New jobs stored in database',
                duplicates: 'number - Jobs already in database',
                errors: 'number - Failed to process',
                durationMs: 'number - Total time in milliseconds',
                jobs: 'array - List of fetched jobs with isNew flag',
            },
            example: {
                curl: `curl -X POST http://localhost:3000/api/jobs/bulk-fetch \\
  -H "Content-Type: application/json" \\
  -d '{"titles": ["Software Engineer", "Backend Developer"], "locations": ["Germany", "Netherlands"]}'`,
            },
        });
    } catch (error) {
        console.error('[BulkFetch] GET Error:', error);
        return NextResponse.json(
            { error: 'Failed to get endpoint info' },
            { status: 500 }
        );
    }
}
