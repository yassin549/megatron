'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeAssetData } from '@/hooks/useRealtimeAssetData';
import { BookOpen, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MobileOrderBookProps {
    assetId: string;
    assetPrice: number;
}

interface OrderBookEntry {
    price: number;
    amount: number;
    total: number;
}

export function MobileOrderBook({ assetId, assetPrice }: MobileOrderBookProps) {
    const { orderbookCounter } = useRealtimeAssetData(assetId, assetPrice);
    const [rawBids, setRawBids] = useState<any[]>([]);
    const [rawAsks, setRawAsks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    async function fetchOrderBook() {
        try {
            const res = await fetch(`/api/order?assetId=${assetId}`);
            if (res.ok) {
                const data = await res.json();
                setRawAsks(data.asks || []);
                setRawBids(data.bids || []);
            }
        } catch (error) {
            console.error('Failed to fetch orderbook', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        setLoading(true);
        fetchOrderBook();
    }, [assetId, orderbookCounter]);

    const { processedAsks, processedBids } = useMemo(() => {
        const priceNum = Number(assetPrice || 0);
        if (priceNum <= 0) return { processedAsks: [], processedBids: [] };

        const step = Math.max(0.01, Number((priceNum * 0.001).toFixed(2)));
        const gridAsks: OrderBookEntry[] = [];
        const gridBids: OrderBookEntry[] = [];

        for (let i = 1; i <= 8; i++) {
            const price = Number((priceNum + i * step).toFixed(2));
            const amount = rawAsks
                .filter((o) => Math.abs(Number(o.price || 0) - price) <= step / 2)
                .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
            gridAsks.push({ price, amount, total: 0 });
        }

        for (let i = 1; i <= 8; i++) {
            const price = Number((priceNum - i * step).toFixed(2));
            const amount = rawBids
                .filter((o) => Math.abs(Number(o.price || 0) - price) <= step / 2)
                .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
            gridBids.push({ price, amount, total: 0 });
        }

        let askSum = 0;
        const asksWithTotal = [...gridAsks].map((a) => {
            askSum += a.amount;
            return { ...a, total: askSum };
        });

        let bidSum = 0;
        const bidsWithTotal = gridBids.map((b) => {
            bidSum += b.amount;
            return { ...b, total: bidSum };
        });

        return {
            processedAsks: asksWithTotal.reverse(),
            processedBids: bidsWithTotal,
        };
    }, [assetPrice, rawAsks, rawBids]);

    const spread = useMemo(() => {
        if (rawAsks.length === 0 || rawBids.length === 0) return { val: 0, pct: 0 };
        const bestAsk = rawAsks[0].price;
        const bestBid = rawBids[0].price;
        const val = Math.max(0, bestAsk - bestBid);
        const pct = bestAsk > 0 ? (val / bestAsk) * 100 : 0;
        return { val, pct };
    }, [rawAsks, rawBids]);

    const maxTotal = useMemo(() => {
        const askMax = processedAsks.length > 0 ? Math.max(...processedAsks.map((a) => a.total)) : 0;
        const bidMax = processedBids.length > 0 ? Math.max(...processedBids.map((b) => b.total)) : 0;
        return Math.max(askMax, bidMax, 1);
    }, [processedAsks, processedBids]);

    if (loading && rawBids.length === 0 && rawAsks.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-3">
                <BookOpen className="w-8 h-8 text-zinc-700 animate-pulse" />
                <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                    Loading Order Book...
                </span>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col font-mono text-[11px] select-none pb-28 bg-gradient-to-b from-transparent to-black/20">
            {/* Header */}
            <div className="grid grid-cols-3 px-4 py-3 text-zinc-500 font-bold uppercase tracking-tight border-b border-white/5 bg-black/40">
                <span className="flex items-center gap-1.5 pl-14">
                    <div className="w-1 h-3 rounded-full bg-gradient-to-b from-rose-500 to-emerald-500" />
                    Price
                </span>
                <span className="text-right">Size</span>
                <span className="text-right">Total</span>
            </div>

            {/* Asks (Sell Orders) */}
            <div className="flex-1 flex flex-col-reverse justify-end overflow-hidden">
                <AnimatePresence initial={false}>
                    {processedAsks.map((order, idx) => (
                        <motion.div
                            key={`ask-${order.price}`}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            className="relative h-9 flex items-center group"
                        >
                            <div
                                className="absolute right-0 inset-y-0 bg-gradient-to-l from-rose-500/15 to-transparent transition-all"
                                style={{ width: `${(order.total / maxTotal) * 100}%` }}
                            />
                            <div className="grid grid-cols-3 w-full px-4 relative z-10">
                                <span className="text-rose-400 font-bold flex items-center gap-1 pl-14">
                                    <ArrowUpRight className="w-3 h-3 opacity-40" />
                                    ${order.price.toFixed(2)}
                                </span>
                                <span className={`text-right transition-colors ${order.amount > 0 ? 'text-zinc-300' : 'text-zinc-600'}`}>
                                    {order.amount === 0 ? '—' : order.amount.toFixed(2)}
                                </span>
                                <span className={`text-right transition-colors ${order.amount > 0 ? 'text-zinc-400' : 'text-zinc-700'}`}>
                                    {order.amount === 0 ? '—' : order.total.toFixed(0)}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Central Price / Spread */}
            <div className="px-4 py-3 border-y border-white/10 bg-gradient-to-r from-white/[0.03] to-transparent flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-white tabular-nums">
                        ${assetPrice.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Mark</span>
                </div>
                <div className="flex items-center gap-2 text-right">
                    <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest">Spread</span>
                    <span className="text-sm text-white font-bold tabular-nums">${spread.val.toFixed(2)}</span>
                    <span className="text-xs text-zinc-500 tabular-nums">({spread.pct.toFixed(2)}%)</span>
                </div>
            </div>

            {/* Bids (Buy Orders) */}
            <div className="flex-1 overflow-hidden">
                <AnimatePresence initial={false}>
                    {processedBids.map((order, idx) => (
                        <motion.div
                            key={`bid-${order.price}`}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            className="relative h-9 flex items-center group"
                        >
                            <div
                                className="absolute right-0 inset-y-0 bg-gradient-to-l from-emerald-500/15 to-transparent transition-all"
                                style={{ width: `${(order.total / maxTotal) * 100}%` }}
                            />
                            <div className="grid grid-cols-3 w-full px-4 relative z-10">
                                <span className="text-emerald-400 font-bold flex items-center gap-1 pl-14">
                                    <ArrowDownRight className="w-3 h-3 opacity-40" />
                                    ${order.price.toFixed(2)}
                                </span>
                                <span className={`text-right transition-colors ${order.amount > 0 ? 'text-zinc-300' : 'text-zinc-600'}`}>
                                    {order.amount === 0 ? '—' : order.amount.toFixed(2)}
                                </span>
                                <span className={`text-right transition-colors ${order.amount > 0 ? 'text-zinc-400' : 'text-zinc-700'}`}>
                                    {order.amount === 0 ? '—' : order.total.toFixed(0)}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
