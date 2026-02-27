import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/services/storage';
import { LatexResumeData, LatexResumePersonalInfo } from '@/types';

// Default user ID for now (in production this would come from auth)
const DEFAULT_USER_ID = 'default-user';

interface RouteParams {
    params: Promise<{ jobId: string }>;
}

// GET /api/resume/:jobId - Get saved resume for job
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { jobId } = await params;

        if (!jobId) {
            return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
        }

        const resume = await storageService.getLatexResume(DEFAULT_USER_ID, jobId);

        if (!resume) {
            return NextResponse.json({ exists: false });
        }

        return NextResponse.json({
            exists: true,
            resume: {
                ...resume,
                createdAt: resume.createdAt.toISOString(),
                updatedAt: resume.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        console.error('[API] Error getting resume:', error);
        return NextResponse.json(
            { error: 'Failed to get resume' },
            { status: 500 }
        );
    }
}

// PUT /api/resume/:jobId - Save/update resume data
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { jobId } = await params;
        const body = await request.json();
        const { personalInfo, data } = body as {
            personalInfo: LatexResumePersonalInfo;
            data: LatexResumeData;
        };

        if (!jobId) {
            return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
        }

        if (!personalInfo || !data) {
            return NextResponse.json(
                { error: 'personalInfo and data are required' },
                { status: 400 }
            );
        }

        const resume = await storageService.saveLatexResume({
            userId: DEFAULT_USER_ID,
            jobId,
            personalInfo,
            data,
        });

        return NextResponse.json({
            success: true,
            resume: {
                ...resume,
                createdAt: resume.createdAt.toISOString(),
                updatedAt: resume.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        console.error('[API] Error saving resume:', error);
        return NextResponse.json(
            { error: 'Failed to save resume' },
            { status: 500 }
        );
    }
}

// DELETE /api/resume/:jobId - Delete resume
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { jobId } = await params;

        if (!jobId) {
            return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
        }

        const deleted = await storageService.deleteLatexResume(DEFAULT_USER_ID, jobId);

        if (!deleted) {
            return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] Error deleting resume:', error);
        return NextResponse.json(
            { error: 'Failed to delete resume' },
            { status: 500 }
        );
    }
}
