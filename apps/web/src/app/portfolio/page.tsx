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

                {/* Institutional Status Ribbon - High Density */}
                <div className="bg-black/40 border border-white/5 rounded-[4px] mb-8 overflow-hidden shadow-2xl shrink-0">
                    <div className="flex items-center gap-8 px-6 py-4 bg-white/[0.02] border-b border-white/5 overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Portfolio_Status</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </div>

                        <div className="flex items-center gap-10 text-xs font-mono whitespace-nowrap">
                            <div className="flex flex-col gap-0.5 border-l border-white/10 pl-6">
                                <span className="text-zinc-600 font-black uppercase text-[8px] tracking-widest">Net_Equity</span>
                                <span className="text-white font-black text-sm">${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex flex-col gap-0.5 border-l border-white/10 pl-6">
                                <span className="text-zinc-600 font-black uppercase text-[8px] tracking-widest">Liquidity_Pools</span>
                                <span className="text-cyan-400 font-black text-sm">${lpValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex flex-col gap-0.5 border-l border-white/10 pl-6">
                                <span className="text-zinc-600 font-black uppercase text-[8px] tracking-widest">Total_PnL</span>
                                <span className={`font-black text-sm ${(lpData?.summary?.totalEarnings || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {(lpData?.summary?.totalEarnings || 0) >= 0 ? '+' : ''}${(lpData?.summary?.totalEarnings || 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5 border-l border-white/10 pl-6">
                                <span className="text-zinc-600 font-black uppercase text-[8px] tracking-widest">Cash_Balance</span>
                                <span className="text-white font-black text-sm">${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-8 md:mb-12">
                    <div className="mb-4 flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-cyan-500" />
                        <h2 className="text-lg font-black uppercase tracking-widest">Liquidity_Pools</h2>
                        <span className="ml-2 px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-[10px] font-black rounded-sm border border-cyan-500/20">
                            {lpData?.positions?.length || 0}_ACTIVE
                        </span>
                    </div>

                    <div className="bg-black/20 border border-white/5 rounded-[4px] overflow-hidden shadow-2xl">
                        {lpData?.positions && lpData.positions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-white/[0.02] border-b border-white/5 text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em]">
                                        <tr>
                                            <th className="px-6 py-3 font-black">Instrument</th>
                                            <th className="px-6 py-3 text-right font-black">Capital_Exposure</th>
                                            <th className="px-6 py-3 text-right font-black">Asset_Value</th>
                                            <th className="px-6 py-3 text-right font-black">Net_Yield</th>
                                            <th className="px-6 py-3 text-right font-black">APY</th>
                                            <th className="px-6 py-3 text-right font-black">Maturity</th>
                                            <th className="px-6 py-3 text-right font-black">Control</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.03] text-xs">
                                        {lpData.positions.map((lp) => (
                                            <tr key={lp.id} className="group hover:bg-white/[0.01] transition-colors">
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-6 h-6 rounded-sm bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                                            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                                                        </div>
                                                        <span className="font-black text-white uppercase tracking-tight">{lp.assetName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-right font-mono text-zinc-400 font-bold tracking-tighter">${lp.contributed.toLocaleString()}</td>
                                                <td className="px-6 py-3 text-right font-mono text-white font-black tracking-tighter">${lp.currentValue.toLocaleString()}</td>
                                                <td className="px-6 py-3 text-right">
                                                    <span className={`font-mono font-black tracking-tighter ${lp.earnings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {lp.earnings >= 0 ? '+' : ''}${lp.earnings.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-black border border-emerald-500/20 rounded-sm">
                                                        {lp.apy}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-right text-[10px] text-zinc-500 font-mono uppercase font-bold">{lp.vestingEnd}</td>
                                                <td className="px-6 py-3 text-right">
                                                    <button
                                                        onClick={() => setWithdrawModal({ show: true, position: lp, amount: '', loading: false, error: '' })}
                                                        className="inline-flex items-center gap-1.5 text-[9px] font-black text-rose-400 hover:text-white transition-all bg-rose-500/10 px-3 py-1.5 rounded-sm border border-rose-500/20 hover:bg-rose-500/40 uppercase tracking-widest"
                                                    >
                                                        Redeem_Shares
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-16 flex flex-col items-center justify-center text-center bg-black/40">
                                <div className="w-12 h-12 bg-white/[0.03] border border-white/5 rounded-sm flex items-center justify-center mb-4">
                                    <Droplets className="w-6 h-6 text-zinc-600 opacity-40" />
                                </div>
                                <h3 className="text-xs font-black text-zinc-500 mb-1 uppercase tracking-widest">No_Pool_Exposure</h3>
                                <p className="text-[10px] text-zinc-600 uppercase tracking-tight mb-6">No active liquidity positions detected.</p>
                                <Link href="/" className="px-6 py-2 bg-primary/10 border border-primary/20 text-primary rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all">
                                    Explore_Vaults
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Trading Positions Table - High Density Instrument View */}
                <div className="mb-4 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <h2 className="text-lg font-black uppercase tracking-widest">Market_Exposure</h2>
                    <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-sm border border-primary/20">
                        {data?.positions?.length || 0}_INSTRUMENTS
                    </span>
                </div>

                <div className="bg-black/20 border border-white/5 rounded-[4px] overflow-hidden shadow-2xl">
                    {data?.positions && data.positions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white/[0.02] border-b border-white/5 text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em]">
                                    <tr>
                                        <th className="px-6 py-3 font-black">Asset_Node</th>
                                        <th className="px-6 py-3 text-right font-black">Alloc_Shares</th>
                                        <th className="px-6 py-3 text-right font-black">Entry_Price</th>
                                        <th className="px-6 py-3 text-right font-black">Mark_Price</th>
                                        <th className="px-6 py-3 text-right font-black">Hold_Value</th>
                                        <th className="px-6 py-3 text-right font-black">PnL_Percent</th>
                                        <th className="px-6 py-3 text-right font-black">Control</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03] text-xs">
                                    {data.positions.map((pos) => (
                                        <tr key={pos.assetId} className="group hover:bg-white/[0.01] transition-colors">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 rounded-sm bg-white/[0.03] flex items-center justify-center border border-white/10 text-[10px] font-black text-zinc-500">
                                                        {pos.assetName[0]}
                                                    </div>
                                                    <span className="font-black text-white hover:text-primary transition-colors cursor-pointer uppercase tracking-tight">{pos.assetName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-right font-mono text-zinc-400 font-bold tracking-tighter">{pos.shares.toFixed(4)}</td>
                                            <td className="px-6 py-3 text-right font-mono text-zinc-400 font-bold tracking-tighter">${pos.avgPrice.toFixed(2)}</td>
                                            <td className="px-6 py-3 text-right font-mono text-white font-bold tracking-tighter">${pos.currentPrice.toFixed(2)}</td>
                                            <td className="px-6 py-3 text-right font-mono text-white font-black tracking-tighter">${pos.value.toLocaleString()}</td>
                                            <td className="px-6 py-3 text-right">
                                                <div className={`inline-flex items-center gap-1 font-mono font-black border-l border-white/10 pl-3 ${pos.returnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {pos.returnPercent >= 0 ? '+' : ''}{pos.returnPercent.toFixed(2)}%
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <Link href={`/assets/${pos.assetId}`} className="inline-flex items-center gap-1.5 text-[9px] font-black text-primary hover:text-white transition-all bg-primary/10 px-3 py-1.5 rounded-sm border border-primary/20 hover:bg-primary/40 uppercase tracking-widest">
                                                    Manage_Node <ArrowRight className="w-3 h-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-16 flex flex-col items-center justify-center text-center bg-black/40">
                            <div className="w-12 h-12 bg-white/[0.03] border border-white/5 rounded-sm flex items-center justify-center mb-4">
                                <Layers className="w-6 h-6 text-zinc-600 opacity-40" />
                            </div>
                            <h3 className="text-xs font-black text-zinc-500 mb-1 uppercase tracking-widest">No_Market_Sync</h3>
                            <p className="text-[10px] text-zinc-600 uppercase tracking-tight mb-6">Market exposure currently zero-indexed.</p>
                            <Link href="/" className="px-6 py-2 bg-primary/10 border border-primary/20 text-primary rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all">
                                Initialize_Trade
                            </Link>
                        </div>
                    )}
                </div>
            </main>

            {/* Withdraw Modal - Institutional Refinement */}
            {withdrawModal.show && withdrawModal.position && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setWithdrawModal(prev => ({ ...prev, show: false }))} />

                    <div className="relative bg-[#050912] border border-white/5 rounded-[4px] p-6 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <button
                            onClick={() => setWithdrawModal(prev => ({ ...prev, show: false }))}
                            className="absolute top-4 right-4 p-1 rounded-sm hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                        >
                            <X className="w-5 h-5 text-zinc-500" />
                        </button>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-10 h-10 rounded-sm bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                                <Droplets className="w-5 h-5 text-rose-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">REDEEM_LP_STAKE</h3>
                                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">{withdrawModal.position.assetName}</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8 border-y border-white/5 py-6">
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="text-zinc-600 font-black uppercase tracking-widest">Mark_Value</span>
                                <span className="text-white font-mono font-black">${withdrawModal.position.currentValue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="text-zinc-600 font-black uppercase tracking-widest">Maturity_Status</span>
                                <span className="text-zinc-400 font-mono font-bold uppercase tracking-tighter">{withdrawModal.position.vestingEnd}</span>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-[8px] text-zinc-600 mb-2 uppercase tracking-[0.3em] font-black">Capital_Liquidate (USDC)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={withdrawModal.amount}
                                    onChange={(e) => setWithdrawModal(prev => ({ ...prev, amount: e.target.value }))}
                                    placeholder="0.00"
                                    className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-3 text-xl font-mono text-white placeholder-zinc-800 focus:outline-none focus:border-rose-500/50 transition-all font-black"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-700 font-black">USDC</span>
                            </div>
                            <div className="flex gap-2 mt-3">
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
                                        className="flex-1 py-1.5 text-[8px] font-mono font-black border border-white/5 rounded-sm bg-white/[0.02] hover:bg-rose-500/20 text-zinc-600 hover:text-white transition-all uppercase tracking-widest"
                                    >
                                        {pct}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {withdrawModal.error && (
                            <div className="mb-6 p-4 bg-rose-500/5 border border-rose-500/10 rounded-sm text-[10px] text-rose-400 font-black uppercase tracking-widest leading-relaxed">
                                CRITICAL_ERROR: {withdrawModal.error}
                            </div>
                        )}

                        <button
                            onClick={handleWithdraw}
                            disabled={!withdrawModal.amount || parseFloat(withdrawModal.amount) <= 0 || withdrawModal.loading}
                            className="w-full py-4 rounded-sm font-black text-[10px] uppercase tracking-[0.3em] bg-rose-500 hover:bg-rose-400 text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-[0_4px_20px_rgba(244,63,94,0.1)] active:scale-[0.98]"
                        >
                            {withdrawModal.loading ? 'EXECUTING_REDUCE...' : 'CONFIRM_LIQUIDATION'}
                        </button>

                        <p className="text-center text-[8px] text-zinc-600 mt-4 uppercase font-black tracking-widest opacity-40 leading-relaxed">
                            Disclaimer: Only vested capital nodes are eligible for instant redemption. Non-vested nodes require batch exit.
                        </p>
                    </div>
                </div>
            )}

            {/* Success Modal - Institutional View */}
            {successModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSuccessModal({ show: false, message: '', amount: '' })} />

                    <div className="relative bg-[#050912] border border-white/5 rounded-[4px] p-8 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] text-center">
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 rounded-sm bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                        </div>

                        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-2">LIQUIDATION_COMPLETE</h3>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-6 leading-relaxed">{successModal.message}</p>

                        <div className="flex justify-center mb-8">
                            <div className="px-6 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-sm">
                                <span className="text-emerald-400 font-mono font-black text-xs">+${successModal.amount} USDC_CREDIT</span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setSuccessModal({ show: false, message: '', amount: '' });
                                window.location.reload();
                            }}
                            className="w-full py-3 rounded-sm font-black text-[10px] uppercase tracking-[0.2em] bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10 transition-all hover:border-white/20"
                        >
                            CLOSE_CONSOLE
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

