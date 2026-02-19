import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
    return uuidv4();
}

/**
 * Generate a deduplication hash for a job
 */
export function generateJobHash(title: string, company: string, description: string): string {
    const normalizedTitle = title.toLowerCase().trim();
    const normalizedCompany = company.toLowerCase().trim();
    // Use first 500 chars of description to avoid minor changes causing different hashes
    const normalizedDescription = description.toLowerCase().trim().slice(0, 500);

    const content = `${normalizedTitle}|${normalizedCompany}|${normalizedDescription}`;
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Parse relative date strings like "2 days ago", "1 week ago"
 */
export function parseRelativeDate(text: string): Date {
    const now = new Date();
    const lowerText = text.toLowerCase().trim();

    // Match patterns like "X days ago", "X hours ago", etc.
    const match = lowerText.match(/(\d+)\s*(hour|day|week|month)s?\s*ago/);

    if (match) {
        const [, amount, unit] = match;
        const value = parseInt(amount, 10);

        switch (unit) {
            case 'hour':
                now.setHours(now.getHours() - value);
                break;
            case 'day':
                now.setDate(now.getDate() - value);
                break;
            case 'week':
                now.setDate(now.getDate() - value * 7);
                break;
            case 'month':
                now.setMonth(now.getMonth() - value);
                break;
        }
        return now;
    }

    // Try to parse as a regular date
    if (lowerText === 'today' || lowerText === 'just now') {
        return now;
    }

    if (lowerText === 'yesterday') {
        now.setDate(now.getDate() - 1);
        return now;
    }

    // Fallback: try direct parsing
    const parsed = new Date(text);
    return isNaN(parsed.getTime()) ? now : parsed;
}

/**
 * Normalize location string to structured format
 */
export function normalizeLocation(raw: string): {
    type: 'remote' | 'onsite' | 'hybrid';
    country?: string;
    city?: string;
} {
    const lowerRaw = raw.toLowerCase().trim();

    // Check for remote
    if (lowerRaw.includes('remote') && !lowerRaw.includes('hybrid')) {
        return { type: 'remote' };
    }

    // Check for hybrid
    if (lowerRaw.includes('hybrid')) {
        // Try to extract location
        const parts = raw.split(/[,\-–]/).map(p => p.trim());
        const locationParts = parts.filter(p => !p.toLowerCase().includes('hybrid'));

        return {
            type: 'hybrid',
            city: locationParts[0] || undefined,
            country: locationParts[1] || undefined,
        };
    }

    // Onsite - try to extract city and country
    const parts = raw.split(/[,\-–]/).map(p => p.trim());

    return {
        type: 'onsite',
        city: parts[0] || undefined,
        country: parts[1] || parts[0] || undefined,
    };
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format salary range for display
 */
export function formatSalary(salary: {
    min?: number;
    max?: number;
    currency: string;
    period: string;
}): string {
    const { min, max, currency, period } = salary;
    const currencySymbol = getCurrencySymbol(currency);

    if (min && max) {
        return `${currencySymbol}${formatNumber(min)} - ${currencySymbol}${formatNumber(max)}/${period}`;
    }

    if (min) {
        return `From ${currencySymbol}${formatNumber(min)}/${period}`;
    }

    if (max) {
        return `Up to ${currencySymbol}${formatNumber(max)}/${period}`;
    }

    return 'Not specified';
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        PLN: 'zł',
        LTL: '€', // Lithuania uses EUR
    };
    return symbols[currency.toUpperCase()] || currency;
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Delay execution
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rate limiter class
 */
export class RateLimiter {
    private queue: Array<() => void> = [];
    private running = 0;

    constructor(
        private maxRequests: number,
        private perMilliseconds: number
    ) { }

    async acquire(): Promise<void> {
        if (this.running < this.maxRequests) {
            this.running++;
            return;
        }

        return new Promise(resolve => {
            this.queue.push(resolve);
        });
    }

    release(): void {
        setTimeout(() => {
            this.running--;
            const next = this.queue.shift();
            if (next) {
                this.running++;
                next();
            }
        }, this.perMilliseconds);
    }

    async withLimit<T>(fn: () => Promise<T>): Promise<T> {
        await this.acquire();
        try {
            return await fn();
        } finally {
            this.release();
        }
    }
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
    fn: () => Promise<T>,
    options: {
        maxRetries?: number;
        initialDelay?: number;
        maxDelay?: number;
        backoffFactor?: number;
    } = {}
): Promise<T> {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        backoffFactor = 2,
    } = options;

    let lastError: Error | undefined;
    let currentDelay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt === maxRetries) {
                break;
            }

            await delay(currentDelay);
            currentDelay = Math.min(currentDelay * backoffFactor, maxDelay);
        }
    }

    throw lastError;
}

/**
 * Extract keywords from job description
 */
export function extractKeywords(text: string): string[] {
    // Common tech keywords and skills
    const techPatterns = [
        /\b(javascript|typescript|python|java|c\+\+|c#|go|rust|ruby|php|swift|kotlin)\b/gi,
        /\b(react|vue|angular|next\.?js|node\.?js|express|django|flask|spring|rails)\b/gi,
        /\b(aws|azure|gcp|docker|kubernetes|terraform|ci\/cd|devops)\b/gi,
        /\b(sql|postgresql|mysql|mongodb|redis|elasticsearch|graphql)\b/gi,
        /\b(git|agile|scrum|rest|api|microservices|serverless)\b/gi,
    ];

    const keywords = new Set<string>();

    for (const pattern of techPatterns) {
        const matches = text.match(pattern) || [];
        matches.forEach(match => keywords.add(match.toLowerCase()));
    }

    return Array.from(keywords);
}

/**
 * Calculate text similarity (simple word overlap)
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
}
