'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { UserStats } from '@/components/layout/UserStats';
import { ProfileHoverCard } from '@/components/profile/ProfileHoverCard';
import { Search, Activity, Menu, TrendingUp, Users, Bookmark, FileText } from 'lucide-react';

export function Navbar() {
    const { status } = useSession();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
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

                {/* 3. Right Section */}
                <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
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
            </div>
        </nav>
    );
}

