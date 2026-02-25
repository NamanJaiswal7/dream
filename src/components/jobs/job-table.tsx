'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
    ExternalLink,
    FileText,
    Mail,
    MoreHorizontal,
    Star,
    Eye,
    EyeOff,
    Sparkles,
    Loader2,
    ChevronDown,
    ChevronUp,
    FileSearch,
    ClipboardPaste,
    Save,
    Pencil,
    Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ApplicationStatus } from '@/types';
import { cn } from '@/lib/utils';

// Flexible job type that works with both formats
interface JobDisplay {
    id: string;
    title: string;
    company: string;
    location: string | { type?: string; city?: string; country?: string };
    source: string;
    sourceUrl?: string;
    url?: string;
    postedAt: string | Date;
    matchScore?: number;
    matchReasoning?: string;
    strengths?: string[];
    gaps?: string[];
    applicationStatus?: ApplicationStatus;
    favorite?: boolean;
    hidden?: boolean;
    isScoring?: boolean;
    isGenerating?: boolean;
    description?: string;
    job?: {
        id: string;
        title: string;
        company: string;
        location: { type?: string; city?: string; country?: string };
        source: string;
        sourceUrl?: string;
        postedAt: string | Date;
        description?: string;
    };
}

interface JobTableProps {
    jobs: JobDisplay[];
    onStatusChange: (id: string, status: ApplicationStatus) => void;
    onGenerateResume: (userJobId: string, jobId: string) => void;
    onGenerateCoverLetter: (userJobId: string, jobId: string) => void;
    onToggleFavorite: (id: string, favorite: boolean) => void;
    onToggleHidden: (id: string, hidden: boolean) => void;
    onFetchDescription?: (id: string) => Promise<void>;
    onSaveDescription?: (id: string, description: string) => Promise<void>;
    onDeleteJob?: (id: string) => Promise<void>;
    fetchingDescriptionId?: string | null;
    savingDescriptionId?: string | null;
    deletingJobId?: string | null;
    isLoading?: boolean;
}

const statusColors: Record<ApplicationStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
    not_applied: 'secondary',
    applied: 'default',
    interviewing: 'warning',
    rejected: 'destructive',
    offer: 'success',
};

const statusLabels: Record<ApplicationStatus, string> = {
    not_applied: 'Not Applied',
    applied: 'Applied',
    interviewing: 'Interviewing',
    rejected: 'Rejected',
    offer: 'Offer',
};

// Helper to get location display
const getLocationDisplay = (location: string | { type?: string; city?: string; country?: string }) => {
    if (typeof location === 'string') {
        return { type: 'onsite', city: location, country: '' };
    }
    return location;
};

