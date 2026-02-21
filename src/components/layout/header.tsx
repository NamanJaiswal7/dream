'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Bell, Plus } from 'lucide-react';

interface HeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
    return (
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
            <div>
                <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
                {subtitle && (
                    <p className="text-sm text-slate-500">{subtitle}</p>
                )}
            </div>

            <div className="flex items-center gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        type="search"
                        placeholder="Search jobs..."
                        className="pl-10 w-64"
                    />
                </div>

                {actions}

                <Button variant="ghost" size="icon">
                    <Bell className="h-5 w-5" />
                </Button>
            </div>
        </header>
    );
}
