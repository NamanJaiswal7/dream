import { NextResponse } from 'next/server';
import { storageService } from '@/services/storage';

/**
 * DELETE /api/jobs/delete-all
 * Delete all jobs from the database
 */
export async function DELETE() {
    try {
        console.log('[API] Deleting all jobs from database...');

        const deletedCount = await storageService.deleteAllJobs();

        console.log(`[API] Successfully deleted ${deletedCount} jobs`);

        return NextResponse.json({
            success: true,
            message: `Successfully deleted ${deletedCount} jobs`,
            deletedCount,
        });
    } catch (error) {
        console.error('[API] Error deleting all jobs:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to delete jobs',
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
