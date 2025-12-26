'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface OrderFormProps {
    assetId: string;
    assetPrice: number;
    assetSymbol?: string;
}

export function OrderForm({ assetId, assetPrice, assetSymbol = 'Share' }: OrderFormProps) {
    const { status } = useSession();
    const router = useRouter();
    const [type, setType] = useState<'buy' | 'sell'>('buy');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [userBalance, setUserBalance] = useState(0);

    // Success modal state
    const [successModal, setSuccessModal] = useState<{
        show: boolean;
        type: 'buy' | 'sell';
        amount: string;
        shares: number;
        tradeId: string;
    }>({ show: false, type: 'buy', amount: '', shares: 0, tradeId: '' });

    // Fetch balance on mount/session load
    useEffect(() => {
        if (status === 'authenticated') {
            fetch('/api/user/me').then(res => res.json()).then(data => {
                if (data.walletHotBalance) setUserBalance(parseFloat(data.walletHotBalance));
            });
        }
    }, [status]);

    const isBuy = type === 'buy';
    const estimatedShares = amount ? parseFloat(amount) / assetPrice : 0;
    const fee = parseFloat(amount || '0') * 0.005; // 0.5% fee

    const handleTrade = async () => {
        if (!amount) return;
        setLoading(true);
        try {
            const res = await fetch('/api/trade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: type,
                    assetId: assetId,
                    amount: parseFloat(amount)
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSuccessModal({
                show: true,
                type: type,
                amount: amount,
                shares: estimatedShares,
                tradeId: data.tradeId
            });
            setAmount('');
        } catch (err: any) {
            alert(`Order failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setSuccessModal(prev => ({ ...prev, show: false }));
        window.location.reload();
    };

    const handleViewPortfolio = () => {
        router.push('/portfolio');
    };

    if (status !== 'authenticated') {
        return (
            <div className="bg-zinc-900 border border-white/5 rounded-2xl p-8 text-center backdrop-blur-xl shadow-2xl">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Trade Assets</h3>
                <p className="text-zinc-400 mb-8 max-w-xs mx-auto">Sign in to start trading and building your portfolio.</p>
                <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/40"
                >
                    Connect Wallet to Trade
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 md:p-5 backdrop-blur-xl md:sticky md:top-36 z-30 shadow-2xl overflow-hidden">
            {/* Tabs */}
            <div className="flex bg-black/40 rounded-xl p-1 mb-4 relative border border-white/5">
                <motion.div
                    className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-lg shadow-lg ${isBuy ? 'bg-emerald-500/20 shadow-emerald-500/10' : 'bg-rose-500/20 shadow-rose-500/10'}`}
                    animate={{
                        left: isBuy ? '4px' : 'calc(50% + 0px)',
                        width: 'calc(50% - 4px)'
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
                <button
                    onClick={() => setType('buy')}
                    className={`flex-1 py-2.5 text-[10px] md:text-xs font-black tracking-tighter relative z-10 transition-colors duration-300 uppercase ${isBuy ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    BUY
                </button>
                <button
                    onClick={() => setType('sell')}
                    className={`flex-1 py-2.5 text-[10px] md:text-xs font-black tracking-tighter relative z-10 transition-colors duration-300 uppercase ${!isBuy ? 'text-rose-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    SELL
                </button>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={type}
                    initial={{ opacity: 0, x: isBuy ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isBuy ? 20 : -20 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Input Area */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                {isBuy ? 'Invest Amount' : 'Quantity'}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-medium">
                                Balance: <span className="text-white font-mono">${userBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </span>
                        </div>
                        <div className="relative group">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-xl md:text-2xl font-mono text-white placeholder-zinc-800 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all font-bold"
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs text-zinc-600 font-black">
                                {isBuy ? 'USDC' : 'SHARES'}
                            </span>
                        </div>
                        {/* Presets */}
                        <div className="flex gap-2.5 mt-2">
                            {['10', '50', '250', 'MAX'].map((val) => (
                                <button
                                    key={val}
                                    onClick={() => setAmount(val === 'MAX' ? userBalance.toString() : val)}
                                    className="flex-1 py-2 text-[10px] font-mono font-black border border-white/5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white transition-all uppercase"
                                >
                                    {val === 'MAX' ? 'MAX' : `$${val}`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Order Details */}
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4 mb-6 space-y-4 font-mono">
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                            <span className="text-zinc-500 uppercase tracking-tighter">Current Price</span>
                            <span className="text-white font-bold">${assetPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] md:text-xs border-t border-white/5 pt-4">
                            <span className="text-zinc-500 uppercase tracking-tighter">{isBuy ? 'Est. Shares' : 'Est. Return'}</span>
                            <span className="text-white font-bold">
                                {isBuy ? estimatedShares.toFixed(4) : `$${(estimatedShares * assetPrice).toFixed(2)}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] border-t border-white/5 pt-4 opacity-50">
                            <span className="text-zinc-500 uppercase tracking-tighter">Trade Fee (0.5%)</span>
                            <span className="text-zinc-400 font-bold">${fee.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleTrade}
                        disabled={!amount || loading}
                        className={`w-full py-4 rounded-2xl font-black text-xs md:text-sm tracking-widest shadow-2xl transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed uppercase flex items-center justify-center gap-3
                            ${isBuy
                                ? 'bg-gradient-to-r from-emerald-700 to-emerald-500 text-white shadow-emerald-900/40 hover:from-emerald-600 hover:to-emerald-400'
                                : 'bg-gradient-to-r from-rose-700 to-rose-500 text-white shadow-rose-900/40 hover:from-rose-600 hover:to-rose-400'
                            }`}
                    >
                        {loading ? (
                            <span className="flex items-center gap-3">
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                                EXECUTING...
                            </span>
                        ) : (
                            <>
                                {isBuy ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                {isBuy ? 'PLACE BUY ORDER' : 'PLACE SELL ORDER'}
                            </>
                        )}
                    </button>
                </motion.div>
            </AnimatePresence>

            {/* Success Modal */}
            <AnimatePresence>
                {successModal.show && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                            onClick={handleCloseModal}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] text-center"
                        >
                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${successModal.type === 'buy' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                                }`}>
                                {successModal.type === 'buy' ? (
                                    <TrendingUp className="w-10 h-10 text-emerald-400" />
                                ) : (
                                    <TrendingDown className="w-10 h-10 text-rose-400" />
                                )}
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">
                                {successModal.type === 'buy' ? 'ORDER FILLED' : 'SALE EXECUTED'}
                            </h3>
                            <p className="text-zinc-400 text-sm mb-8 leading-relaxed font-medium">
                                {successModal.type === 'buy'
                                    ? `You successfully acquired ${successModal.shares.toFixed(4)} ${assetSymbol} shares.`
                                    : `You successfully sold ${successModal.amount} shares to the market.`
                                }
                            </p>
                            <div className="bg-black/40 rounded-2xl p-4 mb-8 border border-white/5">
                                <span className={`text-2xl font-mono font-black ${successModal.type === 'buy' ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                    {successModal.type === 'buy' ? '+' : '-'}{successModal.type === 'buy' ? successModal.shares.toFixed(2) : successModal.amount} SHARES
                                </span>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCloseModal}
                                    className="flex-1 py-4 bg-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/20 transition-all active:scale-[0.95]"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={handleViewPortfolio}
                                    className="flex-1 py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-[0.95]"
                                >
                                    Portfolio
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
