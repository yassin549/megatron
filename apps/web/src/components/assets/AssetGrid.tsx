'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AssetCard } from '@/components/assets';
import Link from 'next/link';
import { Search, LayoutGrid, List } from 'lucide-react';
import { motion } from 'framer-motion';

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
    // AI Data
    lastFundamental: number | null;
    aiConfidence: number | null;
    aiSummary: string | null;
    imageUrl?: string;
    holders?: number;
    isBookmarked?: boolean;
}

interface AssetGridProps {
    initialAssets: Asset[];
    isAuthenticated: boolean;
}

export function AssetGrid({ initialAssets, isAuthenticated }: AssetGridProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const searchParam = searchParams.get('q') || '';
    const categoryParam = searchParams.get('category') || 'all';

    const [mobileSearchText, setMobileSearchText] = useState(searchParam);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Persist view mode (client-side only)
    useEffect(() => {
        const saved = localStorage.getItem('assetViewMode');
        if (saved === 'list' || saved === 'grid') setViewMode(saved);
    }, []);

    const toggleView = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('assetViewMode', mode);
    };

    // Sync mobile search text
    useEffect(() => {
        setMobileSearchText(searchParam);
    }, [searchParam]);

    const handleMobileSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (mobileSearchText.trim()) {
            router.push(`/?q=${encodeURIComponent(mobileSearchText)}&category=${categoryParam}`);
        } else {
            router.push(`/?category=${categoryParam}`);
        }
    };

    // Filter assets (can be moved to server eventually, but client-side is fine for <1000 items)
    const filteredAssets = initialAssets.filter((asset) => {
        // 1. Text Search
        if (searchParam) {
            const query = searchParam.toLowerCase();
            const matchesName = asset.name.toLowerCase().includes(query);
            const matchesDesc = asset.description?.toLowerCase().includes(query);
            if (!matchesName && !matchesDesc) return false;
        }

        // 2. Category Filter
        if (categoryParam === 'all') return true;
        if (categoryParam === 'new') return true;
        if (categoryParam === 'trending') return true;
        return asset.type.toLowerCase() === categoryParam.toLowerCase();
    });

    return (
        <>
            {/* Markets Title & Mobile Search */}
            <div className="flex flex-col gap-4 mb-8 text-white">
                {/* Mobile Search Bar */}
                <div className="md:hidden">
                    <form onSubmit={handleMobileSearch} className="relative group">
                        <input
                            name="mobileSearch"
                            type="text"
                            value={mobileSearchText}
                            onChange={(e) => setMobileSearchText(e.target.value)}
                            placeholder="Search markets..."
                            className="w-full pl-10 pr-4 py-3 bg-obsidian-900 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all shadow-sm"
                        />
                        <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                    </form>
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
                            {searchParam ? (
                                <>Results for "<span className="text-primary">{searchParam}</span>"</>
                            ) : (
                                <>{categoryParam === 'all' ? 'Trending Markets' : `${categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1)} Markets`}</>
                            )}
                        </h2>
                        <span className="hidden xs:inline-flex text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                            {filteredAssets.length} ASSETS
                        </span>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center bg-obsidian-900 rounded-lg p-1 border border-white/10 shadow-sm">
                        <button
                            onClick={() => toggleView('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => toggleView('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Assets Grid / List */}
            {filteredAssets.length > 0 ? (
                <motion.div
                    layout
                    className={viewMode === 'grid'
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-3.5"
                        : "flex flex-col gap-2"
                    }
                >
                    {filteredAssets.map((asset, index) => (
                        <motion.div
                            layout
                            key={asset.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="fill-mode-backwards"
                        >
                            <AssetCard
                                {...asset}
                                isAuthenticated={isAuthenticated}
                                viewMode={viewMode}
                            />
                        </motion.div>
                    ))}
                </motion.div>
            ) : (
                <div className="flex flex-col items-center justify-center py-32 border border-dashed border-white/10 rounded-2xl bg-white/5">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-zinc-500" />
                    </div>
                    <h3 className="text-white text-lg font-medium mb-2">No markets found</h3>
                    <p className="text-zinc-500 text-sm mb-6 max-w-sm text-center">We couldn't find any assets matching your criteria.</p>
                    <Link
                        href="/assets/request"
                        className="text-primary hover:text-primary/80 transition-colors text-sm font-bold flex items-center gap-2"
                    >
                        Request a new market <span aria-hidden="true">&rarr;</span>
                    </Link>
                </div>
            )}
        </>
    );
}
