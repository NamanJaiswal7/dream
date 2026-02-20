import { getDb } from '@/lib/firebase/admin';
import { sheetsStorage } from '@/lib/sheets';
import {
    Job,
    UserJob,
    UserProfile,
    JobFilters,
    PaginatedResponse,
    DateOrTimestamp,
    LatexResume
} from '@/types';
import { generateId } from '@/lib/utils';

/**
 * Storage Service with Firebase primary and Google Sheets fallback
 */

// Firestore collection names
const COLLECTIONS = {
    jobs: 'jobs',
    userJobs: 'userJobs',
    profiles: 'profiles',
    users: 'users',
    latexResumes: 'latexResumes',
};

// Convert Firestore timestamp to Date
function toDate(value: DateOrTimestamp): Date {
    if (value instanceof Date) {
        return value;
    }
    if (typeof value === 'string') {
        return new Date(value);
    }
    if ('_seconds' in value) {
        return new Date(value._seconds * 1000);
    }
    if ('toDate' in value && typeof value.toDate === 'function') {
        return value.toDate();
    }
    return new Date();
}

// Convert document data to Job
function docToJob(id: string, data: Record<string, unknown>): Job {
    return {
        id,
        externalId: data.externalId as string,
        title: data.title as string,
        company: data.company as string,
        description: data.description as string,
        location: data.location as Job['location'],
        source: data.source as string,
        sourceUrl: data.sourceUrl as string,
        postedAt: toDate(data.postedAt as DateOrTimestamp),
        fetchedAt: toDate(data.fetchedAt as DateOrTimestamp),
        salary: data.salary as Job['salary'],
        requirements: data.requirements as string[],
        benefits: data.benefits as string[],
        companyInfo: data.companyInfo as Job['companyInfo'],
        deduplicationHash: data.deduplicationHash as string,
        status: data.status as Job['status'],
        createdAt: toDate(data.createdAt as DateOrTimestamp),
        updatedAt: toDate(data.updatedAt as DateOrTimestamp),
    };
}

// Convert document data to UserJob
function docToUserJob(id: string, data: Record<string, unknown>): UserJob {
    return {
        id,
        userId: data.userId as string,
        jobId: data.jobId as string,
        matchScore: data.matchScore as number,
        matchReasoning: data.matchReasoning as string,
        strengths: data.strengths as string[] || [],
        gaps: data.gaps as string[] || [],
        generatedResume: data.generatedResume as string,
        generatedCoverLetter: data.generatedCoverLetter as string,
        applicationStatus: data.applicationStatus as UserJob['applicationStatus'],
        appliedAt: data.appliedAt ? toDate(data.appliedAt as DateOrTimestamp) : undefined,
        notes: data.notes as string,
        favorite: data.favorite as boolean || false,
        hidden: data.hidden as boolean || false,
        createdAt: toDate(data.createdAt as DateOrTimestamp),
        updatedAt: toDate(data.updatedAt as DateOrTimestamp),
    };
}

// Convert document data to UserProfile
function docToProfile(id: string, data: Record<string, unknown>): UserProfile {
    return {
        id,
        userId: data.userId as string,
        personalDetails: data.personalDetails as UserProfile['personalDetails'],
        summary: data.summary as string || '',
        skills: data.skills as string[] || [],
        experience: data.experience as UserProfile['experience'] || [],
        education: data.education as UserProfile['education'] || [],
        projects: data.projects as UserProfile['projects'] || [],
        certifications: data.certifications as UserProfile['certifications'] || [],
        preferences: data.preferences as UserProfile['preferences'] || {
            roles: [],
            locations: [],
            remoteOnly: false,
        },
        version: data.version as number || 1,
        createdAt: toDate(data.createdAt as DateOrTimestamp),
        updatedAt: toDate(data.updatedAt as DateOrTimestamp),
    };
}

class StorageService {
    private useSheetsFallback = false;

