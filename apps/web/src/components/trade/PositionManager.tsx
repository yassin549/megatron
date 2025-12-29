'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Target, Save, X, Info } from 'lucide-react';

interface PositionManagerProps {
    assetId: string;
    currentPrice: number;
    position: {
        shares: number;
        avgPrice: number;
        stopLoss: number | null;
        takeProfit: number | null;
    };
    onUpdate: () => void;
}

export function PositionManager({ assetId, currentPrice, position, onUpdate }: PositionManagerProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [sl, setSl] = useState(position.stopLoss?.toString() || '');
    const [tp, setTp] = useState(position.takeProfit?.toString() || '');
    const [loading, setLoading] = useState(false);

    const pnl = (currentPrice - position.avgPrice) * position.shares;
    const pnlPercent = ((currentPrice - position.avgPrice) / position.avgPrice) * 100;

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/trade/position', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetId,
                    stopLoss: sl ? parseFloat(sl) : null,
                    takeProfit: tp ? parseFloat(tp) : null,
                }),
            });
            if (res.ok) {
                setIsEditing(false);
                onUpdate();
            }
        } catch (error) {
            console.error('Failed to update position', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Your Position</h4>
                        <p className="text-[10px] text-zinc-500 font-mono">{position.shares.toFixed(4)} Shares</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-sm font-black font-mono ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                    </p>
                    <p className={`text-[10px] font-bold font-mono ${pnl >= 0 ? 'text-emerald-500/60' : 'text-rose-500/60'}`}>
                        {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Stop Loss */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Shield className="w-3 h-3 text-rose-500" />
                        Stop Loss
                    </label>
                    {isEditing ? (
                        <input
                            type="number"
                            value={sl}
                            onChange={(e) => setSl(e.target.value)}
                            placeholder="Price"
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500/40"
                        />
                    ) : (
                        <div className="bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300">
                            {position.stopLoss ? `$${position.stopLoss.toFixed(2)}` : 'Not Set'}
                        </div>
                    )}
                </div>

                {/* Take Profit */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Target className="w-3 h-3 text-emerald-500" />
                        Take Profit
                    </label>
                    {isEditing ? (
                        <input
                            type="number"
                            value={tp}
                            onChange={(e) => setTp(e.target.value)}
                            placeholder="Price"
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/40"
                        />
                    ) : (
                        <div className="bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300">
                            {position.takeProfit ? `$${position.takeProfit.toFixed(2)}` : 'Not Set'}
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-2">
                <AnimatePresence mode="wait">
                    {isEditing ? (
                        <motion.div
                            key="editing"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="flex gap-2"
                        >
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                            >
                                {loading ? 'Saving...' : <><Save className="w-3 h-3" /> Save Targets</>}
                            </button>
                        </motion.div>
                    ) : (
                        <motion.button
                            key="static"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            onClick={() => setIsEditing(true)}
                            className="w-full py-2 rounded-xl border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white text-[10px] font-bold uppercase transition-all"
                        >
                            Manage Targets
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/10 rounded-xl p-3">
                <Info className="w-3 h-3 text-blue-400 mt-0.5" />
                <p className="text-[9px] text-zinc-500 leading-tight">
                    Set Stop Loss and Take Profit levels to automatically close your position at target prices. Interactive chart lines will visualize your setup.
                </p>
            </div>
        </div>
    );
}