export function JobTable({
    jobs,
    onStatusChange,
    onGenerateResume,
    onGenerateCoverLetter,
    onToggleFavorite,
    onToggleHidden,
    onFetchDescription,
    onSaveDescription,
    onDeleteJob,
    fetchingDescriptionId,
    savingDescriptionId,
    deletingJobId,
    isLoading,
}: JobTableProps) {
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [expandedDescription, setExpandedDescription] = useState<string | null>(null);
    const [pasteMode, setPasteMode] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<string | null>(null);
    const [pastedDescription, setPastedDescription] = useState<string>('');
    const isFetching = (id: string) => fetchingDescriptionId === id;
    const isSaving = (id: string) => savingDescriptionId === id;
    const isDeleting = (id: string) => deletingJobId === id;

    const handleSavePasted = async (id: string) => {
        if (!onSaveDescription || !pastedDescription.trim()) return;
        await onSaveDescription(id, pastedDescription);
        setPasteMode(null);
        setEditMode(null);
        setPastedDescription('');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    if (jobs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <FileText className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">No jobs found</p>
                <p className="text-sm">Fetch jobs or adjust your filters</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Job
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Location
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Match Score
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Generate
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Status
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Posted
                        </th>
                        <th className="py-3 px-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {jobs.map((item) => {
                        // Handle both nested (userJob.job) and flat formats
                        const job = item.job || item;
                        const jobId = item.job?.id || item.id;
                        const location = getLocationDisplay(job.location);
                        const isExpanded = expandedRow === item.id;
                        const isDescExpanded = expandedDescription === item.id;
                        const status = item.applicationStatus || 'not_applied';
                        const jobDescription = item.description || item.job?.description || '';

                        return (
                            <>
                                <tr
                                    key={item.id}
                                    className={cn(
                                        'hover:bg-slate-50 transition-colors',
                                        item.hidden && 'opacity-50'
                                    )}
                                >
                                    {/* Job Title & Company */}
                                    <td className="py-4 px-4">
                                        <div className="flex items-start gap-3">
                                            <button
                                                onClick={() => onToggleFavorite(item.id, !item.favorite)}
                                                className={cn(
                                                    'mt-1 transition-colors',
                                                    item.favorite ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-500'
                                                )}
                                            >
                                                <Star className={cn('h-4 w-4', item.favorite && 'fill-current')} />
                                            </button>
                                            <div>
                                                <a
                                                    href={job.sourceUrl || job.url || '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-medium text-slate-900 hover:text-blue-600 flex items-center gap-1"
                                                >
                                                    {job.title}
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                                <p className="text-sm text-slate-500">{job.company}</p>
                                                <Badge variant="outline" className="mt-1 text-xs">
                                                    {job.source}
                                                </Badge>
                                                <button
                                                    onClick={() => setExpandedDescription(isDescExpanded ? null : item.id)}
                                                    className="ml-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                >
                                                    <FileSearch className="h-3 w-3" />
                                                    {isDescExpanded ? 'Hide' : 'View'} Description
                                                    {isDescExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                </button>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Location */}
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant={location.type === 'remote' ? 'success' : 'secondary'}
                                            >
                                                {location.type === 'remote' ? 'Remote' :
                                                    location.type === 'hybrid' ? 'Hybrid' : 'Onsite'}
                                            </Badge>
                                            {location.city && (
                                                <span className="text-sm text-slate-500">
                                                    {location.city}{location.country && location.country !== location.city ? `, ${location.country}` : ''}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Match Score */}
                                    <td className="py-4 px-4 min-w-[150px]">
                                        {item.isScoring ? (
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Scoring...
                                            </div>
                                        ) : item.matchScore !== undefined ? (
                                            <div>
                                                <Progress value={item.matchScore} showLabel />
                                                <button
                                                    onClick={() => setExpandedRow(isExpanded ? null : item.id)}
                                                    className="text-xs text-blue-600 hover:underline mt-1"
                                                >
                                                    View Analysis
                                                </button>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onGenerateResume(item.id, jobId)}
                                            >
                                                <Sparkles className="h-3 w-3 mr-1" />
                                                Score
                                            </Button>
                                        )}
                                    </td>

                                    {/* Generate Documents */}
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => onGenerateResume(item.id, jobId)}
                                                disabled={item.isGenerating}
                                            >
                                                {item.isGenerating ? (
                                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                ) : (
                                                    <FileText className="h-4 w-4 mr-1" />
                                                )}
                                                Resume
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onGenerateCoverLetter(item.id, jobId)}
                                                disabled={item.isGenerating}
                                            >
                                                {item.isGenerating ? (
                                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                ) : (
                                                    <Mail className="h-4 w-4 mr-1" />
                                                )}
                                                Cover Letter
                                            </Button>
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="py-4 px-4">
                                        <select
                                            value={status}
                                            onChange={(e) => onStatusChange(item.id, e.target.value as ApplicationStatus)}
                                            className={cn(
                                                'px-3 py-1 text-sm rounded-full border-0 font-medium cursor-pointer',
                                                statusColors[status] === 'success' && 'bg-green-100 text-green-800',
                                                statusColors[status] === 'warning' && 'bg-yellow-100 text-yellow-800',
                                                statusColors[status] === 'destructive' && 'bg-red-100 text-red-800',
                                                statusColors[status] === 'default' && 'bg-slate-900 text-white',
                                                statusColors[status] === 'secondary' && 'bg-slate-100 text-slate-800',
                                            )}
                                        >
                                            {Object.entries(statusLabels).map(([value, label]) => (
                                                <option key={value} value={value}>{label}</option>
                                            ))}
                                        </select>
                                    </td>

                                    {/* Posted Date */}
                                    <td className="py-4 px-4 text-sm text-slate-500">
                                        {format(new Date(job.postedAt), 'MMM d, yyyy')}
                                    </td>

                                    {/* More Actions */}
                                    <td className="py-4 px-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <a
                                                href={job.sourceUrl || job.url || '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Button variant="outline" size="sm">
                                                    <ExternalLink className="h-4 w-4 mr-1" />
                                                    Apply
                                                </Button>
                                            </a>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onToggleHidden(item.id, !item.hidden)}
                                                title={item.hidden ? 'Show' : 'Hide'}
                                            >
                                                {item.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                            </Button>
                                            {onDeleteJob && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        if (confirm('Delete this job? This cannot be undone.')) {
                                                            onDeleteJob(item.id);
                                                        }
                                                    }}
                                                    disabled={isDeleting(item.id)}
                                                    title="Delete job"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    {isDeleting(item.id) ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>

                                {/* Expanded Row - Match Analysis */}
                                {isExpanded && item.matchScore !== undefined && (
                                    <tr key={`${item.id}-expanded`}>
                                        <td colSpan={7} className="bg-gradient-to-r from-slate-50 to-white px-8 py-6">
                                            <div className="grid grid-cols-3 gap-6">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className={cn(
                                                            'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold',
                                                            item.matchScore >= 70 ? 'bg-green-100 text-green-700' :
                                                                item.matchScore >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-red-100 text-red-700'
                                                        )}>
                                                            {item.matchScore}%
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-slate-900">Match Score</h4>
                                                            <p className="text-sm text-slate-500">
                                                                {item.matchScore >= 70 ? 'Excellent match' :
                                                                    item.matchScore >= 50 ? 'Good match' : 'Fair match'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-slate-600">{item.matchReasoning}</p>
                                                </div>

                                                <div>
                                                    <h5 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1">
                                                        ✓ Your Strengths
                                                    </h5>
                                                    <ul className="text-sm text-slate-600 space-y-1">
                                                        {(item.strengths || []).map((s, i) => (
                                                            <li key={i} className="flex items-start gap-2">
                                                                <span className="text-green-500 mt-0.5">•</span>
                                                                {s}
                                                            </li>
                                                        ))}
                                                        {(!item.strengths || item.strengths.length === 0) && (
                                                            <li className="text-slate-400">No specific strengths identified</li>
                                                        )}
                                                    </ul>
                                                </div>

                                                <div>
                                                    <h5 className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-1">
                                                        ⚡ Areas to Improve
                                                    </h5>
                                                    <ul className="text-sm text-slate-600 space-y-1">
                                                        {(item.gaps || []).map((g, i) => (
                                                            <li key={i} className="flex items-start gap-2">
                                                                <span className="text-orange-500 mt-0.5">•</span>
                                                                {g}
                                                            </li>
                                                        ))}
                                                        {(!item.gaps || item.gaps.length === 0) && (
                                                            <li className="text-slate-400">No gaps identified</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {/* Expanded Row - Job Description */}
                                {isDescExpanded && (
                                    <tr key={`${item.id}-description`}>
                                        <td colSpan={7} className="bg-blue-50/50 px-8 py-6 border-l-4 border-blue-400">
                                            <div className="max-w-4xl">
                                                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                                    <FileSearch className="h-5 w-5 text-blue-600" />
                                                    Job Description
                                                </h4>
                                                {jobDescription && editMode !== item.id ? (
                                                    <div className="prose prose-sm max-w-none text-slate-600">
                                                        <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-96 overflow-y-auto pr-4 mb-3">
                                                            {jobDescription}
                                                        </div>
                                                        {onSaveDescription && (
                                                            <button
                                                                onClick={() => {
                                                                    setPastedDescription(jobDescription);
                                                                    setEditMode(item.id);
                                                                }}
                                                                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                                Edit Description
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (editMode === item.id || pasteMode === item.id) ? (
                                                    /* Paste Mode */
                                                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                                                        <p className="text-slate-700 text-sm font-medium mb-2">
                                                            Paste the job description below:
                                                        </p>
                                                        <textarea
                                                            value={pastedDescription}
                                                            onChange={(e) => setPastedDescription(e.target.value)}
                                                            placeholder="Paste the full job description here..."
                                                            rows={10}
                                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y mb-3"
                                                        />
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => handleSavePasted(item.id)}
                                                                disabled={!pastedDescription.trim() || isSaving(item.id)}
                                                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                                                            >
                                                                {isSaving(item.id) ? (
                                                                    <>
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                        Saving...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Save className="h-4 w-4" />
                                                                        Save Description
                                                                    </>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setPasteMode(null);
                                                                    setPastedDescription('');
                                                                }}
                                                                className="text-sm text-slate-500 hover:text-slate-700"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                                                        <p className="text-slate-500 text-sm mb-3">
                                                            Job description is not available in the current data.
                                                        </p>
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            {onFetchDescription && (
                                                                <button
                                                                    onClick={() => onFetchDescription(item.id)}
                                                                    disabled={isFetching(item.id)}
                                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                                                                >
                                                                    {isFetching(item.id) ? (
                                                                        <>
                                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                                            Fetching...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Sparkles className="h-4 w-4" />
                                                                            Fetch Description
                                                                        </>
                                                                    )}
                                                                </button>
                                                            )}
                                                            {onSaveDescription && (
                                                                <button
                                                                    onClick={() => setPasteMode(item.id)}
                                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium transition-colors"
                                                                >
                                                                    <ClipboardPaste className="h-4 w-4" />
                                                                    Paste Description
                                                                </button>
                                                            )}
                                                            <a
                                                                href={job.sourceUrl || '#'}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                                                            >
                                                                <ExternalLink className="h-4 w-4" />
                                                                View on {job.source}
                                                            </a>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
