import { UserProfile, Job } from '@/types';

/**
 * AI Prompt Templates for Job Scoring, Resume, and Cover Letter Generation
 * Updated for compatibility with both full and simplified profile structures
 */

// Helper to safely access nested properties
const getProfileName = (profile: UserProfile): string => {
  if (profile.personalDetails?.fullName) return profile.personalDetails.fullName;
  if (profile.name) return profile.name;
  return 'Candidate';
};

const getProfileLocation = (profile: UserProfile): string => {
  if (profile.personalDetails?.location) return profile.personalDetails.location;
  if (profile.location) return profile.location;
  return 'Not specified';
};

const getJobLocation = (job: Job): string => {
  if (typeof job.location === 'string') return job.location;
  if (job.location?.type === 'remote') return 'Remote';
  if (job.location?.city || job.location?.country) {
    return `${job.location.city || ''}, ${job.location.country || ''}`.trim().replace(/^,\s*|,\s*$/g, '');
  }
  return 'Not specified';
};

export const PROMPTS = {
  /**
   * Job Scoring Prompt
   * Analyzes how well a job matches the user's profile
   */
  jobScoring: (profile: UserProfile, job: Job): string => `
You are an expert career advisor analyzing job fit for a candidate.

## Candidate Profile

- Name: ${getProfileName(profile)}
- Location: ${getProfileLocation(profile)}
- Headline: ${profile.headline || 'Not specified'}

### Professional Summary
${profile.summary || 'Not provided'}

### Skills
${Array.isArray(profile.skills) ? profile.skills.join(', ') : 'Not specified'}

### Experience
${Array.isArray(profile.experience) && profile.experience.length > 0
      ? profile.experience.map(exp => `
- **${exp.title || 'Role'}** at ${exp.company || 'Company'} (${exp.startDate || 'Start'} - ${exp.current ? 'Present' : exp.endDate || 'End'})
  ${exp.description || ''}
`).join('\n')
      : 'No experience listed'}

### Education
${Array.isArray(profile.education) && profile.education.length > 0
      ? profile.education.map(edu => `
- **${edu.degree || 'Degree'}** from ${edu.institution || 'Institution'}
`).join('\n')
      : 'No education listed'}

---

## Job Details

- **Title**: ${job.title}
- **Company**: ${job.company}
- **Location**: ${getJobLocation(job)}

### Job Description
${job.description || 'No description available'}

---

## Task

Analyze how well this job matches the candidate's profile. Consider:
1. Skills match
2. Experience relevance
3. Location fit
4. Career trajectory alignment

Provide your analysis in the following JSON format:

\`\`\`json
{
  "score": <number between 0-100>,
  "strengths": ["<strength 1>", "<strength 2>"],
  "gaps": ["<gap 1>", "<gap 2>"],
  "reasoning": "<2-3 sentence overall assessment>"
}
\`\`\`

Be honest and realistic. A score of 80+ means excellent match, 60-79 is good, 40-59 is moderate, below 40 is weak match.
`,

  /**
   * Resume Generation Prompt
   */
  resumeGeneration: (profile: UserProfile, job: Job): string => `
You are an expert resume writer creating an ATS-optimized resume tailored for a specific job application.

## Candidate Information

- Name: ${getProfileName(profile)}
- Location: ${getProfileLocation(profile)}
- Email: ${profile.personalDetails?.email || profile.email || 'email@example.com'}
- Headline: ${profile.headline || ''}

### Professional Summary
${profile.summary || 'Create an appropriate summary based on experience'}

### Skills
${Array.isArray(profile.skills) ? profile.skills.join(', ') : 'Not specified'}

### Work Experience
${Array.isArray(profile.experience) && profile.experience.length > 0
      ? profile.experience.map(exp => `
**${exp.title || 'Role'}** | ${exp.company || 'Company'}
${exp.startDate || 'Start'} - ${exp.current ? 'Present' : exp.endDate || 'End'}

${exp.description || ''}

${Array.isArray(exp.achievements) ? exp.achievements.map(a => `- ${a}`).join('\n') : ''}
`).join('\n---\n')
      : 'No experience listed'}

### Education
${Array.isArray(profile.education) && profile.education.length > 0
      ? profile.education.map(edu => `
**${edu.degree || 'Degree'}** | ${edu.institution || 'Institution'}
${edu.graduationDate || ''}
`).join('\n')
      : 'No education listed'}

---

## Target Job

**Position**: ${job.title}
**Company**: ${job.company}
**Location**: ${getJobLocation(job)}

### Job Description
${job.description || 'No description available'}

---

## Instructions

Create a tailored resume that:
1. Highlights relevant experience for this role
2. Uses keywords from the job description
3. Quantifies achievements where possible
4. Is ATS-friendly with clean formatting

Provide the resume in clean Markdown format.
`,

  /**
   * Cover Letter Generation Prompt
   * Creates authentic, human-sounding cover letters with specific experience
   */
  coverLetterGeneration: (profile: UserProfile, job: Job): string => `
You are ${getProfileName(profile)}, a senior software professional writing your own cover letter. Write in first person as if you're sending this to a friend who happens to be a hiring manager.

## ABOUT YOU

Name: ${getProfileName(profile)}
Location: ${getProfileLocation(profile)}
Your Professional Focus: ${profile.headline || 'Senior Software Engineer'}

### Your Background Summary
${profile.summary || 'Experienced software professional with strong technical skills'}

### Your Technical Skills
${Array.isArray(profile.skills) ? profile.skills.slice(0, 15).join(', ') : 'Strong technical background'}

### Your Work Experience (Pick specific stories from here)
${Array.isArray(profile.experience) && profile.experience.length > 0
      ? profile.experience.slice(0, 3).map(exp => `
**${exp.title || 'Role'}** at ${exp.company || 'Company'} (${exp.startDate || ''} - ${exp.current ? 'Present' : exp.endDate || ''})
What you did: ${exp.description || ''}
Achievements: ${Array.isArray(exp.achievements) ? exp.achievements.join('; ') : ''}
`).join('\n')
      : 'Senior engineering roles at tech companies'}

### Your Projects (Reference these as passion/side work)
${Array.isArray(profile.projects) && profile.projects.length > 0
      ? profile.projects.slice(0, 2).map(proj => `
- ${proj.name}: ${proj.description || 'Technical project'} (Tech: ${Array.isArray(proj.technologies) ? proj.technologies.join(', ') : 'Modern stack'})
`).join('')
      : 'Personal technical projects'}

---

## THE JOB YOU'RE APPLYING FOR

**Position**: ${job.title}
**Company**: ${job.company}
**Location**: ${getJobLocation(job)}

### Job Description (Read this carefully - you need to address their specific needs)
${job.description || 'No description available - focus on the role title and company'}

---

## WRITING INSTRUCTIONS

Write a cover letter that sounds like a REAL PERSON wrote it, not an AI. Follow these rules:

**TONE & VOICE:**
- Write like you're emailing a colleague about why you're excited for this role
- Be confident but not arrogant - you know you're good, you don't need to oversell
- Use contractions naturally ("I've", "I'm", "that's")
- Avoid corporate buzzwords like "leverage", "synergy", "passionate about excellence"
- NO generic phrases like "I am writing to express my interest" - that screams template

**STRUCTURE (4 paragraphs, 250-350 words total):**

**Paragraph 1 - The Hook (2-3 sentences):**
- Start with something specific about ${job.company} or the ${job.title} role that genuinely interests you
- Briefly state who you are and your relevant experience level
- Example: "When I saw ${job.company} is building [specific thing from job description], I had to reach out. I've spent the last X years doing exactly this kind of work at [current/recent company]."

**Paragraph 2 - Your Story (4-5 sentences):**
- Pick ONE specific project or accomplishment from your experience that's relevant to this job
- Tell it like a brief story: the problem, what you did, the outcome with numbers
- Connect it directly to what ${job.company} needs based on the job description
- Example: "At [company], we faced [similar challenge to job requirements]. I led the effort to [what you did], which [specific measurable outcome]. This taught me [relevant insight]."

**Paragraph 3 - Why This Fits (3-4 sentences):**
- Explain why ${job.company}'s specific challenges interest you
- Reference 2-3 technologies or approaches from the job description that match your skills
- If you can find hints about their culture/mission in the description, mention alignment
- Show you understand what they're trying to build

**Paragraph 4 - The Close (2 sentences):**
- Express genuine interest in discussing further
- Be direct and confident, not needy
- Example: "I'd love to chat about how I could contribute to [specific team/project]. I'm available anytime that works for you."

**CRITICAL RULES:**
- Reference SPECIFIC technologies from the job description that you actually know
- Mention REAL numbers from your experience (users served, performance improvements, team size)
- Sound like someone who has options, not someone desperate for a job
- Keep it under 350 words - hiring managers skim

**Output:**
Write the cover letter directly in plain text (not markdown). Include a simple greeting and sign-off:

"Hi [Hiring Team],

[Your cover letter paragraphs]

Best,
${getProfileName(profile)}"
`,

  /**
* LaTeX Resume Generation Prompt
* Generates tailored, authentic senior developer content for resume placeholders
*/
  latexResumeGeneration: (profile: UserProfile, job: Job): string => `
You are a senior software engineer with 10+ years of experience writing your own resume. Write in first person perspective as if YOU are the candidate describing YOUR actual work.

## YOUR PROFILE (This is YOU)

Name: ${getProfileName(profile)}
Location: ${getProfileLocation(profile)}

### Your Technical Skills
${Array.isArray(profile.skills) ? profile.skills.join(', ') : 'Not specified'}

### Your Work History
${Array.isArray(profile.experience) && profile.experience.length > 0
      ? profile.experience.slice(0, 3).map((exp, i) => `
**Role ${i + 1}: ${exp.title || 'Role'} at ${exp.company || 'Company'}**
Duration: ${exp.startDate || 'Start'} - ${exp.current ? 'Present' : exp.endDate || 'End'}
Location: ${exp.location || 'Remote'}
What you did: ${exp.description || 'Technical work'}
Key wins: ${Array.isArray(exp.achievements) ? exp.achievements.join('; ') : 'Various achievements'}
`).join('\n')
      : 'Senior developer with multiple roles'}

### Your Side Projects
${Array.isArray(profile.projects) && profile.projects.length > 0
      ? profile.projects.slice(0, 3).map((proj, i) => `
**Project ${i + 1}: ${proj.name}**
Stack: ${Array.isArray(proj.technologies) ? proj.technologies.join(', ') : 'Modern stack'}
What it does: ${proj.description || 'Technical project'}
Notable aspects: ${Array.isArray(proj.highlights) ? proj.highlights.join('; ') : 'Various features'}
`).join('\n')
      : 'Personal technical projects'}

---

## THE JOB YOU'RE APPLYING FOR

**Position**: ${job.title}
**Company**: ${job.company}
**Location**: ${getJobLocation(job)}

### What They're Looking For
${job.description || 'Senior engineering role with modern tech stack'}

---

## YOUR TASK - CRITICAL JOB MATCHING

**STEP 1: ANALYZE THE JOB DESCRIPTION**
First, extract the key requirements from the job description above:
- What technologies do they mention? (languages, frameworks, databases, cloud services)
- What type of work is this? (backend, frontend, full-stack, infra, ML, etc.)
- What's the seniority level? (IC, Tech Lead, Staff, Principal)
- What business domain? (fintech, e-commerce, healthcare, etc.)

**STEP 2: MAP YOUR EXPERIENCE TO THEIR NEEDS**
For each technology/requirement they mention, find something from YOUR profile that matches:
- If they want React → emphasize your React/frontend work
- If they want distributed systems → highlight your backend scaling work
- If they want AWS → mention your cloud experience specifically
- If they want leadership → emphasize team lead, mentoring, architecture decisions

**STEP 3: REWRITE EVERYTHING TO FIT THIS JOB**

Rewrite your resume content to perfectly match this job. You ARE the candidate - write like you're describing your REAL work to a friend who's a hiring manager.

**Writing Style Rules:**
1. NO generic phrases like "contributed to" or "worked on" - be SPECIFIC about what YOU built
2. Start bullets with strong verbs: Architected, Shipped, Debugged, Refactored, Scaled, Migrated, Optimized
3. Include REAL numbers: latency reductions (e.g., "cut P99 from 800ms to 120ms"), traffic handled ("serving 2M RPM"), team sizes, cost savings
4. Mention specific tech by name: "Redis cluster", "Kubernetes HPA", "PostgreSQL with Citus", not just "databases"
5. Sound like a senior IC writing their own resume, not a recruiter writing about someone else
6. **CRITICAL: Skills and experience bullets MUST reference technologies from the job description**
7. Reorder skills to put job-relevant ones FIRST

**Output Format:**
Return ONLY a JSON object. No explanation text before or after.

\`\`\`json
{
  "summary": "Write 2-3 sentences as if introducing yourself to the hiring manager. Mention years of experience, your specialty (backend/frontend/full-stack), and 1-2 impressive metrics. Example: 'Staff engineer with 8 years building payment systems at scale. Led the migration of checkout flow to microservices, reducing cart abandonment by 23%. Previously built real-time fraud detection serving 50M transactions/day at Stripe.'",
  
  "exp1_bullets": [
    "Describe YOUR biggest technical win at this job - what you built, why it mattered, specific metrics",
    "Describe a hard technical problem YOU solved - the challenge, your approach, the outcome",
    "Describe YOUR leadership or mentorship - how many engineers, what you taught them, impact",
    "Describe a system YOU designed or improved - architecture decisions, trade-offs, results"
  ],
  
  "exp2_bullets": [
    "Your main technical contribution at this role with specific technologies used",
    "A performance or reliability improvement you drove with metrics",
    "Cross-team or cross-functional work that shipped something meaningful"
  ],
  
  "exp3_bullets": [
    "What you learned or built early in your career that's relevant to this job",
    "Any notable projects or technologies you worked with"
  ],
  
  "proj1_bullets": [
    "What the project does and why you built it - make it sound like a passion project",
    "Interesting technical decisions you made and why",
    "Scale or usage metrics if applicable"
  ],
  
  "proj2_bullets": [
    "What this project does and why you built it - be specific about the problem it solves",
    "Technical highlights that show your skills relevant to the target job"
  ],
  
  "proj3_bullets": [
    "What this project demonstrates about your capabilities",
    "Notable technical aspects"
  ],
  
  "edu1_bullets": ["Relevant coursework, thesis, or academic achievements only if notable"],
  
  "skills_languages": "Order by relevance to job: strongest/most relevant first. Example: TypeScript, Python, Go, SQL",
  "skills_frameworks": "Order by relevance: React, Next.js, Node.js, FastAPI, etc.",
  "skills_cloud": "Cloud and DevOps tools you actually use: AWS (Lambda, ECS, RDS), Kubernetes, Terraform, etc.",
  "skills_databases": "Databases you have real experience with: PostgreSQL, Redis, MongoDB, DynamoDB, etc.",
  "skills_tools": "Development tools: Git, GitHub Actions, DataDog, Sentry, Kafka, etc."
}
\`\`\`

**Critical:**
- Sound like a REAL person, not a template
- Use specific technologies from YOUR profile that match the JOB
- Include real metrics (you can extrapolate realistic ones from the context)
- Escape LaTeX: & → \\&, % → \\%, $ → \\$
- Each bullet should be 1-2 lines max
`,
};

/**
 * Parse AI response to extract JSON
 */
export function parseJsonResponse<T>(response: string): T | null {
  try {
    // Try to find JSON in code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }

    // Try to find JSON object in the response
    const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      return JSON.parse(jsonObjectMatch[0]);
    }

    // Try to parse the entire response as JSON
    return JSON.parse(response);
  } catch {
    console.error('Failed to parse AI response as JSON');
    return null;
  }
}

/**
 * Extract markdown content from AI response
 */
export function parseMarkdownResponse(response: string): string {
  // Try to find markdown in code blocks
  const markdownMatch = response.match(/```(?:markdown)?\s*([\s\S]*?)```/);
  if (markdownMatch) {
    return markdownMatch[1].trim();
  }

  // Return the entire response if no code block found
  return response.trim();
}
