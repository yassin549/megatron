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
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-5 md:p-6 backdrop-blur-xl md:sticky md:top-36 z-30 shadow-2xl overflow-hidden">
            {/* Tabs */}
            <div className="flex bg-black/40 rounded-xl p-1 mb-6 relative border border-white/5">
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
                    className={`flex-1 py-3 text-[10px] md:text-xs font-black tracking-tighter relative z-10 transition-colors duration-300 uppercase ${isBuy ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    BUY {assetSymbol}
                </button>
                <button
                    onClick={() => setType('sell')}
                    className={`flex-1 py-3 text-[10px] md:text-xs font-black tracking-tighter relative z-10 transition-colors duration-300 uppercase ${!isBuy ? 'text-rose-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    SELL {assetSymbol}
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
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
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
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-5 text-2xl md:text-3xl font-mono text-white placeholder-zinc-800 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all font-bold"
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm text-zinc-600 font-black">
                                {isBuy ? 'USDC' : 'SHARES'}
                            </span>
                        </div>
                        {/* Presets */}
                        <div className="flex gap-2.5 mt-3">
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
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-5 mb-8 space-y-4 font-mono">
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
                        className={`w-full py-5 rounded-2xl font-black text-xs md:text-sm tracking-widest shadow-2xl transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed uppercase flex items-center justify-center gap-3
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
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${successModal.type === 'buy'
                        ? 'bg-emerald-500/20 border-emerald-500/50'
                        : 'bg-rose-500/20 border-rose-500/50'
                        }`}>
                        {successModal.type === 'buy' ? (
                            <TrendingUp className="w-8 h-8 text-emerald-400" />
                        ) : (
                            <TrendingDown className="w-8 h-8 text-rose-400" />
                        )}
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white text-center mb-2">
                    {successModal.type === 'buy' ? '✅ Buy Order Executed!' : '✅ Sell Order Executed!'}
                </h3>

                {/* Message */}
                <p className="text-zinc-400 text-center text-sm mb-6">
                    {successModal.type === 'buy'
                        ? `You bought ${successModal.shares.toFixed(4)} shares of ${assetSymbol}!`
                        : `You sold ${successModal.amount} shares of ${assetSymbol}!`
                    }
                </p>

                {/* Trade Details */}
                <div className="bg-black/30 border border-white/5 rounded-xl p-4 mb-6 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-zinc-500">Order Type</span>
                        <span className={`font-bold ${successModal.type === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {successModal.type.toUpperCase()}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-500">{successModal.type === 'buy' ? 'Amount Spent' : 'Shares Sold'}</span>
                        <span className="text-white font-mono">
                            {successModal.type === 'buy' ? `$${successModal.amount}` : successModal.amount}
                        </span>
                    </div>
                    {successModal.type === 'buy' && (
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Shares Received</span>
                            <span className="text-emerald-400 font-mono font-bold">{successModal.shares.toFixed(4)}</span>
                        </div>
                    )}
                    <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
                        <span className="text-zinc-500">Trade ID</span>
                        <span className="text-zinc-400 font-mono text-xs">{successModal.tradeId.slice(0, 8)}...</span>
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
                        className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm text-white transition-all flex items-center justify-center gap-2 ${successModal.type === 'buy'
                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400'
                            : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400'
                            }`}
                    >
                        <Wallet className="w-4 h-4" />
                        See Portfolio
                    </button>
                </div>
            </div>
        </div>
    )
}
        </>
    );
}

