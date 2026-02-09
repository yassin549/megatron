'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import { MobileListRow } from '@/components/mobile/MobileListRow';
import { Layers, TrendingUp, Zap, BarChart3 } from 'lucide-react';

interface LPPosition {
    id: string;
    assetId: string;
    assetName: string;
    contributed: number;
    currentValue: number;
    lpTokens: number;
    earnings: number;
    apy: number;
    vestingEnd: string;
    unclaimedRewards: number;
}

interface LPSummary {
    totalContributed: number;
    totalValue: number;
    totalEarnings: number;
    poolCount: number;
}

export default function LPDashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [positions, setPositions] = useState<LPPosition[]>([]);
    const [summary, setSummary] = useState<LPSummary>({
        totalContributed: 0,
        totalValue: 0,
        totalEarnings: 0,
        poolCount: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        async function fetchLPPositions() {
            if (status !== 'authenticated') return;

            try {
                const res = await fetch('/api/lp/positions');
                if (res.ok) {
                    const data = await res.json();
                    setPositions(data.positions);
                    setSummary(data.summary);
                }
            } catch (error) {
                console.error('Failed to fetch LP positions:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchLPPositions();
    }, [status]);

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground">Loading...</div>
            </div>
        );
    }

    const SummaryCard = ({ label, value, subValue, icon: Icon, color }: any) => (
        <div className="bg-card/30 border border-white/5 p-4 rounded-2xl relative overflow-hidden">
            <div className={`absolute top-0 right-0 p-3 opacity-10 ${color}`}>
                <Icon size={48} />
            </div>
            <div className="relative z-10">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">{label}</p>
                <p className="text-xl font-bold text-foreground font-mono">{value}</p>
                {subValue && <p className={`text-xs mt-1 ${color}`}>{subValue}</p>}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-transparent">
            {/* =========================================
                DESKTOP VIEW (Hidden on Mobile)
               ========================================= */}
            <div className="hidden md:block">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">
                                Liquidity Provider
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Earn fees by providing liquidity to asset pools
                            </p>
                        </div>
                        <Link
                            href="/assets"
                            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            Participate in Pools
                        </Link>
                    </div>

                    {/* LP Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6 md:mb-8">
                        <div className="bg-card border border-border rounded-xl p-3 md:p-6">
                            <p className="text-[10px] md:text-sm text-muted-foreground uppercase tracking-wider">Contributed</p>
                            <p className="text-lg md:text-3xl font-bold text-foreground mt-0.5 md:mt-1 font-mono">
                                ${summary.totalContributed.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-3 md:p-6">
                            <p className="text-[10px] md:text-sm text-muted-foreground uppercase tracking-wider">Value</p>
                            <p className="text-lg md:text-3xl font-bold text-foreground mt-0.5 md:mt-1 font-mono">
                                ${summary.totalValue.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-3 md:p-6">
                            <p className="text-[10px] md:text-sm text-muted-foreground uppercase tracking-wider">Earnings</p>
                            <p className="text-lg md:text-3xl font-bold text-green-500 mt-0.5 md:mt-1 font-mono">
                                +${summary.totalEarnings.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-3 md:p-6">
                            <p className="text-[10px] md:text-sm text-muted-foreground uppercase tracking-wider">Pools</p>
                            <p className="text-lg md:text-3xl font-bold text-foreground mt-0.5 md:mt-1 font-mono">
                                {summary.poolCount}
                            </p>
                        </div>
                    </div>

                    {/* How LP Works */}
                    <div className="bg-card border border-border rounded-xl p-4 md:p-6 mb-6 md:mb-8">
                        <h2 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base">How LP Works</h2>
                        <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-6">
                            <div>
                                <div className="w-7 h-7 md:w-10 md:h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2 md:mb-3">
                                    <span className="text-primary font-bold text-xs md:text-base">1</span>
                                </div>
                                <h3 className="font-medium text-foreground mb-0.5 md:mb-1 text-xs md:text-base">Provide</h3>
                                <p className="text-[10px] md:text-sm text-muted-foreground hidden md:block">
                                    Deposit USDC to fund new or existing asset pools during the funding phase.
                                </p>
                            </div>
                            <div>
                                <div className="w-7 h-7 md:w-10 md:h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2 md:mb-3">
                                    <span className="text-primary font-bold text-xs md:text-base">2</span>
                                </div>
                                <h3 className="font-medium text-foreground mb-0.5 md:mb-1 text-xs md:text-base">Earn</h3>
                                <p className="text-[10px] md:text-sm text-muted-foreground hidden md:block">
                                    Receive 90% of trading fees proportional to your pool share.
                                </p>
                            </div>
                            <div>
                                <div className="w-7 h-7 md:w-10 md:h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2 md:mb-3">
                                    <span className="text-primary font-bold text-xs md:text-base">3</span>
                                </div>
                                <h3 className="font-medium text-foreground mb-0.5 md:mb-1 text-xs md:text-base">Sell</h3>
                                <p className="text-[10px] md:text-sm text-muted-foreground hidden md:block">
                                    After 30-day vesting, sell up to 10% daily. FIFO queue for large exits.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* LP Positions */}
                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/5">
                            <h2 className="font-semibold text-foreground">Your LP Positions</h2>
                        </div>

                        {positions.length > 0 ? (
                            <div className="divide-y divide-white/5">
                                {positions.map((position) => (
                                    <div key={position.id} className="p-4 md:p-6 hover:bg-white/5 transition-colors">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            {/* Asset Info */}
                                            <div className="flex-shrink-0">
                                                <Link
                                                    href={`/assets/${position.assetId}`}
                                                    className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
                                                >
                                                    {position.assetName}
                                                </Link>
                                                <p className="text-sm text-muted-foreground">
                                                    {position.lpTokens.toFixed(2)} LP Tokens
                                                </p>
                                            </div>

                                            {/* Stats Grid */}
                                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2 md:mt-0">
                                                <div>
                                                    <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Contributed</p>
                                                    <p className="text-foreground font-medium">
                                                        ${position.contributed.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Current Value</p>
                                                    <p className="font-semibold text-foreground">
                                                        ${position.currentValue.toLocaleString()}
                                                    </p>
                                                    <p className="text-xs text-green-500">
                                                        +${position.earnings.toLocaleString()} earned
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">APY</p>
                                                    <p className="text-green-500 font-bold">
                                                        {position.apy}%
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Vesting Ends</p>
                                                    <p className="text-foreground font-medium">
                                                        {position.vestingEnd}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="mt-4 md:mt-0 md:text-right">
                                                <button className="w-full md:w-auto px-4 py-2 text-sm bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-rose-400 transition-colors font-medium">
                                                    Sell My Shares
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <p className="text-muted-foreground mb-4">
                                    You haven't provided liquidity yet.
                                </p>
                                <Link
                                    href="/assets"
                                    className="inline-block px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    Browse Assets
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* =========================================
                MOBILE VIEW (Visible on Mobile)
               ========================================= */}
            <div className="md:hidden pb-24">
                <MobilePageHeader
                    title="Liquidity Pools"
                    description="Provide Liquidity & Earn Yield"
                />

                <div className="px-4 py-6 space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <SummaryCard
                            label="Total Value"
                            value={`$${summary.totalValue.toLocaleString()}`}
                            icon={Layers}
                            color="text-blue-400"
                        />
                        <SummaryCard
                            label="Earnings"
                            value={`+$${summary.totalEarnings.toLocaleString()}`}
                            icon={TrendingUp}
                            color="text-emerald-400"
                        />
                        <SummaryCard
                            label="Contributed"
                            value={`$${summary.totalContributed.toLocaleString()}`}
                            icon={Zap}
                            color="text-amber-400"
                        />
                        <SummaryCard
                            label="Active Pools"
                            value={summary.poolCount}
                            icon={BarChart3}
                            color="text-purple-400"
                        />
                    </div>

                    {/* How It Works - Compact List */}
                    <div className="bg-card/30 border border-white/5 rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-foreground mb-4">How it works</h3>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 font-bold flex items-center justify-center text-xs flex-shrink-0">1</div>
                                <div>
                                    <h4 className="text-xs font-bold text-foreground">Provide Liquidity</h4>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Fund pools to enable trading.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center text-xs flex-shrink-0">2</div>
                                <div>
                                    <h4 className="text-xs font-bold text-foreground">Earn Fees</h4>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Get 90% of trading fees.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-400 font-bold flex items-center justify-center text-xs flex-shrink-0">3</div>
                                <div>
                                    <h4 className="text-xs font-bold text-foreground">Vest & Sell</h4>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">30-day vesting, then exit.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Positions List */}
                    <div>
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h3 className="font-bold text-foreground">Your Pools</h3>
                            <Link href="/assets" className="text-xs text-primary hover:text-primary/80">Browse All</Link>
                        </div>

                        {positions.length > 0 ? (
                            <div className="space-y-3">
                                {positions.map((pos) => (
                                    <MobileListRow
                                        key={pos.id}
                                        label={pos.assetName}
                                        subLabel={`${pos.apy}% APY`}
                                        value={`$${pos.currentValue.toLocaleString()}`}
                                        subValue={<span className="text-emerald-500">+${pos.earnings.toLocaleString()}</span>}
                                        icon={<div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold">{pos.assetName.substring(0, 2)}</div>}
                                        onClick={() => router.push(`/assets/${pos.assetId}`)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center bg-card/30 rounded-2xl border border-white/5 border-dashed">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                                    <Layers size={20} />
                                </div>
                                <p className="text-xs text-muted-foreground mb-4">No active liquidity positions.</p>
                                <Link href="/assets" className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg block w-full">Start Earning</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
