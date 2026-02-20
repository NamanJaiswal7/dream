import { google } from 'googleapis';
import { Job, DateOrTimestamp } from '@/types';

/**
 * Google Sheets fallback storage adapter
 * Used when Firebase quota is exceeded
 */

const SHEETS_RANGES = {
    jobs: 'Jobs!A:Z',
    userJobs: 'UserJobs!A:Z',
    profiles: 'Profiles!A:Z',
};

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

function getSheetsClient() {
    if (!sheetsClient) {
        const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
        const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!clientEmail || !privateKey) {
            throw new Error('Google Sheets credentials not configured');
        }

        const auth = new google.auth.JWT({
            email: clientEmail,
            key: privateKey,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        sheetsClient = google.sheets({ version: 'v4', auth });
    }

    return sheetsClient;
}

function getSpreadsheetId(): string {
    const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!id) {
        throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not configured');
    }
    return id;
}

// Convert date to ISO string for storage
function dateToString(date: DateOrTimestamp): string {
    if (date instanceof Date) {
        return date.toISOString();
    }
    if (typeof date === 'string') {
        return date;
    }
    // Handle Firestore Timestamp
    if ('_seconds' in date) {
        return new Date(date._seconds * 1000).toISOString();
    }
    if ('toDate' in date && typeof date.toDate === 'function') {
        return date.toDate().toISOString();
    }
    return new Date().toISOString();
}

// Convert row to Job object
function rowToJob(row: string[], headers: string[]): Job {
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
        obj[header] = row[index] || '';
    });

    return {
        id: obj.id,
        externalId: obj.externalId,
        title: obj.title,
        company: obj.company,
        description: obj.description,
        location: JSON.parse(obj.location || '{}'),
        source: obj.source,
        sourceUrl: obj.sourceUrl,
        postedAt: new Date(obj.postedAt),
        fetchedAt: new Date(obj.fetchedAt),
        salary: obj.salary ? JSON.parse(obj.salary) : undefined,
        requirements: obj.requirements ? JSON.parse(obj.requirements) : undefined,
        benefits: obj.benefits ? JSON.parse(obj.benefits) : undefined,
        companyInfo: obj.companyInfo ? JSON.parse(obj.companyInfo) : undefined,
        deduplicationHash: obj.deduplicationHash,
        status: obj.status as Job['status'],
        createdAt: new Date(obj.createdAt),
        updatedAt: new Date(obj.updatedAt),
    };
}

// Convert Job to row
function jobToRow(job: Job): string[] {
    return [
        job.id,
        job.externalId,
        job.title,
        job.company,
        job.description,
        JSON.stringify(job.location),
        job.source,
        job.sourceUrl,
        dateToString(job.postedAt),
        dateToString(job.fetchedAt),
        job.salary ? JSON.stringify(job.salary) : '',
        job.requirements ? JSON.stringify(job.requirements) : '',
        job.benefits ? JSON.stringify(job.benefits) : '',
        job.companyInfo ? JSON.stringify(job.companyInfo) : '',
        job.deduplicationHash,
        job.status,
        dateToString(job.createdAt),
        dateToString(job.updatedAt),
    ];
}

const JOB_HEADERS = [
    'id', 'externalId', 'title', 'company', 'description', 'location',
    'source', 'sourceUrl', 'postedAt', 'fetchedAt', 'salary', 'requirements',
    'benefits', 'companyInfo', 'deduplicationHash', 'status', 'createdAt', 'updatedAt'
];

export class GoogleSheetsStorage {
    private _spreadsheetId: string | null = null;

    private get spreadsheetId(): string {
        if (!this._spreadsheetId) {
            this._spreadsheetId = getSpreadsheetId();
        }
        return this._spreadsheetId;
    }

    async initialize(): Promise<void> {
        const sheets = getSheetsClient();

        // Check if sheets exist, create if not
        try {
            const response = await sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId,
            });

            const existingSheets = response.data.sheets?.map(s => s.properties?.title).filter(Boolean) || [];

            const requiredSheets = ['Jobs', 'UserJobs', 'Profiles'];
            const missingSheets = requiredSheets.filter(s => !existingSheets.includes(s));

