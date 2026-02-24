import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/services/storage';
import { generateResume } from '@/services/ai';

/**
 * POST /api/ai/resume
 * Generate a tailored resume for a job
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

        // Generate resume
        const resume = await generateResume(profile, job);

        // Update user job record with generated resume if userJobId provided
        if (userJobId) {
            await storageService.updateUserJob(userJobId, {
                generatedResume: resume.content,
            });
        }

        return NextResponse.json({
            success: true,
            data: resume,
        });
    } catch (error) {
        console.error('Error generating resume:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate resume' },
            { status: 500 }
        );
    }
}
