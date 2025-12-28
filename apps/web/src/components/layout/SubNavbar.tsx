'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

export function SubNavbar() {
    const searchParams = useSearchParams();
    const currentCategory = searchParams.get('category') || 'all';
    const scrollRef = useRef<HTMLDivElement>(null);
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([
        { id: 'all', name: 'Trending' }
    ]);

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
        <div className="glass-nav sticky top-16 z-40 transition-all duration-300 border-b border-white/5">
            <div className="max-w-[1400px] mx-auto px-4">
                <div
                    ref={scrollRef}
                    className="relative flex items-center justify-start md:justify-start gap-3 md:gap-8 overflow-x-auto no-scrollbar py-0 mask-fade-right h-12 md:h-14 px-2 md:px-0 scroll-smooth"
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
                                    className={`group flex items-center px-4 py-2.5 md:px-6 md:py-4 border-b-2 transition-all duration-300 text-sm font-medium whitespace-nowrap relative ${isActive
                                        ? 'border-primary text-white shadow-[0_4px_12px_-2px_rgba(59,130,246,0.3)]'
                                        : 'border-transparent text-muted-foreground hover:text-white'
                                        }`}
                                >
                                    <span className="relative z-10 transition-transform duration-300 transform group-hover:scale-105 inline-block pointer-events-none">
                                        {category.name}
                                    </span>

                                    {/* Animated underline for non-active items */}
                                    {!isActive && (
                                        <div className="absolute inset-x-4 bottom-0 h-[2px] bg-primary/0 group-hover:bg-primary/50 transition-all duration-300 transform scale-x-0 group-hover:scale-x-100" />
                                    )}

                                    {/* Active Glow Effect */}
                                    {isActive && (
                                        <div className="absolute inset-0 bg-primary/5 blur-md -z-10 rounded-lg"></div>
                                    )}
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
