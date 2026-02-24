import { NextRequest, NextResponse } from 'next/server';
import { fetchJobsFromAllSources, getDefaultSearchParams } from '@/services/scraper';

/**
 * POST /api/cron/fetch-jobs
 * Cron job endpoint for daily job fetching
 * 
 * This endpoint should be protected with CRON_SECRET in production
 */
export async function POST(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.log('[CRON] Starting daily job fetch...');
        const startTime = Date.now();

        const params = getDefaultSearchParams();
        const result = await fetchJobsFromAllSources(params);

        const duration = Date.now() - startTime;
        console.log(`[CRON] Job fetch completed in ${duration}ms`);
        console.log(`[CRON] Results: ${result.totalFetched} fetched, ${result.newJobs} new`);

        return NextResponse.json({
            success: true,
            data: {
                ...result,
                duration,
                timestamp: new Date().toISOString(),
            },
            message: `Cron job completed: ${result.newJobs} new jobs added`,
        });
    } catch (error) {
        console.error('[CRON] Error in job fetch:', error);
        return NextResponse.json(
            { success: false, error: 'Cron job failed' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/cron/fetch-jobs
 * Get cron job status (for health checks)
 */
export async function GET() {
    return NextResponse.json({
        success: true,
        data: {
            status: 'ready',
            endpoint: '/api/cron/fetch-jobs',
            method: 'POST',
            schedule: 'Daily at 6 AM UTC (configurable in vercel.json)',
        },
    });
}
