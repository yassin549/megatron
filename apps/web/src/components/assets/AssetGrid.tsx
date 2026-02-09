'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AssetCard } from '@/components/assets';
import Link from 'next/link';
import { Search, SlidersHorizontal, X, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    marketCap?: number;
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
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        minHolders: 0,
        minLiquidity: 0,
        maxPressure: 100
    });

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
        if (categoryParam !== 'all' && categoryParam !== 'new' && categoryParam !== 'trending') {
            if (asset.type.toLowerCase() !== categoryParam.toLowerCase()) return false;
        }

        // 3. Advanced Filters
        if (filters.minHolders > 0 && (asset.holders || 0) < filters.minHolders) return false;

        return true;
    });

    const activeCategory = categoryParam.toLowerCase();

    const suggestions = inputValue.trim()
        ? initialAssets.filter(a => a.name.toLowerCase().includes(inputValue.toLowerCase())).slice(0, 5)
        : [];

    return (
        <>
            {/* Search Bar & Filter (Mobile only) */}
            <div className="md:hidden mb-6 max-w-xl relative z-20 flex gap-2">
                <div className="relative flex-1 group">
                    <form onSubmit={handleMobileSearch} className="h-full">
                        <input
                            name="mobileSearch"
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Search markets..."
                            className="w-full h-full pl-11 pr-4 py-4 bg-surface border border-border-subtle rounded-xl text-sm text-text-main placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-brand-primary/50 transition-all shadow-sm"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted group-focus-within:text-brand-primary transition-colors" />
                    </form>
                </div>

                <button
                    onClick={() => setShowFilters(true)}
                    className={`w-[20%] flex items-center justify-center bg-surface border border-border-subtle rounded-xl text-text-muted hover:text-text-main hover:border-border-bright transition-all ${showFilters ? 'text-brand-primary border-brand-primary/30 bg-brand-primary/10' : ''
                        }`}
                >
                    <SlidersHorizontal className="w-6 h-6" />
                </button>

                {/* Suggestions Dropdown */}
                {inputValue.trim().length > 0 && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-[20%] mt-2 bg-obsidian-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
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

            {/* Filter Sheet Modal */}
            <AnimatePresence>
                {showFilters && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowFilters(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-[80px] left-0 right-0 bg-zinc-900 border-t border-white/10 rounded-t-3xl z-50 p-6 md:hidden max-h-[70vh] overflow-y-auto shadow-2xl"
                        >
                            <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-6" />

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Categories</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {['All', 'New', 'Trending', 'Crypto', 'Stocks', 'AI', 'Meme'].map((cat) => (
                                            <button
                                                key={cat}
                                                onClick={() => {
                                                    const val = cat.toLowerCase();
                                                    router.push(`/?category=${val}`, { scroll: false });
                                                }}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${(activeCategory === cat.toLowerCase() || (cat === 'All' && activeCategory === 'all'))
                                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                                    : 'bg-surface text-text-muted border-border-subtle hover:bg-active hover:text-text-main'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Minimum Holders</h3>
                                    <input
                                        type="range"
                                        min="0"
                                        max="10000"
                                        step="100"
                                        value={filters.minHolders}
                                        onChange={(e) => setFilters(prev => ({ ...prev, minHolders: parseInt(e.target.value) }))}
                                        className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <div className="flex justify-between text-xs text-zinc-500 mt-2 font-mono">
                                        <span>0</span>
                                        <span className="text-primary font-bold">{filters.minHolders}+</span>
                                        <span>10k+</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowFilters(false)}
                                    className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Active Content Grid */}
            <main className="max-w-[1400px] mx-auto px-3 sm:px-6 py-6 md:py-8 lg:py-12 relative z-10">
                {/* Floating Navigation / Stats Bar could go here */}

                <div className="flex flex-col gap-6 md:gap-10">
                    <AnimatePresence mode="popLayout">
                        {filteredAssets.length > 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={viewMode === 'grid'
                                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-3.5 lg:gap-4 md:auto-rows-fr"
                                    : "flex flex-col gap-2 md:gap-3"
                                }
                            >
                                {filteredAssets.map((asset) => (
                                    <AssetCard
                                        key={asset.id}
                                        {...asset}
                                        isAuthenticated={isAuthenticated}
                                        viewMode={viewMode}
                                        activeTimeframe={undefined}
                                    />
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-20 md:py-40 text-center"
                            >
                                <div className="w-20 h-20 md:w-32 md:h-32 bg-surface rounded-full flex items-center justify-center mb-6 md:mb-8 border border-border-subtle shadow-xl">
                                    <Activity className="w-10 h-10 md:w-16 md:h-16 text-text-dim" />
                                </div>
                                <h3 className="text-xl md:text-3xl font-black text-text-main mb-2 md:mb-4 tracking-tight">
                                    No Assets Found
                                </h3>
                                <p className="text-sm md:text-lg text-text-muted max-w-md font-medium px-6">
                                    We couldn't find any assets matching your filters. Try adjusting your search or category.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </>
    );
}
