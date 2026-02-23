import { UserProfile, Job } from '@/types';
import { PROMPTS, parseJsonResponse, parseMarkdownResponse } from '@/prompts';

/**
 * AI Service using Local Mistral 7B via Ollama
 * 
 * Ollama runs on localhost:11434 and provides an OpenAI-compatible API.
 * This eliminates the need for external API keys and keeps data local.
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL_NAME = process.env.OLLAMA_MODEL || 'mistral';

interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
}

interface OllamaChatResponse {
    model: string;
    message: {
        role: string;
        content: string;
    };
    done: boolean;
}

/**
 * Call Ollama API to generate text
 */
async function generateWithOllama(prompt: string): Promise<string> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                    num_predict: 2048,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Ollama API error: ${response.status} - ${error}`);
        }

        const data = await response.json() as OllamaResponse;
        return data.response;
    } catch (error) {
        console.error('[Ollama] Error:', error);
        throw error;
    }
}

/**
 * Call Ollama Chat API for structured conversations
 */
async function chatWithOllama(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                stream: false,
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                    num_predict: 2048,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Ollama Chat API error: ${response.status} - ${error}`);
        }

        const data = await response.json() as OllamaChatResponse;
        return data.message.content;
    } catch (error) {
        console.error('[Ollama Chat] Error:', error);
        throw error;
    }
}

/**
 * Check if Ollama is available
 */
export async function isOllamaAvailable(): Promise<boolean> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            method: 'GET',
        });

        if (response.ok) {
            const data = await response.json() as { models: Array<{ name: string }> };
            const hasModel = data.models?.some(m => m.name.includes('mistral'));
            console.log(`[Ollama] Available: ${response.ok}, Has Mistral: ${hasModel}`);
            return hasModel;
        }
        return false;
    } catch {
        console.warn('[Ollama] Not available, is ollama serve running?');
        return false;
    }
}

// Type definitions for AI responses
export interface JobScoreResult {
    score: number;
    reasoning: string;
    strengths: string[];
    gaps: string[];
}

export interface GeneratedResume {
    content: string;
    format: 'markdown';
    generatedAt: Date;
}

export interface GeneratedCoverLetter {
    content: string;
    generatedAt: Date;
}

/**
 * Score how well a job matches a user profile
 */
export async function scoreJobMatch(
    profile: UserProfile,
    job: Job
): Promise<JobScoreResult> {
    try {
        const prompt = PROMPTS.jobScoring(profile, job);

        console.log(`[AI] Scoring job: ${job.title} at ${job.company}`);
        const text = await generateWithOllama(prompt);

        const parsed = parseJsonResponse<{
            score: number;
            reasoning: string;
            strengths: string[];
            gaps: string[];
        }>(text);

        if (!parsed) {
            console.warn('[AI] Could not parse JSON response, using regex fallback');
            // Try to extract score from text
            const scoreMatch = text.match(/score[:\s]*(\d+)/i);
            const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;

            return {
                score: Math.min(100, Math.max(0, score)),
                reasoning: text.substring(0, 500),
                strengths: [],
                gaps: [],
            };
        }

        return {
            score: Math.min(100, Math.max(0, parsed.score)),
            reasoning: parsed.reasoning,
            strengths: parsed.strengths || [],
            gaps: parsed.gaps || [],
        };
    } catch (error) {
        console.error('Error scoring job match:', error);
        return {
            score: 50,
            reasoning: 'Unable to generate detailed analysis - Ollama may not be running',
            strengths: [],
            gaps: [],
        };
    }
}

/**
 * Batch score multiple jobs
 */
