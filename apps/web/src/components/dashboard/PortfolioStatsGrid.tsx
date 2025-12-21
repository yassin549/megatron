'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Target, PieChart, Activity } from 'lucide-react';

interface PortfolioStats {
    totalValue: number;
    cashBalance: number;
    totalInvested: number;
    totalReturnAbs: number;
    totalReturnPercent: number;
    realizedPnL: number;
    winRate: number;
}

interface PortfolioStatsGridProps {
    stats: PortfolioStats | null;
    loading: boolean;
}

export function PortfolioStatsGrid({ stats, loading }: PortfolioStatsGridProps) {
    if (loading || !stats) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="glass-card p-6 rounded-xl animate-pulse">
                        <div className="h-4 w-24 bg-white/5 rounded mb-4" />
                        <div className="h-8 w-32 bg-white/5 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    const cards = [
        {
            label: 'Total Value',
            value: `$${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: `${stats.totalReturnPercent >= 0 ? '+' : ''}${stats.totalReturnPercent.toFixed(2)}%`,
            isPositive: stats.totalReturnPercent >= 0,
            icon: DollarSign,
            color: 'blue'
        },
        {
            label: 'Realized PnL',
            value: `$${stats.realizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: 'Cumulative',
            isPositive: stats.realizedPnL >= 0,
            icon: Target,
            color: stats.realizedPnL >= 0 ? 'emerald' : 'rose'
        },
        {
            label: 'Win Rate',
            value: `${stats.winRate.toFixed(1)}%`,
            change: 'Lifetime',
            isPositive: stats.winRate >= 50,
            icon: Activity,
            color: 'indigo'
        },
        {
            label: 'Net Returns',
            value: `${stats.totalReturnAbs >= 0 ? '+' : ''}$${Math.abs(stats.totalReturnAbs).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: 'Unrealized',
            isPositive: stats.totalReturnAbs >= 0,
            icon: PieChart,
            color: stats.totalReturnAbs >= 0 ? 'emerald' : 'rose'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, i) => (
                <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card p-6 rounded-xl relative overflow-hidden group hover:border-white/20 transition-all duration-300"
                >
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-${card.color}-500/5 blur-3xl rounded-full -mr-8 -mt-8`} />

                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className={`p-2 rounded-lg bg-${card.color}-500/10 text-${card.color}-500`}>
                            <card.icon className="w-5 h-5" />
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${card.isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                            }`}>
                            {card.change}
                        </span>
                    </div>

                    <div className="relative z-10">
                        <p className="text-sm font-medium text-muted-foreground mb-1">{card.label}</p>
                        <h3 className="text-2xl font-bold text-foreground font-mono tracking-tight">
                            {card.value}
                        </h3>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
