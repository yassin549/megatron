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
    onTradeSuccess,
    activePositionId,
    onSelectPosition
}: TradingSidebarProps) {
    const [view, setView] = useState<'trade' | 'positions'>('trade');

    return (
        <div className="flex flex-col h-auto max-h-full w-full">
            {/* Perspective Tabs (Premium Toggle) - Padded at top */}
            <div className="px-5 pt-6 pb-2">
                <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 relative">
                    <motion.div
                        className="absolute inset-y-1 bg-zinc-800 rounded-lg shadow-lg border border-white/5"
                        initial={false}
                        animate={{
                            left: view === 'trade' ? '4px' : '50%',
                            width: 'calc(50% - 4px)'
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                    <button
                        onClick={() => setView('trade')}
                        className={`flex-1 py-2.5 text-[10px] font-black tracking-[0.2em] relative z-10 transition-colors uppercase flex items-center justify-center gap-2 ${view === 'trade' ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <TrendingUp className="w-3.5 h-3.5" />
                        Trade
                    </button>
                    <button
                        onClick={() => setView('positions')}
                        className={`flex-1 py-2.5 text-[10px] font-black tracking-[0.2em] relative z-10 transition-colors uppercase flex items-center justify-center gap-2 ${view === 'positions' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <Activity className="w-3.5 h-3.5" />
                        Positions
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 px-5 overflow-y-auto custom-scrollbar">
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

                            {/* Pro-Tips / Market Status Hook */}
                            {/* Market Status Helper */}
                            <div className="mt-6 px-4">
                                <p className="text-[10px] text-zinc-500 text-center leading-relaxed">
                                    Current volatility is <span className="font-bold text-zinc-400">NORMAL</span>. Bonding curve depth ensures liquidity for orders up to $10,000.
                                </p>
                            </div>
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
