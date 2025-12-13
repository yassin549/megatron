'use client';

import { useState } from 'react';

interface DepositCardProps {
    depositAddress: string | null | undefined;
}

export function DepositCard({ depositAddress }: DepositCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    const copyToClipboard = async () => {
        if (!depositAddress) return;
        try {
            await navigator.clipboard.writeText(depositAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden transition-all duration-300 ease-in-out">
            {/* Header - Always visible */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-6 cursor-pointer hover:bg-secondary/30 transition-colors"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl flex items-center justify-center border border-green-500/20">
                            <svg
                                className="w-5 h-5 text-green-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                Deposit USDC
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {isExpanded ? 'Click to collapse' : 'Click to expand'}
                            </p>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                        <svg
                            className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''
                                }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="px-6 pb-6 border-t border-border">
                    {/* Network Badges */}
                    <div className="flex items-center gap-2 mt-4 mb-4">
                        <span className="px-3 py-1.5 bg-blue-500/10 text-blue-400 text-xs font-semibold rounded-lg border border-blue-500/20">
                            Arbitrum One
                        </span>
                        <span className="px-3 py-1.5 bg-green-500/10 text-green-400 text-xs font-semibold rounded-lg border border-green-500/20">
                            USDC Only
                        </span>
                    </div>

                    {/* Deposit Address Box */}
                    <div className="bg-gradient-to-br from-secondary/80 to-secondary/40 border border-border rounded-xl p-4 mb-5">
                        <p className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider">
                            Your Deposit Address
                        </p>
                        <div className="flex items-stretch gap-2">
                            <div className="flex-1 bg-background/80 backdrop-blur p-3 rounded-lg border border-border">
                                <code className="text-xs text-foreground font-mono break-all leading-relaxed">
                                    {depositAddress || 'Generating...'}
                                </code>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard();
                                }}
                                disabled={!depositAddress}
                                className={`px-4 font-semibold rounded-lg transition-all duration-200 text-sm whitespace-nowrap ${copied
                                        ? 'bg-green-500 text-white'
                                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                    } disabled:opacity-50`}
                            >
                                {copied ? '✓' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="space-y-2 mb-5">
                        {[
                            { step: 1, title: 'Copy address', desc: 'Use the button above' },
                            { step: 2, title: 'Send USDC', desc: 'From any Arbitrum wallet' },
                            { step: 3, title: 'Wait ~2 min', desc: 'Balance updates automatically' },
                        ].map((item) => (
                            <div
                                key={item.step}
                                className="flex items-center gap-3 p-2.5 bg-secondary/30 rounded-lg"
                            >
                                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-[10px] font-bold text-primary">
                                        {item.step}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm text-foreground font-medium">
                                        {item.title}
                                    </span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                        {item.desc}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Warning */}
                    <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                            <svg
                                className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <p className="text-xs text-yellow-500/90 leading-relaxed">
                                <strong>Only USDC on Arbitrum.</strong> Other tokens or networks = lost funds.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
