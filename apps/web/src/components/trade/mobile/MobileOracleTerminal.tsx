'use client';

import { motion } from 'framer-motion';
import { Zap, ExternalLink, Shield } from 'lucide-react';

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
            <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <Zap className="w-8 h-8 mb-3 opacity-30" />
                <span className="text-[10px] font-bold uppercase tracking-widest">No signals yet</span>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 space-y-3">
            {sortedLogs.slice(0, 10).map((log, index) => {
                const delta = typeof log.deltaPercent === 'number' ? log.deltaPercent : 0;
                const conf = typeof log.confidence === 'number' ? log.confidence : 0;
                const summary = log.summary || 'Analyzing...';
                const urls = Array.isArray(log.sourceUrls) ? log.sourceUrls.filter(Boolean) : [];

                let dateStr = '';
                try {
                    const d = new Date(log.createdAt);
                    if (!isNaN(d.getTime())) {
                        dateStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                } catch { }

                return (
                    <motion.div
                        key={log.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white/[0.02] border border-white/5 rounded-xl p-3"
                    >
                        {/* Meta */}
                        <div className="flex items-center gap-2 mb-2 text-[10px]">
                            <span className="text-zinc-600 font-mono">{dateStr}</span>
                            <span
                                className={`font-bold ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                            >
                                {delta >= 0 ? '+' : ''}{delta.toFixed(2)}%
                            </span>
                            <div className="flex items-center gap-1 text-primary/70">
                                <Shield className="w-3 h-3" />
                                <span className="font-bold">{(conf * 100).toFixed(0)}%</span>
                            </div>
                        </div>

                        {/* Summary */}
                        <p className="text-[11px] text-white font-medium leading-relaxed">{summary}</p>

                        {/* Sources */}
                        {urls.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {urls.slice(0, 2).map((url, idx) => (
                                    <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-[8px] text-zinc-500 hover:text-primary bg-white/[0.03] px-2 py-1 rounded border border-white/5 hover:border-primary/30 font-bold uppercase tracking-widest transition-colors"
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
