'use client';

import { ReactNode } from 'react';

interface MobileMetricCardProps {
    label: string;
    value: string | number;
    trend?: number; // percentage
    icon?: ReactNode;
    className?: string;
}

export function MobileMetricCard({ label, value, trend, icon, className = '' }: MobileMetricCardProps) {
    return (
        <div className={`flex flex-col p-4 bg-card/40 backdrop-blur-sm border border-border/40 rounded-xl ${className}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
                {icon && <div className="text-primary/80">{icon}</div>}
            </div>
            <div className="flex items-end justify-between gap-2">
                <span className="text-lg font-bold text-foreground font-mono">{value}</span>
                {trend !== undefined && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${trend >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {trend >= 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </div>
        </div>
    );
}
