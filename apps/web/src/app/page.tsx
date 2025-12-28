'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AssetCard } from '@/components/assets';
import { SubNavbar } from '@/components/layout/SubNavbar';
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
            <div className="min-h-screen bg-background relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
                <SubNavbar />
                <div className="max-w-[1400px] mx-auto px-4 py-24 flex flex-col items-center justify-center space-y-4">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin"></div>
                        <div className="absolute inset-2 border-r-2 border-neon-purple rounded-full animate-spin reverse-spin"></div>
                    </div>
                    <div className="text-primary/50 animate-pulse font-mono text-sm tracking-widest uppercase">Initializing Datastream...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background relative selection:bg-primary/20 selection:text-primary">
            {/* Background Effects */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            <div className="fixed inset-0 bg-[radial-gradient(circle_800px_at_50%_-20%,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

            <SubNavbar />

            <main className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8 relative z-10">
                {/* Guest Welcome Banner - Only for non-auth */}
                {!isAuthenticated && !searchParam && categoryParam === 'all' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="mb-8 md:mb-16 relative overflow-hidden rounded-3xl border border-white/10 group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-obsidian-800 to-obsidian-950/50 backdrop-blur-xl" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />

                        <div className="relative z-10 p-8 md:p-16 text-center">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="inline-block mb-4 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono tracking-widest uppercase"
                            >
                                The Future of Trading
                            </motion.div>

                            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 md:mb-8 tracking-tighter leading-tight">
                                Turn World Variables Into <br className="hidden md:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-neon-purple animate-gradient-x">Investable Assets</span>
                            </h1>

                            <p className="text-base md:text-xl text-muted-foreground mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed">
                                Trade AI-monitored real-world events. From climate data to political outcomes,
                                verify your thesis with institutional-grade tools.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link
                                    href="/signup"
                                    className="w-full sm:w-auto px-8 py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-95 text-sm md:text-base ring-1 ring-white/20"
                                >
                                    Start Trading Now
                                </Link>
                                <Link
                                    href="/about"
                                    className="w-full sm:w-auto px-8 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all border border-white/10 hover:border-white/20 text-sm md:text-base"
                                >
                                    How it Works
                                </Link>
                            </div>
                        </div>

                        {/* Abstract BG decorations */}
                        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 blur-3xl rounded-full transform translate-x-1/2 -translate-y-1/2 opacity-20" />
                        <div className="absolute bottom-0 left-0 w-1/3 h-full bg-neon-purple/5 blur-3xl rounded-full transform -translate-x-1/2 translate-y-1/2 opacity-20" />
                    </motion.div>
                )}

                {/* Markets Title & Mobile Search */}
                <div className="flex flex-col gap-4 mb-8 animate-in fade-in duration-500 delay-100">
                    {/* Mobile Search Bar - Only visible on small screens */}
                    <div className="md:hidden">
                        <form
                            onSubmit={handleMobileSearch}
                            className="relative group"
                        >
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
                            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                                {searchParam ? (
                                    <>Results for "<span className="text-primary">{searchParam}</span>"</>
                                ) : (
                                    <>{categoryParam === 'all' ? 'Trending Markets' : `${categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1)} Markets`}</>
                                )}
                            </h2>
                            <span className="hidden xs:inline-flex text-[10px] font-mono text-muted-foreground bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                {filteredAssets.length} ASSETS
                            </span>
                        </div>

                        {/* View Toggle - Icons Only */}
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
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
                            : "flex flex-col gap-3"
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
            </main>
        </div>
    );
}
