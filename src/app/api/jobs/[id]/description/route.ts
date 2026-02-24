import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/services/storage';
import { fetchJobDescription } from '@/services/job-description-scraper';

/**
 * POST /api/jobs/[id]/description
 * Fetch job description from source URL and save to database
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Get job to retrieve source URL
        const job = await storageService.getJobById(id);

        if (!job) {
            return NextResponse.json(
                { success: false, error: 'Job not found' },
                { status: 404 }
            );
        }

        if (!job.sourceUrl) {
            return NextResponse.json(
                { success: false, error: 'Job has no source URL' },
                { status: 400 }
            );
        }

        // Check if description already exists
        if (job.description && job.description.trim().length > 0) {
            return NextResponse.json({
                success: true,
                data: job,
                message: 'Description already exists',
            });
        }

        console.log(`[API] Fetching description for job ${id} from ${job.sourceUrl}`);

        // Fetch description from source
        const scraped = await fetchJobDescription(job.sourceUrl);

        // Update job with description (only include defined fields)
        const updateData: { description: string; requirements?: string[]; benefits?: string[] } = {
            description: scraped.description,
        };
        if (scraped.requirements) {
            updateData.requirements = scraped.requirements;
        }
        if (scraped.benefits) {
            updateData.benefits = scraped.benefits;
        }

        const updatedJob = await storageService.updateJob(id, updateData);

        if (!updatedJob) {
            return NextResponse.json(
                { success: false, error: 'Failed to update job' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: updatedJob,
            message: 'Description fetched and saved',
        });
    } catch (error) {
        console.error('Error fetching job description:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch description'
            },
            { status: 500 }
        );
    }
}
