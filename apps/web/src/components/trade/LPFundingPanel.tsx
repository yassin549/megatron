'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Droplets, Clock, Info, CheckCircle2, X, Wallet } from 'lucide-react';

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
    const router = useRouter();
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [userBalance, setUserBalance] = useState(0);
    const [showInfo, setShowInfo] = useState(false);
    const [successModal, setSuccessModal] = useState<{
        show: boolean;
        message: string;
        isActivation: boolean;
        contributedAmount: string;
    }>({ show: false, message: '', isActivation: false, contributedAmount: '' });

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

            const contributedAmount = amount;
            setAmount('');

            if (data.activated) {
                setSuccessModal({
                    show: true,
                    message: `Your contribution activated the market! You are now an LP for ${assetName}.`,
                    isActivation: true,
                    contributedAmount
                });
            } else {
                setSuccessModal({
                    show: true,
                    message: `Successfully contributed $${contributedAmount} to ${assetName} liquidity pool!`,
                    isActivation: false,
                    contributedAmount
                });
            }
        } catch (err: any) {
            alert(`Contribution failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setSuccessModal({ show: false, message: '', isActivation: false, contributedAmount: '' });
        window.location.reload();
    };

    const handleViewPortfolio = () => {
        router.push('/portfolio');
    };

    if (status !== 'authenticated') {
        return (
            <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 text-center backdrop-blur-xl">
                <Droplets className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-2">Become a Liquidity Provider</h3>
                <p className="text-gray-400 mb-4 text-xs">Sign in to fund this market and earn trading fees.</p>
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
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-5 backdrop-blur-xl sticky top-36 z-30 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Droplets className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Fund This Market</h3>
                        <p className="text-[10px] text-zinc-500">Provide liquidity & earn fees</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowInfo(!showInfo)}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                    <Info className="w-3.5 h-3.5 text-zinc-500" />
                </button>
            </div>

            {/* Info Tooltip */}
            {showInfo && (
                <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] text-blue-200 space-y-1">
                    <p className="font-semibold">How LP Funding Works:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-blue-300/80">
                        <li>Contribute USDC to provide initial liquidity</li>
                        <li>Earn 90% of all trading fees proportionally</li>
                        <li>Funds vest over 180 days • Market activates at soft cap</li>
                    </ul>
                </div>
            )}

            {/* Funding Progress */}
            <div className="mb-4">
                <div className="flex justify-between text-[10px] mb-1.5">
                    <span className="text-zinc-400">Funding Progress</span>
                    <span className="text-white font-bold">{fundingProgress.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full relative">
                        <div className="absolute inset-0 bg-zinc-700/50" />
                        <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(progressToHardCap, 100)}%` }}
                        />
                        <div
                            className="absolute inset-y-0 w-0.5 bg-emerald-400"
                            style={{ left: `${(softCap / hardCap) * 100}%` }}
                        />
                    </div>
                </div>
                <div className="flex justify-between text-[9px] mt-1 text-zinc-500">
                    <span>${currentFunding.toLocaleString()} raised</span>
                    <span>Soft Cap: ${softCap.toLocaleString()}</span>
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex gap-2 mb-4">
                <div className="flex-1 bg-black/20 rounded-lg p-2 border border-white/5">
                    <span className="text-[9px] text-zinc-500 block">Remaining</span>
                    <span className="text-xs font-bold text-emerald-400">${remaining.toLocaleString()}</span>
                </div>
                <div className="flex-1 bg-black/20 rounded-lg p-2 border border-white/5">
                    <span className="text-[9px] text-zinc-500 block">Est. APY</span>
                    <span className="text-xs font-bold text-purple-400">{estimatedAPY}</span>
                </div>
                {fundingDeadline && (
                    <div className="flex-1 bg-black/20 rounded-lg p-2 border border-white/5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                        <span className="text-[9px] text-zinc-400 truncate">{new Date(fundingDeadline).toLocaleDateString()}</span>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="mb-4">
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1.5 font-mono uppercase tracking-wider font-semibold">
                    <span>Contribution Amount</span>
                    <span>Balance: <span className="text-zinc-300">${userBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                </div>
                <div className="relative">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-xl font-mono text-white placeholder-zinc-700 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-bold">
                        USDC
                    </span>
                </div>
                <div className="flex gap-2 mt-2">
                    {['50', '100', '500', 'MAX'].map((val) => (
                        <button
                            key={val}
                            onClick={() => setAmount(val === 'MAX' ? userBalance.toString() : val)}
                            className="flex-1 py-1 text-[9px] font-mono font-medium border border-white/5 rounded-lg bg-white/5 hover:bg-blue-500/20 hover:border-blue-500/30 text-zinc-400 hover:text-white transition-all"
                        >
                            {val}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary + Vesting Combined */}
            <div className="bg-black/20 border border-white/5 rounded-xl p-3 mb-4 text-[10px] space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-zinc-500">LP Shares</span>
                    <span className="text-white font-mono">{estimatedShares.toFixed(2)} LP</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-2">
                    <span className="text-zinc-500">Vesting</span>
                    <div className="flex gap-1 text-[8px]">
                        <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">10% D0</span>
                        <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">25% D30</span>
                        <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">50% D90</span>
                        <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">100% D180</span>
                    </div>
                </div>
            </div>

            {/* Action Button */}
            <button
                onClick={handleContribute}
                disabled={!amount || parseFloat(amount) <= 0 || loading}
                className="w-full py-3.5 rounded-xl font-bold text-sm tracking-widest shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:from-blue-500 hover:via-purple-500 hover:to-blue-500 text-white shadow-blue-900/30"
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

            {/* Success Modal */}
            {successModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={handleCloseModal}
                    />

                    {/* Modal Card */}
                    <div className="relative bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        {/* Close Button */}
                        <button
                            onClick={handleCloseModal}
                            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-zinc-400" />
                        </button>

                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${successModal.isActivation
                                    ? 'bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border-2 border-emerald-500/50'
                                    : 'bg-emerald-500/20 border-2 border-emerald-500/30'
                                }`}>
                                <CheckCircle2 className={`w-8 h-8 ${successModal.isActivation ? 'text-emerald-400' : 'text-emerald-500'}`} />
                            </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-white text-center mb-2">
                            {successModal.isActivation ? '🎉 Market Activated!' : '✅ Contribution Successful!'}
                        </h3>

                        {/* Message */}
                        <p className="text-zinc-400 text-center text-sm mb-6">
                            {successModal.message}
                        </p>

                        {/* Contribution Amount Badge */}
                        <div className="flex justify-center mb-6">
                            <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
                                <span className="text-blue-400 font-mono font-bold">
                                    +${successModal.contributedAmount} USDC
                                </span>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleCloseModal}
                                className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all"
                            >
                                Close
                            </button>
                            <button
                                onClick={handleViewPortfolio}
                                className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white transition-all flex items-center justify-center gap-2"
                            >
                                <Wallet className="w-4 h-4" />
                                See Portfolio
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