export async function batchScoreJobs(
    profile: UserProfile,
    jobs: Job[]
): Promise<Map<string, JobScoreResult>> {
    const results = new Map<string, JobScoreResult>();

    // Process sequentially to avoid overloading local model
    for (const job of jobs) {
        const result = await scoreJobMatch(profile, job);
        results.set(job.id, result);

        // Small delay between requests for local model
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
}

/**
 * Generate a tailored resume for a specific job
 */
export async function generateResume(
    profile: UserProfile,
    job: Job
): Promise<GeneratedResume> {
    try {
        const systemPrompt = `You are an expert resume writer. Create professional, ATS-friendly resumes 
tailored to specific job descriptions. Use markdown formatting with clear sections.`;

        const userPrompt = PROMPTS.resumeGeneration(profile, job);

        console.log(`[AI] Generating resume for: ${job.title} at ${job.company}`);
        const text = await chatWithOllama(systemPrompt, userPrompt);

        const content = parseMarkdownResponse(text);

        return {
            content,
            format: 'markdown',
            generatedAt: new Date(),
        };
    } catch (error) {
        console.error('Error generating resume:', error);
        throw new Error('Failed to generate resume - ensure Ollama is running with Mistral model');
    }
}

/**
 * Generate a personalized cover letter for a job
 */
export async function generateCoverLetter(
    profile: UserProfile,
    job: Job
): Promise<GeneratedCoverLetter> {
    try {
        const systemPrompt = `You are an expert cover letter writer. Create compelling, personalized 
cover letters that highlight relevant experience and show genuine interest in the role.`;

        const userPrompt = PROMPTS.coverLetterGeneration(profile, job);

        console.log(`[AI] Generating cover letter for: ${job.title} at ${job.company}`);
        const text = await chatWithOllama(systemPrompt, userPrompt);

        const content = parseMarkdownResponse(text);

        return {
            content,
            generatedAt: new Date(),
        };
    } catch (error) {
        console.error('Error generating cover letter:', error);
        throw new Error('Failed to generate cover letter - ensure Ollama is running with Mistral model');
    }
}

/**
 * LaTeX Resume Content generated by AI
 */
export interface LatexResumeContent {
    summary: string;
    exp1_bullets: string[];
    exp2_bullets: string[];
    exp3_bullets: string[];
    proj1_bullets: string[];
    proj2_bullets: string[];
    edu1_bullets: string[];
    skills_languages: string;
    skills_frameworks: string;
    skills_cloud: string;
    skills_databases: string;
    skills_tools: string;
}

/**
 * Generated LaTeX Resume
 */
export interface GeneratedLatexResume {
    latex: string;
    content: LatexResumeContent;
    generatedAt: Date;
}

/**
 * LaTeX Resume Template with placeholders
 */
const LATEX_TEMPLATE = `%-------------------------
% Resume Template in LaTeX
%-------------------------

\\documentclass[letterpaper,11pt]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage{tabularx}
\\usepackage{xcolor}
\\usepackage{fontawesome5}

% Page style
\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Margins
\\addtolength{\\oddsidemargin}{-0.6in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1.19in}
\\addtolength{\\topmargin}{-.7in}
\\addtolength{\\textheight}{1.4in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Section formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large\\bfseries
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

% Custom commands
\\newcommand{\\resumeItem}[1]{\\item\\small{{#1 \\vspace{-2pt}}}}
\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{1.0\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & \\textbf{\\small #2} \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}
\\newcommand{\\resumeProjectHeading}[2]{
    \\vspace{-2pt}\\item
    \\begin{tabular*}{1.0\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & \\textbf{\\small #2}\\\\
    \\end{tabular*}\\vspace{-7pt}
}
\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}
\\renewcommand\\labelitemi{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.0in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

\\begin{document}

%----------HEADER----------
\\begin{center}
    {\\Huge \\scshape {{NAME}}} \\\\ \\vspace{1pt}
    \\small 
    \\faIcon{phone} {{PHONE}} ~ 
    \\href{mailto:{{EMAIL}}}{\\faIcon{envelope} {{EMAIL}}} ~ 
    \\href{https://{{LINKEDIN}}}{\\faIcon{linkedin} {{LINKEDIN}}}
    \\vspace{-8pt}
\\end{center}

%----------SUMMARY----------
\\section{Summary}
  \\resumeSubHeadingListStart
    \\item[]
    \\small{{{SUMMARY}}}
  \\resumeSubHeadingListEnd

%-----------EXPERIENCE-----------
\\section{Experience}
  \\resumeSubHeadingListStart

    \\resumeSubheading
      {{{EXP1_TITLE}}}{{{EXP1_DATES}}}
      {{{EXP1_COMPANY}}}{{{EXP1_LOCATION}}}
      \\resumeItemListStart
        {{EXP1_BULLETS}}
      \\resumeItemListEnd

    \\resumeSubheading
      {{{EXP2_TITLE}}}{{{EXP2_DATES}}}
      {{{EXP2_COMPANY}}}{{{EXP2_LOCATION}}}
      \\resumeItemListStart
        {{EXP2_BULLETS}}
      \\resumeItemListEnd

    \\resumeSubheading
      {{{EXP3_TITLE}}}{{{EXP3_DATES}}}
      {{{EXP3_COMPANY}}}{{{EXP3_LOCATION}}}
      \\resumeItemListStart
        {{EXP3_BULLETS}}
      \\resumeItemListEnd

  \\resumeSubHeadingListEnd

%-----------PROJECTS-----------
\\section{Projects}
  \\resumeSubHeadingListStart

    \\resumeProjectHeading
      {\\textbf{{{PROJ1_NAME}}} $|$ \\emph{{{PROJ1_TECH}}}}{{{PROJ1_DATE}}}
      \\resumeItemListStart
        {{PROJ1_BULLETS}}
      \\resumeItemListEnd

    \\resumeProjectHeading
      {\\textbf{{{PROJ2_NAME}}} $|$ \\emph{{{PROJ2_TECH}}}}{{{PROJ2_DATE}}}
      \\resumeItemListStart
        {{PROJ2_BULLETS}}
      \\resumeItemListEnd

  \\resumeSubHeadingListEnd

%-----------SKILLS-----------
\\section{Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{Languages}{: {{SKILLS_LANGUAGES}}} \\\\
     \\textbf{Frameworks}{: {{SKILLS_FRAMEWORKS}}} \\\\
     \\textbf{Cloud \\& DevOps}{: {{SKILLS_CLOUD}}} \\\\
     \\textbf{Databases}{: {{SKILLS_DATABASES}}} \\\\
     \\textbf{Tools}{: {{SKILLS_TOOLS}}}
    }}
 \\end{itemize}

%-----------EDUCATION-----------
\\section{Education}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {{{EDU1_INSTITUTION}}}{{{EDU1_LOCATION}}}
      {{{EDU1_DEGREE}}}{{{EDU1_DATE}}}
      \\resumeItemListStart
        {{EDU1_BULLETS}}
      \\resumeItemListEnd
  \\resumeSubHeadingListEnd

\\end{document}`;

/**
 * Escape special LaTeX characters in text
 */
function escapeLatex(text: string): string {
    if (!text) return '';
    return text
        // Handle backslashes first (before adding more)
        .replace(/\\/g, '\\textbackslash{}')
        // Special LaTeX characters
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/\$/g, '\\$')
        .replace(/#/g, '\\#')
        .replace(/_/g, '\\_')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/\^/g, '\\textasciicircum{}')
        // Handle plus signs that might cause issues in certain contexts
        .replace(/\+/g, '{+}')
        // Handle less than / greater than
        .replace(/</g, '\\textless{}')
        .replace(/>/g, '\\textgreater{}');
}

