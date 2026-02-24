import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/services/storage';

/**
 * PATCH /api/jobs/user/[id]
 * Update a user job (status, notes, etc.)
 * The id can be either a userJobId or a jobId - we handle both cases
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Allowed updates
        const allowedFields = [
            'applicationStatus',
            'appliedAt',
            'notes',
            'favorite',
            'hidden',
        ];

        const updates: Record<string, unknown> = {};
        for (const field of allowedFields) {
            if (field in body) {
                updates[field] = body[field];
            }
        }

        // If marking as applied, set appliedAt
        if (body.applicationStatus === 'applied' && !body.appliedAt) {
            updates.appliedAt = new Date();
        }

        // First, try to update by userJobId
        let updatedUserJob = await storageService.updateUserJob(id, updates);

        // If not found, the id might be a jobId - try to find or create a userJob
        if (!updatedUserJob) {
            // Check if a userJob exists for this jobId
            const userId = 'default-user'; // TODO: Get from auth
            const existingUserJobs = await storageService.getUserJobs(userId, {});
            const existingUserJob = existingUserJobs.data.find(uj => uj.jobId === id);

            if (existingUserJob) {
                // Update the existing userJob
                updatedUserJob = await storageService.updateUserJob(existingUserJob.id, updates);
            } else {
                // Create a new userJob entry for this job
                updatedUserJob = await storageService.createUserJob({
                    userId,
                    jobId: id,
                    matchScore: 0,
                    matchReasoning: '',
                    strengths: [],
                    gaps: [],
                    generatedResume: '',
                    generatedCoverLetter: '',
                    applicationStatus: updates.applicationStatus as 'not_applied' | 'applied' | 'interviewing' | 'rejected' | 'offer' || 'not_applied',
                    notes: '',
                    favorite: updates.favorite as boolean || false,
                    hidden: updates.hidden as boolean || false,
                });
            }
        }

        if (!updatedUserJob) {
            return NextResponse.json(
                { success: false, error: 'Failed to update or create user job' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: updatedUserJob,
        });
    } catch (error) {
        console.error('Error updating user job:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update user job' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/jobs/user/[id]
 * Get a single user job by ID
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userJob = await storageService.getUserJobById(id);

        if (!userJob) {
            return NextResponse.json(
                { success: false, error: 'User job not found' },
                { status: 404 }
            );
        }

        // Get the associated job details
        const job = await storageService.getJobById(userJob.jobId);

        return NextResponse.json({
            success: true,
            data: { ...userJob, job },
        });
    } catch (error) {
        console.error('Error fetching user job:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch user job' },
            { status: 500 }
        );
    }
}
