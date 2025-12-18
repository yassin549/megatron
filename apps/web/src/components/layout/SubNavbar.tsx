'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    LayoutGrid,
    Users,
    Trophy,
    LineChart,
    CloudSun,
    Bitcoin,
    Vote,
    Microscope,
    Cpu,
    Star,
    Rocket,
    Building2,
    Film,
    Gamepad2,
    Leaf,
    Activity
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
    all: LayoutGrid,
    social: Users,
    sports: Trophy,
    economics: LineChart,
    weather: CloudSun,
    crypto: Bitcoin,
    politics: Vote,
    science: Microscope,
    ai: Cpu,
    celebrities: Star,
    startups: Rocket,
    companies: Building2,
    entertainment: Film,
    gaming: Gamepad2,
    space: Rocket, // Reuse rocket for space
    sustainability: Leaf,
};

export function SubNavbar() {
    const searchParams = useSearchParams();
    const currentCategory = searchParams.get('category') || 'all';
    const scrollRef = useRef<HTMLDivElement>(null);
    const [categories, setCategories] = useState<{ id: string, name: string, icon: any }[]>([
        { id: 'all', name: 'All', icon: LayoutGrid }
    ]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch('/api/categories');
                if (res.ok) {
                    const data = await res.json();
                    const dynamicCats = data.categories.map((cat: string) => ({
                        id: cat,
                        name: cat.charAt(0).toUpperCase() + cat.slice(1),
                        icon: ICON_MAP[cat.toLowerCase()] || Activity
                    }));

                    // Filter out 'all' if it somehow comes from DB to avoid duplicates, 
                    // then merge with our default 'all'.
                    const filteredDynamic = dynamicCats.filter((c: any) => c.id !== 'all');
                    setCategories([{ id: 'all', name: 'All', icon: LayoutGrid }, ...filteredDynamic]);
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
        <div className="border-b border-white/5 bg-background/80 backdrop-blur-md sticky top-16 z-40 transition-all duration-300">
            <div className="max-w-[1400px] mx-auto px-4">
                <div
                    ref={scrollRef}
                    className="relative flex items-center gap-4 md:gap-8 overflow-x-auto no-scrollbar py-0 mask-fade-right h-12 md:h-14 px-2 md:px-0"
                >
                    {categories.map((category) => {
                        const isActive = currentCategory === category.id;
                        const Icon = category.icon;
                        return (
                            <Link
                                key={category.id}
                                href={`/?category=${category.id}`}
                                data-active={isActive}
                                className={`flex items-center gap-2 px-4 py-2.5 md:px-6 md:py-4 border-b-[3px] transition-all duration-200 text-sm font-medium whitespace-nowrap ${isActive
                                    ? 'border-blue-500 text-white shadow-[0_4px_12px_-2px_rgba(59,130,246,0.5)]'
                                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {category.name}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
