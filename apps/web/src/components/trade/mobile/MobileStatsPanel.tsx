'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Droplets, Layers, Activity } from 'lucide-react';

interface MobileStatsPanelProps {
    stats: {
        marketCap: number;
        liquidity: number;
        supply: number;
        low24h?: number;
        high24h?: number;
    };
    assetName?: string;
    price?: number;
    change?: number;
}

export function MobileStatsPanel({ stats, assetName, price, change }: MobileStatsPanelProps) {
    const isPositive = (change ?? 0) >= 0;

    const statItems = [
        {
            label: 'Market Cap',
            value: `$${(stats.marketCap / 1_000_000).toFixed(2)}M`,
            icon: DollarSign,
            color: 'text-amber-400',
            bgColor: 'bg-amber-500/10',
            borderColor: 'border-amber-500/20',
        },
        {
            label: 'Liquidity',
            value: `$${stats.liquidity.toLocaleString()}`,
            icon: Droplets,
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/20',
        },
        {
            label: 'Total Supply',
            value: `${(stats.supply / 1000).toFixed(1)}K`,
            icon: Layers,
            color: 'text-violet-400',
            bgColor: 'bg-violet-500/10',
            borderColor: 'border-violet-500/20',
        },
        {
            label: '24h Range',
            value:
                stats.low24h !== undefined && stats.high24h !== undefined
                    ? `$${stats.low24h.toFixed(2)} - $${stats.high24h.toFixed(2)}`
                    : '--',
            icon: Activity,
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-500/10',
            borderColor: 'border-emerald-500/20',
        },
    ];

    return (
        <div className="h-full flex flex-col p-4">
            {/* Hero Section */}
            {assetName && price !== undefined && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-5 bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-2xl"
                >
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
                        {assetName}
                    </p>
                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-black text-white tabular-nums">
                            ${price.toFixed(2)}
                        </span>
                        <span
                            className={`flex items-center gap-1 text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                        >
                            {isPositive ? (
                                <TrendingUp className="w-4 h-4" />
                            ) : (
                                <TrendingDown className="w-4 h-4" />
                            )}
                            {isPositive ? '+' : ''}
                            {change?.toFixed(2)}%
                        </span>
                    </div>
                </motion.div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                {statItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                        <motion.div
                            key={item.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.08 }}
                            className={`p-4 ${item.bgColor} border ${item.borderColor} rounded-2xl`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <div
                                    className={`p-1.5 rounded-lg ${item.bgColor} border ${item.borderColor}`}
                                >
                                    <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                                </div>
                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                                    {item.label}
                                </span>
                            </div>
                            <span className="text-lg text-white font-black tabular-nums">
                                {item.value}
                            </span>
                        </motion.div>
                    );
                })}
            </div>

            {/* Additional Info */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl"
            >
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                        Trading Status
                    </span>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                            Active
                        </span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
