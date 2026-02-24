import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/services/storage';
import { generateId } from '@/lib/utils';

// Simple in-memory storage for documents (as a quick solution)
// In production, this would use Firebase or another persistent storage
const documentStorage: Map<string, {
    jobId: string;
    type: 'resume' | 'cover-letter';
    content: string;
    createdAt: Date;
    updatedAt: Date;
}> = new Map();

/**
 * GET /api/documents?jobId=xxx&type=resume|cover-letter
 * Get a saved document for a job
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');
        const type = searchParams.get('type') as 'resume' | 'cover-letter';

        if (!jobId || !type) {
            return NextResponse.json(
                { success: false, error: 'jobId and type are required' },
                { status: 400 }
            );
        }

        const key = `${jobId}-${type}`;
        const document = documentStorage.get(key);

        if (!document) {
            return NextResponse.json({
                success: true,
                data: null,
                message: 'No saved document found'
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                jobId: document.jobId,
                type: document.type,
                content: document.content,
                createdAt: document.createdAt.toISOString(),
                updatedAt: document.updatedAt.toISOString(),
            }
        });
    } catch (error) {
        console.error('Error fetching document:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch document' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/documents
 * Save a document for a job
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { jobId, type, content } = body;

        if (!jobId || !type || !content) {
            return NextResponse.json(
                { success: false, error: 'jobId, type, and content are required' },
                { status: 400 }
            );
        }

        if (type !== 'resume' && type !== 'cover-letter') {
            return NextResponse.json(
                { success: false, error: 'type must be "resume" or "cover-letter"' },
                { status: 400 }
            );
        }

        const key = `${jobId}-${type}`;
        const now = new Date();
        const existing = documentStorage.get(key);

        const document = {
            jobId,
            type,
            content,
            createdAt: existing?.createdAt || now,
            updatedAt: now,
        };

        documentStorage.set(key, document);

        return NextResponse.json({
            success: true,
            data: {
                jobId: document.jobId,
                type: document.type,
                content: document.content,
                createdAt: document.createdAt.toISOString(),
                updatedAt: document.updatedAt.toISOString(),
            },
            message: 'Document saved successfully'
        });
    } catch (error) {
        console.error('Error saving document:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save document' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/documents?jobId=xxx&type=resume|cover-letter
 * Delete a saved document
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');
        const type = searchParams.get('type');

        if (!jobId || !type) {
            return NextResponse.json(
                { success: false, error: 'jobId and type are required' },
                { status: 400 }
            );
        }

        const key = `${jobId}-${type}`;
        documentStorage.delete(key);

        return NextResponse.json({
            success: true,
            message: 'Document deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting document:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete document' },
            { status: 500 }
        );
    }
}
