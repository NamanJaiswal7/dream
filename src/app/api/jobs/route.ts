import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/services/storage';
import { JobFilters } from '@/types';

/**
 * GET /api/jobs
 * Fetch jobs with optional filters
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        const filters: JobFilters = {
            search: searchParams.get('search') || undefined,
            location: searchParams.get('location') || undefined,
            remote: searchParams.get('remote') === 'true' ? true :
                searchParams.get('remote') === 'false' ? false : undefined,
            source: searchParams.get('source') || undefined,
            sortBy: (searchParams.get('sortBy') as JobFilters['sortBy']) || 'date',
            sortOrder: (searchParams.get('sortOrder') as JobFilters['sortOrder']) || 'desc',
            page: parseInt(searchParams.get('page') || '1', 10),
            limit: parseInt(searchParams.get('limit') || '20', 10),
        };

        const result = await storageService.getJobs(filters);

        return NextResponse.json({
            success: true,
            ...result,
        });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch jobs' },
            { status: 500 }
        );
    }
}
