'use client';

import { motion } from 'framer-motion';
import { Zap, ExternalLink, Shield, Clock, TrendingUp, TrendingDown, Sparkles, Brain, Target } from 'lucide-react';

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
                    <Brain className="w-10 h-10 text-violet-400" />
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
        <div className="h-full overflow-y-auto custom-scrollbar p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 px-1 sticky top-0 bg-black/80 backdrop-blur-xl py-2 -mt-4 -mx-4 px-4 z-10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-violet-500/20 rounded-lg border border-violet-500/30">
                        <Brain className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-white">AI Oracle Feed</span>
                        <p className="text-[9px] text-zinc-500">{sortedLogs.length} signals</p>
                    </div>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-violet-500/30 to-transparent" />
            </div>

            {/* All Logs - Full Desktop-like Feed */}
            {sortedLogs.map((log, index) => {
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
                        dateStr = d.toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
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
                        transition={{ delay: index * 0.03 }}
                        className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-2xl overflow-hidden"
                    >
                        {/* Card Header */}
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-1.5 text-zinc-500">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="text-[11px] font-medium">{dateStr}</span>
                            </div>

                            <div className="flex-1" />

                            <div
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${isPositive
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : 'bg-rose-500/20 text-rose-400'
                                    }`}
                            >
                                {isPositive ? (
                                    <TrendingUp className="w-3.5 h-3.5" />
                                ) : (
                                    <TrendingDown className="w-3.5 h-3.5" />
                                )}
                                {isPositive ? '+' : ''}{delta.toFixed(2)}%
                            </div>

                            <div
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${confColors[confTier]}`}
                            >
                                <Target className="w-3.5 h-3.5" />
                                {(conf * 100).toFixed(0)}%
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="px-4 py-3">
                            <p className="text-[13px] text-white font-medium leading-relaxed">
                                {summary}
                            </p>

                            {/* Reasoning - Like Desktop */}
                            {reasoning && (
                                <div className="mt-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                    <div className="flex items-center gap-1.5 text-zinc-500 mb-2">
                                        <Sparkles className="w-3 h-3" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Analysis</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                                        {reasoning}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Sources */}
                        {urls.length > 0 && (
                            <div className="px-4 pb-3">
                                <div className="flex items-center gap-1.5 text-zinc-600 mb-2">
                                    <ExternalLink className="w-3 h-3" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Sources</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {urls.map((url, idx) => {
                                        let domain = '';
                                        try {
                                            domain = new URL(url).hostname.replace('www.', '');
                                        } catch {
                                            domain = `Source ${idx + 1}`;
                                        }
                                        return (
                                            <a
                                                key={idx}
                                                href={url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-violet-400 bg-white/[0.03] hover:bg-violet-500/10 px-2.5 py-1.5 rounded-lg border border-white/5 hover:border-violet-500/30 font-medium transition-all"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                {domain}
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
}
