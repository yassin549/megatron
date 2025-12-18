'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface UserStats {
    portfolioValue: string;
    walletHotBalance: string;
    isLoading: boolean;
}

interface UserStatsProps {
    isMobile?: boolean; // New prop for mobile rendering
}

export function UserStats({ isMobile = false }: UserStatsProps) {
    const { status } = useSession();
    const [stats, setStats] = useState<UserStats>({
        portfolioValue: '0.00',
        walletHotBalance: '0.00',
        isLoading: true
    });

    useEffect(() => {
        if (status === 'authenticated') {
            const fetchStats = async () => {
                try {
                    const res = await fetch('/api/user/me');
                    if (res.ok) {
                        const data = await res.json();
                        setStats({
                            portfolioValue: data.portfolioValue || '0.00',
                            walletHotBalance: data.walletHotBalance || '0.00',
                            isLoading: false
                        });
                    }
                } catch (error) {
                    console.error('Failed to fetch stats:', error);
                    setStats(prev => ({ ...prev, isLoading: false }));
                }
            };
            fetchStats();
            // Poll every 10 seconds
            const interval = setInterval(fetchStats, 10000);
            return () => clearInterval(interval);
        }
    }, [status]);

    if (status !== 'authenticated') return null;

    if (stats.isLoading) {
        return (
            <div className="flex items-center gap-6 animate-pulse">
                <div className="h-4 w-24 bg-secondary/50 rounded" />
                {!isMobile && <div className="h-4 w-20 bg-secondary/50 rounded" />}
            </div>
        );
    }

    if (isMobile) {
        return (
            <div className="flex items-center gap-2 bg-secondary/30 px-3 py-1.5 rounded-lg border border-white/5">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Cash
                </span>
                <span className="text-sm font-bold text-green-500">
                    ${parseFloat(stats.walletHotBalance).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-6 mr-4">
            <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Portfolio
                </span>
                <span className="text-sm font-bold text-green-500">
                    ${parseFloat(stats.portfolioValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Cash
                </span>
                <span className="text-sm font-bold text-green-500">
                    ${parseFloat(stats.walletHotBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
            <Link
                href="/wallet"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors ml-2"
            >
                Deposit
            </Link>
        </div>
    );
}
