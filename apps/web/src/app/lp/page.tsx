'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

    return (
        <div className="min-h-screen bg-background">
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
                        Find Assets to Fund
                    </Link>
                </div>

                {/* LP Stats */}
                <div className="grid md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-card border border-border rounded-xl p-6">
                        <p className="text-sm text-muted-foreground">Total Contributed</p>
                        <p className="text-3xl font-bold text-foreground mt-1">
                            ${summary.totalContributed.toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-6">
                        <p className="text-sm text-muted-foreground">Current Value</p>
                        <p className="text-3xl font-bold text-foreground mt-1">
                            ${summary.totalValue.toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-6">
                        <p className="text-sm text-muted-foreground">Total Earnings</p>
                        <p className="text-3xl font-bold text-green-500 mt-1">
                            +${summary.totalEarnings.toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-6">
                        <p className="text-sm text-muted-foreground">Active Pools</p>
                        <p className="text-3xl font-bold text-foreground mt-1">
                            {summary.poolCount}
                        </p>
                    </div>
                </div>

                {/* How LP Works */}
                <div className="bg-card border border-border rounded-xl p-6 mb-8">
                    <h2 className="font-semibold text-foreground mb-4">How LP Works</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div>
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                                <span className="text-primary font-bold">1</span>
                            </div>
                            <h3 className="font-medium text-foreground mb-1">Provide Liquidity</h3>
                            <p className="text-sm text-muted-foreground">
                                Deposit USDC to fund new or existing asset pools during the funding phase.
                            </p>
                        </div>
                        <div>
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                                <span className="text-primary font-bold">2</span>
                            </div>
                            <h3 className="font-medium text-foreground mb-1">Earn Fees</h3>
                            <p className="text-sm text-muted-foreground">
                                Receive 90% of trading fees proportional to your pool share.
                            </p>
                        </div>
                        <div>
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                                <span className="text-primary font-bold">3</span>
                            </div>
                            <h3 className="font-medium text-foreground mb-1">Withdraw</h3>
                            <p className="text-sm text-muted-foreground">
                                After 30-day vesting, withdraw up to 10% daily. FIFO queue for large exits.
                            </p>
                        </div>
                    </div>
                </div>

                {/* LP Positions */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-border">
                        <h2 className="font-semibold text-foreground">Your LP Positions</h2>
                    </div>

                    {positions.length > 0 ? (
                        <div className="divide-y divide-border">
                            {positions.map((position) => (
                                <div key={position.id} className="p-6 hover:bg-secondary/30 transition-colors">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <Link
                                                href={`/assets/${position.assetId}`}
                                                className="font-semibold text-foreground hover:text-primary transition-colors"
                                            >
                                                {position.assetName}
                                            </Link>
                                            <p className="text-sm text-muted-foreground">
                                                {position.lpTokens.toFixed(2)} LP Tokens
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-foreground">
                                                ${position.currentValue.toLocaleString()}
                                            </p>
                                            <p className="text-sm text-green-500">
                                                +${position.earnings.toLocaleString()} earned
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Contributed</p>
                                            <p className="text-foreground font-medium">
                                                ${position.contributed.toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">APY</p>
                                            <p className="text-green-500 font-medium">
                                                {position.apy}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Vesting Ends</p>
                                            <p className="text-foreground font-medium">
                                                {position.vestingEnd}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <button className="text-sm text-primary hover:underline">
                                                Withdraw
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
    );
}
