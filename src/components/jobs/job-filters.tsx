'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Filter, X, ChevronDown } from 'lucide-react';
import { JobFilters } from '@/types';
import { cn } from '@/lib/utils';

interface JobFiltersProps {
    filters: JobFilters;
    onFiltersChange: (filters: JobFilters) => void;
    sources: string[];
}

export function JobFiltersComponent({ filters, onFiltersChange, sources }: JobFiltersProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const updateFilter = (key: keyof JobFilters, value: unknown) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    const clearFilters = () => {
        onFiltersChange({
            page: 1,
            limit: 20,
            sortBy: 'score',
            sortOrder: 'desc',
        });
    };

    const activeFilterCount = [
        filters.search,
        filters.location,
        filters.remote !== undefined,
        filters.source,
        filters.minScore,
        filters.status && filters.status !== 'all',
    ].filter(Boolean).length;

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
            {/* Filter Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-slate-500" />
                    <span className="font-medium text-slate-900">Filters</span>
                    {activeFilterCount > 0 && (
                        <Badge variant="secondary">{activeFilterCount} active</Badge>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                            <X className="h-4 w-4 mr-1" />
                            Clear
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
                    </Button>
                </div>
            </div>

            {/* Quick Filters - Always Visible */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
                <Input
                    type="search"
                    placeholder="Search jobs..."
                    value={filters.search || ''}
                    onChange={(e) => updateFilter('search', e.target.value || undefined)}
                    className="w-64"
                />

                <div className="flex gap-2">
                    <Button
                        variant={filters.remote === true ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateFilter('remote', filters.remote === true ? undefined : true)}
                    >
                        Remote Only
                    </Button>
                    <Button
                        variant={filters.minScore === 70 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateFilter('minScore', filters.minScore === 70 ? undefined : 70)}
                    >
                        70%+ Match
                    </Button>
                    <Button
                        variant={filters.status === 'not_applied' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateFilter('status', filters.status === 'not_applied' ? 'all' : 'not_applied')}
                    >
                        Not Applied
                    </Button>
                    <Button
                        variant={filters.status === 'applied' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateFilter('status', filters.status === 'applied' ? 'all' : 'applied')}
                    >
                        Applied
                    </Button>
                </div>
            </div>

            {/* Expanded Filters */}
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-4 gap-4">
                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Location
                        </label>
                        <Input
                            type="text"
                            placeholder="e.g., Lithuania, Remote"
                            value={filters.location || ''}
                            onChange={(e) => updateFilter('location', e.target.value || undefined)}
                        />
                    </div>

                    {/* Source */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Source
                        </label>
                        <select
                            value={filters.source || ''}
                            onChange={(e) => updateFilter('source', e.target.value || undefined)}
                            className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm"
                        >
                            <option value="">All Sources</option>
                            {sources.map((source) => (
                                <option key={source} value={source}>
                                    {source}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Min Score */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Min Score
                        </label>
                        <Input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="0"
                            value={filters.minScore || ''}
                            onChange={(e) => updateFilter('minScore', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Status
                        </label>
                        <select
                            value={filters.status || 'all'}
                            onChange={(e) => updateFilter('status', e.target.value as JobFilters['status'])}
                            className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm"
                        >
                            <option value="all">All</option>
                            <option value="not_applied">Not Applied</option>
                            <option value="applied">Applied</option>
                            <option value="interviewing">Interviewing</option>
                            <option value="rejected">Rejected</option>
                            <option value="offer">Offer</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}
