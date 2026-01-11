'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Shield, Target } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';

interface OrderFormProps {
    assetId: string;
    assetPrice: number;
    marketPrice: number;
    assetSymbol?: string;
    onTradeSuccess?: () => void;
}

export function OrderForm({
    assetId,
    assetPrice,
    marketPrice,
    assetSymbol = 'Share',
    onTradeSuccess,
}: OrderFormProps) {
    const { status } = useSession();
    const router = useRouter();
    const [type, setType] = useState<'buy' | 'sell'>('buy');
    const [amount, setAmount] = useState('');
    const [stopLoss, setStopLoss] = useState('');
    const [takeProfit, setTakeProfit] = useState('');
    const [loading, setLoading] = useState(false);
    const [userBalance, setUserBalance] = useState(0);

    useEffect(() => {
        if (status === 'authenticated') {
            fetch('/api/user/me').then(res => res.json()).then(data => {
                if (data.walletHotBalance) setUserBalance(parseFloat(data.walletHotBalance));
            });
        }
    }, [status]);

    const isBuy = type === 'buy';
    const fillPrice = assetPrice; // Always use Execution Price for estimation
    const estimatedShares = amount ? parseFloat(amount) / fillPrice : 0;

    const spreadPercent = Math.abs(fillPrice - assetPrice) / assetPrice;
    const isHighSpread = spreadPercent > 0.05; // 5% threshold

    const { showNotification, showStatusModal } = useNotification();

    const handleTrade = async () => {
        if (!amount) return;
        setLoading(true);
        try {
            const slValue = stopLoss ? parseFloat(stopLoss) : null;
            const tpValue = takeProfit ? parseFloat(takeProfit) : null;

            // Trade Logic Validation
            if (isBuy) {
                if (slValue !== null && slValue >= fillPrice) throw new Error('For Buy positions, Stop Loss must be below Entry Price.');
                if (tpValue !== null && tpValue <= fillPrice) throw new Error('For Buy positions, Take Profit must be above Entry Price.');
            } else {
                if (slValue !== null && slValue <= fillPrice) throw new Error('For Sell positions, Stop Loss must be above Entry Price.');
                if (tpValue !== null && tpValue >= fillPrice) throw new Error('For Sell positions, Take Profit must be below Entry Price.');
            }

            const res = await fetch('/api/trade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: type,
                    assetId: assetId,
                    amount: parseFloat(amount),
                    stopLoss: slValue,
                    takeProfit: tpValue,
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setAmount('');
            setStopLoss('');
            setTakeProfit('');
            await onTradeSuccess?.();
            showStatusModal({
                type: 'success',
                title: 'DONE',
                message: `${estimatedShares.toFixed(4)} ${assetSymbol} units added`
            });
        } catch (err: any) {
            showStatusModal({
                type: 'error',
                title: 'ORDER FAILED',
                message: err.message || 'Unknown error'
            });
        } finally {
            setLoading(false);
        }
    };

    if (status !== 'authenticated') {
        return (
            <div className="bg-zinc-900 border border-white/5 rounded-xl p-6 text-center shadow-2xl">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Trade Assets</h3>
                <p className="text-zinc-400 text-sm mb-6">Sign in to start trading.</p>
                <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all text-sm"
                >
                    Connect Wallet
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 shadow-xl">
            {/* Buy/Sell Tabs */}
            <div className="flex bg-black/40 rounded-lg p-1 mb-4 relative border border-white/5">
                <motion.div
                    className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-md ${isBuy ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}
                    animate={{ left: isBuy ? '4px' : 'calc(50%)' }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                />
                <button
                    onClick={() => setType('buy')}
                    className={`flex-1 py-2 text-xs font-bold relative z-10 transition-colors uppercase ${isBuy ? 'text-emerald-400' : 'text-zinc-500'}`}
                >
                    BUY
                </button>
                <button
                    onClick={() => setType('sell')}
                    className={`flex-1 py-2 text-xs font-bold relative z-10 transition-colors uppercase ${!isBuy ? 'text-rose-400' : 'text-zinc-500'}`}
                >
                    SELL
                </button>
            </div>

            {/* Price Info */}
            <div className="mb-4 bg-black/40 rounded-2xl p-4 border border-white/10 space-y-3 relative overflow-hidden">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Market Price</span>
                    <span className="text-xs text-white font-mono font-bold">${marketPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center transition-colors duration-500 rounded-lg -mx-1 px-1"
                    key={assetPrice} // Trigger re-render/animation on price change
                    style={{ animation: 'flash-up 1s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                    <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Execution Price</span>
                    <span className={`text-xs font-mono font-black ${isHighSpread ? 'text-amber-400' : 'text-emerald-400'}`}>
                        ${assetPrice.toFixed(2)}
                    </span>
                </div>
                {isHighSpread && (
                    <div className="flex items-start gap-2 pt-2 border-t border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 flex-shrink-0 animate-pulse" />
                        <p className="text-[9px] text-amber-500/80 leading-tight font-medium">
                            High spread detected. Fill occurs at execution price.
                        </p>
                    </div>
                )}
            </div>

            {/* Amount Input */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">
                        Order Amount
                    </span>
                    <span className="text-[10px] text-zinc-400">
                        Max: <span className="text-white font-mono">${userBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </span>
                </div>
                <div className="relative">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-black/40 border border-white/5 rounded-lg px-4 py-3 text-lg font-mono text-white placeholder-zinc-700 focus:outline-none focus:border-blue-500/40 transition-all font-bold"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 font-bold">
                        USDC
                    </span>
                </div>
            </div>

            {/* SL/TP Inputs */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                    <label className="text-[9px] font-bold text-rose-500/70 uppercase flex items-center gap-1 mb-1 px-1">
                        <Shield className="w-2.5 h-2.5" />
                        Stop Loss
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={stopLoss}
                        onChange={(e) => setStopLoss(e.target.value)}
                        placeholder="Price"
                        className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500/40 transition-all"
                    />
                </div>
                <div>
                    <label className="text-[9px] font-bold text-emerald-500/70 uppercase flex items-center gap-1 mb-1 px-1">
                        <Target className="w-2.5 h-2.5" />
                        Take Profit
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={takeProfit}
                        onChange={(e) => setTakeProfit(e.target.value)}
                        placeholder="Price"
                        className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/40 transition-all"
                    />
                </div>
            </div>

            {/* Trade Button */}
            <button
                onClick={handleTrade}
                disabled={!amount || loading}
                className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wide transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2
                    ${isBuy
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 text-white'
                        : 'bg-gradient-to-r from-rose-600 to-rose-400 text-white'
                    }`}
            >
                {loading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                    <>
                        {isBuy ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {isBuy ? 'BUY' : 'SELL'}
                    </>
                )}
            </button>
        </div>
    );
}
