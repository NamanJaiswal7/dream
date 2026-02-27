'use client';

import { useState, useEffect } from 'react';
import { X, Download, Save, Check, RefreshCw, FileCode, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserProfile, LatexResumeData, LatexResumePersonalInfo } from '@/types';
import { LatexResumeEditor } from './latex-resume-editor';
import jsPDF from 'jspdf';

interface ResumeBuilderProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (content: string) => Promise<void>;
    profile: UserProfile | null;
    job: {
        id: string;
        title: string;
        company: string;
        description?: string;
    };
    savedContent?: string;
}

// Simple editable text input
function EditableText({
    value,
    onChange,
    placeholder,
    className = '',
    style = {}
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    className?: string;
    style?: React.CSSProperties;
}) {
    return (
        <input
            type="text"
            value={value.startsWith('[') ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none bg-transparent transition-colors ${className}`}
            style={style}
        />
    );
}

type ResumeMode = 'standard' | 'latex';

export function ResumeBuilder({ isOpen, onClose, onSave, profile, job }: ResumeBuilderProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [mode, setMode] = useState<ResumeMode>('standard');
    const [isGeneratingLatex, setIsGeneratingLatex] = useState(false);
    const [latexContent, setLatexContent] = useState<string>('');
    const [latexError, setLatexError] = useState<string>('');

    // Resume data
    const [data, setData] = useState({
        name: profile?.personalDetails?.fullName || '',
        email: profile?.personalDetails?.email || '',
        phone: profile?.personalDetails?.phone || '',
        location: profile?.personalDetails?.location || '',
        linkedin: profile?.personalDetails?.linkedIn || '',
        summary: profile?.summary || '',
        skills: profile?.skills || [],
        experience: profile?.experience?.slice(0, 2) || [],
        education: profile?.education?.slice(0, 1) || [],
    });

    const update = (field: string, value: any) => {
        setData(prev => ({ ...prev, [field]: value }));
        setIsSaved(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const saveData = mode === 'latex'
                ? JSON.stringify({ mode: 'latex', latex: latexContent, data })
                : JSON.stringify(data);
            await onSave(saveData);
            setIsSaved(true);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownloadPDF = () => {
        const pdf = new jsPDF({ format: 'a4', unit: 'mm' });
        const w = pdf.internal.pageSize.getWidth();
        const m = 15; // margin
        let y = m;

        // Name
        pdf.setFontSize(22);
        pdf.setFont('helvetica', 'bold');
        pdf.text(data.name || 'Your Name', m, y);
        y += 8;

        // Contact line
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100);
        const contact = [data.email, data.phone, data.location].filter(Boolean).join(' • ');
        pdf.text(contact, m, y);
        y += 4;
        if (data.linkedin) {
            pdf.text(data.linkedin, m, y);
            y += 6;
        } else {
            y += 2;
        }

        // Line
        pdf.setDrawColor(200);
        pdf.line(m, y, w - m, y);
        y += 6;

        // Summary
        if (data.summary) {
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(40);
            pdf.text('SUMMARY', m, y);
            y += 5;
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(60);
            const sumLines = pdf.splitTextToSize(data.summary, w - 2 * m);
            pdf.text(sumLines, m, y);
            y += sumLines.length * 4 + 5;
        }

        // Skills
        if (data.skills.length > 0) {
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(40);
            pdf.text('SKILLS', m, y);
            y += 5;
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(60);
            const skillText = data.skills.join(' • ');
            const skillLines = pdf.splitTextToSize(skillText, w - 2 * m);
            pdf.text(skillLines, m, y);
            y += skillLines.length * 4 + 5;
        }

        // Experience
        if (data.experience.length > 0) {
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(40);
            pdf.text('EXPERIENCE', m, y);
            y += 5;

            data.experience.forEach(exp => {
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(30);
                pdf.text(exp.title, m, y);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(100);
                const dates = `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`;
                pdf.text(dates, w - m - pdf.getTextWidth(dates), y);
                y += 4;
                pdf.setTextColor(60);
                pdf.text(`${exp.company}${exp.location ? ', ' + exp.location : ''}`, m, y);
                y += 4;
                (exp.achievements || []).forEach(a => {
                    const lines = pdf.splitTextToSize(`• ${a}`, w - 2 * m - 3);
                    pdf.text(lines, m + 2, y);
                    y += lines.length * 3.5;
                });
                y += 3;
            });
        }

        // Education
        if (data.education.length > 0) {
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(40);
            pdf.text('EDUCATION', m, y);
            y += 5;

            data.education.forEach(edu => {
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(30);
                pdf.text(edu.degree, m, y);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(100);
                pdf.text(edu.graduationDate || '', w - m - pdf.getTextWidth(edu.graduationDate || ''), y);
                y += 4;
                pdf.setTextColor(60);
                pdf.text(edu.institution, m, y);
                y += 6;
            });
        }

        pdf.save(`Resume_${job.company.replace(/\s+/g, '_')}.pdf`);
    };

    // Generate LaTeX resume
    const generateLatexResume = async () => {
        if (!profile) {
            setLatexError('Profile is required to generate LaTeX resume');
            return;
        }

        setIsGeneratingLatex(true);
        setLatexError('');

        try {
            const response = await fetch('/api/resume/latex', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile,
                    job: {
                        id: job.id,
                        title: job.title,
                        company: job.company,
                        description: job.description,
                        location: { type: 'remote' },
                        source: 'manual',
                        sourceUrl: '',
                        postedAt: new Date(),
                        fetchedAt: new Date(),
                        deduplicationHash: '',
                        status: 'active',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate LaTeX resume');
            }

            setLatexContent(result.latex);
        } catch (error) {
            console.error('Error generating LaTeX:', error);
            setLatexError(error instanceof Error ? error.message : 'Failed to generate LaTeX resume');
        } finally {
            setIsGeneratingLatex(false);
        }
    };

    // Download compiled PDF from LaTeX
    const [isCompilingPdf, setIsCompilingPdf] = useState(false);

    const handleDownloadLatexPdf = async () => {
        if (!profile || !latexContent) return;

        setIsCompilingPdf(true);

        try {
            const response = await fetch('/api/resume/latex', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile,
                    job: {
                        id: job.id,
                        title: job.title,
                        company: job.company,
                        description: job.description,
                        location: { type: 'remote' },
                        source: 'manual',
                        sourceUrl: '',
                        postedAt: new Date(),
                        fetchedAt: new Date(),
                        deduplicationHash: '',
                        status: 'active',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    compile: true, // Request PDF compilation
                }),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to compile PDF');
            }

            // Download the PDF blob
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Resume_${job.company.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error compiling PDF:', error);
            setLatexError(error instanceof Error ? error.message : 'Failed to compile PDF');
        } finally {
            setIsCompilingPdf(false);
        }
    };

    // Download LaTeX source file
    const handleDownloadLatexSource = () => {
        if (!latexContent) return;

        const blob = new Blob([latexContent], { type: 'application/x-latex' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Resume_${job.company.replace(/\s+/g, '_')}.tex`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Auto-generate LaTeX when switching to latex mode
    useEffect(() => {
        if (mode === 'latex' && !latexContent && !isGeneratingLatex) {
            generateLatexResume();
        }
    }, [mode]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-[900px] max-h-[95vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                    <div>
                        <h2 className="text-lg font-semibold">Resume Builder</h2>
                        <p className="text-sm text-gray-500">{job.title} at {job.company}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Mode Toggle */}
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setMode('standard')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'standard'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                <FileText className="h-4 w-4" />
                                Standard
                            </button>
                            <button
                                onClick={() => setMode('latex')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'latex'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                <FileCode className="h-4 w-4" />
                                LaTeX
                            </button>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Resume Content */}
                <div className="flex-1 overflow-auto p-6 bg-gray-100">
                    {mode === 'standard' ? (
                        /* Standard Resume Preview */
                        <div
                            className="bg-white shadow-lg mx-auto p-8"
                            style={{ width: '100%', maxWidth: '700px', minHeight: '900px' }}
                        >
                            {/* Name */}
                            <EditableText
                                value={data.name}
                                onChange={(v) => update('name', v)}
                                placeholder="Your Full Name"
                                className="text-2xl font-bold w-full text-gray-900"
                            />

                            {/* Contact Info */}
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600 mt-1 mb-2">
                                <EditableText
                                    value={data.email}
                                    onChange={(v) => update('email', v)}
                                    placeholder="email@example.com"
                                    className="text-sm"
                                />
                                <span className="text-gray-300">•</span>
                                <EditableText
                                    value={data.phone}
                                    onChange={(v) => update('phone', v)}
                                    placeholder="+1 234 567 8900"
                                    className="text-sm"
                                />
                                <span className="text-gray-300">•</span>
                                <EditableText
                                    value={data.location}
                                    onChange={(v) => update('location', v)}
                                    placeholder="City, Country"
                                    className="text-sm"
                                />
                            </div>
                            <EditableText
                                value={data.linkedin}
                                onChange={(v) => update('linkedin', v)}
                                placeholder="linkedin.com/in/yourprofile"
                                className="text-sm text-blue-600"
                            />

                            <hr className="my-4 border-gray-200" />

                            {/* Summary */}
                            <div className="mb-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Summary</h3>
                                <textarea
                                    value={data.summary}
                                    onChange={(e) => update('summary', e.target.value)}
                                    placeholder="Brief professional summary highlighting your expertise..."
                                    className="w-full text-sm text-gray-700 leading-relaxed border-0 outline-none resize-none bg-transparent hover:bg-gray-50 focus:bg-blue-50 rounded p-1 -m-1"
                                    rows={3}
                                />
                            </div>

                            {/* Skills */}
                            <div className="mb-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Skills</h3>
                                <div className="flex flex-wrap gap-2">
                                    {data.skills.map((skill, i) => (
                                        <input
                                            key={i}
                                            type="text"
                                            value={skill}
                                            onChange={(e) => {
                                                const newSkills = [...data.skills];
                                                newSkills[i] = e.target.value;
                                                update('skills', newSkills);
                                            }}
                                            className="px-2 py-1 text-sm bg-gray-100 rounded border-0 outline-none focus:bg-blue-100 hover:bg-gray-200"
                                            style={{ width: `${Math.max(skill.length * 8 + 20, 60)}px` }}
                                        />
                                    ))}
                                    <button
                                        onClick={() => update('skills', [...data.skills, 'New Skill'])}
                                        className="px-2 py-1 text-sm text-blue-600 border border-dashed border-blue-300 rounded hover:bg-blue-50"
                                    >
                                        + Add
                                    </button>
                                </div>
                            </div>

                            {/* Experience */}
                            <div className="mb-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Experience</h3>
                                {data.experience.map((exp, i) => (
                                    <div key={i} className="mb-3 p-2 -mx-2 rounded hover:bg-gray-50">
                                        <div className="flex justify-between items-start">
                                            <EditableText
                                                value={exp.title}
                                                onChange={(v) => {
                                                    const newExp = [...data.experience];
                                                    newExp[i] = { ...newExp[i], title: v };
                                                    update('experience', newExp);
                                                }}
                                                placeholder="Job Title"
                                                className="font-semibold text-gray-900"
                                            />
                                            <span className="text-xs text-gray-500">
                                                {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                                            </span>
                                        </div>
                                        <EditableText
                                            value={exp.company}
                                            onChange={(v) => {
                                                const newExp = [...data.experience];
                                                newExp[i] = { ...newExp[i], company: v };
                                                update('experience', newExp);
                                            }}
                                            placeholder="Company Name"
                                            className="text-sm text-gray-600"
                                        />
                                        <ul className="mt-1 space-y-0.5">
                                            {(exp.achievements || []).map((ach, j) => (
                                                <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                                                    <span className="text-gray-400 mt-0.5">•</span>
                                                    <input
                                                        type="text"
                                                        value={ach}
                                                        onChange={(e) => {
                                                            const newExp = [...data.experience];
                                                            const newAch = [...(newExp[i].achievements || [])];
                                                            newAch[j] = e.target.value;
                                                            newExp[i] = { ...newExp[i], achievements: newAch };
                                                            update('experience', newExp);
                                                        }}
                                                        placeholder="Key achievement..."
                                                        className="flex-1 border-0 outline-none bg-transparent hover:bg-gray-100 focus:bg-blue-50 rounded px-1"
                                                    />
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>

                            {/* Education */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Education</h3>
                                {data.education.map((edu, i) => (
                                    <div key={i} className="flex justify-between items-start p-2 -mx-2 rounded hover:bg-gray-50">
                                        <div>
                                            <EditableText
                                                value={edu.degree}
                                                onChange={(v) => {
                                                    const newEdu = [...data.education];
                                                    newEdu[i] = { ...newEdu[i], degree: v };
                                                    update('education', newEdu);
                                                }}
                                                placeholder="Degree"
                                                className="font-semibold text-gray-900"
                                            />
                                            <EditableText
                                                value={edu.institution}
                                                onChange={(v) => {
                                                    const newEdu = [...data.education];
                                                    newEdu[i] = { ...newEdu[i], institution: v };
                                                    update('education', newEdu);
                                                }}
                                                placeholder="Institution"
                                                className="text-sm text-gray-600 block"
                                            />
                                        </div>
                                        <span className="text-xs text-gray-500">{edu.graduationDate}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* LaTeX Mode - Editable Resume */
                        <div className="bg-white shadow-lg mx-auto rounded-lg overflow-hidden" style={{ width: '100%', maxWidth: '900px', height: 'calc(95vh - 200px)' }}>
                            <LatexResumeEditor
                                jobId={job.id}
                                profile={profile}
                                jobTitle={job.title}
                                jobCompany={job.company}
                                jobDescription={job.description}
                                onSave={onSave}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50">
                    <span className="text-sm text-gray-500">
                        {mode === 'standard' ? 'Click any field to edit' : 'AI-generated LaTeX resume tailored for this job'}
                    </span>
                    <div className="flex items-center gap-3">
                        {isSaved && (
                            <span className="flex items-center text-sm text-green-600">
                                <Check className="h-4 w-4 mr-1" /> Saved
                            </span>
                        )}
                        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                            {isSaving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Save
                        </Button>
                        {mode === 'standard' ? (
                            <Button onClick={handleDownloadPDF} className="bg-green-600 hover:bg-green-700">
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleDownloadLatexPdf}
                                    disabled={!latexContent || isCompilingPdf}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {isCompilingPdf ? (
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Download className="h-4 w-4 mr-2" />
                                    )}
                                    {isCompilingPdf ? 'Compiling...' : 'Download PDF'}
                                </Button>
                                <Button
                                    onClick={handleDownloadLatexSource}
                                    disabled={!latexContent}
                                    variant="outline"
                                    className="border-green-600 text-green-600 hover:bg-green-50"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    .tex
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
