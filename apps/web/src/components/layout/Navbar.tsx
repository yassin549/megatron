'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, Activity, Bookmark } from 'lucide-react';
import { NavbarSearch } from '@/components/layout/NavbarSearch';
import { UserStats } from '@/components/layout/UserStats';
import { NavUnifiedWindow } from '@/components/layout/NavUnifiedWindow';
import {
    NavTabButton,
    MobileDrawer,
    ProfilePanel,
    BookmarksPanel,
    ActivityPanel,
    GeneralPanel
} from './navbar';

type NavTab = 'general' | 'activity' | 'bookmarks' | 'profile' | null;

export function Navbar() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    // Scroll behavior
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        let lastScroll = 0;
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (window.innerWidth < 768) {
                setIsVisible(currentScrollY <= lastScroll || currentScrollY <= 80);
            } else {
                setIsVisible(true);
            }
            lastScroll = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // UI state
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeNavTab, setActiveNavTab] = useState<NavTab>(null);
    const [bookmarks, setBookmarks] = useState<any[]>([]);
    const [loadingBookmarks, setLoadingBookmarks] = useState(false);
    const [assetCount, setAssetCount] = useState<number | null>(null);

    // Mobile search state
    const [mobileSearchResults, setMobileSearchResults] = useState<any[]>([]);
    const [isMobileSearching, setIsMobileSearching] = useState(false);

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
            const interval = setInterval(fetchBookmarks, 15000);
            return () => clearInterval(interval);
        }
    }, [status]);

    // Fetch System Stats
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
        setActiveNavTab(null);
        setIsMobileMenuOpen(false);
    }, [router]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Element;
            if (!target.closest('.nav-popover-trigger') && !target.closest('.nav-popover-content')) {
                setActiveNavTab(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Mobile search handler
    const handleMobileSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setMobileSearchResults([]);
            return;
        }
        setIsMobileSearching(true);
        try {
            const res = await fetch(`/api/assets?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                setMobileSearchResults(data.assets || []);
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsMobileSearching(false);
        }
    }, []);

    const toggleTab = (tab: NavTab) => {
        setActiveNavTab(activeNavTab === tab ? null : tab);
    };

    const closePanel = () => setActiveNavTab(null);

    return (
        <nav className={`sticky top-0 z-50 h-16 transition-all duration-300 ${!isVisible ? '-translate-y-full pointer-events-none' : 'translate-y-0 pointer-events-auto'} glass-nav ${pathname === '/' ? 'border-b-0 shadow-none' : ''}`}>
            <div className="max-w-[1400px] mx-auto px-4 h-full flex items-center justify-between gap-4">
                {/* Logo */}
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
                        <span className="font-bold text-xl md:text-2xl text-text-main tracking-tighter group-hover:text-brand-primary transition-colors duration-200">
                            MEGATRON
                        </span>
                        <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 rounded-sm text-[10px] font-mono bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                            BETA
                        </span>
                    </div>
                </Link>

                {/* Search (Desktop) */}
                <div className="hidden md:flex flex-1 max-w-xl justify-center px-4">
                    <NavbarSearch />
                </div>

                {/* Right Section (Desktop) */}
                <div className="hidden md:flex items-center gap-3 md:gap-4 flex-shrink-0">
                    {status === 'authenticated' ? (
                        <>
                            <UserStats />

                            {/* Unified Nav Icons */}
                            <div className="relative flex items-center gap-1">
                                <NavUnifiedWindow
                                    isOpen={!!activeNavTab}
                                    activeTab={activeNavTab}
                                    onClose={closePanel}
                                    userName={session?.user?.name}
                                >
                                    {activeNavTab === 'profile' && session?.user && (
                                        <ProfilePanel onClose={closePanel} userName={session.user.name} />
                                    )}
                                    {activeNavTab === 'general' && (
                                        <GeneralPanel onClose={closePanel} />
                                    )}
                                    {activeNavTab === 'bookmarks' && (
                                        <BookmarksPanel
                                            bookmarks={bookmarks}
                                            loading={loadingBookmarks}
                                            onClose={closePanel}
                                        />
                                    )}
                                    {activeNavTab === 'activity' && (
                                        <ActivityPanel assetCount={assetCount} />
                                    )}
                                </NavUnifiedWindow>

                                <NavTabButton
                                    icon={Menu}
                                    isActive={activeNavTab === 'general'}
                                    onClick={() => toggleTab('general')}
                                />
                                <NavTabButton
                                    icon={Bookmark}
                                    isActive={activeNavTab === 'bookmarks'}
                                    onClick={() => toggleTab('bookmarks')}
                                />
                                <NavTabButton
                                    icon={Activity}
                                    isActive={activeNavTab === 'activity'}
                                    onClick={() => toggleTab('activity')}
                                    showStatusDot
                                />

                                <div className="w-px h-6 bg-white/10 mx-1" />

                                <NavTabButton
                                    icon={Menu}
                                    isActive={activeNavTab === 'profile'}
                                    onClick={() => toggleTab('profile')}
                                    avatar={
                                        <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 overflow-hidden relative">
                                            {session.user?.image ? (
                                                <img src={session.user.image} alt={session.user.name || 'User'} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 text-white text-xs font-bold">
                                                    {session.user?.email?.[0]?.toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                    }
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link href="/login" className="text-sm font-medium text-text-muted hover:text-text-main transition-colors">
                                Log In
                            </Link>
                            <Link href="/signup" className="group relative px-5 py-2 rounded-lg bg-brand-primary text-text-main text-sm font-bold overflow-hidden">
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <span className="relative">Get Started</span>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Mobile Layout */}
                <div className="md:hidden flex items-center gap-3">
                    {status === 'authenticated' && (
                        <div className="flex items-center gap-3">
                            <UserStats isMobile={true} />
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="transition-all active:scale-95"
                            >
                                <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden relative">
                                    {session.user?.image ? (
                                        <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 text-white text-[10px] font-bold">
                                            {session.user?.email?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </button>
                        </div>
                    )}

                    {status !== 'authenticated' && (
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 text-muted-foreground hover:text-white"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile Drawer */}
            <MobileDrawer
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                isAuthenticated={status === 'authenticated'}
                bookmarks={bookmarks}
                onSearch={handleMobileSearch}
                searchResults={mobileSearchResults}
                isSearching={isMobileSearching}
            />
        </nav>
    );
}
