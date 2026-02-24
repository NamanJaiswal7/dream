import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/services/storage';
import { batchScoreJobs } from '@/services/ai';

/**
 * POST /api/ai/batch-score
 * Score multiple jobs in batch
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { jobIds, userId, scoreAll } = body;

        // Get user profile
        const profile = await storageService.getProfile(userId || 'default-user');
        if (!profile) {
            return NextResponse.json(
                { success: false, error: 'Profile not found. Please create a profile first.' },
                { status: 400 }
            );
        }

        let jobsToScore: { id: string }[] = [];

        if (scoreAll) {
            // Score all unscored jobs
            const allJobs = await storageService.getJobs({ limit: 100 });
            const userJobs = await storageService.getUserJobs(profile.userId, {});
            const scoredJobIds = new Set(userJobs.data.map(uj => uj.jobId));

            jobsToScore = allJobs.data
                .filter(job => !scoredJobIds.has(job.id))
                .map(job => ({ id: job.id }));
        } else if (jobIds && Array.isArray(jobIds)) {
            jobsToScore = jobIds.map((id: string) => ({ id }));
        } else {
            return NextResponse.json(
                { success: false, error: 'Either jobIds array or scoreAll flag is required' },
                { status: 400 }
            );
        }

        if (jobsToScore.length === 0) {
            return NextResponse.json({
                success: true,
                data: { scored: 0, results: [] },
                message: 'No jobs to score',
            });
        }

        // Fetch full job data
        const jobs = await Promise.all(
            jobsToScore.map(async ({ id }) => storageService.getJobById(id))
        );
        const validJobs = jobs.filter((job): job is NonNullable<typeof job> => job !== null);

        // Batch score
        const scoreResults = await batchScoreJobs(profile, validJobs);

        // Create user job records
        const results: Array<{ jobId: string; score: number }> = [];

        for (const job of validJobs) {
            const scoreResult = scoreResults.get(job.id);
            if (scoreResult) {
                await storageService.createUserJob({
                    userId: profile.userId,
                    jobId: job.id,
                    matchScore: scoreResult.score,
                    matchReasoning: scoreResult.reasoning,
                    strengths: scoreResult.strengths,
                    gaps: scoreResult.gaps,
                    applicationStatus: 'not_applied',
                    favorite: false,
                    hidden: false,
                });

                results.push({ jobId: job.id, score: scoreResult.score });
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                scored: results.length,
                results,
            },
            message: `Scored ${results.length} jobs`,
        });
    } catch (error) {
        console.error('Error batch scoring jobs:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to batch score jobs' },
            { status: 500 }
        );
    }
}
