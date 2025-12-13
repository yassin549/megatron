'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AssetCard } from '@/components/assets';
import Link from 'next/link';

interface Asset {
    id: string;
    name: string;
    description: string | null;
    type: string;
    price: number;
    change24h: number;
    volume24h: number;
    status: 'active' | 'funding' | 'paused';
    softCap: number;
    hardCap: number;
    fundingProgress: number;
    poolLiquidity: number;
}

interface Stats {
    totalAssets: number;
    volume24h: number;
    totalLiquidity: number;
    activeTraders: number;
}

export default function AssetsPage() {
    const { status: authStatus } = useSession();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [stats, setStats] = useState<Stats>({
        totalAssets: 0,
        volume24h: 0,
        totalLiquidity: 0,
        activeTraders: 0,
    });
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All');
    const [activeType, setActiveType] = useState<string | null>(null);

    const isAuthenticated = authStatus === 'authenticated';

    useEffect(() => {
        async function fetchData() {
            try {
                const [assetsRes, statsRes] = await Promise.all([
                    fetch('/api/assets'),
                    fetch('/api/assets/stats'),
                ]);

                if (assetsRes.ok) {
                    const data = await assetsRes.json();
                    setAssets(data.assets);
                }

                if (statsRes.ok) {
                    const data = await statsRes.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Failed to fetch assets:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    // Filter assets
    const filteredAssets = assets.filter((asset) => {
        // Status filter
        if (activeFilter === 'Active' && asset.status !== 'active') return false;
        if (activeFilter === 'Funding' && asset.status !== 'funding') return false;

        // Type filter
        if (activeType && asset.type.toLowerCase() !== activeType.toLowerCase()) return false;

        return true;
    });

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
        return `$${num.toFixed(0)}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground">Loading assets...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">
                            Assets
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Trade synthetic assets tied to real-world variables
                        </p>
                    </div>
                    <Link
                        href="/assets/request"
                        className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        Request Asset
                    </Link>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 mb-8 flex-wrap">
                    <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1">
                        {['All', 'Active', 'Funding'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeFilter === filter
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {['Social', 'Sports', 'Economics', 'Weather', 'Crypto'].map(
                            (category) => (
                                <button
                                    key={category}
                                    onClick={() =>
                                        setActiveType(
                                            activeType === category.toLowerCase()
                                                ? null
                                                : category.toLowerCase()
                                        )
                                    }
                                    className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${activeType === category.toLowerCase()
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                                        }`}
                                >
                                    {category}
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-card border border-border rounded-xl p-4">
                        <p className="text-sm text-muted-foreground">Total Assets</p>
                        <p className="text-2xl font-bold text-foreground">
                            {stats.totalAssets}
                        </p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4">
                        <p className="text-sm text-muted-foreground">24h Volume</p>
                        <p className="text-2xl font-bold text-foreground">
                            {formatNumber(stats.volume24h)}
                        </p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4">
                        <p className="text-sm text-muted-foreground">Total Liquidity</p>
                        <p className="text-2xl font-bold text-foreground">
                            {formatNumber(stats.totalLiquidity)}
                        </p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4">
                        <p className="text-sm text-muted-foreground">Active Traders</p>
                        <p className="text-2xl font-bold text-foreground">
                            {stats.activeTraders.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Asset Grid */}
                {filteredAssets.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAssets.map((asset) => (
                            <AssetCard
                                key={asset.id}
                                {...asset}
                                isAuthenticated={isAuthenticated}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-card border border-border rounded-xl p-12 text-center">
                        <p className="text-muted-foreground">
                            No assets found matching your filters.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
