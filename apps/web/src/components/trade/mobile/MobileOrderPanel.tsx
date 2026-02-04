'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, TrendingUp, TrendingDown, ChevronUp, ChevronDown } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useNotification } from '@/context/NotificationContext';

interface MobileOrderPanelProps {
    assetId: string;
    assetPrice: number;
    assetName: string;
    onTradeSuccess?: () => void;
}

export function MobileOrderPanel({
    assetId,
    assetPrice,
    assetName,
    onTradeSuccess,
}: MobileOrderPanelProps) {
    const { data: session, status } = useSession();
    const { showNotification } = useNotification();

    const [side, setSide] = useState<'buy' | 'sell'>('buy');
    const [amount, setAmount] = useState('');
    const [balance, setBalance] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        if (status === 'authenticated') {
            fetch('/api/user/me')
                .then((res) => res.json())
                .then((data) => setBalance(parseFloat(data.walletHotBalance || '0')))
                .catch(() => { });
        }
    }, [status, isSubmitting]);

    const estimation = useMemo(() => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return null;

        const feeRate = 0.01;
        const fee = numAmount * feeRate;

        if (side === 'buy') {
            const netAmount = numAmount - fee;
            return {
                quantity: netAmount / assetPrice,
                fee,
                total: numAmount,
            };
        } else {
            return {
                quantity: numAmount / assetPrice,
                fee,
                total: numAmount - fee,
            };
        }
    }, [amount, side, assetPrice]);

    const handlePercentage = (pct: number) => {
        if (side === 'buy' && balance !== null) {
            setAmount((balance * pct).toFixed(2));
            setError(null);
        }
    };

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setError('Enter a valid amount');
            return;
        }

        if (status !== 'authenticated') {
            showNotification('error', 'Please login to trade');
            return;
        }

        if (side === 'buy' && balance !== null && parseFloat(amount) > balance) {
            setError('Insufficient balance');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/trade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetId,
                    side,
                    type: 'market',
                    amount: parseFloat(amount),
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Trade failed');

            showNotification('success', 'Order placed!');
            setAmount('');
            onTradeSuccess?.();
        } catch (err: any) {
            setError(err.message);
            showNotification('error', err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isBuy = side === 'buy';

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
            {/* Toggle Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-center py-2 text-zinc-500"
            >
                {isExpanded ? (
                    <ChevronDown className="w-5 h-5" />
                ) : (
                    <ChevronUp className="w-5 h-5" />
                )}
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-3">
                            {/* Buy/Sell Toggle */}
                            <div className="flex bg-white/[0.03] border border-white/5 rounded-xl p-1">
                                <button
                                    onClick={() => setSide('buy')}
                                    className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${isBuy
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            : 'text-zinc-500'
                                        }`}
                                >
                                    Buy
                                </button>
                                <button
                                    onClick={() => setSide('sell')}
                                    className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${!isBuy
                                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                            : 'text-zinc-500'
                                        }`}
                                >
                                    Sell
                                </button>
                            </div>

                            {/* Amount Input */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] text-zinc-500 font-bold uppercase px-1">
                                    <span>Amount (USD)</span>
                                    <span className="tabular-nums">
                                        Balance: ${balance?.toFixed(2) ?? '--'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => {
                                            setAmount(e.target.value);
                                            setError(null);
                                        }}
                                        placeholder="0.00"
                                        className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-lg font-bold text-white placeholder-zinc-700 outline-none focus:border-white/20 tabular-nums"
                                    />
                                    <button
                                        onClick={() => handlePercentage(1)}
                                        className="px-3 py-3 text-[10px] font-bold text-zinc-400 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.06] transition-colors uppercase"
                                    >
                                        Max
                                    </button>
                                </div>

                                {/* Quick Percentages */}
                                {isBuy && (
                                    <div className="flex gap-2">
                                        {[0.25, 0.5, 0.75].map((pct) => (
                                            <button
                                                key={pct}
                                                onClick={() => handlePercentage(pct)}
                                                className="flex-1 py-1.5 text-[10px] font-bold text-zinc-600 bg-white/[0.02] rounded-lg border border-white/5 hover:bg-white/[0.04] hover:text-zinc-400 transition-colors"
                                            >
                                                {pct * 100}%
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Estimation */}
                            {estimation && (
                                <div className="flex items-center justify-between text-[10px] px-1">
                                    <span className="text-zinc-500">
                                        ≈ {estimation.quantity.toFixed(4)} {assetName}
                                    </span>
                                    <span className="text-zinc-600">Fee: ${estimation.fee.toFixed(2)}</span>
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="text-[11px] text-rose-400 font-medium px-1">{error}</div>
                            )}

                            {/* Submit */}
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !amount}
                                className={`w-full h-12 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${isBuy
                                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                                        : 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-lg shadow-rose-900/30'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        {isBuy ? 'Buy Now' : 'Sell Now'}
                                        {isBuy ? (
                                            <TrendingUp className="w-4 h-4" />
                                        ) : (
                                            <TrendingDown className="w-4 h-4" />
                                        )}
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
