'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/header';
import { JobTable } from '@/components/jobs/job-table';
import { JobFiltersComponent } from '@/components/jobs/job-filters';
import { ResumeBuilder } from '@/components/resume/resume-builder';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Sparkles, X, FileText, Mail, AlertCircle, Download, Wand2, Edit3, Send, Save, Check } from 'lucide-react';
import { Job, JobFilters, ApplicationStatus, UserProfile } from '@/types';
import jsPDF from 'jspdf';

// Extended job type with user tracking fields
interface JobWithTracking extends Job {
    matchScore?: number;
    matchReasoning?: string;
    strengths?: string[];
    gaps?: string[];
    applicationStatus?: ApplicationStatus;
    favorite?: boolean;
    hidden?: boolean;
    userJobId?: string;
    savedResume?: string;
    savedCoverLetter?: string;
}

// Enhanced Modal for displaying and editing generated content
interface ContentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (content: string) => Promise<void>;
    title: string;
    content: string;
    type: 'resume' | 'cover-letter' | 'analysis';
    jobTitle?: string;
    company?: string;
    jobId?: string;
    isSavedDocument?: boolean;
}

function ContentModal({ isOpen, onClose, onSave, title, content, type, jobTitle, company, jobId, isSavedDocument }: ContentModalProps) {
    const [editableContent, setEditableContent] = useState(content);
    const [isEditing, setIsEditing] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isRefining, setIsRefining] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(isSavedDocument || false);
    const [hasChanges, setHasChanges] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Update content when prop changes
    useEffect(() => {
        setEditableContent(content);
        setIsSaved(isSavedDocument || false);
        setHasChanges(false);
    }, [content, isSavedDocument]);

    // Track changes
    useEffect(() => {
        if (editableContent !== content) {
            setHasChanges(true);
            setIsSaved(false);
        }
    }, [editableContent, content]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(editableContent);
            setIsSaved(true);
            setHasChanges(false);
        } catch (error) {
            console.error('Error saving document:', error);
            alert('Failed to save document');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAiRefine = async () => {
        if (!aiPrompt.trim()) return;

        setIsRefining(true);
        try {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'mistral',
                    prompt: `You are helping to refine a ${type === 'resume' ? 'resume' : 'cover letter'}.

Current document:
${editableContent}

User's request: ${aiPrompt}

Please provide the updated version of the document based on the user's request. Only output the updated document content, no explanations.`,
                    stream: false,
                    options: { temperature: 0.7, num_predict: 2048 },
                }),
            });

            const data = await response.json();
            if (data.response) {
                setEditableContent(data.response);
            }
        } catch (error) {
            console.error('Error refining content:', error);
            alert('Failed to refine content. Ensure Ollama is running.');
        } finally {
            setIsRefining(false);
            setAiPrompt('');
        }
    };

    const handleDownloadPDF = () => {
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        // PDF settings
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - 2 * margin;
        const lineHeight = 6;
        let yPosition = margin;

        // Set font
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);

        // Only add title header for resumes, not for cover letters
        if (type === 'resume') {
            // Title
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            const titleLines = pdf.splitTextToSize(title, contentWidth);
            pdf.text(titleLines, margin, yPosition);
            yPosition += titleLines.length * 8 + 5;

            // Subtitle
            if (jobTitle && company) {
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'italic');
                pdf.text(`For: ${jobTitle} at ${company}`, margin, yPosition);
                yPosition += 10;
            }

            // Horizontal line
            pdf.setDrawColor(200, 200, 200);
            pdf.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 10;
        }

        // Content
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);

        const lines = editableContent.split('\n');

        for (const line of lines) {
            // Check for headers (lines starting with #)
            if (line.startsWith('# ')) {
                pdf.setFontSize(14);
                pdf.setFont('helvetica', 'bold');
                const headerText = line.replace(/^#+\s*/, '');
                const wrappedLines = pdf.splitTextToSize(headerText, contentWidth);

                for (const wrappedLine of wrappedLines) {
                    if (yPosition > pageHeight - margin) {
                        pdf.addPage();
                        yPosition = margin;
                    }
                    pdf.text(wrappedLine, margin, yPosition);
                    yPosition += lineHeight + 2;
                }
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'normal');
            } else if (line.startsWith('## ')) {
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'bold');
                const headerText = line.replace(/^#+\s*/, '');
                const wrappedLines = pdf.splitTextToSize(headerText, contentWidth);

                for (const wrappedLine of wrappedLines) {
                    if (yPosition > pageHeight - margin) {
                        pdf.addPage();
                        yPosition = margin;
                    }
                    pdf.text(wrappedLine, margin, yPosition);
                    yPosition += lineHeight + 1;
                }
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'normal');
            } else if (line.startsWith('### ')) {
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'bold');
                const headerText = line.replace(/^#+\s*/, '');
                const wrappedLines = pdf.splitTextToSize(headerText, contentWidth);

                for (const wrappedLine of wrappedLines) {
                    if (yPosition > pageHeight - margin) {
                        pdf.addPage();
                        yPosition = margin;
                    }
                    pdf.text(wrappedLine, margin, yPosition);
                    yPosition += lineHeight;
                }
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'normal');
            } else if (line.startsWith('- ') || line.startsWith('* ')) {
                // Bullet points
                const bulletText = line.replace(/^[-*]\s*/, '');
                const wrappedLines = pdf.splitTextToSize(`• ${bulletText}`, contentWidth - 5);

                for (const wrappedLine of wrappedLines) {
                    if (yPosition > pageHeight - margin) {
                        pdf.addPage();
                        yPosition = margin;
                    }
                    pdf.text(wrappedLine, margin + 5, yPosition);
                    yPosition += lineHeight;
                }
            } else if (line.startsWith('---')) {
                // Horizontal rule
                yPosition += 3;
                pdf.setDrawColor(200, 200, 200);
                pdf.line(margin, yPosition, pageWidth - margin, yPosition);
                yPosition += 5;
            } else if (line.trim() === '') {
                yPosition += 3;
            } else {
                // Regular text - handle bold markers
                let processedLine = line.replace(/\*\*(.*?)\*\*/g, '$1');
                const wrappedLines = pdf.splitTextToSize(processedLine, contentWidth);

                for (const wrappedLine of wrappedLines) {
                    if (yPosition > pageHeight - margin) {
                        pdf.addPage();
                        yPosition = margin;
                    }
                    pdf.text(wrappedLine, margin, yPosition);
                    yPosition += lineHeight;
                }
            }
        }

        // Generate filename
        const fileName = `${type}_${company?.replace(/\s+/g, '_') || 'document'}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2">
                        {type === 'resume' && <FileText className="h-5 w-5 text-blue-600" />}
                        {type === 'cover-letter' && <Mail className="h-5 w-5 text-green-600" />}
                        {type === 'analysis' && <Sparkles className="h-5 w-5 text-purple-600" />}
                        <div>
                            <h2 className="text-lg font-semibold">{title}</h2>
                            <p className="text-sm text-slate-500">Click to edit • Use AI to refine • Download as PDF</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content - Editable */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isEditing ? (
                        <textarea
                            ref={textareaRef}
                            value={editableContent}
                            onChange={(e) => setEditableContent(e.target.value)}
                            className="w-full h-[400px] p-4 border border-slate-300 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your content..."
                        />
                    ) : (
                        <div
                            className="prose prose-slate max-w-none cursor-text"
                            onClick={() => setIsEditing(true)}
                        >
                            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
                                {editableContent}
                            </pre>
                        </div>
                    )}
                </div>

                {/* AI Refinement Bar */}
                <div className="p-4 border-t border-slate-200 bg-gradient-to-r from-purple-50 to-blue-50">
                    <div className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-purple-600" />
                        <input
                            type="text"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAiRefine()}
                            placeholder="Ask AI to edit: 'Make it more concise', 'Add more technical skills', 'Make the tone more professional'..."
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            disabled={isRefining}
                        />
                        <Button
                            onClick={handleAiRefine}
                            disabled={isRefining || !aiPrompt.trim()}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {isRefining ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Refining...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Refine
                                </>
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        💡 Try: "Make it shorter", "Emphasize my Python skills", "Add more quantifiable achievements"
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center p-4 border-t border-slate-200 bg-white">
                    <div className="flex gap-2">
                        <Button
                            variant={isEditing ? 'default' : 'outline'}
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            <Edit3 className="h-4 w-4 mr-2" />
                            {isEditing ? 'Preview' : 'Edit Text'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigator.clipboard.writeText(editableContent)}
                        >
                            Copy to Clipboard
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        {isSaved ? (
                            <span className="flex items-center text-sm text-green-600 px-3">
                                <Check className="h-4 w-4 mr-1" />
                                Saved
                            </span>
                        ) : hasChanges ? (
                            <span className="text-sm text-orange-500 px-2">Unsaved changes</span>
                        ) : null}
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || (isSaved && !hasChanges)}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSaving ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save
                                </>
                            )}
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                        <Button onClick={handleDownloadPDF} className="bg-green-600 hover:bg-green-700">
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                        </Button>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default function JobsPage() {
    const [jobs, setJobs] = useState<JobWithTracking[]>([]);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [filters, setFilters] = useState<JobFilters>({
        page: 1,
        limit: 50,
        sortBy: 'date',
        sortOrder: 'desc',
    });
    const [sources, setSources] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [isScoring, setIsScoring] = useState(false);
    const [scoringJobId, setScoringJobId] = useState<string | null>(null);
    const [generatingFor, setGeneratingFor] = useState<{ jobId: string; type: 'resume' | 'cover-letter' } | null>(null);
    const [fetchingDescriptionId, setFetchingDescriptionId] = useState<string | null>(null);
    const [savingDescriptionId, setSavingDescriptionId] = useState<string | null>(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
    });

    // Modal state
    const [modal, setModal] = useState<{
        isOpen: boolean;
        title: string;
        content: string;
        type: 'resume' | 'cover-letter' | 'analysis';
        jobTitle?: string;
        company?: string;
        jobId?: string;
        isSavedDocument?: boolean;
    }>({
        isOpen: false,
        title: '',
        content: '',
        type: 'analysis',
    });

    // Resume builder state
    const [resumeBuilder, setResumeBuilder] = useState<{
        isOpen: boolean;
        job: { id: string; title: string; company: string; description?: string } | null;
    }>({
        isOpen: false,
        job: null,
    });

    // Load user profile
    const loadProfile = useCallback(async () => {
        try {
            const response = await fetch('/api/profile');
            const data = await response.json();
            if (data.success && data.data) {
                setProfile(data.data);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }, []);

    // Build query string from filters
    const buildQueryString = useCallback((f: JobFilters) => {
        const params = new URLSearchParams();
        if (f.search) params.append('search', f.search);
        if (f.location) params.append('location', f.location);
        if (f.remote !== undefined) params.append('remote', String(f.remote));
        if (f.source) params.append('source', f.source);
        if (f.sortBy) params.append('sortBy', f.sortBy);
        if (f.sortOrder) params.append('sortOrder', f.sortOrder);
        if (f.page) params.append('page', String(f.page));
        if (f.limit) params.append('limit', String(f.limit));
        return params.toString();
    }, []);

    const loadJobs = useCallback(async () => {
        setIsLoading(true);
        try {
            const queryString = buildQueryString(filters);
            const [jobsResponse, userJobsResponse] = await Promise.all([
                fetch(`/api/jobs?${queryString}`),
                fetch('/api/jobs/user?limit=1000'),
            ]);
            const jobsData = await jobsResponse.json();
            const userJobsData = await userJobsResponse.json();

            if (jobsData.success && jobsData.data) {
                // Create a map of user jobs by jobId for quick lookup
                const userJobsMap = new Map<string, {
                    id: string;
                    applicationStatus?: ApplicationStatus;
                    favorite?: boolean;
                    hidden?: boolean;
                    matchScore?: number;
                    matchReasoning?: string;
                    strengths?: string[];
                    gaps?: string[];
                }>();

                if (userJobsData.success && userJobsData.data) {
                    userJobsData.data.forEach((uj: { id: string; jobId: string; applicationStatus?: ApplicationStatus; favorite?: boolean; hidden?: boolean; matchScore?: number; matchReasoning?: string; strengths?: string[]; gaps?: string[] }) => {
                        userJobsMap.set(uj.jobId, {
                            id: uj.id,
                            applicationStatus: uj.applicationStatus,
                            favorite: uj.favorite,
                            hidden: uj.hidden,
                            matchScore: uj.matchScore,
                            matchReasoning: uj.matchReasoning,
                            strengths: uj.strengths,
                            gaps: uj.gaps,
                        });
                    });
                }

                // Merge base jobs with user job data
                const jobsWithTracking: JobWithTracking[] = jobsData.data.map((job: Job) => {
                    const userJob = userJobsMap.get(job.id);
                    return {
                        ...job,
                        userJobId: userJob?.id,
                        matchScore: userJob?.matchScore,
                        matchReasoning: userJob?.matchReasoning,
                        strengths: userJob?.strengths,
                        gaps: userJob?.gaps,
                        applicationStatus: userJob?.applicationStatus || ('not_applied' as ApplicationStatus),
                        favorite: userJob?.favorite || false,
                        hidden: userJob?.hidden || false,
                    };
                });
                setJobs(jobsWithTracking);
                setPagination(jobsData.pagination || { page: 1, limit: 50, total: jobsData.data.length, totalPages: 1 });
            }
        } catch (error) {
            console.error('Error loading jobs:', error);
        } finally {
            setIsLoading(false);
        }
    }, [filters, buildQueryString]);

    const loadSources = async () => {
        try {
            const response = await fetch('/api/jobs?limit=1000');
            const data = await response.json();

            if (data.success && data.data) {
                const uniqueSources = [...new Set(data.data.map((j: { source: string }) => j.source))] as string[];
                setSources(uniqueSources);
            }
        } catch (error) {
            console.error('Error loading sources:', error);
        }
    };

    useEffect(() => {
        loadProfile();
        loadJobs();
        loadSources();
    }, [loadJobs, loadProfile]);

    const handleFetchJobs = async () => {
        setIsFetching(true);
        try {
            const response = await fetch('/api/jobs/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    titles: profile?.preferences?.roles || ['Software Engineer', 'Developer'],
                    locations: profile?.preferences?.locations || [],
                    maxResults: 100,
                }),
            });
            const data = await response.json();

            if (data.success) {
                await loadJobs();
                await loadSources();
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setIsFetching(false);
        }
    };

    const handleScoreJob = async (jobId: string) => {
        if (!profile) {
            alert('Please create a profile first to enable AI scoring');
            return;
        }

        setScoringJobId(jobId);
        const job = jobs.find(j => j.id === jobId);
        if (!job) return;

        try {
            const response = await fetch('/api/ai/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile: {
                        name: profile.personalDetails?.fullName || 'User',
                        headline: profile.preferences?.roles?.[0] || 'Software Engineer',
                        summary: profile.summary || '',
                        skills: profile.skills || [],
                        experience: profile.experience || [],
                        education: profile.education || [],
                    },
                    job: {
                        id: job.id,
                        title: job.title,
                        company: job.company,
                        description: job.description || `${job.title} at ${job.company}`,
                        location: typeof job.location === 'string' ? job.location : `${job.location?.city || ''}, ${job.location?.country || ''}`,
                    },
                }),
            });

            const data = await response.json();

            if (data.success && data.data) {
                setJobs(jobs.map(j =>
                    j.id === jobId
                        ? {
                            ...j,
                            matchScore: data.data.score,
                            matchReasoning: data.data.reasoning,
                            strengths: data.data.strengths,
                            gaps: data.data.gaps,
                        }
                        : j
                ));
            }
        } catch (error) {
            console.error('Error scoring job:', error);
        } finally {
            setScoringJobId(null);
        }
    };

    const handleScoreAll = async () => {
        if (!profile) {
            alert('Please create a profile first to enable AI scoring');
            return;
        }

        setIsScoring(true);
        try {
            const unscoredJobs = jobs.filter(j => !j.matchScore).slice(0, 5);

            for (const job of unscoredJobs) {
                await handleScoreJob(job.id);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error('Error scoring jobs:', error);
        } finally {
            setIsScoring(false);
        }
    };

    const handleGenerateResume = async (userJobId: string, jobId: string) => {
        if (!profile) {
            alert('Please create a profile first to generate a resume');
            return;
        }

        const job = jobs.find(j => j.id === jobId);
        if (!job) return;

        // Open the visual resume builder
        setResumeBuilder({
            isOpen: true,
            job: {
                id: job.id,
                title: job.title,
                company: job.company,
                description: job.description,
            },
        });
    };

    const handleGenerateResumeOld = async (userJobId: string, jobId: string) => {
        if (!profile) {
            alert('Please create a profile first to generate a resume');
            return;
        }

        const job = jobs.find(j => j.id === jobId);
        if (!job) return;

        setGeneratingFor({ jobId, type: 'resume' });

        try {
            // Check for saved document first
            const savedDocResponse = await fetch(`/api/documents?jobId=${jobId}&type=resume`);
            const savedDoc = await savedDocResponse.json();

            if (savedDoc.success && savedDoc.data) {
                // Use saved document
                setModal({
                    isOpen: true,
                    title: `Resume - ${job.title}`,
                    content: savedDoc.data.content,
                    type: 'resume',
                    jobTitle: job.title,
                    company: job.company,
                    jobId: jobId,
                    isSavedDocument: true,
                });
                setGeneratingFor(null);
                return;
            }

            // Generate new document
            const scoreResponse = await fetch('/api/ai/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile: {
                        name: profile.personalDetails?.fullName || 'User',
                        headline: profile.preferences?.roles?.[0] || 'Software Engineer',
                        summary: profile.summary || '',
                        skills: profile.skills || [],
                    },
                    job: {
                        title: job.title,
                        company: job.company,
                        description: job.description || `${job.title} position at ${job.company}`,
                    },
                }),
            });

            const scoreData = await scoreResponse.json();

            const resumeContent = `# ${profile.personalDetails?.fullName || 'Your Name'}

