'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Terminal, Shield, ExternalLink, Zap } from 'lucide-react';

interface OracleLog {
    id: string;
    deltaPercent: number;
    confidence: number;
    summary: string | null;
    reasoning?: string | null;
    sourceUrls: string[];
    createdAt: string;
}

interface AILiveTerminalProps {
    logs: OracleLog[];
}

export function AILiveTerminal({ logs }: AILiveTerminalProps) {
    const [isMinimized, setIsMinimized] = useState(false);
    const [visibleLogs, setVisibleLogs] = useState<OracleLog[]>([]);
    const [streamingLogId, setStreamingLogId] = useState<string | null>(null);
    const prevLogsRef = useRef<OracleLog[]>([]);

    // Detect new logs and trigger streaming animation
    useEffect(() => {
        if (!Array.isArray(logs) || logs.length === 0) {
            setVisibleLogs([]);
            return;
        }

        // Find new logs
        const newLogs = logs.filter(
            log => !prevLogsRef.current.some(prevLog => prevLog.id === log.id)
        );

        if (newLogs.length > 0) {
            // Add new logs with streaming effect
            newLogs.forEach((newLog, index) => {
                setTimeout(() => {
                    setStreamingLogId(newLog.id);
                    setVisibleLogs(prev => [...prev, newLog]);

                    // Remove streaming effect after animation
                    setTimeout(() => {
                        setStreamingLogId(null);
                    }, 1000);
                }, index * 300);
            });
        } else {
            // Initial load
            setVisibleLogs(logs);
        }

        prevLogsRef.current = logs;
    }, [logs]);

    const sortedLogs = [...visibleLogs].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-6 right-6 z-50 w-[420px] max-h-[500px] flex flex-col"
        >
            {/* Terminal Header */}
            <div className="bg-black/95 backdrop-blur-xl border border-primary/30 rounded-t-2xl shadow-[0_0_40px_rgba(59,130,246,0.3)]">
                <div className="px-4 py-3 flex items-center justify-between border-b border-primary/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg border border-primary/30">
                            <Terminal className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                                Neural Oracle
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">
                                    Live Analysis
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all active:scale-95"
                    >
                        {isMinimized ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* Terminal Body */}
            <AnimatePresence>
                {!isMinimized && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-black/95 backdrop-blur-xl border-x border-b border-primary/30 rounded-b-2xl shadow-[0_0_40px_rgba(59,130,246,0.3)] overflow-hidden"
                    >
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-4 space-y-4 font-mono text-sm">
                            {sortedLogs.length === 0 ? (
                                <div className="text-zinc-600 p-8 text-center animate-pulse font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2">
                                    <Zap className="w-3 h-3 animate-pulse" />
                                    Awaiting_Neural_Stream...
                                </div>
                            ) : (
                                sortedLogs.slice(0, 5).map((log) => {
                                    const delta = typeof log.deltaPercent === 'number' ? log.deltaPercent : Number(log.deltaPercent || 0);
                                    const conf = typeof log.confidence === 'number' ? log.confidence : Number(log.confidence || 0);
                                    const summary = log.summary ? String(log.summary) : 'Analyzing_Market_Conditions...';
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
                                    } catch (e) {
                                        console.warn('[Terminal] Date parse failed', e);
                                    }

                                    const safeDelta = isNaN(delta) ? 0 : delta;
                                    const safeConf = isNaN(conf) ? 0 : conf;
                                    const isStreaming = streamingLogId === log.id;

                                    return (
                                        <motion.div
                                            key={log.id}
                                            initial={isStreaming ? { opacity: 0, x: -10 } : false}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="border-l-2 border-primary/40 pl-4 py-2 bg-white/[0.02] rounded-r-lg"
                                        >
                                            {/* Metadata */}
                                            <div className="flex items-center gap-3 mb-2 text-xs flex-wrap">
                                                <span className="text-zinc-600 font-bold">[{dateStr}]</span>
                                                <span className={`font-black tracking-tighter ${safeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    IMPACT: {safeDelta >= 0 ? '+' : ''}{safeDelta.toFixed(2)}%
                                                </span>
                                                <div className="flex items-center gap-1.5 text-blue-400/70">
                                                    <Shield className="w-3 h-3" />
                                                    <span className="font-black text-[10px]">
                                                        {(safeConf * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Summary */}
                                            <div className="mb-2">
                                                <p className={`text-white font-bold leading-relaxed tracking-tight text-sm ${isStreaming ? 'animate-pulse' : ''}`}>
                                                    <span className="text-primary mr-2">$</span>
                                                    {summary}
                                                </p>
                                                {reasoning && (
                                                    <div className="text-[11px] text-zinc-500 pl-4 mt-2 border-l border-white/10 italic leading-relaxed">
                                                        {reasoning}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Sources */}
                                            {urls.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {urls.slice(0, 2).map((url, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={url ? String(url) : '#'}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 text-[8px] text-zinc-500 hover:text-primary transition-all bg-white/[0.03] px-2 py-1 rounded border border-white/5 hover:border-primary/30 font-black uppercase tracking-widest"
                                                        >
                                                            <ExternalLink className="w-2 h-2" />
                                                            SRC_{idx + 1}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2 border-t border-white/10 bg-black/50 flex items-center justify-between">
                            <span className="text-[7px] text-zinc-600 font-black uppercase tracking-[0.2em]">
                                {sortedLogs.length} Neural_Entries
                            </span>
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                <span className="text-[7px] text-zinc-600 font-black uppercase tracking-[0.2em]">
                                    HF_API:ACTIVE
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
