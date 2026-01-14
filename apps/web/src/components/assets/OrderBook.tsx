'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface OrderBookEntry {
    price: number;
    amount: number;
    total: number;
}

interface OrderBookProps {
    assetPrice: number;
}

export function OrderBook({ assetPrice }: OrderBookProps) {
    // Generate static mock data representing a professional orderbook
    const { asks, bids, spread, spreadPercent } = useMemo(() => {
        const askPrices = Array.from({ length: 12 }, (_, i) => assetPrice + (i + 1) * 0.02).reverse();
        const bidPrices = Array.from({ length: 12 }, (_, i) => assetPrice - (i + 1) * 0.02);

        let askTotal = 0;
        const asks: OrderBookEntry[] = askPrices.map(price => {
            const amount = Math.random() * 500 + 100;
            askTotal += amount;
            return { price, amount, total: askTotal };
        });

        let bidTotal = 0;
        const bids: OrderBookEntry[] = bidPrices.map(price => {
            const amount = Math.random() * 500 + 100;
            bidTotal += amount;
            return { price, amount, total: bidTotal };
        });

        const bestAsk = asks[asks.length - 1].price;
        const bestBid = bids[0].price;
        const spread = bestAsk - bestBid;
        const spreadPercent = (spread / bestAsk) * 100;

        return { asks, bids, spread, spreadPercent };
    }, [assetPrice]);

    const maxTotal = Math.max(
        asks[0].total,
        bids[bids.length - 1].total
    );

    return (
        <div className="h-full flex flex-col bg-black/40 border-r border-white/5 font-mono text-[10px] select-none overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 px-3 py-2 border-b border-white/5 text-zinc-500 font-black uppercase tracking-tighter">
                <span>Price</span>
                <span className="text-right">Size</span>
                <span className="text-right">Sum</span>
            </div>

            {/* Asks (Sells) - Red */}
            <div className="flex-1 flex flex-col-reverse justify-end overflow-hidden custom-scrollbar">
                {asks.map((order, i) => (
                    <div key={`ask-${i}`} className="relative group hover:bg-white/[0.02] cursor-pointer h-[18px] flex items-center">
                        <div
                            className="absolute right-0 inset-y-0 bg-rose-500/10 transition-all duration-300"
                            style={{ width: `${(order.total / maxTotal) * 100}%` }}
                        />
                        <div className="grid grid-cols-3 w-full px-3 relative z-10">
                            <span className="text-rose-400 font-bold">${order.price.toFixed(2)}</span>
                            <span className="text-right text-zinc-400">{order.amount.toFixed(1)}</span>
                            <span className="text-right text-zinc-500">{order.total.toFixed(0)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Spread Info */}
            <div className="px-3 py-2 border-y border-white/10 bg-white/[0.02] flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-sm font-black text-white leading-none">${assetPrice.toFixed(2)}</span>
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-tighter mt-0.5">Mark Price</span>
                </div>
                <div className="text-right">
                    <span className="text-zinc-500 uppercase font-bold tracking-tighter">Spread</span>
                    <div className="flex items-center gap-1.5 justify-end mt-0.5">
                        <span className="text-white font-bold">${spread.toFixed(2)}</span>
                        <span className="text-zinc-600">({spreadPercent.toFixed(2)}%)</span>
                    </div>
                </div>
            </div>

            {/* Bids (Buys) - Green */}
            <div className="flex-1 overflow-hidden custom-scrollbar">
                {bids.map((order, i) => (
                    <div key={`bid-${i}`} className="relative group hover:bg-white/[0.02] cursor-pointer h-[18px] flex items-center">
                        <div
                            className="absolute right-0 inset-y-0 bg-emerald-500/10 transition-all duration-300"
                            style={{ width: `${(order.total / maxTotal) * 100}%` }}
                        />
                        <div className="grid grid-cols-3 w-full px-3 relative z-10">
                            <span className="text-emerald-400 font-bold">${order.price.toFixed(2)}</span>
                            <span className="text-right text-zinc-400">{order.amount.toFixed(1)}</span>
                            <span className="text-right text-zinc-500">{order.total.toFixed(0)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer / Context */}
            <div className="px-3 py-1.5 border-t border-white/5 bg-black/40 flex items-center justify-between opacity-40">
                <span className="text-[8px] uppercase font-black tracking-widest text-zinc-500">Live_Liquidity</span>
                <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="w-1 h-1 rounded-full bg-emerald-500/40" />
                    <div className="w-1 h-1 rounded-full bg-emerald-500/20" />
                </div>
            </div>
        </div>
    );
}
