'use client';

import { motion } from 'framer-motion';
import { Zap, ExternalLink, Shield, Clock, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';

interface OracleLog {
    id: string;
    deltaPercent: number;
    confidence: number;
    summary: string | null;
    reasoning?: string | null;
    sourceUrls: string[];
    createdAt: string;
}

interface MobileOracleTerminalProps {
    oracleLogs: OracleLog[];
}

export function MobileOracleTerminal({ oracleLogs }: MobileOracleTerminalProps) {
    const sortedLogs = [...oracleLogs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (sortedLogs.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 p-8">
                <div className="p-4 bg-violet-500/10 rounded-2xl border border-violet-500/20 mb-4">
                    <Sparkles className="w-10 h-10 text-violet-400" />
                </div>
                <span className="text-sm font-bold text-zinc-500 mb-1">No AI Signals Yet</span>
                <span className="text-[10px] text-zinc-600 text-center">
                    The AI Oracle is analyzing market data.
                    <br />
                    Signals will appear here automatically.
                </span>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 pb-32 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2 px-1">
                <div className="flex items-center gap-1.5 text-violet-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">AI Oracle Feed</span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-violet-500/30 to-transparent" />
            </div>

            {sortedLogs.slice(0, 15).map((log, index) => {
                const delta = typeof log.deltaPercent === 'number' ? log.deltaPercent : 0;
                const conf = typeof log.confidence === 'number' ? log.confidence : 0;
                const summary = log.summary || 'Analyzing market conditions...';
                const reasoning = log.reasoning || null;
                const urls = Array.isArray(log.sourceUrls) ? log.sourceUrls.filter(Boolean) : [];
                const isPositive = delta >= 0;

                let dateStr = '';
                try {
                    const d = new Date(log.createdAt);
                    if (!isNaN(d.getTime())) {
                        dateStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                } catch { }

                // Confidence tier for visual treatment
                const confTier = conf >= 0.9 ? 'high' : conf >= 0.7 ? 'medium' : 'low';
                const confColors = {
                    high: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                    medium: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                    low: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                };

                return (
                    <motion.div
                        key={log.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-2xl p-4"
                    >
                        {/* Meta Row */}
                        <div className="flex items-center gap-2 mb-3">
                            <div className="flex items-center gap-1.5 text-zinc-600">
                                <Clock className="w-3 h-3" />
                                <span className="text-[10px] font-mono">{dateStr}</span>
                            </div>

                            <div
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isPositive
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : 'bg-rose-500/20 text-rose-400'
                                    }`}
                            >
                                {isPositive ? (
                                    <TrendingUp className="w-3 h-3" />
                                ) : (
                                    <TrendingDown className="w-3 h-3" />
                                )}
                                {isPositive ? '+' : ''}{delta.toFixed(2)}%
                            </div>

                            <div
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${confColors[confTier]}`}
                            >
                                <Shield className="w-3 h-3" />
                                {(conf * 100).toFixed(0)}%
                            </div>
                        </div>

                        {/* Summary */}
                        <p className="text-[12px] text-white font-medium leading-relaxed mb-2">
                            {summary}
                        </p>

                        {/* Reasoning (like desktop) */}
                        {reasoning && (
                            <div className="mb-3 p-3 bg-black/30 rounded-xl border border-white/5">
                                <p className="text-[11px] text-zinc-400 leading-relaxed">
                                    {reasoning}
                                </p>
                            </div>
                        )}

                        {/* Sources */}
                        {urls.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {urls.slice(0, 3).map((url, idx) => (
                                    <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 text-[9px] text-zinc-500 hover:text-violet-400 bg-white/[0.03] hover:bg-violet-500/10 px-2.5 py-1.5 rounded-lg border border-white/5 hover:border-violet-500/30 font-bold uppercase tracking-widest transition-all"
                                    >
                                        <ExternalLink className="w-2.5 h-2.5" />
                                        Source {idx + 1}
                                    </a>
                                ))}
                            </div>
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
}
