'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileHeaderProps {
    assetName: string;
    price: number;
    change24h: number;
}

export function MobileHeader({ assetName, price, change24h }: MobileHeaderProps) {
    const isPositive = change24h >= 0;

    return (
        <header className="h-14 fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
            <div className="h-full px-4 flex items-center gap-3">
                {/* Back Button */}
                <Link
                    href="/"
                    className="p-2 -ml-2 text-zinc-500 hover:text-white active:scale-95 transition-all rounded-xl"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>

                {/* Asset Info */}
                <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest truncate">
                        {assetName}
                    </p>
                    <div className="flex items-center gap-2">
                        <motion.span
                            key={price}
                            initial={{ opacity: 0.5 }}
                            animate={{ opacity: 1 }}
                            className="text-lg font-black text-white tabular-nums"
                        >
                            ${price.toFixed(2)}
                        </motion.span>
                        <span
                            className={`text-xs font-bold tabular-nums ${isPositive ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                        >
                            {isPositive ? '+' : ''}{change24h.toFixed(2)}%
                        </span>
                    </div>
                </div>

                {/* Live Indicator */}
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-bold text-emerald-500/80 uppercase tracking-widest">
                        Live
                    </span>
                </div>
            </div>
        </header>
    );
}
