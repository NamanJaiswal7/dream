/**
 * Profile Expander Service
 * 
 * Expands a profile/job title to related job titles for comprehensive job search.
 * For example: "Software Engineer" → ["Software Developer", "Full Stack Engineer", ...]
 */

// Predefined mappings for common profiles
const PROFILE_MAPPINGS: Record<string, string[]> = {
    // Software Engineering
    'software engineer': [
        'software engineer', 'software developer', 'swe', 'sde',
        'full stack engineer', 'full stack developer', 'fullstack engineer', 'fullstack developer',
        'backend engineer', 'backend developer', 'back end engineer', 'back-end developer',
        'frontend engineer', 'frontend developer', 'front end engineer', 'front-end developer',
        'web developer', 'application developer', 'platform engineer',
        'senior software engineer', 'junior software engineer', 'staff engineer',
        'software engineering', 'developer', 'programmer', 'coder',
    ],

    // Data roles
    'data engineer': [
        'data engineer', 'data developer', 'etl developer', 'data pipeline engineer',
        'analytics engineer', 'data platform engineer', 'big data engineer',
        'senior data engineer', 'junior data engineer',
    ],

    'data scientist': [
        'data scientist', 'machine learning engineer', 'ml engineer', 'ai engineer',
        'research scientist', 'applied scientist', 'data analyst',
        'senior data scientist', 'junior data scientist',
    ],

    // DevOps/Infrastructure
    'devops engineer': [
        'devops engineer', 'site reliability engineer', 'sre', 'platform engineer',
        'infrastructure engineer', 'cloud engineer', 'systems engineer',
        'kubernetes engineer', 'aws engineer', 'azure engineer', 'gcp engineer',
        'senior devops engineer', 'junior devops engineer',
    ],

    // Product/Design
    'product manager': [
        'product manager', 'product owner', 'pm', 'technical product manager',
        'senior product manager', 'associate product manager', 'group product manager',
        'product lead', 'product director',
    ],

    'ux designer': [
        'ux designer', 'ui designer', 'ui/ux designer', 'product designer',
        'ux/ui designer', 'user experience designer', 'interaction designer',
        'visual designer', 'senior ux designer', 'junior ux designer',
    ],

    // Mobile
    'mobile developer': [
        'mobile developer', 'mobile engineer', 'ios developer', 'ios engineer',
        'android developer', 'android engineer', 'react native developer',
        'flutter developer', 'mobile application developer',
        'senior mobile developer', 'junior mobile developer',
    ],

    // QA/Testing
    'qa engineer': [
        'qa engineer', 'quality assurance engineer', 'test engineer', 'sdet',
        'software development engineer in test', 'automation engineer',
        'test automation engineer', 'quality engineer',
        'senior qa engineer', 'junior qa engineer',
    ],

    // Security
    'security engineer': [
        'security engineer', 'cybersecurity engineer', 'information security engineer',
        'application security engineer', 'security analyst', 'penetration tester',
        'devsecops engineer', 'senior security engineer',
    ],

    // Management
    'engineering manager': [
        'engineering manager', 'software engineering manager', 'tech lead',
        'technical lead', 'team lead', 'development manager',
        'director of engineering', 'vp of engineering', 'head of engineering',
    ],
};

// Normalize profile input
function normalizeProfile(profile: string): string {
    return profile.toLowerCase().trim();
}

// Find best matching profile key
function findBestMatch(profile: string): string | null {
    const normalized = normalizeProfile(profile);

    // Exact match
    if (PROFILE_MAPPINGS[normalized]) {
        return normalized;
    }

    // Partial match
    for (const key of Object.keys(PROFILE_MAPPINGS)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return key;
        }
    }

    // Word overlap match
    const profileWords = normalized.split(/\s+/);
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const key of Object.keys(PROFILE_MAPPINGS)) {
        const keyWords = key.split(/\s+/);
        const overlap = profileWords.filter(w => keyWords.includes(w)).length;
        if (overlap > bestScore) {
            bestScore = overlap;
            bestMatch = key;
        }
    }

    return bestMatch;
}

/**
 * Expand a profile to related job titles
 */
export function expandProfile(profile: string): string[] {
    const matchedKey = findBestMatch(profile);

    if (matchedKey) {
        return PROFILE_MAPPINGS[matchedKey];
    }

    // If no match, return the original profile with common variations
    const normalized = normalizeProfile(profile);
    return [
        normalized,
        `senior ${normalized}`,
        `junior ${normalized}`,
        `lead ${normalized}`,
        normalized.replace('engineer', 'developer'),
        normalized.replace('developer', 'engineer'),
    ].filter((v, i, a) => a.indexOf(v) === i); // Deduplicate
}

/**
 * Get search keywords for ATS platforms
 * Returns a smaller set of high-impact keywords for API searches
 */
export function getSearchKeywords(profile: string): string[] {
    const expanded = expandProfile(profile);

    // Return top keywords that cover most job postings
    const primaryKeywords = expanded.slice(0, 5);

    // Also generate single-word keywords for broader matches
    const singleWords = new Set<string>();
    for (const title of expanded) {
        for (const word of title.split(/\s+/)) {
            if (word.length > 3 && !['senior', 'junior', 'lead', 'staff'].includes(word)) {
                singleWords.add(word);
            }
        }
    }

    return [...primaryKeywords, ...Array.from(singleWords).slice(0, 3)];
}

/**
 * Check if a job title matches the expanded profile
 */
export function matchesProfile(jobTitle: string, profile: string): boolean {
    const expandedTitles = expandProfile(profile);
    const normalizedJob = jobTitle.toLowerCase();

    // Check if any expanded title is contained in the job title
    for (const title of expandedTitles) {
        if (normalizedJob.includes(title) || title.split(' ').every(word => normalizedJob.includes(word))) {
            return true;
        }
    }

    // Also check individual keywords
    const keywords = getSearchKeywords(profile);
    const matchCount = keywords.filter(kw => normalizedJob.includes(kw)).length;

    return matchCount >= 2; // At least 2 keyword matches
}

export const ProfileExpander = {
    expand: expandProfile,
    getKeywords: getSearchKeywords,
    matches: matchesProfile,
};
