import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/ai/test
 * Test AI scoring with raw job/profile data (for development)
 */
export async function POST(request: NextRequest) {
    try {
        const { scoreJobMatch } = await import('@/services/ai');

        const body = await request.json();
        const { profile, job } = body;

        if (!profile || !job) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Both profile and job are required',
                    example: {
                        profile: {
                            userId: 'test',
                            name: 'John Doe',
                            headline: 'Software Engineer',
                            summary: '5 years experience',
                            skills: ['TypeScript', 'React', 'Node.js'],
                            experience: [],
                            education: [],
                        },
                        job: {
                            id: 'test-1',
                            title: 'Senior Software Engineer',
                            company: 'Spotify',
                            description: 'Build amazing music features with React and TypeScript',
                            location: 'Stockholm',
                            url: 'https://spotify.com/jobs/1',
                        }
                    }
                },
                { status: 400 }
            );
        }

        // Create proper profile/job objects
        const profileObj = {
            userId: profile.userId || 'test-user',
            name: profile.name || 'Test User',
            headline: profile.headline || '',
            summary: profile.summary || '',
            skills: profile.skills || [],
            experience: profile.experience || [],
            education: profile.education || [],
            preferences: profile.preferences || {},
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const jobObj = {
            id: job.id || 'test-job',
            title: job.title || '',
            company: job.company || '',
            description: job.description || '',
            location: job.location || '',
            url: job.url || '',
            salary: job.salary,
            postedAt: job.postedAt ? new Date(job.postedAt) : new Date(),
            source: job.source || 'test',
            externalId: job.externalId || job.id || 'test',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        console.log('[AI Test] Scoring job:', jobObj.title, 'at', jobObj.company);

        const result = await scoreJobMatch(profileObj, jobObj);

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('[AI Test] Error:', error);
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
