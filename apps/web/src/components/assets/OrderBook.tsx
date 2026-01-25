'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OrderBookEntry {
    price: number;
    amount: number;
    total: number;
}

interface OrderBookProps {
    assetId: string;
    assetPrice: number;
}

export function OrderBook({ assetId, assetPrice }: OrderBookProps) {
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
        const interval = setInterval(fetchOrderBook, 5000);
        return () => clearInterval(interval);
    }, [assetId]);

    const { processedAsks, processedBids } = useMemo(() => {
        const priceNum = Number(assetPrice || 0);
        if (priceNum <= 0) return { processedAsks: [], processedBids: [] };

        const step = Math.max(0.01, Number((priceNum * 0.001).toFixed(2)));
        const gridAsks: OrderBookEntry[] = [];
        const gridBids: OrderBookEntry[] = [];

        for (let i = 1; i <= 7; i++) {
            const price = Number((priceNum + (i * step)).toFixed(2));
            const amount = rawAsks
                .filter(o => Math.abs(Number(o.price || 0) - price) <= step / 2)
                .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
            gridAsks.push({ price, amount, total: 0 });
        }

        for (let i = 1; i <= 7; i++) {
            const price = Number((priceNum - (i * step)).toFixed(2));
            const amount = rawBids
                .filter(o => Math.abs(Number(o.price || 0) - price) <= step / 2)
                .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
            gridBids.push({ price, amount, total: 0 });
        }

        let askSum = 0;
        const asksWithTotal = [...gridAsks].map(a => {
            askSum += a.amount;
            return { ...a, total: askSum };
        });

        let bidSum = 0;
        const bidsWithTotal = gridBids.map(b => {
            bidSum += b.amount;
            return { ...b, total: bidSum };
        });

        return {
            processedAsks: asksWithTotal.reverse(),
            processedBids: bidsWithTotal
        };
    }, [assetPrice, rawAsks, rawBids]);

    const spread = useMemo(() => {
        // Use RAW orders for true market spread
        if (rawAsks.length === 0 || rawBids.length === 0) return { val: 0, pct: 0 };

        // API returns Asks sorted Ascending (Cheapest First) -> [0] is Best Ask
        // API returns Bids sorted Descending (Highest First) -> [0] is Best Bid
        const bestAsk = rawAsks[0].price;
        const bestBid = rawBids[0].price;

        // If crossed or equal, spread is 0 or negative (shouldn't happen with matching engine but UI should handle it)
        const val = Math.max(0, bestAsk - bestBid);
        const pct = bestAsk > 0 ? (val / bestAsk) * 100 : 0;

        return { val, pct };
    }, [rawAsks, rawBids]);

    const maxTotal = useMemo(() => {
        const askMax = processedAsks.length > 0 ? Math.max(...processedAsks.map(a => a.total)) : 0;
        const bidMax = processedBids.length > 0 ? Math.max(...processedBids.map(b => b.total)) : 0;
        return Math.max(askMax, bidMax, 1);
    }, [processedAsks, processedBids]);

    if (loading && rawBids.length === 0 && rawAsks.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-black/40 border border-white/5 rounded-2xl animate-pulse">
                <span className="text-[9px] text-zinc-600 font-black tracking-widest uppercase">Syncing_Book...</span>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-black/40 border border-white/5 rounded-2xl font-mono text-[10px] select-none overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="grid grid-cols-3 px-3 py-2 border-b border-white/5 text-zinc-500 font-black uppercase tracking-tighter bg-white/[0.02]">
                <span>Price</span>
                <span className="text-right">Size</span>
                <span className="text-right">Sum</span>
            </div>

            {/* Asks (Sells) - Red */}
            <div className="flex-1 flex flex-col-reverse justify-end overflow-hidden custom-scrollbar py-1">
                <AnimatePresence initial={false}>
                    {processedAsks.map((order, i) => (
                        <motion.div
                            key={`ask-${order.price}`}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="relative group hover:bg-white/[0.02] cursor-pointer h-[18px] flex items-center"
                        >
                            <div
                                className="absolute right-0 inset-y-0 bg-rose-500/10 transition-all duration-300"
                                style={{ width: `${(order.total / maxTotal) * 100}%` }}
                            />
                            <div className="grid grid-cols-3 w-full px-3 relative z-10">
                                <span className="text-rose-400 font-bold">${Number(order.price || 0).toFixed(2)}</span>
                                <span className="text-right text-zinc-400">{order.amount === 0 ? '--' : Number(order.amount || 0).toFixed(1)}</span>
                                <span className="text-right text-zinc-500">{order.amount === 0 ? '--' : Number(order.total || 0).toFixed(0)}</span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Price & Spread Info */}
            <div className="px-3 py-2 border-y border-white/10 bg-white/[0.02] flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-sm font-black text-white leading-none">${Number(assetPrice || 0).toFixed(2)}</span>
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-tighter mt-0.5">Mark Price</span>
                </div>
                <div className="text-right">
                    <span className="text-zinc-500 uppercase font-bold tracking-tighter">Spread</span>
                    <div className="flex items-center gap-1.5 justify-end mt-0.5">
                        <span className="text-white font-bold">${Number(spread.val || 0).toFixed(2)}</span>
                        <span className="text-zinc-600">({Number(spread.pct || 0).toFixed(2)}%)</span>
                    </div>
                </div>
            </div>

            {/* Bids (Buys) - Green */}
            <div className="flex-1 overflow-hidden custom-scrollbar py-1">
                <AnimatePresence initial={false}>
                    {processedBids.map((order, i) => (
                        <motion.div
                            key={`bid-${order.price}`}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="relative group hover:bg-white/[0.02] cursor-pointer h-[18px] flex items-center"
                        >
                            <div
                                className="absolute right-0 inset-y-0 bg-emerald-500/10 transition-all duration-300"
                                style={{ width: `${(order.total / maxTotal) * 100}%` }}
                            />
                            <div className="grid grid-cols-3 w-full px-3 relative z-10">
                                <span className="text-emerald-400 font-bold">${Number(order.price || 0).toFixed(2)}</span>
                                <span className="text-right text-zinc-400">{order.amount === 0 ? '--' : Number(order.amount || 0).toFixed(1)}</span>
                                <span className="text-right text-zinc-500">{order.amount === 0 ? '--' : Number(order.total || 0).toFixed(0)}</span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Footer / Context */}
            <div className="px-3 py-1.5 border-t border-white/5 bg-black/40 flex items-center justify-between">
                <span className="text-[8px] uppercase font-black tracking-widest text-zinc-500 opacity-40">Live_Liquidity</span>
                <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="w-1 h-1 rounded-full bg-emerald-500/40" />
                    <div className="w-1 h-1 rounded-full bg-emerald-500/20" />
                </div>
            </div>
        </div>
    );
}
