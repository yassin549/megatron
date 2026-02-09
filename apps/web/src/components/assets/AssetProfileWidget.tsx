'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Terminal, Shield, ExternalLink, ChevronDown } from 'lucide-react';

interface OracleLog {
    id: string;
    deltaPercent: number;
    confidence: number;
    summary: string | null;
    reasoning?: string | null;
    sourceUrls: string[];
    createdAt: string;
}

interface AssetInfoWidgetProps {
    name: string;
    imageUrl?: string;
    type?: string;
    oracleLogs?: OracleLog[];
}

export function AssetInfoWidget({ name, imageUrl, type, oracleLogs = [] }: AssetInfoWidgetProps) {
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const sortedLogs = [...oracleLogs].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const hasLogs = sortedLogs.length > 0;

    return (
        <div
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Asset Info Card - Clickable when there are oracle logs */}
            <motion.div
                className={`bg-black/40 border border-white/5 rounded-[4px] p-4 shadow-2xl relative overflow-hidden group ${hasLogs ? 'cursor-pointer' : ''}`}
                onClick={() => hasLogs && setIsTerminalOpen(!isTerminalOpen)}
                whileHover={hasLogs ? { scale: 1.02 } : {}}
                transition={{ duration: 0.2 }}
            >
                {/* Background Accent */}
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] -mr-12 -mt-12 transition-all duration-200 ${isHovered && hasLogs ? 'bg-primary/20' : 'bg-primary/5'
                    }`} />

                <div className="flex items-center gap-4 relative z-10">
                    {/* Image / Icon container */}
                    <div className={`w-12 h-12 rounded-sm bg-white/[0.03] border flex items-center justify-center overflow-hidden shrink-0 transition-all duration-200 ${isHovered && hasLogs ? 'border-primary/50' : 'border-white/10'
                        }`}>
                        {imageUrl ? (
                            <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                        ) : (
                            <Zap className={`w-6 h-6 transition-all duration-200 ${isHovered && hasLogs ? 'text-primary' : 'text-primary/40'
                                }`} />
                        )}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-0.5 truncate">
                            {type || 'Index Asset'}
                        </span>
                        <h2 className="text-sm font-black text-white uppercase tracking-tighter truncate leading-tight">
                            {name}
                        </h2>
                    </div>

                    {/* Oracle Indicator */}
                    {hasLogs && (
                        <motion.div
                            className="shrink-0"
                            animate={{ rotate: isTerminalOpen ? 180 : 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className={`p-2 rounded-lg transition-all duration-200 ${isHovered ? 'bg-primary/20 border-primary/30' : 'bg-white/5 border-white/10'
                                } border`}>
                                <Terminal className={`w-3.5 h-3.5 transition-colors duration-200 ${isHovered ? 'text-primary' : 'text-zinc-500'
                                    }`} />
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Subtle bottom detail */}
                <div className="mt-3 flex items-center gap-2">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                    {hasLogs ? (
                        <div className="flex items-center gap-1.5">
                            <div className={`w-1 h-1 rounded-full transition-all duration-200 ${isHovered ? 'bg-primary animate-pulse' : 'bg-emerald-500 animate-pulse'
                                }`} />
                            <span className={`text-[7px] font-mono uppercase tracking-widest whitespace-nowrap transition-colors duration-200 ${isHovered ? 'text-primary opacity-100' : 'text-zinc-600 opacity-40'
                                }`}>
                                Neural_Active
                            </span>
                        </div>
                    ) : (
                        <span className="text-[7px] font-mono text-zinc-600 uppercase tracking-widest whitespace-nowrap opacity-40">
                            Asset_Active
                        </span>
                    )}
                </div>

                {/* Hover hint */}
                <AnimatePresence>
                    {isHovered && hasLogs && !isTerminalOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute bottom-1 right-1"
                        >
                            <span className="text-[6px] font-mono text-primary/60 uppercase tracking-widest">
                                Click_for_Oracle
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* AI Terminal Dropdown */}
            <AnimatePresence>
                {isTerminalOpen && hasLogs && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, y: -10 }}
                        animate={{ height: 'auto', opacity: 1, y: 0 }}
                        exit={{ height: 0, opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="absolute top-full left-0 right-0 mt-2 z-50 overflow-hidden"
                    >
                        <div className="bg-black/95 backdrop-blur-xl border border-primary/30 rounded-lg shadow-[0_0_40px_rgba(59,130,246,0.3)]">
                            {/* Terminal Header */}
                            <div className="px-4 py-3 border-b border-primary/20 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Terminal className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                                        Neural Oracle
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-wider">
                                        Live
                                    </span>
                                </div>
                            </div>

                            {/* Terminal Content */}
                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-3 space-y-3 font-mono text-xs">
                                {sortedLogs.slice(0, 5).map((log) => {
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

                                    return (
                                        <motion.div
                                            key={log.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="border-l-2 border-primary/40 pl-3 py-2 bg-white/[0.02] rounded-r"
                                        >
                                            {/* Metadata */}
                                            <div className="flex items-center gap-2 mb-2 text-[10px] flex-wrap">
                                                <span className="text-zinc-600 font-bold">[{dateStr}]</span>
                                                <span className={`font-black tracking-tighter ${safeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {safeDelta >= 0 ? '+' : ''}{safeDelta.toFixed(2)}%
                                                </span>
                                                <div className="flex items-center gap-1 text-blue-400/70">
                                                    <Shield className="w-2.5 h-2.5" />
                                                    <span className="font-black text-[8px]">
                                                        {(safeConf * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Summary */}
                                            <div className="mb-2">
                                                <p className="text-white font-bold leading-relaxed tracking-tight text-[11px]">
                                                    <span className="text-primary mr-1.5">$</span>
                                                    {summary}
                                                </p>
                                                {reasoning && (
                                                    <div className="text-[9px] text-zinc-500 pl-3 mt-1.5 border-l border-white/10 italic leading-relaxed">
                                                        {reasoning}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Sources */}
                                            {urls.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {urls.slice(0, 2).map((url, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={url ? String(url) : '#'}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="inline-flex items-center gap-1 text-[7px] text-zinc-500 hover:text-primary transition-all bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/5 hover:border-primary/30 font-black uppercase tracking-widest"
                                                        >
                                                            <ExternalLink className="w-2 h-2" />
                                                            SRC_{idx + 1}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Footer */}
                            <div className="px-3 py-2 border-t border-white/10 bg-black/50 flex items-center justify-between">
                                <span className="text-[6px] text-zinc-600 font-black uppercase tracking-[0.2em]">
                                    {sortedLogs.length} Neural_Entries
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                    <span className="text-[6px] text-zinc-600 font-black uppercase tracking-[0.2em]">
                                        HF_API:ACTIVE
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
