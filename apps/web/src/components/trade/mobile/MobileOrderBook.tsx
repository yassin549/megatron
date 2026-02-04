'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeAssetData } from '@/hooks/useRealtimeAssetData';

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

        for (let i = 1; i <= 5; i++) {
            const price = Number((priceNum + i * step).toFixed(2));
            const amount = rawAsks
                .filter((o) => Math.abs(Number(o.price || 0) - price) <= step / 2)
                .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
            gridAsks.push({ price, amount, total: 0 });
        }

        for (let i = 1; i <= 5; i++) {
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
            <div className="h-full flex items-center justify-center">
                <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest animate-pulse">
                    Loading...
                </span>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col font-mono text-[10px] select-none">
            {/* Header */}
            <div className="grid grid-cols-3 px-3 py-2 text-zinc-500 font-bold uppercase tracking-tight border-b border-white/5">
                <span>Price</span>
                <span className="text-right">Size</span>
                <span className="text-right">Total</span>
            </div>

            {/* Asks */}
            <div className="flex-1 flex flex-col-reverse justify-end overflow-hidden">
                <AnimatePresence initial={false}>
                    {processedAsks.map((order) => (
                        <motion.div
                            key={`ask-${order.price}`}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="relative h-7 flex items-center"
                        >
                            <div
                                className="absolute right-0 inset-y-0 bg-rose-500/10"
                                style={{ width: `${(order.total / maxTotal) * 100}%` }}
                            />
                            <div className="grid grid-cols-3 w-full px-3 relative z-10">
                                <span className="text-rose-400 font-bold">${order.price.toFixed(2)}</span>
                                <span className="text-right text-zinc-400">
                                    {order.amount === 0 ? '--' : order.amount.toFixed(1)}
                                </span>
                                <span className="text-right text-zinc-500">
                                    {order.amount === 0 ? '--' : order.total.toFixed(0)}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Spread */}
            <div className="px-3 py-2 border-y border-white/10 bg-white/[0.02] flex items-center justify-between">
                <div>
                    <span className="text-sm font-black text-white">${assetPrice.toFixed(2)}</span>
                    <span className="text-[8px] text-zinc-500 uppercase ml-1.5">Mark</span>
                </div>
                <div className="text-right">
                    <span className="text-[8px] text-zinc-500 uppercase mr-1.5">Spread</span>
                    <span className="text-white font-bold">${spread.val.toFixed(2)}</span>
                    <span className="text-zinc-600 ml-1">({spread.pct.toFixed(2)}%)</span>
                </div>
            </div>

            {/* Bids */}
            <div className="flex-1 overflow-hidden">
                <AnimatePresence initial={false}>
                    {processedBids.map((order) => (
                        <motion.div
                            key={`bid-${order.price}`}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="relative h-7 flex items-center"
                        >
                            <div
                                className="absolute right-0 inset-y-0 bg-emerald-500/10"
                                style={{ width: `${(order.total / maxTotal) * 100}%` }}
                            />
                            <div className="grid grid-cols-3 w-full px-3 relative z-10">
                                <span className="text-emerald-400 font-bold">${order.price.toFixed(2)}</span>
                                <span className="text-right text-zinc-400">
                                    {order.amount === 0 ? '--' : order.amount.toFixed(1)}
                                </span>
                                <span className="text-right text-zinc-500">
                                    {order.amount === 0 ? '--' : order.total.toFixed(0)}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
