'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { NavbarSearch } from '@/components/layout/NavbarSearch';
import { UserStats } from '@/components/layout/UserStats';
import { ProfileHoverCard } from '@/components/profile/ProfileHoverCard';
import { NavUnifiedWindow } from '@/components/layout/NavUnifiedWindow';
import { Search, Activity, Menu, TrendingUp, Users, Bookmark, FileText, X, LogOut, LayoutGrid, Star, History, PieChart, Layers, Wallet, Trophy, Settings, ChartBar } from 'lucide-react';

// Robust image component for search results

function SearchItemImage({ src, alt }: { src?: string; alt: string }) {
    const [imageError, setImageError] = useState(false);
    const [useStandardImg, setUseStandardImg] = useState(false);

    if (!src || imageError) {
        return (
            <div className="w-10 h-10 rounded-lg bg-obsidian-900 border border-white/10 flex items-center justify-center text-zinc-600">
                <FileText className="w-5 h-5" />
            </div>
        );
    }

    return (
        <div className="w-10 h-10 rounded-lg bg-obsidian-900 border border-white/10 flex items-center justify-center overflow-hidden relative">
            {/* Fallback Icon underneath */}
            <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
                <FileText className="w-5 h-5" />
            </div>

            {!useStandardImg ? (
                <Image
                    src={src}
                    alt={alt}
                    fill
                    className="object-cover relative z-10"
                    sizes="40px"
                    unoptimized={src.startsWith('/') || src.startsWith('http')}
                    onError={() => setUseStandardImg(true)}
                />
            ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={src}
                    alt={alt}
                    className="object-cover w-full h-full relative z-10"
                    onError={() => setImageError(true)}
                />
            )}
        </div>
    );
}

