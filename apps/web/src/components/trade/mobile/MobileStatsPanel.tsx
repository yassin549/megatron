'use client';

interface MobileStatsPanelProps {
    stats: {
        marketCap: number;
        liquidity: number;
        supply: number;
        low24h?: number;
        high24h?: number;
    };
}

export function MobileStatsPanel({ stats }: MobileStatsPanelProps) {
    const statItems = [
        {
            label: 'Market Cap',
            value: `$${(stats.marketCap / 1_000_000).toFixed(2)}M`,
        },
        {
            label: 'Liquidity',
            value: `$${stats.liquidity.toLocaleString()}`,
        },
        {
            label: 'Supply',
            value: `${(stats.supply / 1000).toFixed(1)}K`,
        },
        {
            label: '24h Range',
            value:
                stats.low24h !== undefined && stats.high24h !== undefined
                    ? `$${stats.low24h.toFixed(1)} - $${stats.high24h.toFixed(1)}`
                    : '--',
        },
    ];

    return (
        <div className="h-full flex flex-col p-4 gap-3">
            {statItems.map((item) => (
                <div
                    key={item.label}
                    className="flex items-center justify-between py-3 px-4 bg-white/[0.02] border border-white/5 rounded-xl"
                >
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                        {item.label}
                    </span>
                    <span className="text-sm text-white font-black tabular-nums">{item.value}</span>
                </div>
            ))}
        </div>
    );
}
