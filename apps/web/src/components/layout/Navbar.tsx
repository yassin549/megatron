'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { UserStats } from '@/components/layout/UserStats';
import { ProfileHoverCard } from '@/components/profile/ProfileHoverCard';
import { Search, Activity, Menu, TrendingUp, Users, Bookmark, FileText, X, LogOut } from 'lucide-react';

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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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
            // Poll for updates
            const interval = setInterval(fetchBookmarks, 15000);
            return () => clearInterval(interval);
        }
    }, [status]);

    // Close menus on route change
    useEffect(() => {
        setIsProfileOpen(false);
        setIsNotifOpen(false);
        setIsBookmarksOpen(false);
        setIsMobileMenuOpen(false);
    }, [router]);

    // Close on click outside
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

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isMobileMenuOpen]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <nav className="glass-nav sticky top-0 z-50 h-16 transition-all duration-300">
            <div className="max-w-[1400px] mx-auto px-4 h-full flex items-center justify-between gap-4">
                {/* 1. Logo Section */}
                <Link href="/" className="flex items-center flex-shrink-0 group gap-3">
                    <div className="relative w-8 h-8 md:w-10 md:h-10">
                        <Image
                            src="/images/megatron-logo.jpg"
                            alt="Megatron Logo"
                            width={40}
                            height={40}
                            className="object-contain mix-blend-screen filter brightness-110 contrast-125"
                            priority
                        />
                    </div>
                    <div className="flex items-center">
                        <span className="font-bold text-2xl text-white tracking-tighter group-hover:text-primary transition-colors duration-300">
                            MEGATRON
                        </span>
                        <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
                            BETA
                        </span>
                    </div>
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
                            placeholder="Type / to search markets..."
                            className="block w-full pl-10 pr-3 py-2 bg-obsidian-900/50 border border-white/10 text-foreground placeholder-muted-foreground rounded-lg focus:outline-none focus:bg-obsidian-800 focus:ring-1 focus:ring-primary focus:border-primary/50 text-sm transition-all duration-200"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <kbd className="hidden sm:inline-block px-1.5 py-0.5 border border-white/10 rounded text-[10px] font-mono text-muted-foreground">
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
                                    className={`nav-popover-trigger p-2 rounded-lg transition-all duration-200 relative ${isBookmarksOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
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
                                    <div className="nav-popover-content absolute right-0 top-full mt-2 w-72 glass-panel rounded-xl animate-in fade-in slide-in-from-top-2 origin-top-right overflow-hidden">
                                        <div className="p-3 border-b border-white/5 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-white">Bookmarks</h3>
                                            <span className="text-xs text-muted-foreground">{bookmarks.length} assets</span>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto p-2">
                                            {loadingBookmarks ? (
                                                <div className="p-4 text-center text-xs text-muted-foreground animate-pulse">Loading data...</div>
                                            ) : bookmarks.length > 0 ? (
                                                <div className="space-y-1">
                                                    {bookmarks.map((bm) => (
                                                        <Link
                                                            key={bm.id}
                                                            href={`/assets/${bm.id}`}
                                                            className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors group"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded bg-obsidian-800 border border-white/5 flex items-center justify-center">
                                                                    <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-white group-hover:text-primary transition-colors">{bm.name}</p>
                                                                    <p className="text-xs text-muted-foreground font-mono">${bm.price.toFixed(2)}</p>
                                                                </div>
                                                            </div>
                                                            <span className={`text-xs font-mono font-bold ${bm.change24h >= 0 ? 'text-neon-emerald' : 'text-neon-rose'}`}>
                                                                {bm.change24h > 0 ? '+' : ''}{bm.change24h.toFixed(2)}%
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
                                    className={`nav-popover-trigger p-2 rounded-lg transition-all duration-200 relative ${isNotifOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsNotifOpen(!isNotifOpen);
                                        setIsProfileOpen(false);
                                        setIsBookmarksOpen(false);
                                    }}
                                >
                                    <Activity className="w-5 h-5" />
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-neon-emerald rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
                                </button>

                                {isNotifOpen && (
                                    <div className="nav-popover-content absolute right-0 top-full mt-2 w-80 glass-panel rounded-xl animate-in fade-in slide-in-from-top-2 origin-top-right overflow-hidden p-4">
                                        <h3 className="text-sm font-semibold mb-3 text-white">Activity Stream</h3>
                                        <div className="space-y-3">
                                            <div className="py-8 text-center text-muted-foreground text-sm flex flex-col items-center">
                                                <Activity className="w-8 h-8 opacity-20 mb-2" />
                                                <p>No recent activity detected</p>
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
                            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">
                                Log In
                            </Link>
                            <Link href="/signup" className="group relative px-5 py-2 rounded-lg bg-primary text-white text-sm font-bold overflow-hidden">
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <span className="relative">Get Started</span>
                            </Link>
                        </div>
                    )}
                </div>

                {/* 4. Mobile Toggle */}
                <div className="md:hidden flex items-center gap-3">
                    {status === 'authenticated' && (
                        <div
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-1 ring-white/10"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            {session?.user?.email?.[0].toUpperCase() || 'U'}
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

            {/* Mobile Menu Portal (Final Definitive Fix) */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <div className="fixed inset-0 z-[9999] md:hidden">
                            {/* Fast Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            />

                            {/* Solid Slide-out Drawer */}
                            <motion.div
                                initial={{ x: "100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "100%" }}
                                transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
                                className="absolute inset-y-0 right-0 w-[85%] max-w-[360px] h-[100dvh] bg-obsidian-950 border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.9)] flex flex-col"
                            >
                                {/* Drawer Header */}
                                <div className="h-20 flex-shrink-0 flex items-center justify-between px-6 border-b border-white/5 bg-white/[0.02]">
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-8 h-8">
                                            <Image
                                                src="/images/megatron-logo.jpg"
                                                alt="Megatron Logo"
                                                fill
                                                className="object-contain mix-blend-screen filter brightness-110 contrast-125"
                                            />
                                        </div>
                                        <span className="font-bold text-xl text-white tracking-tighter">
                                            MEGATRON
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="p-2 -mr-2 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-full"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Drawer Scrollable Content */}
                                <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 custom-scrollbar">
                                    {/* 1. Account Identity */}
                                    {status === 'authenticated' ? (
                                        <div className="relative p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-obsidian-900 to-obsidian-900 border border-primary/20 shadow-inner group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg ring-2 ring-primary/20">
                                                    {session?.user?.email?.[0].toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-white truncate text-sm">{session?.user?.email}</p>
                                                    <p className="flex items-center gap-1.5 text-[10px] text-primary font-bold uppercase tracking-widest mt-0.5">
                                                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                                                        Verified Trader
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            <Link
                                                href="/login"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="flex items-center justify-center py-4 rounded-xl border border-white/10 font-bold text-xs text-white hover:bg-white/5 active:scale-95 transition-all text-center"
                                            >
                                                LOGIN
                                            </Link>
                                            <Link
                                                href="/signup"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="flex items-center justify-center py-4 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-95 transition-all text-center"
                                            >
                                                JOIN
                                            </Link>
                                        </div>
                                    )}

                                    {/* 2. Enhanced Search */}
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-1">Navigation</h3>
                                        <form onSubmit={(e) => { handleSearch(e); setIsMobileMenuOpen(false); }} className="relative group">
                                            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search markets..."
                                                className="w-full pl-11 pr-4 py-3.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-white/[0.05] transition-all"
                                            />
                                        </form>
                                    </div>

                                    {/* 3. Grouped Links */}
                                    <div className="space-y-1">
                                        <Link href="/portfolio" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between group w-full p-4 rounded-xl hover:bg-white/5 transition-all">
                                            <div className="flex items-center gap-3 font-semibold text-zinc-300 group-hover:text-white transition-colors">
                                                <TrendingUp className="w-5 h-5 text-neon-purple opacity-70 group-hover:opacity-100" />
                                                Portfolio
                                            </div>
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-primary transition-colors" />
                                        </Link>
                                        <Link href="/leaderboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between group w-full p-4 rounded-xl hover:bg-white/5 transition-all">
                                            <div className="flex items-center gap-3 font-semibold text-zinc-300 group-hover:text-white transition-colors">
                                                <Users className="w-5 h-5 text-amber-400 opacity-70 group-hover:opacity-100" />
                                                Leaderboard
                                            </div>
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-primary transition-colors" />
                                        </Link>
                                        {status === 'authenticated' && (
                                            <Link href="/bookmarks" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between group w-full p-4 rounded-xl hover:bg-white/5 transition-all">
                                                <div className="flex items-center gap-3 font-semibold text-zinc-300 group-hover:text-white transition-colors">
                                                    <Bookmark className="w-5 h-5 text-neon-blue opacity-70 group-hover:opacity-100" />
                                                    Watchlist
                                                </div>
                                                <div className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] text-primary font-bold">
                                                    {bookmarks.length}
                                                </div>
                                            </Link>
                                        )}
                                    </div>

                                    {/* 4. Bottom Actions */}
                                    {status === 'authenticated' && (
                                        <div className="pt-6 border-t border-white/5">
                                            <Link
                                                href="/api/auth/signout"
                                                className="flex items-center gap-3 w-full p-4 rounded-xl text-sm font-bold text-neon-rose hover:bg-neon-rose/10 transition-colors"
                                            >
                                                <LogOut className="w-5 h-5" />
                                                SIGN OUT
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Sidebar Footer */}
                                <div className="p-6 bg-white/[0.01] border-t border-white/5 flex-shrink-0">
                                    <p className="text-[10px] text-zinc-600 font-mono text-center tracking-tighter">
                                        FARADAY v1.4.2 // NEURAL ENGINE ACTIVE
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </nav>
    );
}

