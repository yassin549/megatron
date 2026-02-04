'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ExternalLink, Shield, Clock, TrendingUp, TrendingDown, Sparkles, ChevronDown, ChevronUp, Terminal } from 'lucide-react';

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
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [visibleLogs, setVisibleLogs] = useState<OracleLog[]>([]);
    const [streamingLogId, setStreamingLogId] = useState<string | null>(null);
    const prevLogsRef = useRef<OracleLog[]>([]);

    // Detect new logs and trigger streaming animation
    useEffect(() => {
        if (!Array.isArray(oracleLogs) || oracleLogs.length === 0) {
            setVisibleLogs([]);
            return;
        }

        // Find new logs
        const newLogs = oracleLogs.filter(
            log => !prevLogsRef.current.some(prevLog => prevLog.id === log.id)
        );

        if (newLogs.length > 0) {
            // Add new logs with streaming effect
            newLogs.forEach((newLog, index) => {
                setTimeout(() => {
                    setStreamingLogId(newLog.id);
                    setVisibleLogs(prev => [...prev, newLog]);

                    setTimeout(() => {
                        setStreamingLogId(null);
                    }, 1000);
                }, index * 300);
            });
        } else {
            setVisibleLogs(oracleLogs);
        }

        prevLogsRef.current = oracleLogs;
    }, [oracleLogs]);

    const sortedLogs = [...visibleLogs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (sortedLogs.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 p-8">
                <div className="p-4 bg-violet-500/10 rounded-2xl border border-violet-500/20 mb-4">
                    <Terminal className="w-10 h-10 text-violet-400" />
                </div>
                <span className="text-sm font-bold text-zinc-500 mb-1">Neural Oracle</span>
                <span className="text-[10px] text-zinc-600 text-center flex items-center gap-2">
                    <Zap className="w-3 h-3 animate-pulse" />
                    Awaiting neural stream...
                </span>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-black/20">
            {/* Header */}
            <div className="sticky top-0 z-10 px-4 py-3 bg-black/80 backdrop-blur-xl border-b border-violet-500/20">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/20 rounded-lg border border-violet-500/30">
                        <Terminal className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="flex-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-violet-400">
                            Neural Oracle
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">
                                Live Analysis
                            </span>
                        </div>
                    </div>
                    <div className="text-[9px] text-zinc-600 font-bold">
                        {sortedLogs.length} entries
                    </div>
                </div>
            </div>

            {/* Logs */}
            <div className="p-3 space-y-3 pb-6">
                {sortedLogs.map((log, index) => {
                    const delta = typeof log.deltaPercent === 'number' ? log.deltaPercent : Number(log.deltaPercent || 0);
                    const conf = typeof log.confidence === 'number' ? log.confidence : Number(log.confidence || 0);
                    const summary = log.summary ? String(log.summary) : 'Analyzing market conditions...';
                    const reasoning = log.reasoning ? String(log.reasoning) : null;
                    const urls = Array.isArray(log.sourceUrls)
                        ? log.sourceUrls.filter(u => u !== null && u !== undefined).map(String)
                        : [];

                    let dateStr = '00:00';
                    try {
                        if (log.createdAt) {
                            const d = new Date(log.createdAt);
                            if (!isNaN(d.getTime())) {
                                dateStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            }
                        }
                    } catch { }

                    const safeDelta = isNaN(delta) ? 0 : delta;
                    const safeConf = isNaN(conf) ? 0 : conf;
                    const isPositive = safeDelta >= 0;
                    const isStreaming = streamingLogId === log.id;
                    const isExpanded = expandedId === log.id;

                    // Confidence tier
                    const confTier = safeConf >= 0.9 ? 'high' : safeConf >= 0.7 ? 'medium' : 'low';
                    const confColors = {
                        high: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                        medium: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
                        low: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
                    };

                    return (
                        <motion.div
                            key={log.id}
                            initial={isStreaming ? { opacity: 0, x: -10 } : { opacity: 0, y: 15 }}
                            animate={{ opacity: 1, x: 0, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="border-l-2 border-violet-500/40 bg-gradient-to-br from-white/[0.03] to-white/[0.01] rounded-r-xl overflow-hidden"
                        >
                            {/* Main Content */}
                            <div className="p-3">
                                {/* Meta Row */}
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <div className="flex items-center gap-1 text-zinc-600">
                                        <Clock className="w-3 h-3" />
                                        <span className="text-[10px] font-mono font-bold">[{dateStr}]</span>
                                    </div>

                                    <div
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${isPositive
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'bg-rose-500/20 text-rose-400'
                                            }`}
                                    >
                                        {isPositive ? (
                                            <TrendingUp className="w-3 h-3" />
                                        ) : (
                                            <TrendingDown className="w-3 h-3" />
                                        )}
                                        {isPositive ? '+' : ''}{safeDelta.toFixed(2)}%
                                    </div>

                                    <div
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${confColors[confTier]}`}
                                    >
                                        <Shield className="w-3 h-3" />
                                        {(safeConf * 100).toFixed(0)}%
                                    </div>
                                </div>

                                {/* Summary */}
                                <p className={`text-[12px] text-white font-medium leading-relaxed ${isStreaming ? 'animate-pulse' : ''}`}>
                                    <span className="text-violet-400 mr-1.5 font-bold">$</span>
                                    {summary}
                                </p>

                                {/* Reasoning (if available) */}
                                {reasoning && (
                                    <div className="mt-2">
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                            className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-violet-400 transition-colors font-bold uppercase tracking-wider"
                                        >
                                            {isExpanded ? (
                                                <>
                                                    <ChevronUp className="w-3 h-3" />
                                                    Hide Analysis
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="w-3 h-3" />
                                                    View Full Analysis
                                                </>
                                            )}
                                        </button>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="text-[11px] text-zinc-400 pl-3 mt-2 border-l border-violet-500/20 italic leading-relaxed">
                                                        {reasoning}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Sources */}
                                {urls.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {urls.slice(0, 3).map((url, idx) => (
                                            <a
                                                key={idx}
                                                href={url ? String(url) : '#'}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 text-[9px] text-zinc-500 hover:text-violet-400 bg-white/[0.03] hover:bg-violet-500/10 px-2.5 py-1.5 rounded-lg border border-white/5 hover:border-violet-500/30 font-bold uppercase tracking-widest transition-all"
                                            >
                                                <ExternalLink className="w-2.5 h-2.5" />
                                                SRC_{idx + 1}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 px-4 py-2 border-t border-white/5 bg-black/80 backdrop-blur-xl flex items-center justify-between">
                <span className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.15em]">
                    {sortedLogs.length} Neural Entries
                </span>
                <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-violet-500 animate-pulse" />
                    <span className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.15em]">
                        HF_API:ACTIVE
                    </span>
                </div>
            </div>
        </div>
    );
}
