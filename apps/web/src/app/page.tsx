'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AssetCard } from '@/components/assets';
import { SubNavbar } from '@/components/layout/SubNavbar';
import Link from 'next/link';
import { Search, LayoutGrid, List } from 'lucide-react';

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

export default function HomePage() {
    const { status: authStatus } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const searchParam = searchParams.get('q') || '';
    const categoryParam = searchParams.get('category') || 'all';

    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [mobileSearchText, setMobileSearchText] = useState(searchParam);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const isAuthenticated = authStatus === 'authenticated';

    // Persist view mode
    useEffect(() => {
        const saved = localStorage.getItem('assetViewMode');
        if (saved === 'list' || saved === 'grid') setViewMode(saved);
    }, []);

    const toggleView = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('assetViewMode', mode);
    };

    // Sync mobile search text when URL param changes
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

    useEffect(() => {
        async function fetchAssets() {
            try {
                const res = await fetch('/api/assets');
                if (res.ok) {
                    const data = await res.json();
                    setAssets(data.assets);
                }
            } catch (error) {
                console.error('Failed to fetch assets:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchAssets();
    }, []);

    // Filter assets by category and search query
    const filteredAssets = assets.filter((asset) => {
        // 1. Text Search
        if (searchParam) {
            const query = searchParam.toLowerCase();
            const matchesName = asset.name.toLowerCase().includes(query);
            const matchesDesc = asset.description?.toLowerCase().includes(query);
            if (!matchesName && !matchesDesc) return false;
        }

        // 2. Category Filter
        if (categoryParam === 'all') return true;
        if (categoryParam === 'new') return true; // TODO: Implement 'new' logic
        if (categoryParam === 'trending') return true; // TODO: Implement 'trending' logic
        return asset.type.toLowerCase() === categoryParam.toLowerCase();
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-black">
                <SubNavbar />
                <div className="max-w-[1400px] mx-auto px-4 py-12 flex justify-center">
                    <div className="text-gray-500 animate-pulse font-mono">Loading data stream...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <SubNavbar />

            <main className="max-w-[1240px] mx-auto px-6 py-8">
                {/* Guest Welcome Banner - Only for non-auth */}
                {!isAuthenticated && !searchParam && categoryParam === 'all' && (
                    <div className="mb-6 md:mb-12 glass-panel rounded-3xl p-5 md:p-12 text-center relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="relative z-10">
                            <h1 className="text-xl md:text-3xl font-bold text-white mb-2 md:mb-3 tracking-tight leading-tight px-2">
                                When world variables become investable assets
                            </h1>
                            <p className="text-sm md:text-lg text-gray-400 mb-5 md:mb-6 max-w-2xl mx-auto px-4 md:px-0">
                                Trade, invest, earn from anything: real world variables tracked by LLM analysis and institutional-grade tools.
                            </p>
                            <Link
                                href="/signup"
                                className="inline-flex w-full md:w-auto items-center justify-center px-8 py-3.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all shadow-lg hover:scale-[1.02] active:scale-95 text-sm md:text-base"
                            >
                                Start Trading
                            </Link>
                        </div>
                        {/* Abstract BG decorations */}
                        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
                            <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px]" />
                            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px]" />
                        </div>
                    </div>
                )}

                {/* Markets Title & Mobile Search */}
                <div className="flex flex-col gap-4 mb-6 animate-in fade-in duration-500 delay-100">
                    {/* Mobile Search Bar - Only visible on small screens */}
                    <div className="md:hidden">
                        <form
                            onSubmit={handleMobileSearch}
                            className="relative"
                        >
                            <input
                                name="mobileSearch"
                                type="text"
                                value={mobileSearchText}
                                onChange={(e) => setMobileSearchText(e.target.value)}
                                placeholder="Search markets..."
                                className="w-full pl-4 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                            />
                            <button type="submit" className="absolute right-3 top-3.5 text-gray-500">
                                <Search className="w-4 h-4" />
                            </button>
                        </form>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold text-white capitalize flex items-center gap-2">
                                {searchParam ? (
                                    <>Results for "<span className="text-blue-400">{searchParam}</span>"</>
                                ) : (
                                    <>{categoryParam === 'all' ? 'All Markets' : `${categoryParam} Markets`}</>
                                )}
                            </h2>
                            <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded w-fit">
                                {filteredAssets.length} <span className="hidden xs:inline">RESULTS</span>
                            </span>
                        </div>

                        {/* View Toggle - Icons Only */}
                        <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
                            <button
                                onClick={() => toggleView('grid')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                                title="Grid View"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => toggleView('list')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                                title="List View"
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Assets Grid / List */}
                {filteredAssets.length > 0 ? (
                    <div className={viewMode === 'grid'
                        ? "grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6"
                        : "grid grid-cols-1 gap-3 md:gap-4"
                    }>
                        {filteredAssets.map((asset, index) => (
                            <div
                                key={asset.id}
                                className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <AssetCard
                                    {...asset}
                                    isAuthenticated={isAuthenticated}
                                    viewMode={viewMode}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/10 rounded-xl bg-white/5">
                        <p className="text-gray-500 text-lg mb-4">No markets found.</p>
                        <Link
                            href="/assets/request"
                            className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                        >
                            Request a new market
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}
