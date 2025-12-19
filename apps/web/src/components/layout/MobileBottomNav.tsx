'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Wallet, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

export function MobileBottomNav() {
    const pathname = usePathname();

    const tabs = [
        { name: 'Assets', href: '/assets', icon: Home },
        { name: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
        { name: 'Wallet', href: '/wallet', icon: Wallet },
        { name: 'Liquidity', href: '/lp', icon: Layers }, // Using Layers for LP
    ];

    // Hide on login/signup pages
    if (pathname.includes('/login') || pathname.includes('/signup')) {
        return null;
    }

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 pointer-events-none">
            <nav className="glass-nav rounded-2xl flex items-center justify-around p-2 shadow-[0_0_20px_rgba(0,0,0,0.5)] pointer-events-auto">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 w-16 group ${isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="nav-indicator"
                                    className="absolute inset-0 bg-primary/10 rounded-xl"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <Icon className={`w-6 h-6 mb-1 z-10 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                            <span className="text-[10px] font-medium z-10">{tab.name}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
