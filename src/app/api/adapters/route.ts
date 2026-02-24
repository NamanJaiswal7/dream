import { NextResponse } from 'next/server';
import { adapterRegistry } from '@/adapters';
import { JobSearchParams } from '@/types';

/**
 * Test individual job adapters
 * 
 * GET /api/adapters - List all adapters with availability status
 * POST /api/adapters - Test a specific adapter
 */

export async function GET() {
    try {
        const allAdapters = adapterRegistry.getAll();
        const adapterStatus = await Promise.all(
            allAdapters.map(async (adapter) => {
                let isAvailable = false;
                try {
                    isAvailable = await adapter.isAvailable();
                } catch (error) {
                    console.error(`Error checking ${adapter.name} availability:`, error);
                }
                return {
                    name: adapter.name,
                    baseUrl: adapter.baseUrl,
                    available: isAvailable,
                };
            })
        );

        return NextResponse.json({
            adapters: adapterStatus,
            totalRegistered: allAdapters.length,
            totalAvailable: adapterStatus.filter(a => a.available).length,
        });
    } catch (error) {
        console.error('Error listing adapters:', error);
        return NextResponse.json(
            { error: 'Failed to list adapters' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            adapter: adapterName,
            titles = ['Software Engineer'],
            locations = ['Lithuania', 'Remote'],
            remoteOnly = false,
            maxResults = 0, // 0 = unlimited fetching
        } = body;

        if (!adapterName) {
            return NextResponse.json(
                { error: 'adapter name is required' },
                { status: 400 }
            );
        }

        const adapter = adapterRegistry.get(adapterName);

        if (!adapter) {
            const available = adapterRegistry.getAll().map(a => a.name);
            return NextResponse.json(
                {
                    error: `Adapter "${adapterName}" not found`,
                    availableAdapters: available,
                },
                { status: 404 }
            );
        }

        // Check availability
        const isAvailable = await adapter.isAvailable();
        if (!isAvailable) {
            return NextResponse.json(
                {
                    error: `Adapter "${adapterName}" is not available`,
                    hint: 'Check environment variables and enable flags',
                },
                { status: 400 }
            );
        }

        // Run the search
        const searchParams: JobSearchParams = {
            titles,
            locations,
            remoteOnly,
            datePosted: 'week',
            maxResults,
        };

        console.log(`Testing adapter "${adapterName}" with params:`, searchParams);
        const startTime = Date.now();

        const jobs = await adapter.search(searchParams);

        const duration = Date.now() - startTime;

        return NextResponse.json({
            adapter: adapterName,
            baseUrl: adapter.baseUrl,
            success: true,
            jobsFound: jobs.length,
            durationMs: duration,
            searchParams,
            jobs: jobs.map(job => ({
                title: job.title,
                company: job.company,
                location: job.location,
                url: job.url,
                postedAt: job.postedAt,
                source: job.source,
            })),
        });
    } catch (error) {
        console.error('Error testing adapter:', error);
        return NextResponse.json(
            {
                error: 'Adapter test failed',
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