export function Navbar() {
    const { data: session, status } = useSession();
    const router = useRouter();
    // Mobile search state
    const [mobileSearchQuery, setMobileSearchQuery] = useState('');
    const [mobileSearchResults, setMobileSearchResults] = useState<any[]>([]);
    const [isMobileSearching, setIsMobileSearching] = useState(false);

    // UI state
    // isProfileOpen removed as it is now part of unified tabs
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Unified Tab State
    const [activeNavTab, setActiveNavTab] = useState<'general' | 'activity' | 'bookmarks' | 'profile' | null>(null);

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

    // Fetch System Stats
    const [assetCount, setAssetCount] = useState<number | null>(null);
    useEffect(() => {
        fetch('/api/stats/system')
            .then(res => res.json())
            .then(data => {
                if (data.assetCount) setAssetCount(data.assetCount);
            })
            .catch(err => console.error('Failed to load stats', err));
    }, []);

    // Close menus on route change
    useEffect(() => {
        // setIsProfileOpen(false); // Removed
        setActiveNavTab(null);
        setIsMobileMenuOpen(false);
    }, [router]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Element;
            if (!target.closest('.nav-popover-trigger') &&
                !target.closest('.nav-popover-content')) {
                // setIsProfileOpen(false); // Removed
                setActiveNavTab(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Debounced Search (Mobile Only)
    useEffect(() => {
        if (!mobileSearchQuery.trim()) {
            setMobileSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsMobileSearching(true);
            try {
                const res = await fetch(`/api/assets?q=${encodeURIComponent(mobileSearchQuery)}`);
                if (res.ok) {
                    const data = await res.json();
                    setMobileSearchResults(data.assets || []);
                }
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setIsMobileSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [mobileSearchQuery]);

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isMobileMenuOpen]);

    const handleMobileSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (mobileSearchQuery.trim()) {
            router.push(`/?q=${encodeURIComponent(mobileSearchQuery)}`);
            setIsMobileMenuOpen(false);
        }
    };

    return (
        <nav className="glass-nav sticky top-0 z-50 h-16 transition-all duration-200">
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
                        <span className="font-bold text-2xl text-white tracking-tighter group-hover:text-primary transition-colors duration-200">
                            MEGATRON
                        </span>
                        <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 rounded-sm text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
                            BETA
                        </span>
                    </div>
                </Link>

                {/* 2. Search Section (Desktop) */}
                <div className="hidden md:flex flex-1 max-w-xl justify-center px-4">
                    <NavbarSearch />
                </div>

                {/* 3. Right Section (Desktop) */}
                <div className="hidden md:flex items-center gap-3 md:gap-4 flex-shrink-0">
                    {status === 'authenticated' ? (
                        <>
                            <UserStats />


                            {/* Unified Desktop Nav Icons */}
                            <div className="relative flex items-center gap-1">
                                <NavUnifiedWindow
                                    isOpen={!!activeNavTab}
                                    activeTab={activeNavTab}
                                    onClose={() => setActiveNavTab(null)}
                                >
                                    {activeNavTab === 'profile' && session?.user && (
                                        <div className="space-y-8">
                                            {/* Navigation Grid */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <Link href="/dashboard" onClick={() => setActiveNavTab(null)} className="flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all group">
                                                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                                        <ChartBar className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-white">Dashboard</span>
                                                </Link>
                                                <Link href="/portfolio" onClick={() => setActiveNavTab(null)} className="flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all group">
                                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                                        <PieChart className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-white">Portfolio</span>
                                                </Link>
                                                <Link href="/lp" onClick={() => setActiveNavTab(null)} className="flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all group">
                                                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                                                        <Layers className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-white">Pools</span>
                                                </Link>
                                                <Link href="/wallet" onClick={() => setActiveNavTab(null)} className="flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all group">
                                                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                                                        <Wallet className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-white">Wallet</span>
                                                </Link>
                                            </div>

                                            {/* Footer Actions */}
                                            <div className="space-y-1">
                                                <Link href="/leaderboard" onClick={() => setActiveNavTab(null)} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all text-xs font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <Trophy className="w-4 h-4 text-amber-500/50" />
                                                        Leaderboard
                                                    </div>
                                                </Link>
                                                <Link href="/settings" onClick={() => setActiveNavTab(null)} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all text-xs font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <Settings className="w-4 h-4 text-zinc-600" />
                                                        My Settings
                                                    </div>
                                                </Link>
                                            </div>

                                            <div className="pt-4 border-t border-white/5">
                                                <Link
                                                    href="/api/auth/signout"
                                                    className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-all font-bold text-xs uppercase tracking-widest group"
                                                >
                                                    <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                                                    Log Out Session
                                                </Link>
                                            </div>
                                        </div>
                                    )}

                                    {activeNavTab === 'general' && (
                                        <div className="space-y-1">
                                            <Link href="/portfolio" onClick={() => setActiveNavTab(null)} className="flex items-center justify-between group w-full p-4 rounded-xl hover:bg-white/5 transition-all">
                                                <div className="flex items-center gap-3 font-semibold text-zinc-300 group-hover:text-white transition-colors">
                                                    <TrendingUp className="w-5 h-5 text-neon-purple opacity-70 group-hover:opacity-100" />
                                                    Portfolio
                                                </div>
                                                <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-primary transition-colors" />
                                            </Link>
                                            <Link href="/leaderboard" onClick={() => setActiveNavTab(null)} className="flex items-center justify-between group w-full p-4 rounded-xl hover:bg-white/5 transition-all">
                                                <div className="flex items-center gap-3 font-semibold text-zinc-300 group-hover:text-white transition-colors">
                                                    <Users className="w-5 h-5 text-amber-400 opacity-70 group-hover:opacity-100" />
                                                    Leaderboard
                                                </div>
                                                <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-primary transition-colors" />
                                            </Link>

                                            {/* System Stats in General Tab as well */}
                                            <div className="mt-4 pt-4 border-t border-white/5">
                                                <Link
                                                    href="/api/auth/signout"
                                                    className="flex items-center gap-3 w-full p-4 rounded-xl text-sm font-bold text-neon-rose hover:bg-neon-rose/10 transition-colors"
                                                >
                                                    <LogOut className="w-5 h-5" />
                                                    SIGN OUT
                                                </Link>
                                            </div>
                                        </div>
                                    )}

                                    {activeNavTab === 'bookmarks' && (
                                        <div className="space-y-4">
                                            {loadingBookmarks ? (
                                                <div className="space-y-3">
                                                    {[1, 2, 3].map(i => (
                                                        <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
                                                    ))}
                                                </div>
                                            ) : bookmarks.length > 0 ? (
                                                <div className="grid gap-2">
                                                    {bookmarks.slice(0, 6).map((bm) => (
                                                        <Link
                                                            key={bm.id}
                                                            href={`/assets/${bm.id}`}
                                                            onClick={() => setActiveNavTab(null)}
                                                            className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all group"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-obsidian-900 border border-white/5 flex items-center justify-center">
                                                                    <Star className="w-4 h-4 text-zinc-500 group-hover:text-primary transition-colors" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{bm.name}</p>
                                                                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-0.5">${bm.price.toFixed(2)}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className={`text-xs font-mono font-black ${bm.change24h >= 0 ? 'text-neon-emerald' : 'text-neon-rose'}`}>
                                                                    {bm.change24h > 0 ? '+' : ''}{bm.change24h.toFixed(2)}%
                                                                </span>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                    <Link
                                                        href="/bookmarks"
                                                        onClick={() => setActiveNavTab(null)}
                                                        className="block w-full text-center py-2 text-xs font-bold text-primary hover:text-white transition-colors uppercase tracking-widest mt-2"
                                                    >
                                                        View all {bookmarks.length} Bookmarks
                                                    </Link>
                                                </div>
                                            ) : (
                                                <div className="py-20 text-center flex flex-col items-center">
                                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                                        <Bookmark className="w-6 h-6 text-zinc-600" />
                                                    </div>
                                                    <p className="text-sm text-zinc-500">No bookmarked markets</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeNavTab === 'activity' && (
                                        <div className="space-y-6">
                                            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                                        <History className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-white">System Status</h4>
                                                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                                                            The Neural Engine is currently analyzing {assetCount ? assetCount.toLocaleString() : '2,400'} world variables in real-time.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Recent events</h5>
                                                <div className="py-12 text-center flex flex-col items-center">
                                                    <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center mb-3">
                                                        <Activity className="w-5 h-5 text-zinc-800" />
                                                    </div>
                                                    <p className="text-[11px] text-zinc-600 uppercase tracking-wider">Passive mode active</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </NavUnifiedWindow>

                                {/* General / Menu Tab */}
                                <button
                                    className={`nav-popover-trigger relative p-2.5 rounded-lg transition-all duration-300 ${activeNavTab === 'general' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.nativeEvent.stopImmediatePropagation();
                                        setActiveNavTab(activeNavTab === 'general' ? null : 'general');
                                    }}
                                >
                                    <Menu className="relative z-10 w-5 h-5" />
                                    {activeNavTab === 'general' && (
                                        <motion.div
                                            layoutId="navbar-tab-indicator"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] mx-2 rounded-full"
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                </button>

                                {/* Bookmarks Tab */}
                                <button
                                    className={`nav-popover-trigger relative p-2.5 rounded-lg transition-all duration-300 ${activeNavTab === 'bookmarks' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.nativeEvent.stopImmediatePropagation();
                                        setActiveNavTab(activeNavTab === 'bookmarks' ? null : 'bookmarks');
                                    }}
                                >
                                    <Bookmark className="relative z-10 w-5 h-5" />
                                    {activeNavTab === 'bookmarks' && (
                                        <motion.div
                                            layoutId="navbar-tab-indicator"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] mx-2 rounded-full"
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                </button>

                                {/* Activity Tab */}
                                <button
                                    className={`nav-popover-trigger relative p-2.5 rounded-lg transition-all duration-300 ${activeNavTab === 'activity' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.nativeEvent.stopImmediatePropagation();
                                        setActiveNavTab(activeNavTab === 'activity' ? null : 'activity');
                                    }}
                                >
                                    <Activity className="relative z-10 w-5 h-5" />
                                    {/* Status Dot */}
                                    <span className={`absolute top-2 right-2.5 w-1.5 h-1.5 bg-neon-emerald rounded-full transition-opacity duration-300 ${activeNavTab === 'activity' ? 'opacity-0' : 'opacity-100'} animate-pulse`} />

                                    {activeNavTab === 'activity' && (
                                        <motion.div
                                            layoutId="navbar-tab-indicator"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] mx-2 rounded-full"
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                </button>

                                {/* Divider */}
                                <div className="w-px h-6 bg-white/10 mx-1" />

                                {/* Profile Tab */}
                                <button
                                    className={`nav-popover-trigger relative p-0.5 rounded-full transition-all duration-300 group ${activeNavTab === 'profile'
                                        ? 'ring-2 ring-primary/20 scale-105'
                                        : 'hover:ring-2 hover:ring-white/10'
                                        }`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.nativeEvent.stopImmediatePropagation();
                                        setActiveNavTab(activeNavTab === 'profile' ? null : 'profile');
                                    }}
                                >
                                    <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 overflow-hidden relative">
                                        {session.user?.image ? (
                                            <img src={session.user.image} alt={session.user.name || 'User'} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 text-white text-xs font-bold">
                                                {session.user?.email?.[0]?.toUpperCase()}
                                            </div>
                                        )}
                                    </div>

                                    {activeNavTab === 'profile' && (
                                        <motion.div
                                            layoutId="navbar-tab-indicator"
                                            className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] mx-2 rounded-full"
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                </button>
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

                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 text-muted-foreground hover:text-white"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Mobile Menu Portal (Final Definitive Fix) */}
            {
                mounted && createPortal(
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
                                        {!(status === 'authenticated') && (
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
                                            <div className="relative group search-container">
                                                <form onSubmit={handleMobileSearch} className="relative group">
                                                    <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                                                    <input
                                                        type="text"
                                                        value={mobileSearchQuery}
                                                        onChange={(e) => setMobileSearchQuery(e.target.value)}
                                                        placeholder="Search markets..."
                                                        className="w-full pl-11 pr-4 py-3.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-white/[0.05] transition-all"
                                                    />
                                                </form>

                                                {/* Mobile Search Results */}
                                                {mobileSearchQuery.trim() && (
                                                    <div className="mt-4 space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar -mx-2 px-2">
                                                        {isMobileSearching ? (
                                                            <div className="py-8 text-center">
                                                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Searching...</p>
                                                            </div>
                                                        ) : mobileSearchResults.length > 0 ? (
                                                            mobileSearchResults.map((asset) => (
                                                                <Link
                                                                    key={asset.id}
                                                                    href={`/assets/${asset.id}`}
                                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.05] border border-white/10 active:scale-[0.98] transition-all"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <SearchItemImage src={asset.imageUrl} alt={asset.name} />
                                                                        <div>
                                                                            <p className="font-bold text-white text-xs">{asset.name}</p>
                                                                            <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest mt-0.5">{asset.type}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-xs font-bold text-white font-mono">${asset.price.toFixed(2)}</p>
                                                                        <p className={`text-[9px] font-bold font-mono ${asset.change24h >= 0 ? 'text-neon-emerald' : 'text-neon-rose'}`}>
                                                                            {asset.change24h > 0 ? '+' : ''}{asset.change24h}%
                                                                        </p>
                                                                    </div>
                                                                </Link>
                                                            ))
                                                        ) : (
                                                            <div className="py-12 text-center text-zinc-600">
                                                                <p className="text-xs">No results found</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
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
                )
            }
        </nav >
    );
}