${profile.personalDetails?.email || 'email@example.com'} | ${profile.personalDetails?.phone || ''} | ${profile.personalDetails?.location || ''}
${profile.personalDetails?.linkedIn ? `LinkedIn: ${profile.personalDetails.linkedIn}` : ''} ${profile.personalDetails?.github ? `| GitHub: ${profile.personalDetails.github}` : ''}

---

## Professional Summary

${profile.summary || 'Experienced professional with a strong background in software development and problem-solving.'}

---

## Skills

${(profile.skills || ['JavaScript', 'React', 'Node.js']).join(' • ')}

---

## Experience

${(profile.experience || []).map(exp => `### ${exp.title}
**${exp.company}** | ${exp.location || 'Remote'}
${exp.startDate} - ${exp.current ? 'Present' : exp.endDate || 'Present'}

${exp.description || ''}

${(exp.achievements || []).map(a => `- ${a}`).join('\n')}
`).join('\n') || '### Software Engineer\n**Company Name** | Location\n2020 - Present\n\n- Developed and maintained web applications\n- Collaborated with cross-functional teams'}

---

## Education

${(profile.education || []).map(edu => `### ${edu.degree}
**${edu.institution}** | ${edu.graduationDate || ''}`).join('\n\n') || '### Bachelor of Science in Computer Science\n**University Name** | 2020'}

