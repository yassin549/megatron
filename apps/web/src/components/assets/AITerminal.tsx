'use client';

import { Shield, ExternalLink } from 'lucide-react';

interface OracleLog {
    id: string;
    deltaPercent: number;
    confidence: number;
    summary: string | null;
    reasoning?: string | null;
    sourceUrls: string[];
    createdAt: string;
}

interface AITerminalProps {
    logs: OracleLog[];
}

export function AITerminal({ logs }: AITerminalProps) {
    return (
        <div className="font-mono text-sm h-full">
            {/* Terminal Content - Pure Stream */}
            <div className="p-4 md:p-8 h-full overflow-y-auto space-y-6 custom-scrollbar">
                {logs.length === 0 ? (
                    <div className="text-zinc-600 p-8 text-center animate-pulse font-black uppercase tracking-[0.2em] text-[10px]">
                        Establishing_Neural_Sync...
                    </div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="border-l border-white/10 pl-6 py-2 animate-in slide-in-from-left-2 fade-in duration-300">
                            {/* Metadata */}
                            <div className="flex items-center gap-4 mb-2 text-xs">
                                <span className="text-zinc-600 font-bold">[{new Date(log.createdAt).toLocaleTimeString()}]</span>
                                <span className={`font-black tracking-tighter ${log.deltaPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    IMPACT: {log.deltaPercent >= 0 ? '+' : ''}{log.deltaPercent.toFixed(2)}%
                                </span>
                                <div className="flex items-center gap-1.5 text-blue-400/60">
                                    <Shield className="w-3.5 h-3.5" />
                                    <span className="font-black">CONF: {(log.confidence * 100).toFixed(0)}%</span>
                                </div>
                            </div>

                            {/* Summary & Reasoning */}
                            <div className="mb-3 space-y-2">
                                <p className="text-white font-bold leading-relaxed tracking-tight text-base">
                                    <span className="text-blue-500 mr-2">$</span>
                                    {log.summary}
                                </p>
                                {log.reasoning && (
                                    <div className="text-[13px] text-zinc-500 pl-5 border-l border-white/10 italic leading-relaxed font-medium">
                                        {log.reasoning}
                                    </div>
                                )}
                            </div>

                            {/* Sources */}
                            {log.sourceUrls.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {log.sourceUrls.slice(0, 3).map((url, idx) => (
                                        <a
                                            key={idx}
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 text-[9px] text-zinc-500 hover:text-white transition-all bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/5 hover:border-white/10 font-black uppercase tracking-widest shadow-sm"
                                        >
                                            <ExternalLink className="w-2.5 h-2.5 opacity-40" />
                                            Source_{idx + 1}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
