'use client';

import { Terminal, Shield, ExternalLink, Clock } from 'lucide-react';

interface OracleLog {
    id: string;
    deltaPercent: number;
    confidence: number;
    summary: string | null;
    sourceUrls: string[];
    createdAt: string;
}

interface AITerminalProps {
    logs: OracleLog[];
}

export function AITerminal({ logs }: AITerminalProps) {
    return (
        <div className="bg-black/80 border border-white/10 rounded-xl overflow-hidden font-mono text-sm shadow-2xl backdrop-blur-md">
            {/* Terminal Header */}
            <div className="bg-white/5 border-b border-white/10 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                    <Terminal className="w-4 h-4" />
                    <span className="text-xs font-semibold tracking-wider">ORACLE_ANALYSIS_STREAM</span>
                </div>
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
                </div>
            </div>

            {/* Terminal Content */}
            <div className="p-4 max-h-[400px] overflow-y-auto space-y-4">
                {logs.length === 0 ? (
                    <div className="text-gray-500 p-4 text-center animate-pulse">
                        Waiting for initial analysis stream...
                    </div>
                ) : (
                    logs.map((log, i) => (
                        <div key={log.id} className="border-l-2 border-white/10 pl-4 py-1 animate-in slide-in-from-left-2 fade-in duration-300">
                            {/* Metadata */}
                            <div className="flex items-center gap-3 mb-1 text-xs">
                                <span className="text-gray-500">[{new Date(log.createdAt).toLocaleTimeString()}]</span>
                                <span className={`font-bold ${log.deltaPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    IMPACT: {log.deltaPercent >= 0 ? '+' : ''}{log.deltaPercent.toFixed(2)}%
                                </span>
                                <div className="flex items-center gap-1 text-blue-400">
                                    <Shield className="w-3 h-3" />
                                    <span>CONF: {(log.confidence * 100).toFixed(0)}%</span>
                                </div>
                            </div>

                            {/* Summary */}
                            <p className="text-gray-300 leading-relaxed mb-2">
                                <span className="text-blue-500 mr-2">$</span>
                                {log.summary}
                            </p>

                            {/* Sources */}
                            {log.sourceUrls.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {log.sourceUrls.slice(0, 3).map((url, idx) => (
                                        <a
                                            key={idx}
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-white transition-colors bg-white/5 px-2 py-0.5 rounded border border-white/5 hover:border-white/20"
                                        >
                                            <ExternalLink className="w-2.5 h-2.5" />
                                            SOURCE_{idx + 1}
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
