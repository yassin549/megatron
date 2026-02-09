'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, Users, Bookmark, X, LogOut, Palette } from 'lucide-react';
import { SearchItemImage } from './SearchItemImage';

interface Bookmark {
    id: string;
    name: string;
}

interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    isAuthenticated: boolean;
    bookmarks: Bookmark[];
    onSearch: (query: string) => void;
    searchResults: any[];
    isSearching: boolean;
}

/**
 * Mobile slide-out navigation drawer.
 */
export function MobileDrawer({
    isOpen,
    onClose,
    isAuthenticated,
    bookmarks,
    onSearch,
    searchResults,
    isSearching
}: MobileDrawerProps) {
    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            onSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, onSearch]);

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            onClose();
            window.location.href = `/?q=${encodeURIComponent(searchQuery)}`;
        }
    };

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] md:hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-[8px]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
                        className="absolute inset-y-0 right-0 w-[85%] max-w-[360px] h-[100dvh] bg-base/60 backdrop-blur-2xl border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.9)] flex flex-col"
                    >
                        {/* Header */}
                        <div className="h-20 flex-shrink-0 flex items-center justify-between px-6 border-b border-border-subtle bg-surface">
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
                                onClick={onClose}
                                className="p-2 -mr-2 text-zinc-400 hover:text-white transition-colors bg-active rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 custom-scrollbar">
                            {/* Auth buttons if not authenticated */}
                            {!isAuthenticated && (
                                <div className="grid grid-cols-2 gap-3">
                                    <Link
                                        href="/login"
                                        onClick={onClose}
                                        className="flex items-center justify-center py-4 rounded-xl border border-border-subtle font-bold text-xs text-white hover:bg-active active:scale-95 transition-all text-center"
                                    >
                                        LOGIN
                                    </Link>
                                    <Link
                                        href="/signup"
                                        onClick={onClose}
                                        className="flex items-center justify-center py-4 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-95 transition-all text-center"
                                    >
                                        JOIN
                                    </Link>
                                </div>
                            )}

                            {/* Search */}
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-1">Navigation</h3>
                                <div className="relative group search-container">
                                    <form onSubmit={handleSearch} className="relative group">
                                        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search markets..."
                                            className="w-full pl-11 pr-4 py-3.5 bg-surface border border-border-subtle rounded-xl text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-active transition-all"
                                        />
                                    </form>

                                    {/* Search Results */}
                                    {searchQuery.trim() && (
                                        <div className="mt-4 space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar -mx-2 px-2">
                                            {isSearching ? (
                                                <div className="py-8 text-center">
                                                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Searching...</p>
                                                </div>
                                            ) : searchResults.length > 0 ? (
                                                searchResults.map((asset) => (
                                                    <Link
                                                        key={asset.id}
                                                        href={`/assets/${asset.id}`}
                                                        onClick={onClose}
                                                        className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border-subtle active:scale-[0.98] transition-all"
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

                            {/* Navigation Links */}
                            <div className="space-y-1">
                                <Link href="/portfolio" onClick={onClose} className="flex items-center justify-between group w-full p-4 rounded-xl hover:bg-active transition-all">
                                    <div className="flex items-center gap-3 font-semibold text-zinc-300 group-hover:text-white transition-colors">
                                        <TrendingUp className="w-5 h-5 text-neon-purple opacity-70 group-hover:opacity-100" />
                                        Portfolio
                                    </div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-border-subtle group-hover:bg-primary transition-colors" />
                                </Link>
                                <Link href="/leaderboard" onClick={onClose} className="flex items-center justify-between group w-full p-4 rounded-xl hover:bg-active transition-all">
                                    <div className="flex items-center gap-3 font-semibold text-zinc-300 group-hover:text-white transition-colors">
                                        <Users className="w-5 h-5 text-amber-400 opacity-70 group-hover:opacity-100" />
                                        Leaderboard
                                    </div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-border-subtle group-hover:bg-primary transition-colors" />
                                </Link>
                                <Link href="/settings" onClick={onClose} className="flex items-center justify-between group w-full p-4 rounded-xl hover:bg-active transition-all">
                                    <div className="flex items-center gap-3 font-semibold text-zinc-300 group-hover:text-white transition-colors">
                                        <Palette className="w-5 h-5 text-zinc-500 opacity-70 group-hover:opacity-100" />
                                        Themes and Colors
                                    </div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-border-subtle group-hover:bg-primary transition-colors" />
                                </Link>
                                {isAuthenticated && (
                                    <Link href="/bookmarks" onClick={onClose} className="flex items-center justify-between group w-full p-4 rounded-xl hover:bg-active transition-all">
                                        <div className="flex items-center gap-3 font-semibold text-zinc-300 group-hover:text-white transition-colors">
                                            <Bookmark className="w-5 h-5 text-neon-blue opacity-70 group-hover:opacity-100" />
                                            Watchlist
                                        </div>
                                        <div className="px-2 py-0.5 rounded-full bg-primary-muted text-[10px] text-primary font-bold">
                                            {bookmarks.length}
                                        </div>
                                    </Link>
                                )}
                            </div>

                            {/* Logout */}
                            {isAuthenticated && (
                                <div className="pt-6 border-t border-border-subtle">
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

                        {/* Footer */}
                        <div className="p-6 bg-surface border-t border-border-subtle flex-shrink-0">
                            <p className="text-[10px] text-zinc-600 font-mono text-center tracking-tighter">
                                FARADAY v1.4.2 // NEURAL ENGINE ACTIVE
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
