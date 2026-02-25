'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Header } from '@/components/layout/header';
import {
  Briefcase,
  TrendingUp,
  FileCheck,
  RefreshCw,
  Clock,
  Star,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalJobs: number;
  newToday: number;
  avgScore: number;
  applied: number;
  interviewing: number;
  offers: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    newToday: 0,
    avgScore: 0,
    applied: 0,
    interviewing: 0,
    offers: 0,
  });
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetch, setLastFetch] = useState<string | null>(null);

  useEffect(() => {
    // Load stats on mount
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/jobs/user?limit=1000');
      const data = await response.json();

      if (data.success) {
        const jobs = data.data || [];
        const scores = jobs.map((j: { matchScore: number }) => j.matchScore).filter((s: number) => s > 0);

        setStats({
          totalJobs: data.pagination?.total || jobs.length,
          newToday: jobs.filter((j: { createdAt: string }) =>
            new Date(j.createdAt).toDateString() === new Date().toDateString()
          ).length,
          avgScore: scores.length > 0
            ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
            : 0,
          applied: jobs.filter((j: { applicationStatus: string }) => j.applicationStatus === 'applied').length,
          interviewing: jobs.filter((j: { applicationStatus: string }) => j.applicationStatus === 'interviewing').length,
          offers: jobs.filter((j: { applicationStatus: string }) => j.applicationStatus === 'offer').length,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleFetchJobs = async () => {
    setIsFetching(true);
    try {
      const response = await fetch('/api/jobs/fetch', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        setLastFetch(new Date().toLocaleTimeString());
        await loadStats();
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Dashboard"
        subtitle="Your job search at a glance"
        actions={
          <Button onClick={handleFetchJobs} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Fetching...' : 'Fetch Jobs'}
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Last Fetch Notice */}
        {lastFetch && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="h-4 w-4" />
            Last fetched at {lastFetch}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Total Jobs
              </CardTitle>
              <Briefcase className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalJobs}</div>
              {stats.newToday > 0 && (
                <p className="text-xs text-green-600">+{stats.newToday} today</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Avg Match Score
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgScore}%</div>
              <Progress value={stats.avgScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Applied
              </CardTitle>
              <FileCheck className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.applied}</div>
              <p className="text-xs text-slate-500">
                {stats.interviewing} interviewing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Offers
              </CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.offers}</div>
              <p className="text-xs text-slate-500">Congratulations!</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/jobs">
                <Button variant="outline" className="w-full justify-between">
                  View All Jobs
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="outline" className="w-full justify-between">
                  Update Profile
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={async () => {
                  const response = await fetch('/api/ai/batch-score', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scoreAll: true }),
                  });
                  const data = await response.json();
                  if (data.success) {
                    await loadStats();
                  }
                }}
              >
                Score All New Jobs
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">1</Badge>
                  <span>Create your profile with skills, experience, and preferences</span>
                </li>
                <li className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">2</Badge>
                  <span>Click &quot;Fetch Jobs&quot; to discover opportunities</span>
                </li>
                <li className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">3</Badge>
                  <span>AI will score each job based on your profile</span>
                </li>
                <li className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">4</Badge>
                  <span>Generate tailored resumes & cover letters</span>
                </li>
                <li className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">5</Badge>
                  <span>Track your applications in one place</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
