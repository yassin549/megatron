'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, Clock, Info, CheckCircle2, X, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';

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
    const { status, data: session } = useSession();
    const router = useRouter();
    const [type, setType] = useState<'buy' | 'sell'>('buy');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [userBalance, setUserBalance] = useState(0);
    const [userPosition, setUserPosition] = useState<any>(null);
    const [showInfo, setShowInfo] = useState(false);

    const isBuy = type === 'buy';

    // Fetch user data on mount/auth change
    useEffect(() => {
        if (status === 'authenticated') {
            const fetchData = async () => {
                try {
                    // Balance
                    const balRes = await fetch('/api/user/me');
                    const balData = await balRes.json();
                    if (balData.walletHotBalance) setUserBalance(parseFloat(balData.walletHotBalance));

                    // Position
                    const posRes = await fetch('/api/lp/positions');
                    const posData = await posRes.json();
                    const pos = posData.positions.find((p: any) => p.assetId === assetId);
                    setUserPosition(pos || null);
                } catch (err) {
                    console.error('Failed to fetch user LP data:', err);
                }
            };
            fetchData();
        }
    }, [status, assetId]);

    const fundingProgress = (currentFunding / softCap) * 100;
    const progressToHardCap = (currentFunding / hardCap) * 100;
    const remainingToSoftCap = Math.max(0, softCap - currentFunding);
    const estimatedShares = parseFloat(amount || '0');
    const estimatedAPY = fundingProgress < 100 ? 'TBD' : '15-25%';

    const { showNotification, showStatusModal } = useNotification();

    const handleAction = async () => {
        if (!amount || parseFloat(amount) <= 0) return;
        setLoading(true);
        try {
            if (isBuy) {
                const res = await fetch('/api/lp/contribute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ assetId, amount: parseFloat(amount) })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                showStatusModal({
                    type: 'success',
                    title: data.activated ? 'MARKET ACTIVATED!' : 'LP SUCCESS',
                    message: data.activated
                        ? `You are now an LP for ${assetName}.`
                        : `Successfully contributed $${amount} to ${assetName} pool.`
                });
            } else {
                const val = parseFloat(amount);
                const isQueue = val > (userPosition?.instantLimit || 0);

                if (!isQueue && val > (userPosition?.instantLimit || 0)) {
                    throw new Error("Exceeds instant limit. Please use Progressive Sell.");
                }

                if (val > (userPosition?.vestedPrincipal || 0)) {
                    throw new Error(`Exceeds vested amount ($${userPosition?.vestedPrincipal?.toFixed(2)})`);
                }

                const res = await fetch('/api/lp/withdraw', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        assetId,
                        amount: val,
                        type: isQueue ? 'queue' : 'instant'
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                showStatusModal({
                    type: 'success',
                    title: isQueue ? 'WITHDRAWAL QUEUED' : 'WITHDRAWAL SUCCESS',
                    message: isQueue
                        ? `Withdrawal of $${amount} has been queued for progressive processing.`
                        : `Successfully withdrawn $${amount} from ${assetName} pool.`
                });
            }
            setAmount('');
        } catch (err: any) {
            showStatusModal({
                type: 'error',
                title: 'ACTION FAILED',
                message: err.message || 'Unknown error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        window.location.reload();
    };

    if (status !== 'authenticated') {
        return (
            <div className="bg-zinc-900 border border-white/5 rounded-2xl p-8 text-center backdrop-blur-xl shadow-2xl">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Droplets className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Liquidity Provision</h3>
                <p className="text-zinc-400 mb-8 max-w-xs mx-auto">Sign in to buy LP shares and earn 90% of all trading fees generated by this market.</p>
                <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/40"
                >
                    <Wallet className="w-5 h-5" />
                    Connect Wallet to LP
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-3 md:p-4 backdrop-blur-xl md:sticky md:top-36 z-30 shadow-2xl overflow-hidden">
            {/* Tabs */}
            <div className="flex bg-black/40 rounded-lg p-0.5 mb-3 relative border border-white/5">
                <motion.div
                    className="absolute inset-y-1 bg-zinc-800 rounded-lg shadow-lg"
                    initial={false}
                    animate={{
                        left: isBuy ? '4px' : '50%',
                        width: 'calc(50% - 4px)'
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
                <button
                    onClick={() => setType('buy')}
                    className={`flex-1 py-2 text-[9px] md:text-[10px] font-semibold tracking-wide relative z-10 transition-colors duration-300 uppercase ${isBuy ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Buy LP Shares
                </button>
                <button
                    onClick={() => setType('sell')}
                    className={`flex-1 py-2 text-[9px] md:text-[10px] font-semibold tracking-wide relative z-10 transition-colors duration-300 uppercase ${!isBuy ? 'text-rose-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Sell My Shares
                </button>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={type}
                    initial={{ opacity: 0, x: isBuy ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isBuy ? 20 : -20 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    {/* Header Info - Compact */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isBuy ? 'bg-blue-500/10' : 'bg-rose-500/10'}`}>
                                {isBuy ? <Droplets className="w-3.5 h-3.5 text-blue-400" /> : <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />}
                            </div>
                            <h3 className="text-sm font-medium text-white">
                                {isBuy ? 'Supply Liquidity' : 'Withdraw Funds'}
                            </h3>
                        </div>
                        <button
                            onClick={() => setShowInfo(!showInfo)}
                            className="p-1 rounded hover:bg-white/5 transition-colors"
                        >
                            <Info className="w-3 h-3 text-zinc-500" />
                        </button>
                    </div>

                    {showInfo && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] text-blue-200/90 leading-relaxed"
                        >
                            <p className="font-medium mb-1">LP Protocol Rules:</p>
                            <ul className="space-y-0.5 list-disc list-inside">
                                <li>LPs earn 90% of all swap fees proportionally.</li>
                                <li>Instant withdrawals capped at 25% vested.</li>
                                <li>180 day linear vesting.</li>
                            </ul>
                        </motion.div>
                    )}

                    {/* Stats Section */}
                    <div className="space-y-2 mb-3">
                        {isBuy ? (
                            <>
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-wide">Progress to Soft Cap</span>
                                    <span className="text-sm font-mono font-medium text-white">{fundingProgress.toFixed(1)}%</span>
                                </div>
                                <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-blue-600 to-cyan-400"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(progressToHardCap, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500">
                                    <span>${currentFunding.toLocaleString()} raised</span>
                                    <span className="text-blue-400">Soft cap: ${softCap.toLocaleString()}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className="bg-white/5 border border-white/5 rounded-lg p-2">
                                        <span className="text-[8px] text-zinc-500 font-medium block uppercase tracking-wide text-center">Remaining</span>
                                        <span className="text-sm font-mono font-medium text-emerald-400 block text-center">${remainingToSoftCap.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-white/5 border border-white/5 rounded-lg p-2">
                                        <span className="text-[8px] text-zinc-500 font-medium block uppercase tracking-wide text-center">Est. APY</span>
                                        <span className="text-sm font-mono font-medium text-cyan-400 block text-center">{estimatedAPY}</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white/5 border border-white/5 rounded-lg p-2">
                                    <span className="text-[8px] text-zinc-500 font-medium block uppercase tracking-wide">Your Stake</span>
                                    <span className="text-sm font-mono font-medium text-white">${userPosition?.currentValue?.toLocaleString() || '0.00'}</span>
                                </div>
                                <div className="bg-white/5 border border-white/5 rounded-lg p-2">
                                    <span className="text-[8px] text-zinc-500 font-medium block uppercase tracking-wide">Earnings</span>
                                    <span className="text-sm font-mono font-medium text-emerald-400">+${userPosition?.earnings?.toLocaleString() || '0.00'}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-wide">
                                {isBuy ? 'Investment Amount' : 'Withdraw Amount'}
                            </span>
                            <span className="text-[9px] text-zinc-400 font-medium">
                                {isBuy ? 'Available: ' : 'Limit: '}
                                <span className="text-white font-mono">
                                    ${isBuy
                                        ? userBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })
                                        : (userPosition?.instantLimit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })
                                    }
                                </span>
                            </span>
                        </div>
                        <div className="relative group">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-lg md:text-xl font-mono text-white placeholder-zinc-800 focus:outline-none focus:border-blue-500/40 transition-all"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 font-medium">
                                USDC
                            </span>
                        </div>
                        <div className="flex gap-2 mt-1.5">
                            {(isBuy ? ['50', '100', 'MAX'] : ['25%', '50%', 'MAX']).map((val) => (
                                <button
                                    key={val}
                                    onClick={() => {
                                        if (isBuy) {
                                            setAmount(val === 'MAX' ? userBalance.toString() : val);
                                        } else {
                                            const vested = userPosition?.vestedPrincipal || 0;
                                            if (val === '25%') setAmount((vested * 0.25).toFixed(2));
                                            else if (val === '50%') setAmount((vested * 0.5).toFixed(2));
                                            else setAmount(vested.toFixed(2));
                                        }
                                    }}
                                    className="flex-1 py-1.5 text-[8px] font-mono font-medium border border-white/5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white transition-all"
                                >
                                    {val}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Summary Card */}
                    <div className="flex justify-between items-center bg-black/40 border border-white/5 rounded-xl p-3 mb-4">
                        <span className="text-[9px] text-zinc-500 uppercase tracking-wide">
                            {isBuy ? 'Shares to Receive' : 'Execution'}
                        </span>
                        <span className="text-sm font-mono font-medium text-white">
                            {isBuy ? `${estimatedShares.toFixed(2)} LP` : 'Instant'}
                        </span>
                    </div>

                    {/* Primary Button */}
                    <button
                        onClick={handleAction}
                        disabled={!amount || parseFloat(amount) <= 0 || loading}
                        className={`w-full py-3 rounded-xl font-semibold text-[10px] md:text-xs tracking-wide shadow-xl transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2
                            ${isBuy
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-blue-900/30 hover:from-blue-500 hover:to-blue-400'
                                : 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-rose-900/30 hover:from-rose-500 hover:to-rose-400'
                            }`}
                    >
                        {loading ? (
                            <span className="flex items-center gap-3">
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                Processing...
                            </span>
                        ) : (
                            <>
                                {isBuy ? <Droplets className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                {isBuy ? 'Deploy Capital' : 'Withdraw'}
                            </>
                        )}
                    </button>

                    {/* Withdrawal Queue Section */}
                    {!isBuy && userPosition?.pendingWithdrawals?.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-white/5">
                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                Active Withdrawal Queue
                            </h4>
                            <div className="space-y-3">
                                {userPosition.pendingWithdrawals.map((w: any) => (
                                    <div key={w.id} className="bg-black/40 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-mono font-bold text-white">${w.amount.toLocaleString()} USDC</div>
                                            <div className="text-[10px] text-zinc-500">Requested {new Date(w.requestedAt).toLocaleDateString()}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-[10px] font-black text-blue-400 uppercase tracking-tighter px-2 py-1 bg-blue-400/10 rounded-lg">
                                                {w.status}
                                            </div>
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                                className="w-1.5 h-1.5 rounded-full border border-blue-400 border-t-transparent"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

