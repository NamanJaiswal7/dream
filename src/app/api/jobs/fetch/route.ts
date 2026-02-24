import { NextRequest, NextResponse } from 'next/server';
import { fetchJobsFromAllSources, getDefaultSearchParams } from '@/services/scraper';
import { JobSearchParams } from '@/types';

/**
 * POST /api/jobs/fetch
 * Trigger manual job fetching
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));

        // Merge with defaults
        const defaultParams = getDefaultSearchParams();
        const params: JobSearchParams = {
            titles: body.titles || defaultParams.titles,
            locations: body.locations || defaultParams.locations,
            remoteOnly: body.remoteOnly ?? defaultParams.remoteOnly,
            datePosted: body.datePosted || defaultParams.datePosted,
            maxResults: body.maxResults || defaultParams.maxResults,
        };

        console.log('Starting job fetch with params:', params);

        const result = await fetchJobsFromAllSources(params);

        return NextResponse.json({
            success: true,
            data: result,
            message: `Fetched ${result.totalFetched} jobs, ${result.newJobs} new`,
        });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch jobs' },
            { status: 500 }
        );
    }
}
