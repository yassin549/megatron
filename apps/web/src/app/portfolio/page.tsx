'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { SubNavbar } from '@/components/layout/SubNavbar';
import { PieChart, DollarSign, Wallet, TrendingUp, ArrowRight, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import Link from 'next/link';

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

interface PortfolioData {
    totalValue: number;
    cashBalance: number;
    totalInvested: number;
    totalReturnAbs: number;
    totalReturnPercent: number;
    positions: Position[];
}

export default function PortfolioPage() {
    const { status } = useSession();
    const [data, setData] = useState<PortfolioData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status !== 'authenticated') {
            setLoading(false);
            return;
        }

        async function fetchPortfolio() {
            try {
                const res = await fetch('/api/portfolio'); // Ensure this API exists
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchPortfolio();
    }, [status]);

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <div className="font-mono text-sm text-muted-foreground animate-pulse">LOADING_PORTFOLIO...</div>
                </div>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <SubNavbar />
                <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)] text-center px-4">
                    <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-6 border border-border">
                        <Wallet className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h1 className="text-3xl font-bold mb-3 tracking-tight">Connect Portfolio</h1>
                    <p className="text-muted-foreground mb-8 max-w-md">Sign in to view your holdings, performance analytics, and transaction history.</p>
                    <Link href="/login" className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95">
                        Sign In Access
                    </Link>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="min-h-screen bg-background text-foreground animate-in fade-in duration-500">
            <SubNavbar />

            <main className="max-w-[1400px] mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Portfolio Overview</h1>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-secondary text-sm font-medium rounded-lg hover:bg-secondary/80 transition-colors border border-border">Export CSV</button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
                    <div className="glass-panel p-6 rounded-xl">
                        <div className="flex items-center gap-3 mb-3 text-muted-foreground">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <PieChart className="w-5 h-5 text-blue-500" />
                            </div>
                            <span className="text-sm font-medium">Total Equity</span>
                        </div>
                        <div className="text-3xl font-bold font-mono tracking-tight text-foreground">
                            ${data.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-xl">
                        <div className="flex items-center gap-3 mb-3 text-muted-foreground">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                            </div>
                            <span className="text-sm font-medium">Total Return</span>
                        </div>
                        <div className={`text-3xl font-bold font-mono tracking-tight flex items-center gap-2 ${data.totalReturnAbs >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {data.totalReturnAbs >= 0 ? '+' : ''}{data.totalReturnAbs.toFixed(2)}
                            <span className={`text-sm px-1.5 py-0.5 rounded ${data.totalReturnAbs >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                                {data.totalReturnPercent.toFixed(2)}%
                            </span>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-xl">
                        <div className="flex items-center gap-3 mb-3 text-muted-foreground">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <Wallet className="w-5 h-5 text-purple-500" />
                            </div>
                            <span className="text-sm font-medium">Cash Balance</span>
                        </div>
                        <div className="text-3xl font-bold font-mono tracking-tight text-foreground">
                            ${data.cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-xl">
                        <div className="flex items-center gap-3 mb-3 text-muted-foreground">
                            <div className="p-2 bg-amber-500/10 rounded-lg">
                                <DollarSign className="w-5 h-5 text-amber-500" />
                            </div>
                            <span className="text-sm font-medium">Buying Power</span>
                        </div>
                        <div className="text-3xl font-bold font-mono tracking-tight text-foreground">
                            ${data.cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                {/* Positions Table */}
                <div className="mb-6 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold">Active Positions</h2>
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
                    {data.positions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-secondary/50 border-b border-border text-xs text-muted-foreground uppercase font-mono tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Asset</th>
                                        <th className="px-6 py-4 text-right font-medium">Shares</th>
                                        <th className="px-6 py-4 text-right font-medium">Avg Price</th>
                                        <th className="px-6 py-4 text-right font-medium">Current</th>
                                        <th className="px-6 py-4 text-right font-medium">Value</th>
                                        <th className="px-6 py-4 text-right font-medium">Return</th>
                                        <th className="px-6 py-4 text-right font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border text-sm">
                                    {data.positions.map((pos) => (
                                        <tr key={pos.assetId} className="group hover:bg-secondary/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center border border-border text-xs font-bold text-muted-foreground">
                                                        {pos.assetName[0]}
                                                    </div>
                                                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{pos.assetName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-muted-foreground">{pos.shares.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-mono text-muted-foreground">${pos.avgPrice.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-mono text-foreground font-medium">${pos.currentPrice.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-mono text-foreground font-bold">${pos.value.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={`inline-flex items-center gap-1 font-mono font-bold ${pos.returnPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {pos.returnPercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                    {pos.returnPercent.toFixed(2)}%
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link href={`/assets/${pos.assetId}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded hover:bg-primary/20">
                                                    Trade <ArrowRight className="w-3 h-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-16 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
                                <Layers className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-1">No active positions</h3>
                            <p className="text-muted-foreground text-sm mb-6">You haven&apos;t opened any positions yet.</p>
                            <Link href="/" className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
                                Explore Markets
                            </Link>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
