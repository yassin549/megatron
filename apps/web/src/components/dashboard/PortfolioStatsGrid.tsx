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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="glass-card p-3 md:p-6 rounded-xl animate-pulse">
                        <div className="h-3 w-16 md:w-24 bg-white/5 rounded mb-2 md:mb-4" />
                        <div className="h-5 md:h-8 w-20 md:w-32 bg-white/5 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    const cards = [
        {
            label: 'Total Value',
            value: stats.totalValue,
            change: `${stats.totalReturnPercent >= 0 ? '+' : ''}${stats.totalReturnPercent.toFixed(2)}%`,
            isPositive: stats.totalReturnPercent >= 0,
            icon: DollarSign,
            color: 'blue'
        },
        {
            label: 'Realized PnL',
            value: stats.realizedPnL,
            change: 'Cumulative',
            isPositive: stats.realizedPnL >= 0,
            icon: Target,
            color: stats.realizedPnL >= 0 ? 'emerald' : 'rose'
        },
        {
            label: 'Win Rate',
            value: stats.winRate,
            isPercent: true,
            change: 'Lifetime',
            isPositive: stats.winRate >= 50,
            icon: Activity,
            color: 'indigo'
        },
        {
            label: 'Net Returns',
            value: stats.totalReturnAbs,
            showSign: true,
            change: 'Unrealized',
            isPositive: stats.totalReturnAbs >= 0,
            icon: PieChart,
            color: stats.totalReturnAbs >= 0 ? 'emerald' : 'rose'
        }
    ];

    const formatValue = (card: typeof cards[0]) => {
        if (card.isPercent) {
            return `${card.value.toFixed(1)}%`;
        }
        const sign = card.showSign ? (card.value >= 0 ? '+' : '') : '';
        return `${sign}$${Math.abs(card.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            {cards.map((card, i) => (
                <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card p-3 md:p-6 rounded-xl relative overflow-hidden group hover:border-white/20 transition-all duration-200"
                >
                    <div className={`absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 bg-${card.color}-500/5 blur-2xl md:blur-3xl rounded-full -mr-4 md:-mr-8 -mt-4 md:-mt-8`} />

                    {/* Mobile: Compact inline layout */}
                    <div className="relative z-10">
                        {/* Icon + Badge row - Desktop only */}
                        <div className="hidden md:flex items-center justify-between mb-4">
                            <div className={`p-2 rounded-lg bg-${card.color}-500/10 text-${card.color}-500`}>
                                <card.icon className="w-5 h-5" />
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${card.isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                                }`}>
                                {card.change}
                            </span>
                        </div>

                        {/* Mobile: Inline icon */}
                        <div className="flex items-center gap-2 mb-1 md:hidden">
                            <div className={`p-1.5 rounded-md bg-${card.color}-500/10 text-${card.color}-500`}>
                                <card.icon className="w-3.5 h-3.5" />
                            </div>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                        </div>

                        {/* Desktop label */}
                        <p className="hidden md:block text-sm font-medium text-muted-foreground mb-1">{card.label}</p>

                        {/* Value */}
                        <div className="flex items-center justify-between md:block">
                            <h3 className="text-lg md:text-2xl font-bold text-foreground font-mono tracking-tight">
                                {formatValue(card)}
                            </h3>
                            {/* Mobile badge */}
                            <span className={`md:hidden text-[9px] font-medium px-1.5 py-0.5 rounded-full ${card.isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                {card.change}
                            </span>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