            if (missingSheets.length > 0) {
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    requestBody: {
                        requests: missingSheets.map(title => ({
                            addSheet: { properties: { title } },
                        })),
                    },
                });

                // Add headers to Jobs sheet
                if (missingSheets.includes('Jobs')) {
                    await sheets.spreadsheets.values.update({
                        spreadsheetId: this.spreadsheetId,
                        range: 'Jobs!A1',
                        valueInputOption: 'RAW',
                        requestBody: { values: [JOB_HEADERS] },
                    });
                }
            }
        } catch (error) {
            console.error('Failed to initialize Google Sheets:', error);
            throw error;
        }
    }

    async getJobs(): Promise<Job[]> {
        const sheets = getSheetsClient();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: SHEETS_RANGES.jobs,
        });

        const rows = response.data.values || [];
        if (rows.length <= 1) return []; // Only headers or empty

        const headers = rows[0] as string[];
        return rows.slice(1).map((row: string[]) => rowToJob(row, headers));
    }

    async getJobById(id: string): Promise<Job | null> {
        const jobs = await this.getJobs();
        return jobs.find(j => j.id === id) || null;
    }

    async getJobByHash(hash: string): Promise<Job | null> {
        const jobs = await this.getJobs();
        return jobs.find(j => j.deduplicationHash === hash) || null;
    }

    async createJob(job: Job): Promise<Job> {
        const sheets = getSheetsClient();

        await sheets.spreadsheets.values.append({
            spreadsheetId: this.spreadsheetId,
            range: SHEETS_RANGES.jobs,
            valueInputOption: 'RAW',
            requestBody: { values: [jobToRow(job)] },
        });

        return job;
    }

    async createJobs(jobs: Job[]): Promise<Job[]> {
        if (jobs.length === 0) return [];

        const sheets = getSheetsClient();

        await sheets.spreadsheets.values.append({
            spreadsheetId: this.spreadsheetId,
            range: SHEETS_RANGES.jobs,
            valueInputOption: 'RAW',
            requestBody: { values: jobs.map(jobToRow) },
        });

        return jobs;
    }

    async updateJob(id: string, updates: Partial<Job>): Promise<Job | null> {
        const sheets = getSheetsClient();
        const jobs = await this.getJobs();
        const jobIndex = jobs.findIndex(j => j.id === id);

        if (jobIndex === -1) return null;

        const updatedJob = { ...jobs[jobIndex], ...updates, updatedAt: new Date() };
        jobs[jobIndex] = updatedJob;

        // Rewrite entire sheet (not efficient but simple)
        await sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: SHEETS_RANGES.jobs,
            valueInputOption: 'RAW',
            requestBody: {
                values: [JOB_HEADERS, ...jobs.map(jobToRow)],
            },
        });

        return updatedJob;
    }

    async deleteJob(id: string): Promise<boolean> {
        const sheets = getSheetsClient();
        const jobs = await this.getJobs();
        const filteredJobs = jobs.filter(j => j.id !== id);

        if (filteredJobs.length === jobs.length) return false;

        await sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: SHEETS_RANGES.jobs,
            valueInputOption: 'RAW',
            requestBody: {
                values: [JOB_HEADERS, ...filteredJobs.map(jobToRow)],
            },
        });

        return true;
    }
}

// Lazy singleton - only created when actually needed
let _sheetsStorage: GoogleSheetsStorage | null = null;

export function getSheetsStorage(): GoogleSheetsStorage {
    if (!_sheetsStorage) {
        _sheetsStorage = new GoogleSheetsStorage();
    }
    return _sheetsStorage;
}

// Export for compatibility, but this getter won't throw until actually used
export const sheetsStorage = {
    get instance(): GoogleSheetsStorage {
        return getSheetsStorage();
    },
    getJobs: () => getSheetsStorage().getJobs(),
    getJobById: (id: string) => getSheetsStorage().getJobById(id),
    getJobByHash: (hash: string) => getSheetsStorage().getJobByHash(hash),
    createJob: (job: Job) => getSheetsStorage().createJob(job),
    createJobs: (jobs: Job[]) => getSheetsStorage().createJobs(jobs),
    updateJob: (id: string, updates: Partial<Job>) => getSheetsStorage().updateJob(id, updates),
    deleteJob: (id: string) => getSheetsStorage().deleteJob(id),
};
