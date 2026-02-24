import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/services/storage';
import { generateCoverLetter } from '@/services/ai';

/**
 * POST /api/ai/cover-letter
 * Generate a tailored cover letter for a job
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { jobId, userId, userJobId } = body;

        if (!jobId) {
            return NextResponse.json(
                { success: false, error: 'jobId is required' },
                { status: 400 }
            );
        }

        // Get user profile
        const profile = await storageService.getProfile(userId || 'default-user');
        if (!profile) {
            return NextResponse.json(
                { success: false, error: 'Profile not found. Please create a profile first.' },
                { status: 400 }
            );
        }

        // Get job
        const job = await storageService.getJobById(jobId);
        if (!job) {
            return NextResponse.json(
                { success: false, error: 'Job not found' },
                { status: 404 }
            );
        }

        // Generate cover letter
        const coverLetter = await generateCoverLetter(profile, job);

        // Update user job record with generated cover letter if userJobId provided
        if (userJobId) {
            await storageService.updateUserJob(userJobId, {
                generatedCoverLetter: coverLetter.content,
            });
        }

        return NextResponse.json({
            success: true,
            data: coverLetter,
        });
    } catch (error) {
        console.error('Error generating cover letter:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate cover letter' },
            { status: 500 }
        );
    }
}
