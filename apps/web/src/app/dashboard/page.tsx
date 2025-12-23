'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DepositCard, PortfolioStatsGrid, EquityCurveChart } from '@/components/dashboard';
import { motion } from 'framer-motion';

interface UserData {
    id: string;
    email: string;
    walletHotBalance: string;
    walletColdBalance: string;
    depositAddress: string;
    isAdmin: boolean;
    createdAt: string;
}

interface Position {
    assetId: string;
    assetName: string;
    shares: number;
    avgPrice: number;
    currentPrice: number;
    value: number;
    returnPercent: number;
    returnAbs: number;
}

interface PortfolioStats {
    totalValue: number;
    cashBalance: number;
    totalInvested: number;
    totalReturnAbs: number;
    totalReturnPercent: number;
    realizedPnL: number;
    winRate: number;
    positions: Position[];
}

interface EquityPoint {
    time: number;
    value: number;
    profit: number;
    cash: number;
}

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [portfolioStats, setPortfolioStats] = useState<PortfolioStats | null>(null);
    const [history, setHistory] = useState<EquityPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }

        if (status === 'authenticated') {
            fetchAllData();
        }
    }, [status, router]);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [userRes, portfolioRes, historyRes] = await Promise.all([
                fetch('/api/user/me'),
                fetch('/api/portfolio'),
                fetch('/api/portfolio/history')
            ]);

            if (!userRes.ok) throw new Error('Failed to fetch user data');

            const userData = await userRes.json();

            // If user doesn't have a deposit address, generate one
            if (!userData.depositAddress) {
                try {
                    const depositRes = await fetch('/api/wallet/deposit');
                    if (depositRes.ok) {
                        const depositData = await depositRes.json();
                        userData.depositAddress = depositData.address;
                    }
                } catch (depositErr) {
                    console.error('Failed to generate deposit address:', depositErr);
                }
            }

            setUserData(userData);

            if (portfolioRes.ok) {
                const pData = await portfolioRes.json();
                setPortfolioStats(pData);
            }

            if (historyRes.ok) {
                const hData = await historyRes.json();
                setHistory(hData.history);
            }

        } catch (err) {
            setError('Failed to load dashboard data');
            console.error(err);
        } finally {
            setLoading(false);
            setHistoryLoading(false);
        }
    };

    if (status === 'loading' || (loading && !userData)) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <div className="text-muted-foreground font-medium animate-pulse">Syncing Megatron Node...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="glass-card p-8 rounded-2xl text-center max-w-md">
                    <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Sync Error</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-12">
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Welcome Header */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-10"
                >
                    <h1 className="text-4xl font-bold text-foreground tracking-tight">
                        Welcome back, <span className="text-primary">{userData?.email.split('@')[0]}</span>
                    </h1>
                    <p className="text-muted-foreground mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        System Online | Terminal connected via {userData?.email}
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Stats & Chart */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Highlights Grid */}
                        <PortfolioStatsGrid stats={portfolioStats} loading={loading} />

                        {/* Main Performance Chart */}
                        <EquityCurveChart data={history} loading={historyLoading} />
                    </div>

                    {/* Right Column: Actions & Deposit */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Quick Actions Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="glass-card rounded-2xl p-6 border-white/5"
                        >
                            <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                                <div className="p-1.5 bg-primary/10 rounded-md">
                                    <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 11V16M12 11V6M12 11H7M12 11H17" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                Terminal Actions
                            </h2>
                            <div className="grid grid-cols-1 gap-3">
                                <Link
                                    href="/assets"
                                    className="flex items-center justify-between p-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 group"
                                >
                                    <span>Marketplace</span>
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </Link>
                                <Link
                                    href="/lp"
                                    className="flex items-center justify-between p-4 bg-white/5 text-foreground font-medium rounded-xl border border-white/10 hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-95 group"
                                >
                                    <span>Liquidity Pools</span>
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </Link>
                                <Link
                                    href="/wallet"
                                    className="flex items-center justify-between p-4 bg-white/5 text-foreground font-medium rounded-xl border border-white/10 hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-95 group"
                                >
                                    <span>Treasury Sync</span>
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </Link>
                            </div>
                        </motion.div>

                        {/* Expandable Deposit Card */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                            <DepositCard depositAddress={userData?.depositAddress} />
                        </motion.div>
                    </div>
                </div>

                {/* Portfolio Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-12"
                >
                    <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl md:text-2xl font-bold text-foreground">
                                Active Positions
                            </h2>
                            <span className="text-[10px] md:text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded-full border border-primary/20">
                                {portfolioStats?.positions.length || 0} TOTAL
                            </span>
                        </div>
                        <Link
                            href="/portfolio"
                            className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1 group w-fit"
                        >
                            <span>Terminal View</span>
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                    </div>

                    {portfolioStats && portfolioStats.positions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {portfolioStats.positions.map((pos: Position, i: number) => (
                                <motion.div
                                    key={pos.assetId}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 + i * 0.05 }}
                                    className="glass-card p-6 rounded-2xl hover:border-primary/30 transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{pos.assetName}</h3>
                                            <p className="text-sm text-muted-foreground">{pos.shares.toFixed(4)} shares</p>
                                        </div>
                                        <div className={`px-2 py-1 rounded-lg text-xs font-bold ${pos.returnAbs >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            {pos.returnPercent >= 0 ? '+' : ''}{pos.returnPercent.toFixed(2)}%
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Market Value</p>
                                            <p className="text-xl font-bold font-mono">${pos.value.toFixed(2)}</p>
                                        </div>
                                        <Link
                                            href={`/assets/${pos.assetId}`}
                                            className="p-2 bg-white/5 rounded-lg hover:bg-primary hover:text-primary-foreground transition-all"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </Link>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-16 text-center backdrop-blur-sm">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <ActivityIcon className="w-10 h-10 text-primary opacity-50" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-2">Portfolio Empty</h3>
                            <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
                                No active positions found in your terminal. Deploy capital to start tracking performance.
                            </p>
                            <Link
                                href="/assets"
                                className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 hover:scale-105"
                            >
                                Open Markets
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Link>
                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    );
}

function ActivityIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
        </svg>
    );
}
