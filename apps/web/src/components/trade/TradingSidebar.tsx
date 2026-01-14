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
        <div className="flex flex-col h-full w-full overflow-hidden p-3 gap-3">
            {/* Header / Tabs Module */}
            <div className="bg-black/40 border border-white/5 rounded-2xl p-1 shadow-2xl shrink-0">
                <div className="flex bg-black/60 rounded-xl p-0.5 relative border border-white/5 shadow-inner">
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
                        className={`flex-1 py-1.5 text-[9px] font-black tracking-[0.2em] relative z-10 transition-colors uppercase flex items-center justify-center gap-2 ${view === 'trade' ? 'text-primary' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        <TrendingUp className="w-3 h-3" />
                        Execute
                    </button>
                    <button
                        onClick={() => setView('positions')}
                        className={`flex-1 py-1.5 text-[9px] font-black tracking-[0.2em] relative z-10 transition-colors uppercase flex items-center justify-center gap-2 ${view === 'positions' ? 'text-emerald-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        <Activity className="w-3 h-3" />
                        Vault
                    </button>
                </div>
            </div>

            {/* Asset Status Module */}
            {stats && (
                <div className="bg-black/40 border border-white/5 rounded-2xl p-3 shadow-2xl shrink-0">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-white/[0.03] pb-2 mb-2">
                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Market_Status</span>
                            <div className="flex gap-1">
                                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                <div className="w-1 h-1 rounded-full bg-emerald-500/20" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                            <div>
                                <span className="text-[8px] text-zinc-600 block mb-0.5 uppercase tracking-tighter font-black">Mkt_Cap</span>
                                <span className="text-[10px] font-black text-white font-mono tracking-tighter leading-none">${(stats.marketCap / 1000000).toFixed(2)}M</span>
                            </div>
                            <div>
                                <span className="text-[8px] text-zinc-600 block mb-0.5 uppercase tracking-tighter font-black">Liquidity</span>
                                <span className="text-[10px] font-black text-white font-mono tracking-tighter leading-none">${stats.liquidity.toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="text-[8px] text-zinc-600 block mb-0.5 uppercase tracking-tighter font-black">Supply</span>
                                <span className="text-[10px] font-black text-white font-mono tracking-tighter leading-none">{(stats.supply / 1000).toFixed(1)}K</span>
                            </div>
                            <div>
                                <span className="text-[8px] text-zinc-600 block mb-0.5 uppercase tracking-tighter font-black">24h_Range</span>
                                <span className="text-[9px] font-black text-zinc-300 font-mono tracking-tighter leading-none">
                                    {stats.low24h && stats.high24h ? `$${stats.low24h.toFixed(1)}-$${stats.high24h.toFixed(1)}` : '--/--'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Terminal Module - Main Content */}
            <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-1 shadow-2xl overflow-hidden flex flex-col relative">
                <div className="flex-1 overflow-hidden p-2">
                    <AnimatePresence mode="wait">
                        {view === 'trade' ? (
                            <motion.div
                                key="trade"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.15 }}
                                className="h-full flex flex-col"
                            >
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                                    <OrderForm
                                        assetId={assetId}
                                        assetPrice={assetPrice}
                                        marketPrice={marketPrice}
                                        assetSymbol={assetName}
                                        onTradeSuccess={onTradeSuccess}
                                    />
                                </div>

                                {/* Trace Footer */}
                                <div className="mt-2 pt-2 border-t border-white/[0.03] flex justify-between items-center px-1">
                                    <span className="text-[7px] text-zinc-600 font-black uppercase tracking-[0.2em] opacity-40">System_OK</span>
                                    <span className="text-[7px] text-zinc-600 font-black uppercase tracking-[0.2em] opacity-40">{assetId.slice(0, 8)}:LOG</span>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="positions"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
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
        </div>
    );
}