/**
 * Escape LaTeX for bullet points - comprehensive sanitization
 */
function escapeLatexBullet(text: string): string {
    if (!text) return '';

    // First, clean up the text
    let cleaned = text
        // Remove newlines and carriage returns
        .replace(/[\r\n]+/g, ' ')
        // Collapse multiple spaces
        .replace(/\s+/g, ' ')
        // Trim whitespace
        .trim();

    // Limit length to prevent LaTeX issues (max ~200 chars for a bullet)
    if (cleaned.length > 200) {
        cleaned = cleaned.substring(0, 197) + '...';
    }

    // Escape special LaTeX characters
    return cleaned
        // Must escape in this order to avoid double-escaping
        .replace(/\\/g, '\\textbackslash ')
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/\$/g, '\\$')
        .replace(/#/g, '\\#')
        .replace(/_/g, '\\_')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/~/g, '\\textasciitilde ')
        .replace(/\^/g, '\\textasciicircum ')
        .replace(/</g, '\\textless ')
        .replace(/>/g, '\\textgreater ');
}

/**
 * Convert bullet array to LaTeX resumeItem format
 */
function bulletsToLatex(bullets: string[]): string {
    if (!bullets || bullets.length === 0) {
        return '\\resumeItem{Contributed to team objectives and delivered results}';
    }

    const validBullets = bullets
        .filter(b => b && typeof b === 'string' && b.trim().length > 0)
        .slice(0, 5) // Max 5 bullets per section
        .map(b => {
            const escaped = escapeLatexBullet(b);
            // Ensure the bullet isn't empty after escaping
            return escaped.length > 0 ? `\\resumeItem{${escaped}}` : null;
        })
        .filter(b => b !== null);

    if (validBullets.length === 0) {
        return '\\resumeItem{Contributed to team objectives and delivered results}';
    }

    return validBullets.join('\n        ');
}

/**
 * Generate a LaTeX resume tailored to a specific job
 */
