'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { UserStats } from '@/components/layout/UserStats';
import { ProfileHoverCard } from '@/components/profile/ProfileHoverCard';
import { Search, Activity, Menu, TrendingUp, Users, Bookmark, FileText, X, Wallet, LogOut, LayoutGrid } from 'lucide-react';

export function Navbar() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [bookmarks, setBookmarks] = useState<any[]>([]);
    const [loadingBookmarks, setLoadingBookmarks] = useState(false);

    // Fetch Bookmarks
    useEffect(() => {
        if (status === 'authenticated') {
            const fetchBookmarks = async () => {
                setLoadingBookmarks(true);
                try {
                    const res = await fetch('/api/bookmarks');
                    if (res.ok) {
                        const data = await res.json();
                        setBookmarks(data.bookmarks || []);
                    }
                } catch (e) {
                    console.error('Failed to fetch bookmarks', e);
                } finally {
                    setLoadingBookmarks(false);
                }
            };
            fetchBookmarks();
            // Optional: Poll or listen to events
            const interval = setInterval(fetchBookmarks, 15000);
            return () => clearInterval(interval);
        }
    }, [status]);

    // Close menus on route change
    useEffect(() => {
        setIsProfileOpen(false);
        setIsNotifOpen(false);
        setIsBookmarksOpen(false);
    }, [router]);

    // Close on click outside (unchanged)
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Element;
            if (!target.closest('.nav-popover-trigger') &&
                !target.closest('.nav-popover-content')) {
                setIsProfileOpen(false);
                setIsNotifOpen(false);
                setIsBookmarksOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50 h-16 transition-all duration-300">
            <div className="max-w-[1400px] mx-auto px-4 h-full flex items-center justify-between gap-4">
                {/* 1. Logo Section (Text Only) */}
                <Link href="/" className="flex items-center flex-shrink-0 group">
                    <span className="font-bold text-2xl text-white tracking-tighter group-hover:text-primary transition-colors duration-300">
                        MEGATRON
                    </span>
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
                        BETA
                    </span>
                </Link>

                {/* 2. Search Section */}
                <div className="hidden md:flex flex-1 max-w-xl justify-center px-4">
                    <form onSubmit={handleSearch} className="relative w-full group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search markets..."
                            className="block w-full pl-10 pr-3 py-2 bg-secondary/50 border border-border text-foreground placeholder-muted-foreground rounded-lg focus:outline-none focus:bg-secondary focus:ring-1 focus:ring-primary focus:border-primary/50 text-sm transition-all duration-200"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <kbd className="hidden sm:inline-block px-1.5 py-0.5 border border-border rounded text-[10px] font-mono text-muted-foreground">
                                /
                            </kbd>
                        </div>
                    </form>
                </div>

                {/* 3. Right Section (Desktop) */}
                <div className="hidden md:flex items-center gap-3 md:gap-4 flex-shrink-0">
                    {status === 'authenticated' ? (
                        <>
                            <UserStats />

                            {/* Bookmarks Popover */}
                            <div className="relative">
                                <button
                                    className={`nav-popover-trigger p-2 rounded-lg transition-all duration-200 relative ${isBookmarksOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsBookmarksOpen(!isBookmarksOpen);
                                        setIsNotifOpen(false);
                                        setIsProfileOpen(false);
                                    }}
                                >
                                    <Bookmark className="w-5 h-5" />
                                </button>

                                {isBookmarksOpen && (
                                    <div className="nav-popover-content absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 origin-top-right overflow-hidden">
                                        <div className="p-3 border-b border-white/5 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-foreground">Bookmarks</h3>
                                            <span className="text-xs text-muted-foreground">{bookmarks.length} assets</span>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                            {loadingBookmarks ? (
                                                <div className="p-4 text-center text-xs text-muted-foreground">Loading...</div>
                                            ) : bookmarks.length > 0 ? (
                                                <div className="space-y-1">
                                                    {bookmarks.map((bm) => (
                                                        <Link
                                                            key={bm.id}
                                                            href={`/assets/${bm.id}`}
                                                            className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors group"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center">
                                                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-white group-hover:text-primary transition-colors">{bm.name}</p>
                                                                    <p className="text-xs text-muted-foreground">${bm.price.toFixed(2)}</p>
                                                                </div>
                                                            </div>
                                                            <span className={`text-xs font-mono ${bm.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                {bm.change > 0 ? '+' : ''}{bm.change.toFixed(2)}%
                                                            </span>
                                                        </Link>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-8 text-center text-muted-foreground text-sm">
                                                    No bookmarks yet
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Notifications Popover */}
                            <div className="relative">
                                <button
                                    className={`nav-popover-trigger p-2 rounded-lg transition-all duration-200 relative ${isNotifOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsNotifOpen(!isNotifOpen);
                                        setIsProfileOpen(false);
                                        setIsBookmarksOpen(false);
                                    }}
                                >
                                    <Activity className="w-5 h-5" />
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                </button>

                                {isNotifOpen && (
                                    <div className="nav-popover-content absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 origin-top-right overflow-hidden p-4">
                                        <h3 className="text-sm font-semibold mb-3 text-foreground">Activity</h3>
                                        <div className="space-y-3">
                                            <div className="py-8 text-center text-muted-foreground text-sm flex flex-col items-center">
                                                <Activity className="w-8 h-8 opacity-20 mb-2" />
                                                <p>No recent activity</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Profile Popover */}
                            <div className="relative">
                                <ProfileHoverCard
                                    isOpen={isProfileOpen}
                                    onToggle={() => {
                                        setIsProfileOpen(!isProfileOpen);
                                        setIsNotifOpen(false);
                                        setIsBookmarksOpen(false);
                                    }}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                Log In
                            </Link>
                            <Link href="/signup" className="text-sm px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                                Get Started
                            </Link>
                        </div>
                    )}
                </div>

                {/* 4. Mobile Toggle */}
                <div className="md:hidden flex items-center gap-3">
                    {status === 'authenticated' && (
                        <div
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg cursor-pointer"
                            onClick={() => setIsProfileOpen(!isProfileOpen)} // Optional: Navigate or open drawer
                        >
                            U
                        </div>
                    )}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 text-muted-foreground hover:text-white"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm md:hidden"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 z-[101] w-[300px] bg-zinc-950 border-l border-white/10 md:hidden flex flex-col shadow-2xl"
                        >
                            {/* Header */}
                            <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
                                <span className="font-bold text-xl text-white tracking-tighter">
                                    MENU
                                </span>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2 -mr-2 text-muted-foreground hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-24">
                                {/* Search */}
                                <form onSubmit={(e) => { handleSearch(e); setIsMobileMenuOpen(false); }} className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search markets..."
                                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                                    />
                                </form>

                                {/* Navigation Context */}
                                <div className="space-y-6">
                                    {status === 'authenticated' ? (
                                        <>
                                            {/* Account Summary */}
                                            <div className="relative group p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-white/5">
                                                <div className="flex items-center gap-4 mb-2">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-primary/10">
                                                        {session?.user?.email?.[0].toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-white truncate text-sm">{session?.user?.email}</p>
                                                        <p className="text-[10px] text-primary font-medium uppercase tracking-wider">Verified Trader</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Quick Links (Secondary) */}
                                            <div className="space-y-1">
                                                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-2 mb-2">More</h3>
                                                <Link href="/portfolio" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-all text-sm font-medium text-gray-300 hover:text-white hover:pl-4">
                                                    <TrendingUp className="w-4 h-4 text-purple-400" /> Portfolio Analysis
                                                </Link>
                                                <Link href="/leaderboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-all text-sm font-medium text-gray-300 hover:text-white hover:pl-4">
                                                    <Users className="w-4 h-4 text-amber-400" /> Leaderboard
                                                </Link>
                                            </div>

                                            {/* Bookmarks */}
                                            {bookmarks.length > 0 && (
                                                <div className="space-y-3">
                                                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-2">Watchlist</h3>
                                                    <div className="space-y-2">
                                                        {bookmarks.slice(0, 3).map(bm => (
                                                            <Link
                                                                key={bm.id}
                                                                href={`/assets/${bm.id}`}
                                                                onClick={() => setIsMobileMenuOpen(false)}
                                                                className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 active:scale-95 transition-transform"
                                                            >
                                                                <span className="text-xs font-medium text-white truncate mr-2">{bm.name}</span>
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-[10px] font-mono font-bold text-white">${bm.price.toFixed(2)}</span>
                                                                    <span className={`text-[10px] font-mono ${bm.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                        {bm.change > 0 ? '+' : ''}{bm.change.toFixed(2)}%
                                                                    </span>
                                                                </div>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="pt-4 mt-4 border-t border-white/5">
                                                <Link href="/api/auth/signout" className="flex items-center gap-3 w-full p-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors">
                                                    <LogOut className="w-4 h-4" /> Sign Out
                                                </Link>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            <Link
                                                href="/login"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="w-full flex items-center justify-center py-4 rounded-xl border border-white/10 font-bold text-sm hover:bg-white/5 active:scale-95 transition-all"
                                            >
                                                Log In
                                            </Link>
                                            <Link
                                                href="/signup"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="w-full flex items-center justify-center py-4 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 shadow-xl shadow-primary/20 active:scale-95 transition-all"
                                            >
                                                Get Started
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <nav className="glass-nav md:hidden"></nav>
        </nav>
    );
}

