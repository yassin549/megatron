'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { TrendingUp, LayoutGrid, List } from 'lucide-react';

export function SubNavbar() {
    const searchParams = useSearchParams();
    const currentCategory = searchParams.get('category') || 'all';
    const scrollRef = useRef<HTMLDivElement>(null);
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([
        { id: 'all', name: 'Trending' }
    ]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Scroll behavior
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        let lastScroll = 0;
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (window.innerWidth < 768) {
                if (currentScrollY > lastScroll && currentScrollY > 80) {
                    setIsVisible(false);
                } else {
                    setIsVisible(true);
                }
            } else {
                setIsVisible(true);
            }
            lastScroll = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Persist view mode
    useEffect(() => {
        const saved = localStorage.getItem('assetViewMode');
        if (saved === 'list' || saved === 'grid') setViewMode(saved);

        // Listen for view mode changes from AssetGrid
        const handleViewModeChange = (e: CustomEvent) => {
            setViewMode(e.detail);
        };
        window.addEventListener('viewModeChange' as any, handleViewModeChange);
        return () => window.removeEventListener('viewModeChange' as any, handleViewModeChange);
    }, []);

    const toggleView = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('assetViewMode', mode);
        // Dispatch event to notify AssetGrid
        window.dispatchEvent(new CustomEvent('viewModeChange', { detail: mode }));
    };

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch('/api/categories');
                if (res.ok) {
                    const data = await res.json();
                    const dynamicCats = data.categories.map((cat: string) => ({
                        id: cat.toLowerCase(),
                        name: cat,
                    }));

                    const filteredDynamic = dynamicCats.filter((c: any) => c.id !== 'all');
                    setCategories([{ id: 'all', name: 'Trending' }, ...filteredDynamic]);
                }
            } catch (error) {
                console.error('Failed to fetch categories:', error);
            }
        };

        fetchCategories();
    }, []);

    // Auto-scroll to active category
    useEffect(() => {
        if (scrollRef.current) {
            const activeElement = scrollRef.current.querySelector('[data-active="true"]');
            if (activeElement) {
                activeElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center',
                });
            }
        }
    }, [currentCategory, categories]);

    return (
        <div className={`sticky top-16 z-40 transition-all duration-200 ${!isVisible ? '-translate-y-[8rem] md:translate-y-0 pointer-events-none' : 'translate-y-0 pointer-events-auto'} glass-nav`}>
            <div className="max-w-[1400px] mx-auto px-4">
                <div className="flex items-center justify-between h-12 md:h-14">
                    {/* Categories - scrollable on mobile */}
                    <div
                        ref={scrollRef}
                        className="flex items-center gap-2 md:gap-4 overflow-x-auto no-scrollbar py-0 mask-fade-right flex-1 px-2 md:px-0 scroll-smooth"
                    >
                        {categories.map((category, index) => {
                            const isActive = currentCategory === category.id;
                            return (
                                <motion.div
                                    key={category.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Link
                                        href={`/?category=${category.id}`}
                                        data-active={isActive}
                                        className={`group flex items-center px-3 py-2.5 md:px-4 md:py-4 border-b-2 transition-all duration-200 text-sm font-medium whitespace-nowrap relative ${isActive
                                            ? 'border-brand-primary text-text-main shadow-[0_4px_12px_-2px_rgba(var(--brand-primary),0.3)]'
                                            : 'border-transparent text-text-muted hover:text-text-main'
                                            }`}
                                    >
                                        <span className="relative z-10 transition-transform duration-200 transform group-hover:scale-105 flex items-center gap-2 pointer-events-none">
                                            {category.id === 'all' && <TrendingUp className="w-4 h-4 text-status-success" />}
                                            {category.name}
                                        </span>

                                        {/* Animated underline for non-active items */}
                                        {!isActive && (
                                            <div className="absolute inset-x-2 bottom-0 h-[2px] bg-brand-primary/0 group-hover:bg-brand-primary/50 transition-all duration-200 transform scale-x-0 group-hover:scale-x-100" />
                                        )}

                                        {/* Active Glow Effect */}
                                        {isActive && (
                                            <div className="absolute inset-0 bg-brand-primary/5 blur-md -z-10 rounded-md"></div>
                                        )}
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* View Toggle - Hidden on Mobile */}
                    <div className="hidden md:flex items-center bg-surface rounded-lg p-1 border border-border-subtle shadow-sm ml-4 shrink-0">
                        <button
                            onClick={() => toggleView('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-brand-primary text-text-main shadow-md' : 'text-text-dim hover:text-text-main hover:bg-white/5'}`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => toggleView('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-brand-primary text-text-main shadow-md' : 'text-text-dim hover:text-text-main hover:bg-white/5'}`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