export async function generateLatexResume(
    profile: UserProfile,
    job: Job
): Promise<GeneratedLatexResume> {
    try {
        const prompt = PROMPTS.latexResumeGeneration(profile, job);

        console.log(`[AI] Generating LaTeX resume for: ${job.title} at ${job.company}`);
        const text = await generateWithOllama(prompt);

        let parsed = parseJsonResponse<LatexResumeContent>(text);

        // If parsing fails, create fallback content from profile
        if (!parsed) {
            console.warn('[AI] Could not parse JSON response, using fallback content');

            // Create fallback content based on profile data
            const exp = profile.experience || [];
            const skills = profile.skills || [];

            parsed = {
                summary: profile.summary || `Experienced professional seeking ${job.title} position at ${job.company}.`,
                exp1_bullets: exp[0]?.achievements?.slice(0, 3) || ['Led key initiatives and delivered impactful results', 'Collaborated with cross-functional teams'],
                exp2_bullets: exp[1]?.achievements?.slice(0, 3) || ['Developed and maintained software solutions', 'Improved system performance'],
                exp3_bullets: exp[2]?.achievements?.slice(0, 2) || ['Contributed to team projects', 'Gained hands-on experience'],
                proj1_bullets: profile.projects?.[0]?.highlights?.slice(0, 3) || ['Built and deployed application', 'Implemented key features'],
                proj2_bullets: profile.projects?.[1]?.highlights?.slice(0, 2) || ['Developed solution', 'Achieved goals'],
                edu1_bullets: profile.education?.[0]?.achievements?.slice(0, 1) || ['Completed coursework in relevant areas'],
                skills_languages: skills.filter(s => ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'C++', 'Rust', 'Ruby', 'PHP', 'SQL'].some(l => s.toLowerCase().includes(l.toLowerCase()))).join(', ') || 'JavaScript, Python, SQL',
                skills_frameworks: skills.filter(s => ['React', 'Vue', 'Angular', 'Node', 'Django', 'Flask', 'Spring', 'Express', 'Next'].some(f => s.toLowerCase().includes(f.toLowerCase()))).join(', ') || 'React, Node.js',
                skills_cloud: skills.filter(s => ['AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'CI/CD', 'Terraform'].some(c => s.toLowerCase().includes(c.toLowerCase()))).join(', ') || 'AWS, Docker',
                skills_databases: skills.filter(s => ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB'].some(d => s.toLowerCase().includes(d.toLowerCase()))).join(', ') || 'PostgreSQL, MongoDB',
                skills_tools: skills.filter(s => ['Git', 'Jira', 'Jenkins', 'GitHub', 'GitLab', 'Figma'].some(t => s.toLowerCase().includes(t.toLowerCase()))).join(', ') || 'Git, GitHub',
            };
        }

        // Get profile data for constant fields
        const name = profile.personalDetails?.fullName || 'Your Name';
        const email = profile.personalDetails?.email || 'email@example.com';
        const phone = profile.personalDetails?.phone || '+1 234 567 8900';
        const linkedin = profile.personalDetails?.linkedIn || 'linkedin.com/in/yourprofile';

        // Get experience data
        const exp = profile.experience || [];
        const exp1 = exp[0] || { title: 'Software Engineer', company: 'Company', location: '', startDate: '2020', endDate: 'Present', current: true };
        const exp2 = exp[1] || { title: 'Software Engineer', company: 'Company', location: '', startDate: '2018', endDate: '2020', current: false };
        const exp3 = exp[2] || { title: 'Intern', company: 'Company', location: '', startDate: '2017', endDate: '2018', current: false };

        // Get project data
        const proj = profile.projects || [];
        const proj1 = proj[0] || { name: 'Project 1', technologies: ['TypeScript', 'React'], highlights: [] };
        const proj2 = proj[1] || { name: 'Project 2', technologies: ['Python', 'FastAPI'], highlights: [] };

        // Get education data
        const edu = profile.education || [];
        const edu1 = edu[0] || { degree: 'Bachelor of Science in Computer Science', institution: 'University', location: '', graduationDate: '2020' };

        // Build the LaTeX document by replacing placeholders
        let latex = LATEX_TEMPLATE;

        // Header info (constant)
        latex = latex.replace(/\{\{NAME\}\}/g, escapeLatex(name));
        latex = latex.replace(/\{\{EMAIL\}\}/g, escapeLatex(email));
        latex = latex.replace(/\{\{PHONE\}\}/g, escapeLatex(phone));
        latex = latex.replace(/\{\{LINKEDIN\}\}/g, escapeLatex(linkedin));

        // Summary (AI generated)
        latex = latex.replace(/\{\{SUMMARY\}\}/g, parsed.summary);

        // Experience 1
        latex = latex.replace(/\{\{EXP1_TITLE\}\}/g, escapeLatex(exp1.title));
        latex = latex.replace(/\{\{EXP1_COMPANY\}\}/g, escapeLatex(exp1.company));
        latex = latex.replace(/\{\{EXP1_LOCATION\}\}/g, escapeLatex(exp1.location || ''));
        latex = latex.replace(/\{\{EXP1_DATES\}\}/g, `${exp1.startDate} -- ${exp1.current ? 'Present' : exp1.endDate}`);
        latex = latex.replace(/\{\{EXP1_BULLETS\}\}/g, bulletsToLatex(parsed.exp1_bullets || []));

        // Experience 2
        latex = latex.replace(/\{\{EXP2_TITLE\}\}/g, escapeLatex(exp2.title));
        latex = latex.replace(/\{\{EXP2_COMPANY\}\}/g, escapeLatex(exp2.company));
        latex = latex.replace(/\{\{EXP2_LOCATION\}\}/g, escapeLatex(exp2.location || ''));
        latex = latex.replace(/\{\{EXP2_DATES\}\}/g, `${exp2.startDate} -- ${exp2.current ? 'Present' : exp2.endDate}`);
        latex = latex.replace(/\{\{EXP2_BULLETS\}\}/g, bulletsToLatex(parsed.exp2_bullets || []));

        // Experience 3
        latex = latex.replace(/\{\{EXP3_TITLE\}\}/g, escapeLatex(exp3.title));
        latex = latex.replace(/\{\{EXP3_COMPANY\}\}/g, escapeLatex(exp3.company));
        latex = latex.replace(/\{\{EXP3_LOCATION\}\}/g, escapeLatex(exp3.location || ''));
        latex = latex.replace(/\{\{EXP3_DATES\}\}/g, `${exp3.startDate} -- ${exp3.current ? 'Present' : exp3.endDate}`);
        latex = latex.replace(/\{\{EXP3_BULLETS\}\}/g, bulletsToLatex(parsed.exp3_bullets || []));

        // Project 1
        latex = latex.replace(/\{\{PROJ1_NAME\}\}/g, escapeLatex(proj1.name));
        latex = latex.replace(/\{\{PROJ1_TECH\}\}/g, escapeLatex(Array.isArray(proj1.technologies) ? proj1.technologies.join(', ') : ''));
        latex = latex.replace(/\{\{PROJ1_DATE\}\}/g, '2023');
        latex = latex.replace(/\{\{PROJ1_BULLETS\}\}/g, bulletsToLatex(parsed.proj1_bullets || []));

        // Project 2
        latex = latex.replace(/\{\{PROJ2_NAME\}\}/g, escapeLatex(proj2.name));
        latex = latex.replace(/\{\{PROJ2_TECH\}\}/g, escapeLatex(Array.isArray(proj2.technologies) ? proj2.technologies.join(', ') : ''));
        latex = latex.replace(/\{\{PROJ2_DATE\}\}/g, '2022');
        latex = latex.replace(/\{\{PROJ2_BULLETS\}\}/g, bulletsToLatex(parsed.proj2_bullets || []));

        // Skills (AI ordered/generated)
        latex = latex.replace(/\{\{SKILLS_LANGUAGES\}\}/g, parsed.skills_languages || '');
        latex = latex.replace(/\{\{SKILLS_FRAMEWORKS\}\}/g, parsed.skills_frameworks || '');
        latex = latex.replace(/\{\{SKILLS_CLOUD\}\}/g, parsed.skills_cloud || '');
        latex = latex.replace(/\{\{SKILLS_DATABASES\}\}/g, parsed.skills_databases || '');
        latex = latex.replace(/\{\{SKILLS_TOOLS\}\}/g, parsed.skills_tools || '');

        // Education
        latex = latex.replace(/\{\{EDU1_INSTITUTION\}\}/g, escapeLatex(edu1.institution));
        latex = latex.replace(/\{\{EDU1_DEGREE\}\}/g, escapeLatex(edu1.degree));
        latex = latex.replace(/\{\{EDU1_LOCATION\}\}/g, escapeLatex(edu1.location || ''));
        latex = latex.replace(/\{\{EDU1_DATE\}\}/g, edu1.graduationDate || '');
        latex = latex.replace(/\{\{EDU1_BULLETS\}\}/g, bulletsToLatex(parsed.edu1_bullets || []));

        return {
            latex,
            content: parsed,
            generatedAt: new Date(),
        };
    } catch (error) {
        console.error('Error generating LaTeX resume:', error);
        throw new Error('Failed to generate LaTeX resume - ensure Ollama is running with Mistral model');
    }
}

// Export availability check
export const AIService = {
    isAvailable: isOllamaAvailable,
    scoreJob: scoreJobMatch,
    batchScore: batchScoreJobs,
    generateResume,
    generateCoverLetter,
    generateLatexResume,
};

