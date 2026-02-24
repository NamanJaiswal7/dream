import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/services/storage';
import { scoreJobMatch, batchScoreJobs } from '@/services/ai';

/**
 * POST /api/ai/score
 * Score a single job match
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { jobId, userId } = body;

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

        // Score the job
        const scoreResult = await scoreJobMatch(profile, job);

        // Create or update user job record
        const existingUserJobs = await storageService.getUserJobs(profile.userId, {});
        const existingUserJob = existingUserJobs.data.find(uj => uj.jobId === jobId);

        if (existingUserJob) {
            await storageService.updateUserJob(existingUserJob.id, {
                matchScore: scoreResult.score,
                matchReasoning: scoreResult.reasoning,
                strengths: scoreResult.strengths,
                gaps: scoreResult.gaps,
            });
        } else {
            await storageService.createUserJob({
                userId: profile.userId,
                jobId,
                matchScore: scoreResult.score,
                matchReasoning: scoreResult.reasoning,
                strengths: scoreResult.strengths,
                gaps: scoreResult.gaps,
                applicationStatus: 'not_applied',
                favorite: false,
                hidden: false,
            });
        }

        return NextResponse.json({
            success: true,
            data: scoreResult,
        });
    } catch (error) {
        console.error('Error scoring job:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to score job' },
            { status: 500 }
        );
    }
}
