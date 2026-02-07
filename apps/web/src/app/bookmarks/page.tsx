'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AssetCard } from '@/components/assets';
import { Bookmark, Search, ArrowLeft, Loader2, Heart, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    lastFundamental: number | null;
    aiConfidence: number | null;
    aiSummary: string | null;
    imageUrl?: string;
    holders?: number;
    isBookmarked?: boolean;
}

export default function BookmarksPage() {
    const { status: authStatus } = useSession();
    const router = useRouter();
    const [bookmarks, setBookmarks] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const isAuthenticated = authStatus === 'authenticated';

    useEffect(() => {
        if (authStatus === 'unauthenticated') {
            router.push('/login');
        }
    }, [authStatus, router]);

    // Persist view mode
    useEffect(() => {
        const saved = localStorage.getItem('watchlistViewMode');
        if (saved === 'list' || saved === 'grid') setViewMode(saved);
    }, []);

    const toggleView = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('watchlistViewMode', mode);
    };

    const fetchBookmarks = async () => {
        try {
            const res = await fetch('/api/bookmarks');
            if (res.ok) {
                const data = await res.json();
                setBookmarks(data.bookmarks);
            }
        } catch (error) {
            console.error('Failed to fetch bookmarks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchBookmarks();
        }
    }, [isAuthenticated]);

    if (authStatus === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-background relative flex flex-col items-center justify-center space-y-4">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
                <div className="relative w-16 h-16">
                    <Loader2 className="w-16 h-16 text-primary animate-spin" />
                    <Heart className="absolute inset-0 m-auto w-6 h-6 text-primary animate-pulse" />
                </div>
                <div className="text-primary/50 animate-pulse font-mono text-xs tracking-[0.3em] uppercase">Syncing Watchlist...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent relative selection:bg-primary/20 selection:text-primary">
            <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 relative z-10">
                {/* Back Link */}
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white mb-8 transition-colors group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Markets
                </Link>

                {/* Header Section */}
                <div className="flex flex-col gap-6 mb-10">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
                                Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-neon-purple">Watchlist</span>
                            </h1>
                            <p className="text-zinc-500 text-sm font-medium">Assets you're tracking in real-time.</p>
                        </div>

                        {/* View Toggle */}
                        {bookmarks.length > 0 && (
                            <div className="flex items-center bg-obsidian-900/50 backdrop-blur-md rounded-xl p-1 border border-white/10 shadow-xl">
                                <button
                                    onClick={() => toggleView('grid')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => toggleView('list')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Stats Badge */}
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono tracking-widest uppercase">
                            {bookmarks.length} {bookmarks.length === 1 ? 'Asset' : 'Assets'} Tracked
                        </div>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                    </div>
                </div>

                {/* Assets Grid / List */}
                <AnimatePresence mode="popLayout">
                    {bookmarks.length > 0 ? (
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={viewMode === 'grid'
                                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
                                : "flex flex-col gap-4"
                            }
                        >
                            {bookmarks.map((asset, index) => (
                                <motion.div
                                    layout
                                    key={asset.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                >
                                    <AssetCard
                                        {...asset}
                                        isAuthenticated={true}
                                        viewMode={viewMode}
                                    />
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-32 border border-dashed border-white/10 rounded-[32px] bg-white/[0.02] backdrop-blur-sm"
                        >
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 relative group">
                                <Bookmark className="w-10 h-10 text-primary opacity-50 group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping" />
                            </div>
                            <h3 className="text-white text-xl font-bold mb-2">Watchlist Empty</h3>
                            <p className="text-zinc-500 text-sm mb-8 max-w-xs text-center leading-relaxed">
                                You haven't bookmarked any assets yet. Start exploring the markets to build your watchlist.
                            </p>
                            <Link
                                href="/"
                                className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/95 transition-all shadow-xl shadow-primary/20 hover:scale-[1.05] active:scale-95 flex items-center gap-2"
                            >
                                <Search className="w-4 h-4" />
                                Explore Markets
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
