import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/services/storage';
import { JobFilters } from '@/types';

/**
 * GET /api/jobs/user
 * Get user's job matches with scores
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // TODO: Get userId from authentication
        const userId = searchParams.get('userId') || 'default-user';

        const filters: JobFilters = {
            minScore: searchParams.get('minScore')
                ? parseInt(searchParams.get('minScore')!, 10)
                : undefined,
            maxScore: searchParams.get('maxScore')
                ? parseInt(searchParams.get('maxScore')!, 10)
                : undefined,
            status: (searchParams.get('status') as JobFilters['status']) || 'all',
            sortBy: (searchParams.get('sortBy') as JobFilters['sortBy']) || 'score',
            sortOrder: (searchParams.get('sortOrder') as JobFilters['sortOrder']) || 'desc',
            page: parseInt(searchParams.get('page') || '1', 10),
            limit: parseInt(searchParams.get('limit') || '20', 10),
        };

        const result = await storageService.getUserJobs(userId, filters);

        // Populate job details for each user job
        const userJobsWithDetails = await Promise.all(
            result.data.map(async (userJob) => {
                const job = await storageService.getJobById(userJob.jobId);
                return { ...userJob, job };
            })
        );

        return NextResponse.json({
            success: true,
            data: userJobsWithDetails,
            pagination: result.pagination,
        });
    } catch (error) {
        console.error('Error fetching user jobs:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch user jobs' },
            { status: 500 }
        );
    }
}
