'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { PieChart, DollarSign, Wallet, TrendingUp, ArrowRight, ArrowUpRight, ArrowDownRight, Layers, Droplets, X, CheckCircle2 } from 'lucide-react';
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

interface PortfolioData {
    totalValue: number;
    cashBalance: number;
    totalInvested: number;
    totalReturnAbs: number;
    totalReturnPercent: number;
    positions: Position[];
}

interface LPData {
    positions: LPPosition[];
    summary: {
        totalContributed: number;
        totalValue: number;
        totalEarnings: number;
        poolCount: number;
    };
}

export default function PortfolioPage() {
    const { status } = useSession();
    const [data, setData] = useState<PortfolioData | null>(null);
    const [lpData, setLpData] = useState<LPData | null>(null);
    const [loading, setLoading] = useState(true);

    // Withdraw modal state
    const [withdrawModal, setWithdrawModal] = useState<{
        show: boolean;
        position: LPPosition | null;
        amount: string;
        loading: boolean;
        error: string;
    }>({ show: false, position: null, amount: '', loading: false, error: '' });

    const [successModal, setSuccessModal] = useState<{
        show: boolean;
        message: string;
        amount: string;
    }>({ show: false, message: '', amount: '' });

    useEffect(() => {
        if (status !== 'authenticated') {
            setLoading(false);
            return;
        }

        async function fetchPortfolio() {
            try {
                const [portfolioRes, lpRes] = await Promise.all([
                    fetch('/api/portfolio'),
                    fetch('/api/lp/positions')
                ]);

                if (portfolioRes.ok) {
                    const json = await portfolioRes.json();
                    setData(json);
                }

                if (lpRes.ok) {
                    const lpJson = await lpRes.json();
                    setLpData(lpJson);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchPortfolio();
    }, [status]);

    const handleWithdraw = async () => {
        if (!withdrawModal.position || !withdrawModal.amount) return;

        setWithdrawModal(prev => ({ ...prev, loading: true, error: '' }));

        try {
            const res = await fetch('/api/lp/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetId: withdrawModal.position.assetId,
                    amount: parseFloat(withdrawModal.amount),
                    type: 'instant' // Use instant withdrawal for simplicity
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            setWithdrawModal({ show: false, position: null, amount: '', loading: false, error: '' });
            setSuccessModal({
                show: true,
                message: `Successfully sold shares from ${withdrawModal.position.assetName} pool!`,
                amount: withdrawModal.amount
            });

            // Refresh data
            const lpRes = await fetch('/api/lp/positions');
            if (lpRes.ok) setLpData(await lpRes.json());

        } catch (err: any) {
            setWithdrawModal(prev => ({ ...prev, loading: false, error: err.message }));
        }
    };

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

    // Calculate total equity including LP
    const tradingValue = data?.totalValue || 0;
    const lpValue = lpData?.summary?.totalValue || 0;
    const totalEquity = tradingValue + lpValue;
    const cashBalance = data?.cashBalance || 0;

    return (
        <div className="min-h-screen bg-background text-foreground animate-in fade-in duration-500">

            <main className="max-w-[1400px] mx-auto px-4 py-8 pb-32 md:pb-8">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Portfolio</h1>
                </div>

                {/* Stats Grid - Compact Mobile 2x2 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-8 md:mb-10">
                    <div className="glass-panel p-3 md:p-6 rounded-xl">
                        <div className="flex items-center gap-2 md:gap-3 mb-1.5 md:mb-3 text-muted-foreground">
                            <div className="p-1.5 md:p-2 bg-blue-500/10 rounded-lg">
                                <PieChart className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                            </div>
                            <span className="text-[10px] md:text-sm font-medium uppercase tracking-wider">Equity</span>
                        </div>
                        <div className="text-lg md:text-3xl font-bold font-mono tracking-tight text-foreground">
                            ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    <div className="glass-panel p-3 md:p-6 rounded-xl">
                        <div className="flex items-center gap-2 md:gap-3 mb-1.5 md:mb-3 text-muted-foreground">
                            <div className="p-1.5 md:p-2 bg-cyan-500/10 rounded-lg">
                                <Droplets className="w-4 h-4 md:w-5 md:h-5 text-cyan-500" />
                            </div>
                            <span className="text-[10px] md:text-sm font-medium uppercase tracking-wider">LP Value</span>
                        </div>
                        <div className="text-lg md:text-3xl font-bold font-mono tracking-tight text-cyan-400">
                            ${lpValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    <div className="glass-panel p-3 md:p-6 rounded-xl">
                        <div className="flex items-center gap-2 md:gap-3 mb-1.5 md:mb-3 text-muted-foreground">
                            <div className="p-1.5 md:p-2 bg-emerald-500/10 rounded-lg">
                                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
                            </div>
                            <span className="text-[10px] md:text-sm font-medium uppercase tracking-wider">Earnings</span>
                        </div>
                        <div className={`text-lg md:text-3xl font-bold font-mono tracking-tight ${(lpData?.summary?.totalEarnings || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {(lpData?.summary?.totalEarnings || 0) >= 0 ? '+' : ''}${(lpData?.summary?.totalEarnings || 0).toFixed(2)}
                        </div>
                    </div>

                    <div className="glass-panel p-3 md:p-6 rounded-xl">
                        <div className="flex items-center gap-2 md:gap-3 mb-1.5 md:mb-3 text-muted-foreground">
                            <div className="p-1.5 md:p-2 bg-amber-500/10 rounded-lg">
                                <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
                            </div>
                            <span className="text-[10px] md:text-sm font-medium uppercase tracking-wider">Cash</span>
                        </div>
                        <div className="text-lg md:text-3xl font-bold font-mono tracking-tight text-foreground">
                            ${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                <div className="mb-8 md:mb-10">
                    <div className="mb-4 md:mb-6 flex items-center gap-2">
                        <Droplets className="w-4 h-4 md:w-5 md:h-5 text-cyan-500" />
                        <h2 className="text-lg md:text-xl font-bold">Liquidity Positions</h2>
                        <span className="ml-2 px-1.5 md:px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-[10px] md:text-xs font-medium rounded-full">
                            {lpData?.positions?.length || 0} pools
                        </span>
                    </div>

                    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
                        {lpData?.positions && lpData.positions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-secondary/50 border-b border-border text-xs text-muted-foreground uppercase font-mono tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">Pool</th>
                                            <th className="px-6 py-4 text-right font-medium">Contributed</th>
                                            <th className="px-6 py-4 text-right font-medium">Current Value</th>
                                            <th className="px-6 py-4 text-right font-medium">Earnings</th>
                                            <th className="px-6 py-4 text-right font-medium">APY</th>
                                            <th className="px-6 py-4 text-right font-medium">Vesting</th>
                                            <th className="px-6 py-4 text-right font-medium">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border text-sm">
                                        {lpData.positions.map((lp) => (
                                            <tr key={lp.id} className="group hover:bg-secondary/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                                                            <Droplets className="w-4 h-4 text-purple-400" />
                                                        </div>
                                                        <span className="font-semibold text-foreground">{lp.assetName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-muted-foreground">${lp.contributed.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right font-mono text-foreground font-bold">${lp.currentValue.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`font-mono font-bold ${lp.earnings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {lp.earnings >= 0 ? '+' : ''}${lp.earnings.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-mono rounded">
                                                        {lp.apy}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-xs text-muted-foreground">{lp.vestingEnd}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => setWithdrawModal({ show: true, position: lp, amount: '', loading: false, error: '' })}
                                                        className="inline-flex items-center gap-1 text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors bg-rose-500/10 px-3 py-1.5 rounded-lg hover:bg-rose-500/20"
                                                    >
                                                        Sell Shares
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 flex flex-col items-center justify-center text-center">
                                <div className="w-14 h-14 bg-purple-500/10 rounded-full flex items-center justify-center mb-4">
                                    <Droplets className="w-7 h-7 text-purple-400/50" />
                                </div>
                                <h3 className="text-lg font-medium text-foreground mb-1">No LP positions</h3>
                                <p className="text-muted-foreground text-sm mb-6">Participate in asset pools to earn trading fees.</p>
                                <Link href="/" className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-500 transition-colors">
                                    Explore Pools
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Trading Positions Table */}
                <div className="mb-6 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold">Trading Positions</h2>
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
                    {data?.positions && data.positions.length > 0 ? (
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
                            <h3 className="text-lg font-medium text-foreground mb-1">No trading positions</h3>
                            <p className="text-muted-foreground text-sm mb-6">You haven&apos;t opened any positions yet.</p>
                            <Link href="/" className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
                                Explore Markets
                            </Link>
                        </div>
                    )}
                </div>
            </main>

            {/* Withdraw Modal */}
            {withdrawModal.show && withdrawModal.position && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setWithdrawModal(prev => ({ ...prev, show: false }))} />

                    <div className="relative bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <button
                            onClick={() => setWithdrawModal(prev => ({ ...prev, show: false }))}
                            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-zinc-400" />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                                <Droplets className="w-5 h-5 text-rose-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Sell LP Shares</h3>
                                <p className="text-xs text-zinc-500">{withdrawModal.position.assetName}</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Current Value</span>
                                <span className="text-white font-mono">${withdrawModal.position.currentValue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Vesting Status</span>
                                <span className="text-zinc-300">{withdrawModal.position.vestingEnd}</span>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider font-semibold">Shares to Sell (USDC Value)</label>
                            <input
                                type="number"
                                value={withdrawModal.amount}
                                onChange={(e) => setWithdrawModal(prev => ({ ...prev, amount: e.target.value }))}
                                placeholder="0.00"
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-xl font-mono text-white placeholder-zinc-700 focus:outline-none focus:border-rose-500/50"
                            />
                            <div className="flex gap-2 mt-2">
                                {['25%', '50%', '100%'].map((pct) => (
                                    <button
                                        key={pct}
                                        onClick={() => {
                                            const percentage = parseInt(pct) / 100;
                                            setWithdrawModal(prev => ({
                                                ...prev,
                                                amount: (prev.position!.currentValue * percentage).toFixed(2)
                                            }));
                                        }}
                                        className="flex-1 py-1 text-[10px] font-mono border border-white/10 rounded-lg bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-white transition-all"
                                    >
                                        {pct}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {withdrawModal.error && (
                            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400">
                                {withdrawModal.error}
                            </div>
                        )}

                        <button
                            onClick={handleWithdraw}
                            disabled={!withdrawModal.amount || parseFloat(withdrawModal.amount) <= 0 || withdrawModal.loading}
                            className="w-full py-3.5 rounded-xl font-bold text-sm uppercase bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {withdrawModal.loading ? 'PROCESSING...' : 'SELL MY SHARES'}
                        </button>

                        <p className="text-center text-[10px] text-zinc-500 mt-3">
                            Note: Only vested shares can be sold instantly.
                        </p>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {successModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSuccessModal({ show: false, message: '', amount: '' })} />

                    <div className="relative bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-white text-center mb-2">Shares Sold Successfully!</h3>
                        <p className="text-zinc-400 text-center text-sm mb-4">{successModal.message}</p>

                        <div className="flex justify-center mb-6">
                            <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <span className="text-emerald-400 font-mono font-bold">+${successModal.amount} USDC</span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setSuccessModal({ show: false, message: '', amount: '' });
                                window.location.reload();
                            }}
                            className="w-full py-3 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/20 text-white transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

