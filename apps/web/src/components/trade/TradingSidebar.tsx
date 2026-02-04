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
    onExecutionPriceChange?: (price: number) => void;
    // For chart interaction
    activePositionId?: string | null;
    onSelectPosition?: (assetId: string | null) => void;
    totalSupply?: number;
    pricingParams?: { P0: number; k: number };
    sidebarContext?: string;
    userPosition?: {
        shares: number;
        avgPrice: number;
    } | null;
}

export function TradingSidebar({
    assetId,
    assetName,
    assetPrice,
    marketPrice,
    status,
    stats,
    onTradeSuccess,
    onExecutionPriceChange,
    activePositionId,
    onSelectPosition,
    totalSupply,
    pricingParams,
    sidebarContext = 'main',
    userPosition
}: TradingSidebarProps) {
    const [view, setView] = useState<'trade' | 'positions'>('trade');

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            {/* Header / Tabs Module - Aligned with Chart Header (h-58) */}
            <div className="h-[58px] border-b border-white/5 flex items-center justify-center shrink-0 bg-black/20">
                <div className="flex gap-10 h-full px-6">
                    <button
                        onClick={() => setView('trade')}
                        className={`group relative flex items-center h-full transition-all duration-300 text-[10px] font-black tracking-[0.2em] uppercase whitespace-nowrap px-1 ${view === 'trade'
                            ? 'text-white'
                            : 'text-zinc-600 hover:text-zinc-400'
                            }`}
                    >
                        <div className="flex items-center gap-2 relative z-10">
                            <TrendingUp className={`w-3.5 h-3.5 ${view === 'trade' ? 'text-primary' : 'opacity-40'}`} />
                            <span>Trade</span>
                        </div>
                        {view === 'trade' ? (
                            <motion.div
                                layoutId={`${sidebarContext}-sidebar-underline`}
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                            />
                        ) : (
                            <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-primary/0 group-hover:bg-primary/30 transition-all duration-300 transform scale-x-0 group-hover:scale-x-100" />
                        )}
                    </button>
                    <button
                        onClick={() => setView('positions')}
                        className={`group relative flex items-center h-full transition-all duration-300 text-[10px] font-black tracking-[0.2em] uppercase whitespace-nowrap px-1 ${view === 'positions'
                            ? 'text-white'
                            : 'text-zinc-600 hover:text-zinc-400'
                            }`}
                    >
                        <div className="flex items-center gap-2 relative z-10">
                            <Activity className={`w-3.5 h-3.5 ${view === 'positions' ? 'text-emerald-400' : 'opacity-40'}`} />
                            <span>Positions</span>
                        </div>
                        {view === 'positions' ? (
                            <motion.div
                                layoutId={`${sidebarContext}-sidebar-underline`}
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]"
                            />
                        ) : (
                            <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-emerald-500/0 group-hover:bg-emerald-500/30 transition-all duration-300 transform scale-x-0 group-hover:scale-x-100" />
                        )}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden p-3 pt-1 gap-3">
                {/* Terminal Module - Main Content */}
                <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-1 shadow-2xl overflow-hidden flex flex-col relative">

                    {/* High-Density Status Ribbon - Single Line Aligned */}
                    {stats && (
                        <div className="flex items-center gap-6 px-4 py-2 bg-white/[0.02] border-b border-white/5 overflow-x-auto no-scrollbar shrink-0">
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[7px] font-black text-primary uppercase tracking-widest">Market_Status</span>
                                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            </div>

                            <div className="flex items-center gap-4 text-[9px] font-mono whitespace-nowrap">
                                <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                                    <span className="text-zinc-600 font-bold uppercase text-[7px]">Mkt_Cap:</span>
                                    <span className="text-white font-black">${(Number(stats.marketCap || 0) / 1000000).toFixed(2)}M</span>
                                </div>
                                <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                                    <span className="text-zinc-600 font-bold uppercase text-[7px]">Liquidity:</span>
                                    <span className="text-white font-black">${Number(stats.liquidity || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                                    <span className="text-zinc-600 font-bold uppercase text-[7px]">Supply:</span>
                                    <span className="text-white font-black">{(Number(stats.supply || 0) / 1000).toFixed(1)}K</span>
                                </div>
                                <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                                    <span className="text-zinc-600 font-bold uppercase text-[7px]">24h_Range:</span>
                                    <span className="text-zinc-300 font-black">
                                        {stats.low24h !== undefined && stats.high24h !== undefined ? `$${Number(stats.low24h).toFixed(1)}-$${Number(stats.high24h).toFixed(1)}` : '--/--'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

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
                                            onExecutionPriceChange={onExecutionPriceChange}
                                            totalSupply={totalSupply}
                                            pricingParams={pricingParams}
                                            userPosition={userPosition}
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
        </div>
    );
}