    private async withFallback<T>(
        firebaseOp: () => Promise<T>,
        sheetsOp: () => Promise<T>
    ): Promise<T> {
        if (this.useSheetsFallback) {
            return sheetsOp();
        }

        try {
            return await firebaseOp();
        } catch (error: unknown) {
            // Check if it's a quota error
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (
                errorMessage.includes('quota') ||
                errorMessage.includes('RESOURCE_EXHAUSTED') ||
                errorMessage.includes('rate limit')
            ) {
                console.warn('Firebase quota exceeded, falling back to Google Sheets');
                this.useSheetsFallback = true;
                return sheetsOp();
            }
            throw error;
        }
    }

    // =====================
    // Jobs
    // =====================

    async getJobs(filters: JobFilters = {}): Promise<PaginatedResponse<Job>> {
        return this.withFallback(
            async () => {
                const db = getDb();
                let query = db.collection(COLLECTIONS.jobs).orderBy('postedAt', 'desc');

                // Apply filters (Firestore has limitations, so we'll filter in memory for complex queries)
                const snapshot = await query.get();
                let jobs = snapshot.docs.map(doc => docToJob(doc.id, doc.data()));

                // Apply in-memory filters
                if (filters.search) {
                    const search = filters.search.toLowerCase();
                    jobs = jobs.filter(
                        j =>
                            j.title.toLowerCase().includes(search) ||
                            j.company.toLowerCase().includes(search)
                    );
                }

                if (filters.remote !== undefined) {
                    jobs = jobs.filter(j => (j.location.type === 'remote') === filters.remote);
                }

                if (filters.location) {
                    const loc = filters.location.toLowerCase();
                    jobs = jobs.filter(
                        j =>
                            j.location.country?.toLowerCase().includes(loc) ||
                            j.location.city?.toLowerCase().includes(loc)
                    );
                }

                if (filters.source) {
                    jobs = jobs.filter(j => j.source === filters.source);
                }

                // Sorting
                if (filters.sortBy) {
                    jobs.sort((a, b) => {
                        let comparison = 0;
                        switch (filters.sortBy) {
                            case 'date':
                                comparison = b.postedAt.getTime() - a.postedAt.getTime();
                                break;
                            case 'company':
                                comparison = a.company.localeCompare(b.company);
                                break;
                            case 'title':
                                comparison = a.title.localeCompare(b.title);
                                break;
                        }
                        return filters.sortOrder === 'asc' ? -comparison : comparison;
                    });
                }

                // Pagination
                const page = filters.page || 1;
                const limit = filters.limit || 20;
                const total = jobs.length;
                const start = (page - 1) * limit;
                const paginatedJobs = jobs.slice(start, start + limit);

                return {
                    data: paginatedJobs,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            async () => {
                const allJobs = await sheetsStorage.getJobs();
                const page = filters.page || 1;
                const limit = filters.limit || 20;
                const start = (page - 1) * limit;

                return {
                    data: allJobs.slice(start, start + limit),
                    pagination: {
                        page,
                        limit,
                        total: allJobs.length,
                        totalPages: Math.ceil(allJobs.length / limit),
                    },
                };
            }
        );
    }

    async getJobById(id: string): Promise<Job | null> {
        return this.withFallback(
            async () => {
                const db = getDb();
                const doc = await db.collection(COLLECTIONS.jobs).doc(id).get();
                if (!doc.exists) return null;
                return docToJob(doc.id, doc.data() as Record<string, unknown>);
            },
            async () => sheetsStorage.getJobById(id)
        );
    }

    async getJobByHash(hash: string): Promise<Job | null> {
        return this.withFallback(
            async () => {
                const db = getDb();
                const snapshot = await db
                    .collection(COLLECTIONS.jobs)
                    .where('deduplicationHash', '==', hash)
                    .limit(1)
                    .get();

                if (snapshot.empty) return null;
                const doc = snapshot.docs[0];
                return docToJob(doc.id, doc.data());
            },
            async () => sheetsStorage.getJobByHash(hash)
        );
    }

    async createJob(job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> {
        const id = generateId();
        const now = new Date();
        const fullJob: Job = {
            ...job,
            id,
            createdAt: now,
            updatedAt: now,
        };

        return this.withFallback(
            async () => {
                const db = getDb();
                await db.collection(COLLECTIONS.jobs).doc(id).set(fullJob);
                return fullJob;
            },
            async () => sheetsStorage.createJob(fullJob)
        );
    }

    async createJobs(jobs: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Job[]> {
        const now = new Date();
        const fullJobs: Job[] = jobs.map(job => ({
            ...job,
            id: generateId(),
            createdAt: now,
            updatedAt: now,
        }));

        return this.withFallback(
            async () => {
                const db = getDb();
                const batch = db.batch();

                for (const job of fullJobs) {
                    const ref = db.collection(COLLECTIONS.jobs).doc(job.id);
                    batch.set(ref, job);
                }

                await batch.commit();
                return fullJobs;
            },
            async () => sheetsStorage.createJobs(fullJobs)
        );
    }

    async updateJob(id: string, updates: Partial<Job>): Promise<Job | null> {
        return this.withFallback(
            async () => {
                const db = getDb();
                const ref = db.collection(COLLECTIONS.jobs).doc(id);
                const doc = await ref.get();

                if (!doc.exists) return null;

                const updatedData = { ...updates, updatedAt: new Date() };
                await ref.update(updatedData);

                const updatedDoc = await ref.get();
                return docToJob(updatedDoc.id, updatedDoc.data() as Record<string, unknown>);
            },
            async () => sheetsStorage.updateJob(id, updates)
        );
    }

    async deleteJob(id: string): Promise<boolean> {
        return this.withFallback(
            async () => {
                const db = getDb();
                const ref = db.collection(COLLECTIONS.jobs).doc(id);
                const doc = await ref.get();

                if (!doc.exists) return false;

                await ref.delete();
                return true;
            },
            async () => sheetsStorage.deleteJob ? sheetsStorage.deleteJob(id) : false
        );
    }

    async deleteAllJobs(): Promise<number> {
        return this.withFallback(
            async () => {
                const db = getDb();
                const snapshot = await db.collection(COLLECTIONS.jobs).get();

                if (snapshot.empty) return 0;

                let deletedCount = 0;
                const BATCH_SIZE = 500; // Firestore batch limit

                // Delete in batches
                const docs = snapshot.docs;
                for (let i = 0; i < docs.length; i += BATCH_SIZE) {
                    const batch = db.batch();
                    const batchDocs = docs.slice(i, i + BATCH_SIZE);

                    for (const doc of batchDocs) {
                        batch.delete(doc.ref);
                    }

                    await batch.commit();
                    deletedCount += batchDocs.length;
                    console.log(`[Storage] Deleted batch: ${deletedCount}/${docs.length} jobs`);
                }

                return deletedCount;
            },
            async () => {
                // Sheets fallback - not implemented for bulk delete
                console.warn('[Storage] deleteAllJobs not implemented for Sheets fallback');
                return 0;
            }
        );
    }

    // =====================
    // User Jobs
    // =====================

    async getUserJobs(
        userId: string,
        filters: JobFilters = {}
    ): Promise<PaginatedResponse<UserJob>> {
        const db = getDb();
        // Note: Using simple query without orderBy to avoid requiring composite index
        // Sorting is done in-memory below
        const snapshot = await db
            .collection(COLLECTIONS.userJobs)
            .where('userId', '==', userId)
            .get();

        let userJobs = snapshot.docs.map(doc => docToUserJob(doc.id, doc.data()));

        // Sort by match score descending (done in-memory to avoid index requirement)
        userJobs.sort((a, b) => b.matchScore - a.matchScore);

        // Apply filters
        if (filters.minScore !== undefined) {
            userJobs = userJobs.filter(uj => uj.matchScore >= filters.minScore!);
        }

        if (filters.maxScore !== undefined) {
            userJobs = userJobs.filter(uj => uj.matchScore <= filters.maxScore!);
        }

        if (filters.status && filters.status !== 'all') {
            userJobs = userJobs.filter(uj => uj.applicationStatus === filters.status);
        }

        // Pagination
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const total = userJobs.length;
        const start = (page - 1) * limit;
        const paginatedJobs = userJobs.slice(start, start + limit);

        return {
            data: paginatedJobs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getUserJobById(id: string): Promise<UserJob | null> {
        const db = getDb();
        const doc = await db.collection(COLLECTIONS.userJobs).doc(id).get();
        if (!doc.exists) return null;
        return docToUserJob(doc.id, doc.data() as Record<string, unknown>);
    }

    async createUserJob(
        userJob: Omit<UserJob, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<UserJob> {
        const db = getDb();
        const id = generateId();
        const now = new Date();
        const fullUserJob: UserJob = {
            ...userJob,
            id,
            createdAt: now,
            updatedAt: now,
        };

        await db.collection(COLLECTIONS.userJobs).doc(id).set(fullUserJob);
        return fullUserJob;
    }

    async updateUserJob(id: string, updates: Partial<UserJob>): Promise<UserJob | null> {
        const db = getDb();
        const ref = db.collection(COLLECTIONS.userJobs).doc(id);
        const doc = await ref.get();

        if (!doc.exists) return null;

        const updatedData = { ...updates, updatedAt: new Date() };
        await ref.update(updatedData);

        const updatedDoc = await ref.get();
        return docToUserJob(updatedDoc.id, updatedDoc.data() as Record<string, unknown>);
    }

    // =====================
    // Profiles
    // =====================

    async getProfile(userId: string): Promise<UserProfile | null> {
        try {
            const db = getDb();
            const snapshot = await db
                .collection(COLLECTIONS.profiles)
                .where('userId', '==', userId)
                .limit(1)
                .get();

            if (snapshot.empty) return null;
            const doc = snapshot.docs[0];
            return docToProfile(doc.id, doc.data());
        } catch (error: unknown) {
            // Check if it's an SSL/connection error (common with proxies)
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (
                errorMessage.includes('UNAVAILABLE') ||
                errorMessage.includes('SSL') ||
                errorMessage.includes('connection') ||
                errorMessage.includes('ECONNREFUSED')
            ) {
                console.warn('[Storage] gRPC connection failed, trying REST API fallback...');
                return this.getProfileViaRest(userId);
            }
            throw error;
        }
    }

    /**
     * Fallback method to fetch profile via Firestore REST API
     * Used when gRPC connection fails (e.g., due to SSL proxy interference)
     */
    private async getProfileViaRest(userId: string): Promise<UserProfile | null> {
        try {
            const { google } = await import('googleapis');

            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

            if (!projectId || !clientEmail || !privateKey) {
                throw new Error('Missing Firebase credentials for REST API fallback');
            }

            const auth = new google.auth.JWT({
                email: clientEmail,
                key: privateKey,
                scopes: ['https://www.googleapis.com/auth/datastore'],
            });

            const token = await auth.authorize();

            // Query profiles collection for the user
            const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    structuredQuery: {
                        from: [{ collectionId: 'profiles' }],
                        where: {
                            fieldFilter: {
                                field: { fieldPath: 'userId' },
                                op: 'EQUAL',
                                value: { stringValue: userId }
                            }
                        },
                        limit: 1
                    }
                }),
            });

            if (!response.ok) {
                throw new Error(`REST API error: ${response.status}`);
            }

            const results = await response.json() as Array<{ document?: { name: string; fields: Record<string, unknown> } }>;

            if (!results || results.length === 0 || !results[0].document) {
                return null;
            }

            const doc = results[0].document;
            const docId = doc.name.split('/').pop() || '';
            const data = this.parseFirestoreFields(doc.fields);

            return docToProfile(docId, data);
        } catch (error) {
            console.error('[Storage] REST API fallback failed:', error);
            throw error;
        }
    }

    /**
     * Parse Firestore REST API field format to plain objects
     */
    private parseFirestoreFields(fields: Record<string, unknown>): Record<string, unknown> {
        const result: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(fields)) {
            result[key] = this.parseFirestoreValue(value as Record<string, unknown>);
        }

        return result;
    }

    private parseFirestoreValue(value: Record<string, unknown>): unknown {
        if ('stringValue' in value) return value.stringValue;
        if ('integerValue' in value) return parseInt(value.integerValue as string, 10);
        if ('doubleValue' in value) return value.doubleValue;
        if ('booleanValue' in value) return value.booleanValue;
        if ('timestampValue' in value) return new Date(value.timestampValue as string);
        if ('nullValue' in value) return null;
        if ('arrayValue' in value) {
            const arr = value.arrayValue as { values?: Array<Record<string, unknown>> };
            return (arr.values || []).map(v => this.parseFirestoreValue(v));
        }
        if ('mapValue' in value) {
            const map = value.mapValue as { fields?: Record<string, unknown> };
            return map.fields ? this.parseFirestoreFields(map.fields) : {};
        }
        return value;
    }

    async createProfile(
        profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt' | 'version'>
    ): Promise<UserProfile> {
        const db = getDb();
        const id = generateId();
        const now = new Date();
        const fullProfile: UserProfile = {
            ...profile,
            id,
            version: 1,
            createdAt: now,
            updatedAt: now,
        };

        await db.collection(COLLECTIONS.profiles).doc(id).set(fullProfile);
        return fullProfile;
    }

    async updateProfile(
        userId: string,
        updates: Partial<UserProfile>
    ): Promise<UserProfile | null> {
        const db = getDb();
        const snapshot = await db
            .collection(COLLECTIONS.profiles)
            .where('userId', '==', userId)
            .limit(1)
            .get();

        if (snapshot.empty) return null;

        const doc = snapshot.docs[0];
        const currentProfile = docToProfile(doc.id, doc.data());
        const updatedData = {
            ...updates,
            version: currentProfile.version + 1,
            updatedAt: new Date(),
        };

        await doc.ref.update(updatedData);

        const updatedDoc = await doc.ref.get();
        return docToProfile(updatedDoc.id, updatedDoc.data() as Record<string, unknown>);
    }

    // =====================
    // Deduplication
    // =====================

    async getExistingHashes(): Promise<Set<string>> {
        return this.withFallback(
            async () => {
                const db = getDb();
                const snapshot = await db
                    .collection(COLLECTIONS.jobs)
                    .select('deduplicationHash')
                    .get();

                return new Set(snapshot.docs.map(doc => doc.data().deduplicationHash as string));
            },
            async () => {
                const jobs = await sheetsStorage.getJobs();
                return new Set(jobs.map(j => j.deduplicationHash));
            }
        );
    }

    // =====================
    // LaTeX Resumes
    // =====================

    async getLatexResume(userId: string, jobId: string): Promise<LatexResume | null> {
        const db = getDb();
        const snapshot = await db
            .collection(COLLECTIONS.latexResumes)
            .where('userId', '==', userId)
            .where('jobId', '==', jobId)
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        const data = doc.data();
        return {
            id: doc.id,
            userId: data.userId,
            jobId: data.jobId,
            personalInfo: data.personalInfo,
            data: data.data,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
        } as LatexResume;
    }

    async saveLatexResume(
        resume: Omit<LatexResume, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<LatexResume> {
        const db = getDb();

        // Check if resume already exists for this user/job
        const existing = await this.getLatexResume(resume.userId, resume.jobId);

        if (existing) {
            // Update existing
            const ref = db.collection(COLLECTIONS.latexResumes).doc(existing.id);
            const updateData = {
                personalInfo: resume.personalInfo,
                data: resume.data,
                updatedAt: new Date(),
            };
            await ref.update(updateData);

            return {
                ...existing,
                ...updateData,
            };
        } else {
            // Create new
            const id = generateId();
            const now = new Date();
            const fullResume: LatexResume = {
                id,
                userId: resume.userId,
                jobId: resume.jobId,
                personalInfo: resume.personalInfo,
                data: resume.data,
                createdAt: now,
                updatedAt: now,
            };

            await db.collection(COLLECTIONS.latexResumes).doc(id).set(fullResume);
            return fullResume;
        }
    }

    async deleteLatexResume(userId: string, jobId: string): Promise<boolean> {
        const db = getDb();
        const existing = await this.getLatexResume(userId, jobId);

        if (!existing) return false;

        await db.collection(COLLECTIONS.latexResumes).doc(existing.id).delete();
        return true;
    }
}

export const storageService = new StorageService();

