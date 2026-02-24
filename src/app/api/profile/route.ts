import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/services/storage';
import { UserProfile } from '@/types';

/**
 * GET /api/profile
 * Get user profile
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId') || 'default-user';

        const profile = await storageService.getProfile(userId);

        if (!profile) {
            // Return empty profile structure for new users
            return NextResponse.json({
                success: true,
                data: null,
                message: 'No profile found. Please create one.',
            });
        }

        return NextResponse.json({
            success: true,
            data: profile,
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch profile' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/profile
 * Create user profile
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const userId = body.userId || 'default-user';

        // Check if profile already exists
        const existing = await storageService.getProfile(userId);
        if (existing) {
            return NextResponse.json(
                { success: false, error: 'Profile already exists. Use PUT to update.' },
                { status: 400 }
            );
        }

        // Validate required fields
        if (!body.personalDetails?.fullName || !body.personalDetails?.email) {
            return NextResponse.json(
                { success: false, error: 'Full name and email are required' },
                { status: 400 }
            );
        }

        const profileData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt' | 'version'> = {
            userId,
            personalDetails: body.personalDetails,
            summary: body.summary || '',
            skills: body.skills || [],
            experience: body.experience || [],
            education: body.education || [],
            projects: body.projects || [],
            certifications: body.certifications || [],
            preferences: body.preferences || {
                roles: [],
                locations: [],
                remoteOnly: false,
            },
        };

        const profile = await storageService.createProfile(profileData);

        return NextResponse.json({
            success: true,
            data: profile,
            message: 'Profile created successfully',
        });
    } catch (error) {
        console.error('Error creating profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create profile' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/profile
 * Update user profile
 */
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const userId = body.userId || 'default-user';

        // Check if profile exists
        const existing = await storageService.getProfile(userId);
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Profile not found. Use POST to create.' },
                { status: 404 }
            );
        }

        const updates: Partial<UserProfile> = {};

        // Only include provided fields
        if (body.personalDetails) updates.personalDetails = body.personalDetails;
        if (body.summary !== undefined) updates.summary = body.summary;
        if (body.skills) updates.skills = body.skills;
        if (body.experience) updates.experience = body.experience;
        if (body.education) updates.education = body.education;
        if (body.projects) updates.projects = body.projects;
        if (body.certifications) updates.certifications = body.certifications;
        if (body.preferences) updates.preferences = body.preferences;

        const profile = await storageService.updateProfile(userId, updates);

        return NextResponse.json({
            success: true,
            data: profile,
            message: 'Profile updated successfully',
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}