---

## Tailored Analysis for ${job.title} at ${job.company}

**Match Score: ${scoreData.data?.score || 'N/A'}%**

${scoreData.data?.reasoning || 'Analysis not available'}

**Key Strengths:**
${(scoreData.data?.strengths || ['Strong technical background', 'Relevant experience']).map((s: string) => `- ${s}`).join('\n')}

**Areas to Address:**
${(scoreData.data?.gaps || ['Consider highlighting specific achievements']).map((g: string) => `- ${g}`).join('\n')}
`;

            setModal({
                isOpen: true,
                title: `Resume - ${job.title}`,
                content: resumeContent,
                type: 'resume',
                jobTitle: job.title,
                company: job.company,
                jobId: jobId,
                isSavedDocument: false,
            });

            if (scoreData.success && scoreData.data) {
                setJobs(jobs.map(j =>
                    j.id === jobId
                        ? { ...j, matchScore: scoreData.data.score, matchReasoning: scoreData.data.reasoning }
                        : j
                ));
            }
        } catch (error) {
            console.error('Error generating resume:', error);
            alert('Failed to generate resume. Ensure Ollama is running.');
        } finally {
            setGeneratingFor(null);
        }
    };

    const handleGenerateCoverLetter = async (userJobId: string, jobId: string) => {
        if (!profile) {
            alert('Please create a profile first to generate a cover letter');
            return;
        }

        const job = jobs.find(j => j.id === jobId);
        if (!job) return;

        setGeneratingFor({ jobId, type: 'cover-letter' });

        try {
            // Check for saved document first
            const savedDocResponse = await fetch(`/api/documents?jobId=${jobId}&type=cover-letter`);
            const savedDoc = await savedDocResponse.json();

            if (savedDoc.success && savedDoc.data) {
                // Use saved document
                setModal({
                    isOpen: true,
                    title: `Cover Letter - ${job.title}`,
                    content: savedDoc.data.content,
                    type: 'cover-letter',
                    jobTitle: job.title,
                    company: job.company,
                    jobId: jobId,
                    isSavedDocument: true,
                });
                setGeneratingFor(null);
                return;
            }

            // Generate new document
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'mistral',
                    prompt: `Write a professional cover letter for ${profile.personalDetails?.fullName || 'the candidate'} applying for the ${job.title} position at ${job.company}.

