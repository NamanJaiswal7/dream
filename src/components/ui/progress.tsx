import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: number;
    max?: number;
    showLabel?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
    ({ className, value = 0, max = 100, showLabel = false, ...props }, ref) => {
        const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

        const getColor = (val: number) => {
            if (val >= 80) return 'bg-green-500';
            if (val >= 60) return 'bg-blue-500';
            if (val >= 40) return 'bg-yellow-500';
            return 'bg-red-500';
        };

        return (
            <div className={cn('flex items-center gap-2', className)}>
                <div
                    ref={ref}
                    className="relative h-4 w-full overflow-hidden rounded-full bg-slate-100"
                    {...props}
                >
                    <div
                        className={cn('h-full transition-all duration-300', getColor(percentage))}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                {showLabel && (
                    <span className="text-sm font-medium text-slate-700 min-w-[3rem] text-right">
                        {Math.round(percentage)}%
                    </span>
                )}
            </div>
        );
    }
);
Progress.displayName = 'Progress';

export { Progress };
