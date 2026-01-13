'use client';

import { useState } from 'react';
import { OrderForm } from './OrderForm';
import { PositionsList } from './PositionsList';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShieldAlert, TrendingUp } from 'lucide-react';

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
        <div className="flex flex-col h-auto max-h-full w-full">
            {/* Perspective Tabs (Premium Toggle) - Padded at top */}
            <div className="px-6 pt-8 pb-3">
                <div className="flex bg-black/40 rounded-2xl p-1 border border-white/5 relative shadow-inner">
                    <motion.div
                        className="absolute inset-y-1 bg-zinc-800 rounded-xl shadow-lg border border-white/10"
                        initial={false}
                        animate={{
                            left: view === 'trade' ? '4px' : '50%',
                            width: 'calc(50% - 4px)'
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                    <button
                        onClick={() => setView('trade')}
                        className={`flex-1 py-2 text-[10px] font-black tracking-[0.2em] relative z-10 transition-colors uppercase flex items-center justify-center gap-2 ${view === 'trade' ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <TrendingUp className="w-3.5 h-3.5" />
                        Trade
                    </button>
                    <button
                        onClick={() => setView('positions')}
                        className={`flex-1 py-2 text-[10px] font-black tracking-[0.2em] relative z-10 transition-colors uppercase flex items-center justify-center gap-2 ${view === 'positions' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <Activity className="w-3.5 h-3.5" />
                        Positions
                    </button>
                </div>
            </div>

            {/* Market Stats Grid - Refined */}
            {stats && (
                <div className="px-6 py-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 transition-all hover:bg-white/[0.04] group/stat shadow-sm">
                            <span className="text-[9px] text-zinc-500 block mb-1 uppercase tracking-[0.15em] font-black group-hover/stat:text-zinc-400 transition-colors">Market Cap</span>
                            <span className="text-sm font-black text-white font-mono tracking-tight">${(stats.marketCap / 1000000).toFixed(2)}M</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 transition-all hover:bg-white/[0.04] group/stat shadow-sm">
                            <span className="text-[9px] text-zinc-500 block mb-1 uppercase tracking-[0.15em] font-black group-hover/stat:text-zinc-400 transition-colors">Liquidity</span>
                            <span className="text-sm font-black text-white font-mono tracking-tight">${stats.liquidity.toLocaleString()}</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 transition-all hover:bg-white/[0.04] group/stat shadow-sm">
                            <span className="text-[9px] text-zinc-500 block mb-1 uppercase tracking-[0.15em] font-black group-hover/stat:text-zinc-400 transition-colors">Supply</span>
                            <span className="text-sm font-black text-white font-mono tracking-tight">{(stats.supply / 1000).toFixed(1)}K</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 transition-all hover:bg-white/[0.04] group/stat shadow-sm">
                            <span className="text-[9px] text-zinc-500 block mb-1 uppercase tracking-[0.15em] font-black group-hover/stat:text-zinc-400 transition-colors">24h Range</span>
                            <span className="text-[10px] font-black text-white font-mono leading-none tracking-tighter">
                                {stats.low24h && stats.high24h ? `$${stats.low24h.toFixed(1)}-$${stats.high24h.toFixed(1)}` : '-- / --'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 min-h-0 px-6 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                    {view === 'trade' ? (
                        <motion.div
                            key="trade"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.15 }}
                        >
                            <OrderForm
                                assetId={assetId}
                                assetPrice={assetPrice}
                                marketPrice={marketPrice}
                                assetSymbol={assetName}
                                onTradeSuccess={onTradeSuccess}
                            />

                            {/* Simplified Market Info */}
                            <p className="mt-8 text-[10px] text-zinc-500 font-medium text-center px-4 leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity">
                                Current volatility is <span className="text-zinc-400">NORMAL</span>. Bonding curve depth ensures liquidity for orders up to $10,000.
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="positions"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.15 }}
                            className="h-full"
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
