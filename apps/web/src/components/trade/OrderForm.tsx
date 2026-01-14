'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Shield, Target } from 'lucide-react';
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
    const [type, setType] = useState<'buy' | 'sell'>('buy');
    const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
    const [amount, setAmount] = useState('');
    const [price, setPrice] = useState('');
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
    const fillPrice = assetPrice;
    const estimatedShares = amount ? parseFloat(amount) / fillPrice : 0;
    const spreadPercent = Math.abs(fillPrice - assetPrice) / assetPrice;
    const isHighSpread = spreadPercent > 0.05;

    const { showStatusModal } = useNotification();

    const handleTrade = async () => {
        if (!amount) return;
        setLoading(true);
        try {
            const slValue = stopLoss ? parseFloat(stopLoss) : null;
            const tpValue = takeProfit ? parseFloat(takeProfit) : null;

            if (orderType === 'market') {
                if (isBuy) {
                    if (slValue !== null && slValue >= fillPrice) throw new Error('SL must be below Entry Price.');
                    if (tpValue !== null && tpValue <= fillPrice) throw new Error('TP must be above Entry Price.');
                } else {
                    if (slValue !== null && slValue <= fillPrice) throw new Error('SL must be above Entry Price.');
                    if (tpValue !== null && tpValue >= fillPrice) throw new Error('TP must be below Entry Price.');
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
            } else {
                // Limit Order
                const priceValue = parseFloat(price);
                if (isNaN(priceValue) || priceValue <= 0) throw new Error('Invalid limit price');

                const res = await fetch('/api/order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        assetId,
                        side: type,
                        price: priceValue,
                        quantity: parseFloat(amount) / priceValue, // For limit orders, amount is usually USDC, but the API expects quantity. 
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
            }

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
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Trade Assets</h3>
                <p className="text-zinc-400 text-xs mb-4">Sign in to start trading.</p>
                <Link href="/login" className="flex items-center justify-center w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all text-xs">
                    Connect Wallet
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Buy/Sell Tabs - Institutional Style */}
            <div className="flex bg-black/60 rounded-xl p-0.5 relative border border-white/5 shadow-inner">
                <motion.div
                    className={`absolute inset-y-0.5 w-[calc(50%-2px)] rounded-lg shadow-md border border-white/5 ${isBuy ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}
                    animate={{ left: isBuy ? '2px' : 'calc(50%)' }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
                <button
                    onClick={() => setType('buy')}
                    className={`flex-1 py-1.5 text-[9px] font-black tracking-[0.2em] relative z-10 transition-colors uppercase ${isBuy ? 'text-emerald-400' : 'text-zinc-600'}`}
                >
                    BUY
                </button>
                <button
                    onClick={() => setType('sell')}
                    className={`flex-1 py-1.5 text-[9px] font-black tracking-[0.2em] relative z-10 transition-colors uppercase ${!isBuy ? 'text-rose-400' : 'text-zinc-600'}`}
                >
                    SELL
                </button>
            </div>

            {/* Market/Limit Tabs */}
            <div className="flex bg-black/60 rounded-xl p-0.5 relative border border-white/5 group/tabs">
                <motion.div
                    className="absolute inset-y-0.5 w-[calc(50%-2px)] rounded-lg bg-zinc-800/50 border border-white/5"
                    animate={{ left: orderType === 'market' ? '2px' : 'calc(50%)' }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
                <button
                    onClick={() => setOrderType('market')}
                    className={`flex-1 py-1 text-[8px] font-black tracking-widest relative z-10 transition-colors uppercase ${orderType === 'market' ? 'text-zinc-200' : 'text-zinc-600'}`}
                >
                    MARKET
                </button>
                <button
                    onClick={() => setOrderType('limit')}
                    className={`flex-1 py-1 text-[8px] font-black tracking-widest relative z-10 transition-colors uppercase ${orderType === 'limit' ? 'text-zinc-200' : 'text-zinc-600'}`}
                >
                    LIMIT
                </button>
            </div>

            {/* Price Info - Modular Snapshot */}
            <div className="bg-black/40 rounded-xl px-3 py-2 border border-white/5 space-y-1.5">
                <div className="flex justify-between items-center opacity-60">
                    <span className="text-[8px] text-zinc-500 font-black uppercase tracking-tighter">Market_Index</span>
                    <span className="text-[9px] text-white font-mono font-bold">${marketPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/[0.03] pt-1.5">
                    <span className="text-[8px] text-zinc-500 font-black uppercase tracking-tighter text-emerald-500/50">Execution_Est</span>
                    <span className={`text-[10px] font-mono font-black ${isHighSpread ? 'text-amber-400' : 'text-emerald-400'}`}>
                        ${assetPrice.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Amount & Limit Logic */}
            <div className="space-y-2">
                {orderType === 'limit' && (
                    <div>
                        <div className="flex justify-between items-center mb-1 px-1">
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">Target_Price</span>
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-black/60 border border-white/5 rounded-xl pl-3 pr-10 py-2.5 text-base font-mono text-white placeholder-zinc-900 focus:outline-none focus:border-blue-500/30 transition-all font-black shadow-inner"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-zinc-700 font-black">USDC</span>
                        </div>
                    </div>
                )}

                <div>
                    <div className="flex justify-between items-center mb-1 px-1">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">Allocated_Capital</span>
                        <span className="text-[8px] text-zinc-600 font-bold tracking-tighter">
                            AVL: <span className="text-zinc-400 font-mono">${userBalance.toFixed(1)}</span>
                        </span>
                    </div>
                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-black/60 border border-white/5 rounded-xl pl-3 pr-10 py-2.5 text-base font-mono text-white placeholder-zinc-900 focus:outline-none focus:border-blue-500/30 transition-all font-black shadow-inner"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-zinc-700 font-black">USDC</span>
                    </div>
                </div>
            </div>

            {/* SL/TP Inputs - Horizontal & Slim */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[8px] font-black text-rose-500/30 uppercase flex items-center gap-1 mb-1 px-1 tracking-tighter">
                        <Shield className="w-2.5 h-2.5" /> Stop_Loss
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={stopLoss}
                        onChange={(e) => setStopLoss(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-black/60 border border-white/5 rounded-lg px-2 py-1.5 text-[10px] font-mono text-white placeholder-zinc-900 focus:outline-none focus:border-rose-500/30 transition-all font-bold"
                    />
                </div>
                <div>
                    <label className="text-[8px] font-black text-emerald-500/30 uppercase flex items-center gap-1 mb-1 px-1 tracking-tighter">
                        <Target className="w-2.5 h-2.5" /> Take_Profit
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={takeProfit}
                        onChange={(e) => setTakeProfit(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-black/60 border border-white/5 rounded-lg px-2 py-1.5 text-[10px] font-mono text-white placeholder-zinc-900 focus:outline-none focus:border-emerald-500/30 transition-all font-bold"
                    />
                </div>
            </div>

            {/* Execution Button */}
            <button
                onClick={handleTrade}
                disabled={!amount || loading}
                className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-[0.97] disabled:opacity-20 flex items-center justify-center gap-2 shadow-2xl
                    ${isBuy
                        ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                        : 'bg-rose-500 text-black hover:bg-rose-400'
                    }`}
            >
                {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                    <>
                        {isBuy ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {isBuy ? 'Submit_Buy' : 'Submit_Sell'}
                    </>
                )}
            </button>
        </div>
    );
}
