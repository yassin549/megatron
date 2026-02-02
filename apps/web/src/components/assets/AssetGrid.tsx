'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AssetCard } from '@/components/assets';
import Link from 'next/link';
import { Search } from 'lucide-react';
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
    pressure?: number;
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

    // Sync view mode with SubNavbar
    useEffect(() => {
        const saved = localStorage.getItem('assetViewMode');
        if (saved === 'list' || saved === 'grid') setViewMode(saved);

        // Listen for view mode changes from SubNavbar
        const handleViewModeChange = (e: CustomEvent) => {
            setViewMode(e.detail);
        };
        window.addEventListener('viewModeChange' as any, handleViewModeChange);
        return () => window.removeEventListener('viewModeChange' as any, handleViewModeChange);
    }, []);

    // Sync mobile search text
    useEffect(() => {
        setMobileSearchText(searchParam);
    }, [searchParam]);

    const handleMobileSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Blur input to hide keyboard
        if (typeof document !== 'undefined') {
            (document.activeElement as HTMLElement)?.blur();
        }
    };

    // Live search effect
    const [inputValue, setInputValue] = useState(searchParam);
    useEffect(() => {
        const timer = setTimeout(() => {
            if (inputValue !== searchParam) {
                if (inputValue.trim()) {
                    router.push(`/?q=${encodeURIComponent(inputValue)}&category=${categoryParam}`, { scroll: false });
                } else {
                    router.push(`/?category=${categoryParam}`, { scroll: false });
                }
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [inputValue, searchParam, categoryParam, router]);

    // Filter assets
    const filteredAssets = initialAssets.filter((asset) => {
        // 1. Text Search
        const query = (searchParam || inputValue).toLowerCase();
        if (query) {
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

    const suggestions = inputValue.trim()
        ? initialAssets.filter(a => a.name.toLowerCase().includes(inputValue.toLowerCase())).slice(0, 5)
        : [];

    return (
        <>
            {/* Search Bar (Mobile only) - Simplified and high-contrast */}
            <div className="md:hidden mb-6 max-w-xl relative z-20">
                <form onSubmit={handleMobileSearch} className="relative group">
                    <input
                        name="mobileSearch"
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Search markets..."
                        className="w-full pl-10 pr-4 py-3 bg-obsidian-900 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all shadow-sm"
                    />
                    <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                </form>

                {/* Suggestions Dropdown */}
                {inputValue.trim().length > 0 && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-obsidian-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                        {suggestions.map((asset) => (
                            <Link
                                key={asset.id}
                                href={`/assets/${asset.id}`}
                                className="flex items-center gap-3 p-3 hover:bg-white/5 border-b border-white/5 last:border-0"
                            >
                                <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center shrink-0">
                                    {asset.imageUrl ? (
                                        <img src={asset.imageUrl} alt="" className="w-full h-full object-cover rounded" />
                                    ) : (
                                        <Search className="w-4 h-4 text-zinc-600" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{asset.name}</p>
                                    <p className="text-[10px] text-zinc-500 uppercase">{asset.type}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Assets Grid / List */}
            {filteredAssets.length > 0 ? (
                <motion.div
                    layout
                    className={viewMode === 'grid'
                        ? "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-3.5"
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
