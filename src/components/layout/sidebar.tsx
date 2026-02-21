'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Briefcase,
    User,
    Settings,
    RefreshCw,
    LayoutDashboard,
    Sparkles
} from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Jobs', href: '/jobs', icon: Briefcase },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white">
            <div className="flex h-16 items-center gap-2 px-6 border-b border-slate-800">
                <Sparkles className="h-8 w-8 text-blue-400" />
                <span className="text-xl font-bold">JobAI</span>
            </div>

            <nav className="mt-6 px-3">
                <ul className="space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== '/' && pathname.startsWith(item.href));

                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-slate-800 text-white'
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.name}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                    <RefreshCw className="h-4 w-4" />
                    <span>Auto-sync: Daily 6AM UTC</span>
                </div>
            </div>
        </aside>
    );
}
