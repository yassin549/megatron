'use client';

import { useState } from 'react';
import { OrderForm } from './OrderForm';
import { PositionsList } from './PositionsList';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, TrendingUp } from 'lucide-react';

interface TradingSidebarProps {
    assetId: string;
    assetName: string;
    assetPrice: number;
    marketPrice: number;
    status: string;
    stats?: {
        marketCap: number;
        liquidity: number;
        supply: number;
        low24h?: number;
        high24h?: number;
    };
    onTradeSuccess?: () => void;
    // For chart interaction
    activePositionId?: string | null;
    onSelectPosition?: (assetId: string | null) => void;
}

export function TradingSidebar({
    assetId,
    assetName,
    assetPrice,
    marketPrice,
    status,
    stats,
    onTradeSuccess,
    activePositionId,
    onSelectPosition
}: TradingSidebarProps) {
    const [view, setView] = useState<'trade' | 'positions'>('trade');

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            {/* Perspective Tabs - Tightened Top Padding */}
            <div className="px-6 pt-4 pb-2">
                <div className="flex bg-black/40 rounded-xl p-0.5 border border-white/5 relative shadow-inner">
                    <motion.div
                        className="absolute inset-y-0.5 bg-zinc-800 rounded-lg shadow-lg border border-white/5"
                        initial={false}
                        animate={{
                            left: view === 'trade' ? '2px' : '50%',
                            width: 'calc(50% - 2px)'
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                    <button
                        onClick={() => setView('trade')}
                        className={`flex-1 py-2 text-[9px] font-black tracking-[0.2em] relative z-10 transition-colors uppercase flex items-center justify-center gap-2 ${view === 'trade' ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <TrendingUp className="w-3 h-3" />
                        Trade
                    </button>
                    <button
                        onClick={() => setView('positions')}
                        className={`flex-1 py-2 text-[9px] font-black tracking-[0.2em] relative z-10 transition-colors uppercase flex items-center justify-center gap-2 ${view === 'positions' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <Activity className="w-3 h-3" />
                        Positions
                    </button>
                </div>
            </div>

            {/* Market Stats Grid - Compressed Layout */}
            {stats && (
                <div className="px-6 py-2">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-8">
                        <div className="transition-all group/stat">
                            <span className="text-[8px] text-zinc-500 block mb-0.5 uppercase tracking-tighter font-black opacity-60">Market Cap</span>
                            <span className="text-xs font-black text-white font-mono tracking-tight leading-none">${(stats.marketCap / 1000000).toFixed(2)}M</span>
                        </div>
                        <div className="transition-all group/stat">
                            <span className="text-[8px] text-zinc-500 block mb-0.5 uppercase tracking-tighter font-black opacity-60">Liquidity</span>
                            <span className="text-xs font-black text-white font-mono tracking-tight leading-none">${stats.liquidity.toLocaleString()}</span>
                        </div>
                        <div className="transition-all group/stat">
                            <span className="text-[8px] text-zinc-500 block mb-0.5 uppercase tracking-tighter font-black opacity-60">Supply</span>
                            <span className="text-xs font-black text-white font-mono tracking-tight leading-none">{(stats.supply / 1000).toFixed(1)}K</span>
                        </div>
                        <div className="transition-all group/stat">
                            <span className="text-[8px] text-zinc-500 block mb-0.5 uppercase tracking-tighter font-black opacity-60">24h Range</span>
                            <span className="text-[10px] font-black text-white font-mono tracking-tighter leading-none">
                                {stats.low24h && stats.high24h ? `$${stats.low24h.toFixed(1)}-$${stats.high24h.toFixed(1)}` : '-- / --'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Area - Lock Down Scroll */}
            <div className="flex-1 px-6 pt-2 pb-4 overflow-hidden">
                <AnimatePresence mode="wait">
                    {view === 'trade' ? (
                        <motion.div
                            key="trade"
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 5 }}
                            transition={{ duration: 0.15 }}
                            className="h-full flex flex-col"
                        >
                            <OrderForm
                                assetId={assetId}
                                assetPrice={assetPrice}
                                marketPrice={marketPrice}
                                assetSymbol={assetName}
                                onTradeSuccess={onTradeSuccess}
                            />

                            {/* Ultra Minimalist Market Context */}
                            <div className="mt-4 text-center">
                                <span className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] opacity-40">Volatility: NORMAL</span>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="positions"
                            initial={{ opacity: 0, x: 5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -5 }}
                            transition={{ duration: 0.15 }}
                            className="h-full overflow-y-auto custom-scrollbar"
                        >
                            <PositionsList
                                currentAssetId={assetId}
                                activePositionId={activePositionId}
                                onSelectPosition={onSelectPosition}
                                onActionSuccess={onTradeSuccess}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
