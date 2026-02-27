'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Trash2, Save, RefreshCw, Download, Sparkles, Eye, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/types';

interface ResumeData {
    summary: string;
    experiences: {
        id: string;
        title: string;
        company: string;
        location: string;
        dates: string;
        techStack: string;
        companyUrl: string;
        bullets: string[];
    }[];
    projects: {
        id: string;
        name: string;
        tech: string;
        githubUrl: string;
        bullets: string[];
    }[];
    skills: {
        id: string;
        name: string;
        value: string;
    }[];
    education: {
        id: string;
        institution: string;
        degree: string;
        location: string;
        date: string;
        bullets: string[];
    }[];
    languages: {
        id: string;
        language: string;
        proficiency: string;
    }[];
    certifications: {
        id: string;
        name: string;
        issuer: string;
        date: string;
    }[];
}

interface LatexResumeEditorProps {
    jobId: string;
    profile: UserProfile | null;
    jobTitle: string;
    jobCompany: string;
    jobDescription?: string;
    onClose?: () => void;
    onSave?: (content: string) => Promise<void>;
}

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function LatexResumeEditor({
    jobId,
    profile,
    jobTitle,
    jobCompany,
    jobDescription,
    onClose,
    onSave,
}: LatexResumeEditorProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCompiling, setIsCompiling] = useState(false);
    const [error, setError] = useState('');
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<string>('summary');
    const compileTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Personal info (from profile, read-only display)
    const [personalInfo, setPersonalInfo] = useState({
        name: profile?.personalDetails?.fullName || 'Your Name',
        email: profile?.personalDetails?.email || 'email@example.com',
        phone: profile?.personalDetails?.phone || '+1-234-567-8900',
        linkedin: profile?.personalDetails?.linkedIn?.replace(/^https?:\/\//, '') || 'linkedin.com/in/yourprofile',
        github: profile?.personalDetails?.github?.replace(/^https?:\/\//, '') || 'github.com/namanjaiswal7',
        location: profile?.personalDetails?.location || 'City, Country',
        portfolio: profile?.personalDetails?.portfolio?.replace(/^https?:\/\//, '') || '',
        trpStatus: 'Work Authorization: EU Resident(TRP - December 2027)',
    });

    // Resume data state
    const [data, setData] = useState<ResumeData>({
        summary: '',
        experiences: [],
        projects: [],
        skills: [
            { id: generateId(), name: 'Languages', value: '' },
            { id: generateId(), name: 'Frameworks', value: '' },
            { id: generateId(), name: 'Cloud & DevOps', value: '' },
            { id: generateId(), name: 'Databases', value: '' },
            { id: generateId(), name: 'Tools', value: '' },
        ],
        education: [],
        languages: [
            { id: generateId(), language: 'English', proficiency: 'Native/Fluent' },
        ],
        certifications: [],
    });

    // Initialize from profile
    useEffect(() => {
        if (!profile) {
            setIsLoading(false);
            return;
        }

        setData({
            summary: profile.summary || '',
            experiences: (profile.experience || []).slice(0, 3).map((exp) => {
                // Prefill company URLs for known companies
                let companyUrl = '';
                const companyLower = (exp.company || '').toLowerCase();
                if (companyLower.includes('helpshift')) {
                    companyUrl = 'www.helpshift.com';
                } else if (companyLower.includes('source.one') || companyLower.includes('source one') || companyLower.includes('sourceone')) {
                    companyUrl = 'www.source.one';
                } else if (companyLower.includes('infosys') || companyLower.includes('insofys')) {
                    companyUrl = 'www.infosys.com';
                }
                return {
                    id: generateId(),
                    title: exp.title || '',
                    company: exp.company || '',
                    location: exp.location || '',
                    dates: `${exp.startDate || ''} - ${exp.current ? 'Present' : exp.endDate || ''}`,
                    techStack: '',
                    companyUrl,
                    bullets: exp.achievements || [''],
                };
            }),
            projects: (profile.projects || []).slice(0, 3).map((proj) => ({
                id: generateId(),
                name: proj.name || '',
                tech: (proj.technologies || []).join(', '),
                githubUrl: proj.url?.replace('https://', '') || '',
                bullets: proj.highlights || [''],
            })),
            skills: categorizeSkills(profile.skills || []),
            education: (profile.education || []).slice(0, 2).map((edu) => ({
                id: generateId(),
                institution: edu.institution || '',
                degree: edu.degree || '',
                location: edu.location || '',
                date: edu.graduationDate || '',
                bullets: edu.achievements || [],
            })),
            languages: (profile as unknown as { languages?: Array<{ language?: string; proficiency?: string } | string> })?.languages?.length
                ? ((profile as unknown as { languages: Array<{ language?: string; proficiency?: string } | string> }).languages).map((lang) => ({
                    id: generateId(),
                    language: typeof lang === 'string' ? lang : lang.language || '',
                    proficiency: typeof lang === 'string' ? 'Fluent' : lang.proficiency || 'Fluent',
                }))
                : [{ id: generateId(), language: 'English', proficiency: 'Native/Fluent' }],
            certifications: (profile as unknown as { certifications?: Array<{ name?: string; issuer?: string; date?: string }> })?.certifications?.length
                ? ((profile as unknown as { certifications: Array<{ name?: string; issuer?: string; date?: string }> }).certifications).map((cert) => ({
                    id: generateId(),
                    name: cert.name || '',
                    issuer: cert.issuer || '',
                    date: cert.date || '',
                }))
                : [],
        });

        setIsLoading(false);
    }, [profile]);

    // Categorize skills helper - returns array format
    function categorizeSkills(allSkills: string[]): ResumeData['skills'] {
        return [
            {
                id: generateId(),
                name: 'Languages',
                value: allSkills.filter((s) =>
                    ['javascript', 'typescript', 'python', 'java', 'go', 'c++', 'rust', 'ruby', 'php', 'sql', 'swift', 'kotlin'].some((l) =>
                        s.toLowerCase().includes(l)
                    )
                ).join(', '),
            },
            {
                id: generateId(),
                name: 'Frameworks',
                value: allSkills.filter((s) =>
                    ['react', 'vue', 'angular', 'node', 'django', 'flask', 'spring', 'express', 'next', 'rails'].some((f) =>
                        s.toLowerCase().includes(f)
                    )
                ).join(', '),
            },
            {
                id: generateId(),
                name: 'Cloud & DevOps',
                value: allSkills.filter((s) =>
                    ['aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform', 'ci/cd'].some((c) => s.toLowerCase().includes(c))
                ).join(', '),
            },
            {
                id: generateId(),
                name: 'Databases',
                value: allSkills.filter((s) =>
                    ['postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'sqlite'].some((d) =>
                        s.toLowerCase().includes(d)
                    )
                ).join(', '),
            },
            {
                id: generateId(),
                name: 'Tools',
                value: allSkills.filter((s) =>
                    ['git', 'jira', 'jenkins', 'github', 'gitlab', 'figma', 'linux'].some((t) => s.toLowerCase().includes(t))
                ).join(', '),
            },
        ];
    }

    // Generate LaTeX from current data
    const generateLatex = useCallback(() => {
        const escapeLatex = (text: string) => {
            if (!text) return '';
            return text
                .replace(/\\/g, '\\textbackslash ')
                .replace(/&/g, '\\&')
                .replace(/%/g, '\\%')
                .replace(/\$/g, '\\$')
                .replace(/#/g, '\\#')
                .replace(/_/g, '\\_')
                .replace(/\{/g, '\\{')
                .replace(/\}/g, '\\}')
                .replace(/~/g, '\\textasciitilde ')
                .replace(/\^/g, '\\textasciicircum ');
        };

        const bulletsToLatex = (bullets: string[]) =>
            bullets.filter(b => b.trim()).map(b => `        \\resumeItem{${escapeLatex(b)}}`).join('\n');

        return `%-------------------------
% Resume - ${personalInfo.name}
% Generated for: ${jobTitle} at ${jobCompany}
%-------------------------

\\documentclass[letterpaper,11pt]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage{tabularx}
\\usepackage{xcolor}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.6in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1.19in}
\\addtolength{\\topmargin}{-.7in}
\\addtolength{\\textheight}{1.4in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large\\bfseries
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

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
    {\\Huge \\scshape ${escapeLatex(personalInfo.name)}} \\\\ \\vspace{1pt}
    \\small 
    ${escapeLatex(personalInfo.phone)} $|$ 
    \\href{mailto:${personalInfo.email}}{${escapeLatex(personalInfo.email)}} $|$ 
    \\href{https://${personalInfo.linkedin}}{LinkedIn} $|$ 
    \\href{https://${personalInfo.github}}{GitHub}${personalInfo.portfolio ? ` $|$ \\href{https://${personalInfo.portfolio}}{Portfolio}` : ''}
    ${personalInfo.trpStatus ? `\\\\ \\vspace{1pt} \\small{${escapeLatex(personalInfo.trpStatus)}}` : ''}
    \\vspace{-8pt}
\\end{center}

%----------SUMMARY----------
\\section{Summary}
  \\resumeSubHeadingListStart
    \\item[]
    \\small{${escapeLatex(data.summary)}}
  \\resumeSubHeadingListEnd

%-----------SKILLS-----------
\\section{Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
${data.skills.filter(s => s.value.trim()).map((skill, i, arr) =>
            `     \\textbf{${escapeLatex(skill.name)}}{: ${escapeLatex(skill.value)}}${i < arr.length - 1 ? ' \\\\\\\\' : ''}`
        ).join('\n')}
    }}
 \\end{itemize}

%-----------EXPERIENCE-----------
\\section{Work Experience}
  \\resumeSubHeadingListStart
${data.experiences.map(exp => `
    \\resumeSubheading
      {${escapeLatex(exp.title)}${exp.companyUrl ? ` $|$ \\href{https://${exp.companyUrl.replace(/^https?:\/\//, '')}}{Link}` : ''}}{${escapeLatex(exp.dates)}}
      {${escapeLatex(exp.company)}${exp.techStack ? ` $|$ \\emph{${escapeLatex(exp.techStack)}}` : ''}}{${escapeLatex(exp.location)}}
      \\resumeItemListStart
${bulletsToLatex(exp.bullets)}
      \\resumeItemListEnd
`).join('')}
  \\resumeSubHeadingListEnd

%-----------PROJECTS-----------
${data.projects.length > 0 ? `\\section{Projects}
  \\resumeSubHeadingListStart
${data.projects.map(proj => `
    \\resumeProjectHeading
      {\\textbf{${escapeLatex(proj.name)}} $|$ \\emph{${escapeLatex(proj.tech)}}${proj.githubUrl ? ` $|$ \\href{https://${proj.githubUrl.replace(/^https?:\/\//, '')}}{GitHub}` : ''}}{}
      \\resumeItemListStart
${bulletsToLatex(proj.bullets)}
      \\resumeItemListEnd
`).join('')}
  \\resumeSubHeadingListEnd` : ''}

%-----------EDUCATION-----------
\\section{Education}
  \\resumeSubHeadingListStart
${data.education.map(edu => `
    \\resumeSubheading
      {${escapeLatex(edu.institution)}}{${escapeLatex(edu.location)}}
      {${escapeLatex(edu.degree)}}{${escapeLatex(edu.date)}}
`).join('')}
  \\resumeSubHeadingListEnd

%-----------LANGUAGES-----------
${data.languages.filter(l => l.language.trim()).length > 0 ? `\\section{Languages}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
      ${data.languages.filter(l => l.language.trim()).map(lang => `\\textbf{${escapeLatex(lang.language)}}: ${escapeLatex(lang.proficiency)}`).join(' $|$ ')}
    }}
 \\end{itemize}` : ''}

%-----------CERTIFICATIONS-----------
${data.certifications.filter(c => c.name.trim()).length > 0 ? `\\section{Certifications}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
${data.certifications.filter(c => c.name.trim()).map(cert =>
            `      \\textbf{${escapeLatex(cert.name)}}${cert.issuer ? ` -- ${escapeLatex(cert.issuer)}` : ''}${cert.date ? ` (${escapeLatex(cert.date)})` : ''}`
        ).join(' \\\\\\\\ \n')}
    }}
 \\end{itemize}` : ''}

\\end{document}`;
    }, [data, personalInfo, jobTitle, jobCompany]);

    // Compile and show preview
    const compilePreview = useCallback(async () => {
        const latex = generateLatex();
        setIsCompiling(true);
        setError('');

        try {
            const response = await fetch('/api/resume/latex/compile-raw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latex }),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Compilation failed');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            setPdfUrl(prev => {
                if (prev) URL.revokeObjectURL(prev);
                return url;
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to compile');
        } finally {
            setIsCompiling(false);
        }
    }, [generateLatex]);

    // Debounced compile trigger
    const triggerCompile = useCallback(() => {
        if (compileTimeoutRef.current) {
            clearTimeout(compileTimeoutRef.current);
        }
        compileTimeoutRef.current = setTimeout(() => {
            compilePreview();
        }, 2000);
    }, [compilePreview]);

    // Initial compile on load
    useEffect(() => {
        if (!isLoading && data.summary) {
            compilePreview();
        }
    }, [isLoading]);

    // Generate AI content
    const generateAIContent = async () => {
        if (!profile) return;

        setIsGenerating(true);
        setError('');
        try {
            const response = await fetch('/api/resume/latex', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile,
                    job: {
                        id: jobId,
                        title: jobTitle,
                        company: jobCompany,
                        description: jobDescription || `${jobTitle} position at ${jobCompany}`,
                        location: { type: 'remote' },
                        source: 'manual',
                        postedAt: new Date(),
                        fetchedAt: new Date(),
                        status: 'active',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate content');
            }

            // Update data with AI-generated content
            if (result.content) {
                const content = result.content;
                setData(prev => ({
                    ...prev,
                    summary: content.summary || prev.summary,
                    experiences: prev.experiences.map((exp, i) => ({
                        ...exp,
                        bullets: content[`exp${i + 1}_bullets`] || exp.bullets,
                    })),
                    projects: prev.projects.map((proj, i) => ({
                        ...proj,
                        bullets: content[`proj${i + 1}_bullets`] || proj.bullets,
                    })),
                    skills: prev.skills.map((skill, i) => {
                        const keyMap: Record<number, string> = {
                            0: 'skills_languages',
                            1: 'skills_frameworks',
                            2: 'skills_cloud',
                            3: 'skills_databases',
                            4: 'skills_tools',
                        };
                        const newValue = content[keyMap[i]];
                        return newValue ? { ...skill, value: newValue } : skill;
                    }),
                }));
            }

            // Trigger preview update
            setTimeout(() => compilePreview(), 500);
        } catch (err) {
            console.error('Error generating AI content:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate AI content');
        } finally {
            setIsGenerating(false);
        }
    };

    // Download PDF
    const downloadPdf = async () => {
        const latex = generateLatex();
        setIsCompiling(true);

        try {
            const response = await fetch('/api/resume/latex/compile-raw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latex }),
            });

            if (!response.ok) {
                throw new Error('Failed to compile');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Resume_${jobCompany.replace(/\s+/g, '_')}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to download');
        } finally {
            setIsCompiling(false);
        }
    };

    // Update handlers
    const updateSummary = (value: string) => {
        setData(prev => ({ ...prev, summary: value }));
        triggerCompile();
    };

    const updateExperienceBullet = (expId: string, bulletIndex: number, value: string) => {
        setData(prev => ({
            ...prev,
            experiences: prev.experiences.map(exp =>
                exp.id === expId
                    ? { ...exp, bullets: exp.bullets.map((b, i) => (i === bulletIndex ? value : b)) }
                    : exp
            ),
        }));
        triggerCompile();
    };

    const addExperienceBullet = (expId: string) => {
        setData(prev => ({
            ...prev,
            experiences: prev.experiences.map(exp =>
                exp.id === expId ? { ...exp, bullets: [...exp.bullets, ''] } : exp
            ),
        }));
    };

    const removeExperienceBullet = (expId: string, bulletIndex: number) => {
        setData(prev => ({
            ...prev,
            experiences: prev.experiences.map(exp =>
                exp.id === expId
                    ? { ...exp, bullets: exp.bullets.filter((_, i) => i !== bulletIndex) }
                    : exp
            ),
        }));
        triggerCompile();
    };

    const updateProjectBullet = (projId: string, bulletIndex: number, value: string) => {
        setData(prev => ({
            ...prev,
            projects: prev.projects.map(proj =>
                proj.id === projId
                    ? { ...proj, bullets: proj.bullets.map((b, i) => (i === bulletIndex ? value : b)) }
                    : proj
            ),
        }));
        triggerCompile();
    };

    const updateSkillName = (skillId: string, name: string) => {
        setData(prev => ({
            ...prev,
            skills: prev.skills.map(s => s.id === skillId ? { ...s, name } : s),
        }));
        triggerCompile();
    };

    const updateSkillValue = (skillId: string, value: string) => {
        setData(prev => ({
            ...prev,
            skills: prev.skills.map(s => s.id === skillId ? { ...s, value } : s),
        }));
        triggerCompile();
    };

    const addSkillCategory = () => {
        setData(prev => ({
            ...prev,
            skills: [...prev.skills, { id: generateId(), name: 'New Category', value: '' }],
        }));
        triggerCompile();
    };

    const removeSkillCategory = (skillId: string) => {
        setData(prev => ({
            ...prev,
            skills: prev.skills.filter(s => s.id !== skillId),
        }));
        triggerCompile();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">Loading resume...</span>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="font-semibold text-gray-900">Resume for {jobTitle}</h2>
                        <p className="text-sm text-gray-500">{jobCompany}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={generateAIContent}
                        disabled={isGenerating}
                        variant="outline"
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                        {isGenerating ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        {isGenerating ? 'Generating...' : 'Generate with AI'}
                    </Button>
                    {onSave && (
                        <Button
                            onClick={async () => {
                                setIsSaving(true);
                                try {
                                    const latex = generateLatex();
                                    await onSave(JSON.stringify({ mode: 'latex', latex, data, personalInfo }));
                                    setError('');
                                } catch (err) {
                                    setError('Failed to save resume');
                                } finally {
                                    setIsSaving(false);
                                }
                            }}
                            disabled={isSaving}
                            variant="outline"
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                            {isSaving ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                    )}
                    <Button
                        onClick={compilePreview}
                        disabled={isCompiling}
                        variant="outline"
                    >
                        {isCompiling ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Eye className="h-4 w-4 mr-2" />
                        )}
                        Preview
                    </Button>
                    <Button
                        onClick={downloadPdf}
                        disabled={isCompiling}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                    </Button>
                </div>
            </div>

            {error && (
                <div className="mx-4 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Job Description Status Banner */}
            {jobDescription && jobDescription.trim().length > 50 ? (
                <div className="mx-4 mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span><strong>Job description available!</strong> AI will tailor your skills, summary, and experience to match this role.</span>
                </div>
            ) : (
                <div className="mx-4 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span><strong>Tip:</strong> Fetch the job description first from the Jobs page to get better AI-tailored resume content.</span>
                </div>
            )}

            {/* Main Content - Split View */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Editor */}
                <div className="w-1/2 overflow-y-auto p-4 space-y-4">
                    {/* Personal Info (Editable) */}
                    <div className="bg-white rounded-lg p-4 border">
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            Personal Information
                        </h3>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            <div><span className="font-medium">Name:</span> {personalInfo.name}</div>
                            <div><span className="font-medium">Email:</span> {personalInfo.email}</div>
                            <div><span className="font-medium">Phone:</span> {personalInfo.phone}</div>
                            <div><span className="font-medium">Location:</span> {personalInfo.location}</div>
                        </div>
                        <div className="mt-3 space-y-2">
                            <div>
                                <label className="text-sm font-medium text-gray-700">GitHub Profile</label>
                                <input
                                    type="text"
                                    value={personalInfo.github}
                                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, github: e.target.value }))}
                                    placeholder="github.com/yourname"
                                    className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Portfolio / Company Projects URL</label>
                                <input
                                    type="text"
                                    value={personalInfo.portfolio}
                                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, portfolio: e.target.value }))}
                                    placeholder="mycompany.com/projects or portfolio.com"
                                    className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">TRP / Work Authorization Status</label>
                                <input
                                    type="text"
                                    value={personalInfo.trpStatus}
                                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, trpStatus: e.target.value }))}
                                    placeholder="TRP Valid Till: December 2027"
                                    className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Basic info from profile • GitHub/Portfolio/TRP editable here</p>
                    </div>

                    {/* Summary */}
                    <div className="bg-white rounded-lg p-4 border">
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Professional Summary
                        </h3>
                        <textarea
                            value={data.summary}
                            onChange={(e) => updateSummary(e.target.value)}
                            placeholder="A compelling 2-3 sentence summary highlighting your most relevant experience..."
                            rows={4}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                        />
                    </div>

                    {/* Skills */}
                    <div className="bg-white rounded-lg p-4 border">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                                Skills
                            </span>
                            <button
                                onClick={addSkillCategory}
                                className="text-sm text-blue-600 hover:text-blue-700 font-normal"
                            >
                                + Add Category
                            </button>
                        </h3>
                        <div className="space-y-3">
                            {data.skills.map((skill) => (
                                <div key={skill.id} className="flex items-start gap-2">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={skill.name}
                                            onChange={(e) => updateSkillName(skill.id, e.target.value)}
                                            placeholder="Category name (e.g., Backend, Frontend)"
                                            className="w-full px-2 py-1 text-sm font-medium text-gray-700 border border-gray-200 rounded focus:border-blue-500 outline-none mb-1"
                                        />
                                        <input
                                            type="text"
                                            value={skill.value}
                                            onChange={(e) => updateSkillValue(skill.id, e.target.value)}
                                            placeholder="e.g., JavaScript, Python, React..."
                                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeSkillCategory(skill.id)}
                                        className="p-1 text-red-500 hover:bg-red-50 rounded mt-1"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Experience */}
                    <div className="bg-white rounded-lg p-4 border">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            Experience
                        </h3>
                        <div className="space-y-4">
                            {data.experiences.map((exp) => (
                                <div key={exp.id} className="border-l-2 border-purple-200 pl-3">
                                    <div className="font-medium text-gray-900">{exp.title}</div>
                                    <div className="text-sm text-gray-500">{exp.company} • {exp.dates}</div>
                                    <div className="mt-2">
                                        <label className="text-xs font-medium text-gray-600">Tech Stack Used</label>
                                        <input
                                            type="text"
                                            value={exp.techStack}
                                            onChange={(e) => {
                                                setData(prev => ({
                                                    ...prev,
                                                    experiences: prev.experiences.map(ex =>
                                                        ex.id === exp.id ? { ...ex, techStack: e.target.value } : ex
                                                    ),
                                                }));
                                                triggerCompile();
                                            }}
                                            placeholder="e.g., React, Node.js, PostgreSQL, AWS"
                                            className="w-full mt-1 px-2 py-1 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="mt-2">
                                        <label className="text-xs font-medium text-gray-600">Company Website</label>
                                        <input
                                            type="text"
                                            value={exp.companyUrl}
                                            onChange={(e) => {
                                                setData(prev => ({
                                                    ...prev,
                                                    experiences: prev.experiences.map(ex =>
                                                        ex.id === exp.id ? { ...ex, companyUrl: e.target.value } : ex
                                                    ),
                                                }));
                                                triggerCompile();
                                            }}
                                            placeholder="e.g., www.company.com"
                                            className="w-full mt-1 px-2 py-1 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none text-blue-600"
                                        />
                                    </div>
                                    <div className="mt-2 space-y-2">
                                        {exp.bullets.map((bullet, i) => (
                                            <div key={i} className="flex items-start gap-2">
                                                <span className="text-gray-400 mt-2">•</span>
                                                <textarea
                                                    value={bullet}
                                                    onChange={(e) => updateExperienceBullet(exp.id, i, e.target.value)}
                                                    placeholder="Describe an achievement or responsibility..."
                                                    rows={2}
                                                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none resize-none"
                                                />
                                                <button
                                                    onClick={() => removeExperienceBullet(exp.id, i)}
                                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => addExperienceBullet(exp.id)}
                                            className="text-sm text-blue-600 hover:text-blue-700"
                                        >
                                            + Add bullet
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Projects */}
                    <div className="bg-white rounded-lg p-4 border">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                Projects
                            </span>
                            <button
                                onClick={() => {
                                    setData(prev => ({
                                        ...prev,
                                        projects: [...prev.projects, {
                                            id: generateId(),
                                            name: 'New Project',
                                            tech: '',
                                            githubUrl: '',
                                            bullets: [''],
                                        }],
                                    }));
                                    triggerCompile();
                                }}
                                className="text-sm text-blue-600 hover:text-blue-700 font-normal"
                            >
                                + Add Project
                            </button>
                        </h3>
                        <div className="space-y-4">
                            {data.projects.map((proj) => (
                                <div key={proj.id} className="border-l-2 border-orange-200 pl-3">
                                    <div className="flex items-center justify-between">
                                        <input
                                            type="text"
                                            value={proj.name}
                                            onChange={(e) => {
                                                setData(prev => ({
                                                    ...prev,
                                                    projects: prev.projects.map(p =>
                                                        p.id === proj.id ? { ...p, name: e.target.value } : p
                                                    ),
                                                }));
                                                triggerCompile();
                                            }}
                                            placeholder="Project Name"
                                            className="font-medium text-gray-900 border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none bg-transparent"
                                        />
                                        <button
                                            onClick={() => {
                                                setData(prev => ({
                                                    ...prev,
                                                    projects: prev.projects.filter(p => p.id !== proj.id),
                                                }));
                                                triggerCompile();
                                            }}
                                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={proj.tech}
                                        onChange={(e) => {
                                            setData(prev => ({
                                                ...prev,
                                                projects: prev.projects.map(p =>
                                                    p.id === proj.id ? { ...p, tech: e.target.value } : p
                                                ),
                                            }));
                                            triggerCompile();
                                        }}
                                        placeholder="Technologies: React, Node.js, MongoDB..."
                                        className="w-full mt-1 text-sm text-gray-500 border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none bg-transparent"
                                    />
                                    <input
                                        type="text"
                                        value={proj.githubUrl}
                                        onChange={(e) => {
                                            setData(prev => ({
                                                ...prev,
                                                projects: prev.projects.map(p =>
                                                    p.id === proj.id ? { ...p, githubUrl: e.target.value } : p
                                                ),
                                            }));
                                            triggerCompile();
                                        }}
                                        placeholder="GitHub URL: github.com/user/repo"
                                        className="w-full mt-1 text-sm text-blue-600 border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none bg-transparent"
                                    />
                                    <div className="mt-2 space-y-2">
                                        {proj.bullets.map((bullet, i) => (
                                            <div key={i} className="flex items-start gap-2">
                                                <span className="text-gray-400 mt-2">•</span>
                                                <textarea
                                                    value={bullet}
                                                    onChange={(e) => updateProjectBullet(proj.id, i, e.target.value)}
                                                    placeholder="Describe the project..."
                                                    rows={2}
                                                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none resize-none"
                                                />
                                                <button
                                                    onClick={() => {
                                                        setData(prev => ({
                                                            ...prev,
                                                            projects: prev.projects.map(p =>
                                                                p.id === proj.id
                                                                    ? { ...p, bullets: p.bullets.filter((_, idx) => idx !== i) }
                                                                    : p
                                                            ),
                                                        }));
                                                        triggerCompile();
                                                    }}
                                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => {
                                                setData(prev => ({
                                                    ...prev,
                                                    projects: prev.projects.map(p =>
                                                        p.id === proj.id ? { ...p, bullets: [...p.bullets, ''] } : p
                                                    ),
                                                }));
                                            }}
                                            className="text-sm text-blue-600 hover:text-blue-700"
                                        >
                                            + Add bullet
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>


                    {/* Education */}
                    <div className="bg-white rounded-lg p-4 border">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                            Education
                        </h3>
                        <div className="space-y-3">
                            {data.education.map((edu) => (
                                <div key={edu.id} className="border-l-2 border-indigo-200 pl-3">
                                    <div className="font-medium text-gray-900">{edu.institution}</div>
                                    <div className="text-sm text-gray-500">{edu.degree} • {edu.date}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Languages */}
                    <div className="bg-white rounded-lg p-4 border">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                                Languages
                            </span>
                            <button
                                onClick={() => {
                                    setData(prev => ({
                                        ...prev,
                                        languages: [...prev.languages, { id: generateId(), language: '', proficiency: 'Fluent' }],
                                    }));
                                    triggerCompile();
                                }}
                                className="text-sm text-blue-600 hover:text-blue-700 font-normal"
                            >
                                + Add Language
                            </button>
                        </h3>
                        <div className="space-y-2">
                            {data.languages.map((lang) => (
                                <div key={lang.id} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={lang.language}
                                        onChange={(e) => {
                                            setData(prev => ({
                                                ...prev,
                                                languages: prev.languages.map(l =>
                                                    l.id === lang.id ? { ...l, language: e.target.value } : l
                                                ),
                                            }));
                                            triggerCompile();
                                        }}
                                        placeholder="Language (e.g., English, German)"
                                        className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none"
                                    />
                                    <select
                                        value={lang.proficiency}
                                        onChange={(e) => {
                                            setData(prev => ({
                                                ...prev,
                                                languages: prev.languages.map(l =>
                                                    l.id === lang.id ? { ...l, proficiency: e.target.value } : l
                                                ),
                                            }));
                                            triggerCompile();
                                        }}
                                        className="px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none bg-white"
                                    >
                                        <option value="Native">Native</option>
                                        <option value="Fluent">Fluent</option>
                                        <option value="Advanced">Advanced</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Basic">Basic</option>
                                    </select>
                                    <button
                                        onClick={() => {
                                            setData(prev => ({
                                                ...prev,
                                                languages: prev.languages.filter(l => l.id !== lang.id),
                                            }));
                                            triggerCompile();
                                        }}
                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Certifications */}
                    <div className="bg-white rounded-lg p-4 border">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                Certifications
                            </span>
                            <button
                                onClick={() => {
                                    setData(prev => ({
                                        ...prev,
                                        certifications: [...prev.certifications, { id: generateId(), name: '', issuer: '', date: '' }],
                                    }));
                                }}
                                className="text-sm text-blue-600 hover:text-blue-700 font-normal"
                            >
                                + Add Certification
                            </button>
                        </h3>
                        {data.certifications.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No certifications added. Click "+ Add Certification" to add one.</p>
                        ) : (
                            <div className="space-y-3">
                                {data.certifications.map((cert) => (
                                    <div key={cert.id} className="flex items-start gap-2 border-l-2 border-amber-200 pl-3">
                                        <div className="flex-1 space-y-1">
                                            <input
                                                type="text"
                                                value={cert.name}
                                                onChange={(e) => {
                                                    setData(prev => ({
                                                        ...prev,
                                                        certifications: prev.certifications.map(c =>
                                                            c.id === cert.id ? { ...c, name: e.target.value } : c
                                                        ),
                                                    }));
                                                    triggerCompile();
                                                }}
                                                placeholder="Certification Name (e.g., AWS Solutions Architect)"
                                                className="w-full px-2 py-1.5 text-sm font-medium border border-gray-200 rounded focus:border-blue-500 outline-none"
                                            />
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={cert.issuer}
                                                    onChange={(e) => {
                                                        setData(prev => ({
                                                            ...prev,
                                                            certifications: prev.certifications.map(c =>
                                                                c.id === cert.id ? { ...c, issuer: e.target.value } : c
                                                            ),
                                                        }));
                                                        triggerCompile();
                                                    }}
                                                    placeholder="Issuer (e.g., Amazon Web Services)"
                                                    className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    value={cert.date}
                                                    onChange={(e) => {
                                                        setData(prev => ({
                                                            ...prev,
                                                            certifications: prev.certifications.map(c =>
                                                                c.id === cert.id ? { ...c, date: e.target.value } : c
                                                            ),
                                                        }));
                                                        triggerCompile();
                                                    }}
                                                    placeholder="Date (e.g., Jan 2024)"
                                                    className="w-32 px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setData(prev => ({
                                                    ...prev,
                                                    certifications: prev.certifications.filter(c => c.id !== cert.id),
                                                }));
                                                triggerCompile();
                                            }}
                                            className="p-1 text-red-500 hover:bg-red-50 rounded mt-1"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: PDF Preview */}
                <div className="w-1/2 bg-gray-200 border-l">
                    {isCompiling ? (
                        <div className="flex items-center justify-center h-full">
                            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                            <span className="ml-2 text-gray-600">Compiling preview...</span>
                        </div>
                    ) : pdfUrl ? (
                        <iframe
                            src={pdfUrl}
                            className="w-full h-full"
                            title="Resume Preview"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Eye className="h-12 w-12 mb-2 text-gray-400" />
                            <p>Click "Preview" to see your resume</p>
                            <p className="text-sm mt-1">or "Generate with AI" to auto-fill content</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
