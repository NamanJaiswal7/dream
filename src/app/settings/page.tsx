'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Clock, Info } from 'lucide-react';

export default function SettingsPage() {
    const [cronSchedule, setCronSchedule] = useState('0 6 * * *');
    const [defaultTitles, setDefaultTitles] = useState('Software Engineer, Full Stack Developer, Frontend Developer');
    const [defaultLocations, setDefaultLocations] = useState('Lithuania, Remote, European Union');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        // In production, save to database or environment
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSaving(false);
        alert('Settings saved! (Note: Cron schedule changes require redeployment)');
    };

    return (
        <div className="min-h-screen">
            <Header
                title="Settings"
                subtitle="Configure your job search preferences"
                actions={
                    <Button onClick={handleSave} disabled={isSaving}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </Button>
                }
            />

            <div className="p-6 space-y-6 max-w-2xl">
                {/* Job Search Defaults */}
                <Card>
                    <CardHeader>
                        <CardTitle>Job Search Defaults</CardTitle>
                        <CardDescription>
                            Default values used when fetching jobs automatically
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Job Titles
                            </label>
                            <Input
                                value={defaultTitles}
                                onChange={(e) => setDefaultTitles(e.target.value)}
                                placeholder="Comma-separated job titles"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Comma-separated list of job titles to search for
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Locations
                            </label>
                            <Input
                                value={defaultLocations}
                                onChange={(e) => setDefaultLocations(e.target.value)}
                                placeholder="Comma-separated locations"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Priority: Lithuania first, then EU, then Remote
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Cron Schedule */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Automation Schedule
                        </CardTitle>
                        <CardDescription>
                            Configure when jobs are fetched automatically
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Cron Expression
                            </label>
                            <Input
                                value={cronSchedule}
                                onChange={(e) => setCronSchedule(e.target.value)}
                                placeholder="0 6 * * *"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Default: Daily at 6:00 AM UTC
                            </p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-slate-700 mb-2">Common Schedules</h4>
                            <div className="space-y-2 text-sm text-slate-600">
                                <div className="flex justify-between">
                                    <code className="bg-slate-200 px-2 py-0.5 rounded">0 6 * * *</code>
                                    <span>Daily at 6 AM</span>
                                </div>
                                <div className="flex justify-between">
                                    <code className="bg-slate-200 px-2 py-0.5 rounded">0 */6 * * *</code>
                                    <span>Every 6 hours</span>
                                </div>
                                <div className="flex justify-between">
                                    <code className="bg-slate-200 px-2 py-0.5 rounded">0 9 * * 1-5</code>
                                    <span>Weekdays at 9 AM</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Job Sources */}
                <Card>
                    <CardHeader>
                        <CardTitle>Job Sources</CardTitle>
                        <CardDescription>
                            Status of available job portal adapters
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {[
                                { name: 'LinkedIn', enabled: true, note: 'Europe-wide search (30+ countries)' },
                                { name: 'Career Pages', enabled: true, note: 'Company career portals (45+ companies)' },
                            ].map((source) => (
                                <div
                                    key={source.name}
                                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <Badge variant={source.enabled ? 'success' : 'secondary'}>
                                            {source.enabled ? 'Active' : 'Disabled'}
                                        </Badge>
                                        <span className="font-medium text-slate-900">{source.name}</span>
                                    </div>
                                    <span className="text-sm text-slate-500">{source.note}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* API Keys Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5" />
                            API Configuration
                        </CardTitle>
                        <CardDescription>
                            Required API keys (set in environment variables)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                <span className="font-medium">Ollama + Mistral 7B</span>
                                <Badge variant="success">
                                    Local AI (Free)
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                <span className="font-medium">Firebase Credentials</span>
                                <Badge variant="default">Required</Badge>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                <span className="font-medium">Google Sheets API</span>
                                <Badge variant="secondary">Optional (Fallback)</Badge>
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">
                                See <code className="bg-blue-100 px-1 rounded">ENV_SETUP.md</code> for
                                detailed instructions on configuring all required environment variables.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