Candidate Background:
- Current Role: ${profile.preferences?.roles?.[0] || 'Software Professional'}
- Skills: ${(profile.skills || []).slice(0, 10).join(', ')}
- Summary: ${profile.summary || 'Experienced professional'}
- Location: ${profile.personalDetails?.location || 'Not specified'}

Job Details:
- Title: ${job.title}
- Company: ${job.company}
- Description: ${job.description || 'Not available'}

Write a compelling 3-4 paragraph cover letter that:
1. Opens with genuine enthusiasm for the role
2. Highlights 2-3 relevant skills/experiences
3. Shows understanding of the company
4. Ends with a confident call to action

Use a professional but personable tone.`,
                    stream: false,
                    options: { temperature: 0.7, num_predict: 1024 },
                }),
            });

            const data = await response.json();

            const coverLetter = `# Cover Letter

**Position:** ${job.title}
**Company:** ${job.company}
**Date:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

---

${data.response || 'Failed to generate cover letter. Please try again.'}

---

Best regards,

**${profile.personalDetails?.fullName || 'Your Name'}**
${profile.personalDetails?.email || ''}
${profile.personalDetails?.phone || ''}
${profile.personalDetails?.linkedIn || ''}
`;

            setModal({
                isOpen: true,
                title: `Cover Letter - ${job.title}`,
                content: coverLetter,
                type: 'cover-letter',
                jobTitle: job.title,
                company: job.company,
                jobId: jobId,
                isSavedDocument: false,
            });
        } catch (error) {
            console.error('Error generating cover letter:', error);
            alert('Failed to generate cover letter. Ensure Ollama is running with "ollama serve".');
        } finally {
            setGeneratingFor(null);
        }
    };

    const handleStatusChange = async (id: string, status: ApplicationStatus) => {
        // Optimistically update UI first
        const previousStatus = jobs.find(j => j.id === id)?.applicationStatus;
        setJobs(jobs.map(j =>
            j.id === id ? { ...j, applicationStatus: status } : j
        ));

        // Persist to backend
        try {
            const response = await fetch(`/api/jobs/user/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicationStatus: status }),
            });
            const data = await response.json();

            if (!data.success) {
                // Revert on failure
                console.error('Failed to update status:', data.error);
                setJobs(jobs.map(j =>
                    j.id === id ? { ...j, applicationStatus: previousStatus } : j
                ));
            }
        } catch (error) {
            console.error('Error updating status:', error);
            // Revert on error
            setJobs(jobs.map(j =>
                j.id === id ? { ...j, applicationStatus: previousStatus } : j
            ));
        }
    };

    const handleToggleFavorite = async (id: string, favorite: boolean) => {
        setJobs(jobs.map(j => j.id === id ? { ...j, favorite } : j));
        try {
            await fetch(`/api/jobs/user/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ favorite }),
            });
        } catch (error) {
            console.error('Error updating favorite:', error);
            setJobs(jobs.map(j => j.id === id ? { ...j, favorite: !favorite } : j));
        }
    };

    const handleToggleHidden = async (id: string, hidden: boolean) => {
        setJobs(jobs.map(j => j.id === id ? { ...j, hidden } : j));
        try {
            await fetch(`/api/jobs/user/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hidden }),
            });
        } catch (error) {
            console.error('Error updating hidden:', error);
            setJobs(jobs.map(j => j.id === id ? { ...j, hidden: !hidden } : j));
        }
    };

    const handleFetchDescription = async (id: string) => {
        setFetchingDescriptionId(id);
        try {
            const response = await fetch(`/api/jobs/${id}/description`, {
                method: 'POST',
            });
            const data = await response.json();

            if (data.success && data.data) {
                // Update the job in state with the fetched description
                setJobs(jobs.map(j =>
                    j.id === id
                        ? { ...j, description: data.data.description }
                        : j
                ));
            } else {
                console.error('Failed to fetch description:', data.error);
                alert(data.error || 'Failed to fetch description');
            }
        } catch (error) {
            console.error('Error fetching description:', error);
            alert('Failed to fetch description. Check console for details.');
        } finally {
            setFetchingDescriptionId(null);
        }
    };

    const handleSaveDescription = async (id: string, description: string) => {
        setSavingDescriptionId(id);
        try {
            const response = await fetch(`/api/jobs/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description }),
            });
            const data = await response.json();

            if (data.success && data.data) {
                // Update the job in state with the saved description
                setJobs(jobs.map(j =>
                    j.id === id
                        ? { ...j, description: data.data.description }
                        : j
                ));
            } else {
                console.error('Failed to save description:', data.error);
                alert(data.error || 'Failed to save description');
            }
        } catch (error) {
            console.error('Error saving description:', error);
            alert('Failed to save description. Check console for details.');
        } finally {
            setSavingDescriptionId(null);
        }
    };

    const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

    const handleDeleteJob = async (id: string) => {
        setDeletingJobId(id);
        try {
            const response = await fetch(`/api/jobs/${id}`, {
                method: 'DELETE',
            });
            const data = await response.json();

            if (data.success) {
                // Remove the job from state
                setJobs(jobs.filter(j => j.id !== id));
            } else {
                console.error('Failed to delete job:', data.error);
                alert(data.error || 'Failed to delete job');
            }
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('Failed to delete job. Check console for details.');
        } finally {
            setDeletingJobId(null);
        }
    };

    const visibleJobs = jobs
        .filter(j => !j.hidden)
        .filter(j => {
            // Apply status filter
            if (filters.status && filters.status !== 'all') {
                return j.applicationStatus === filters.status;
            }
            return true;
        })
        .sort((a, b) => {
            // Sort applied jobs to end when showing all
            if (!filters.status || filters.status === 'all') {
                const aApplied = a.applicationStatus === 'applied' || a.applicationStatus === 'interviewing' || a.applicationStatus === 'offer' || a.applicationStatus === 'rejected';
                const bApplied = b.applicationStatus === 'applied' || b.applicationStatus === 'interviewing' || b.applicationStatus === 'offer' || b.applicationStatus === 'rejected';
                if (aApplied && !bApplied) return 1;
                if (!aApplied && bApplied) return -1;
            }
            return 0;
        });

    return (
        <div className="min-h-screen">
            <Header
                title="Jobs"
                subtitle={`${pagination.total} jobs found from ${sources.length} sources`}
                actions={
                    <div className="flex gap-2">
                        <Button onClick={handleScoreAll} disabled={isScoring || !profile} variant="outline">
                            <Sparkles className={`h-4 w-4 mr-2 ${isScoring ? 'animate-pulse' : ''}`} />
                            {isScoring ? 'Scoring...' : 'Score Jobs'}
                        </Button>
                        <Button onClick={handleFetchJobs} disabled={isFetching}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                            {isFetching ? 'Fetching...' : 'Fetch Jobs'}
                        </Button>
                    </div>
                }
            />

            {!profile && (
                <div className="mx-6 mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <div>
                        <p className="font-medium text-yellow-800">Profile Required for AI Features</p>
                        <p className="text-sm text-yellow-700">
                            Create a profile with your skills and experience to enable job scoring, resume, and cover letter generation.
                            <a href="/profile" className="ml-1 underline">Go to Profile →</a>
                        </p>
                    </div>
                </div>
            )}

            <div className="p-6">
                <JobFiltersComponent
                    filters={filters}
                    onFiltersChange={setFilters}
                    sources={sources}
                />

                <Card>
                    <CardContent className="p-0">
                        <JobTable
                            jobs={visibleJobs.map(j => ({
                                ...j,
                                isScoring: scoringJobId === j.id,
                                isGenerating: generatingFor?.jobId === j.id,
                            })) as any}
                            onStatusChange={handleStatusChange}
                            onGenerateResume={handleGenerateResume}
                            onGenerateCoverLetter={handleGenerateCoverLetter}
                            onToggleFavorite={handleToggleFavorite}
                            onToggleHidden={handleToggleHidden}
                            onFetchDescription={handleFetchDescription}
                            onSaveDescription={handleSaveDescription}
                            onDeleteJob={handleDeleteJob}
                            fetchingDescriptionId={fetchingDescriptionId}
                            savingDescriptionId={savingDescriptionId}
                            deletingJobId={deletingJobId}
                            isLoading={isLoading}
                        />
                    </CardContent>
                </Card>

                {pagination.totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page <= 1}
                            onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-slate-600">
                            Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>

            <ContentModal
                isOpen={modal.isOpen}
                onClose={() => setModal({ ...modal, isOpen: false })}
                onSave={async (content: string) => {
                    if (modal.jobId && modal.type !== 'analysis') {
                        await fetch('/api/documents', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                jobId: modal.jobId,
                                type: modal.type,
                                content,
                            }),
                        });
                    }
                }}
                title={modal.title}
                content={modal.content}
                type={modal.type}
                jobTitle={modal.jobTitle}
                company={modal.company}
                jobId={modal.jobId}
                isSavedDocument={modal.isSavedDocument}
            />

            {/* Visual Resume Builder */}
            {resumeBuilder.job && (
                <ResumeBuilder
                    isOpen={resumeBuilder.isOpen}
                    onClose={() => setResumeBuilder({ isOpen: false, job: null })}
                    onSave={async (content: string) => {
                        if (resumeBuilder.job) {
                            await fetch('/api/documents', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    jobId: resumeBuilder.job.id,
                                    type: 'resume',
                                    content,
                                }),
                            });
                        }
                    }}
                    profile={profile}
                    job={resumeBuilder.job}
                />
            )}
        </div>
    );
}
