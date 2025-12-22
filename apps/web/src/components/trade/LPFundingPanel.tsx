'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Droplets, TrendingUp, Clock, CheckCircle2, Info } from 'lucide-react';

interface LPFundingPanelProps {
    assetId: string;
    assetName: string;
    softCap: number;
    hardCap: number;
    currentFunding: number;
    fundingDeadline: string | null;
}

export function LPFundingPanel({
    assetId,
    assetName,
    softCap,
    hardCap,
    currentFunding,
    fundingDeadline
}: LPFundingPanelProps) {
    const { status } = useSession();
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [userBalance, setUserBalance] = useState(0);
    const [showInfo, setShowInfo] = useState(false);

    // Fetch balance on mount
    useEffect(() => {
        if (status === 'authenticated') {
            fetch('/api/user/me').then(res => res.json()).then(data => {
                if (data.walletHotBalance) setUserBalance(parseFloat(data.walletHotBalance));
            });
        }
    }, [status]);

    const fundingProgress = (currentFunding / softCap) * 100;
    const progressToHardCap = (currentFunding / hardCap) * 100;
    const remaining = Math.max(0, softCap - currentFunding);
    const estimatedShares = parseFloat(amount || '0');

    // Calculate estimated APY (simplified: based on trading volume assumption)
    const estimatedAPY = fundingProgress < 100 ? 'TBD' : '12-18%';

    const handleContribute = async () => {
        if (!amount || parseFloat(amount) <= 0) return;
        setLoading(true);
        try {
            const res = await fetch('/api/lp/contribute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetId: assetId,
                    amount: parseFloat(amount)
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setAmount('');
            if (data.activated) {
                alert(`🎉 Your contribution activated the market! You are now an LP for ${assetName}.`);
            } else {
                alert(`✅ Successfully contributed $${amount} to ${assetName} liquidity pool!`);
            }
            window.location.reload();
        } catch (err: any) {
            alert(`Contribution failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (status !== 'authenticated') {
        return (
            <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-2xl p-6 text-center backdrop-blur-xl">
                <Droplets className="w-10 h-10 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Become a Liquidity Provider</h3>
                <p className="text-gray-400 mb-4 text-sm">Sign in to fund this market and earn trading fees.</p>
                <Link
                    href="/login"
                    className="inline-block w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                    Sign In to Contribute
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-blue-900/10 to-purple-900/10 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-xl sticky top-36 z-30 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <Droplets className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Fund This Market</h3>
                        <p className="text-xs text-zinc-400">Provide liquidity & earn fees</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowInfo(!showInfo)}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                    <Info className="w-4 h-4 text-zinc-500" />
                </button>
            </div>

            {/* Info Tooltip */}
            {showInfo && (
                <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-200 space-y-2">
                    <p><strong>How LP Funding Works:</strong></p>
                    <ul className="list-disc list-inside space-y-1 text-blue-300/80">
                        <li>Contribute USDC to provide initial liquidity</li>
                        <li>Earn 90% of all trading fees proportionally</li>
                        <li>Your funds vest over 180 days (see schedule below)</li>
                        <li>Market activates when soft cap is reached</li>
                    </ul>
                </div>
            )}

            {/* Funding Progress */}
            <div className="mb-6">
                <div className="flex justify-between text-xs mb-2">
                    <span className="text-zinc-400">Funding Progress</span>
                    <span className="text-white font-bold">{fundingProgress.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full relative">
                        {/* Hard cap background */}
                        <div className="absolute inset-0 bg-zinc-700/50" />
                        {/* Current progress */}
                        <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(progressToHardCap, 100)}%` }}
                        />
                        {/* Soft cap marker */}
                        <div
                            className="absolute inset-y-0 w-0.5 bg-emerald-400"
                            style={{ left: `${(softCap / hardCap) * 100}%` }}
                        />
                    </div>
                </div>
                <div className="flex justify-between text-[10px] mt-2 text-zinc-500">
                    <span>${currentFunding.toLocaleString()} raised</span>
                    <span>Soft Cap: ${softCap.toLocaleString()}</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <span className="text-[10px] text-zinc-500 block mb-1">Remaining to Launch</span>
                    <span className="text-sm font-bold text-emerald-400">${remaining.toLocaleString()}</span>
                </div>
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <span className="text-[10px] text-zinc-500 block mb-1">Est. APY</span>
                    <span className="text-sm font-bold text-purple-400">{estimatedAPY}</span>
                </div>
                {fundingDeadline && (
                    <div className="col-span-2 bg-black/20 rounded-xl p-3 border border-white/5 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-500" />
                        <span className="text-xs text-zinc-400">
                            Deadline: <span className="text-white">{new Date(fundingDeadline).toLocaleDateString()}</span>
                        </span>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="mb-5">
                <div className="flex justify-between text-xs text-zinc-500 mb-2 font-mono uppercase tracking-wider font-semibold">
                    <span>Contribution Amount</span>
                    <span>Balance: <span className="text-zinc-300">${userBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                </div>
                <div className="relative group">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-4 text-2xl font-mono text-white placeholder-zinc-700 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-bold">
                        USDC
                    </span>
                </div>
                {/* Presets */}
                <div className="flex gap-2 mt-3">
                    {['50', '100', '500', 'MAX'].map((val) => (
                        <button
                            key={val}
                            onClick={() => setAmount(val === 'MAX' ? userBalance.toString() : val)}
                            className="flex-1 py-1.5 text-[10px] font-mono font-medium border border-white/10 rounded-lg bg-white/5 hover:bg-blue-500/20 hover:border-blue-500/30 text-zinc-400 hover:text-white transition-all"
                        >
                            {val}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary */}
            <div className="bg-black/20 border border-white/5 rounded-xl p-4 mb-5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                    <span className="text-zinc-500">LP Shares You&apos;ll Receive</span>
                    <span className="text-white font-mono font-medium">{estimatedShares.toFixed(2)} LP</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Fee Share</span>
                    <span className="text-zinc-400 font-mono">90% of trading fees</span>
                </div>
            </div>

            {/* Vesting Schedule */}
            <div className="mb-5">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-semibold">Vesting Schedule</p>
                <div className="flex gap-1">
                    <div className="flex-1 text-center py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <span className="block text-[10px] text-emerald-400 font-bold">10%</span>
                        <span className="block text-[8px] text-zinc-500">Day 0</span>
                    </div>
                    <div className="flex-1 text-center py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <span className="block text-[10px] text-blue-400 font-bold">25%</span>
                        <span className="block text-[8px] text-zinc-500">Day 30</span>
                    </div>
                    <div className="flex-1 text-center py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <span className="block text-[10px] text-purple-400 font-bold">50%</span>
                        <span className="block text-[8px] text-zinc-500">Day 90</span>
                    </div>
                    <div className="flex-1 text-center py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <span className="block text-[10px] text-yellow-400 font-bold">100%</span>
                        <span className="block text-[8px] text-zinc-500">Day 180</span>
                    </div>
                </div>
            </div>

            {/* Action Button */}
            <button
                onClick={handleContribute}
                disabled={!amount || parseFloat(amount) <= 0 || loading}
                className="w-full py-4 rounded-xl font-bold text-sm tracking-widest shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:from-blue-500 hover:via-purple-500 hover:to-blue-500 text-white shadow-blue-900/30 bg-[length:200%_100%] hover:bg-right"
            >
                {loading ? (
                    'PROCESSING...'
                ) : (
                    <span className="flex items-center justify-center gap-2">
                        <Droplets className="w-4 h-4" />
                        FUND THIS MARKET
                    </span>
                )}
            </button>

            {/* Helper Text */}
            <p className="text-center text-[10px] text-zinc-500 mt-4">
                By contributing, you agree to the LP vesting terms.
            </p>
        </div>
    );
}
