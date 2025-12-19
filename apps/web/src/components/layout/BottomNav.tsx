'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, LayoutGrid, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

export function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        {
            label: 'Assets',
            href: '/',
            icon: TrendingUp,
            active: pathname === '/' || pathname.startsWith('/assets')
        },
        {
            label: 'Dashboard',
            href: '/dashboard',
            icon: LayoutGrid,
            active: pathname === '/dashboard'
        },
        {
            label: 'Wallet',
            href: '/wallet',
            icon: Wallet,
            active: pathname === '/wallet'
        }
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] pb-[env(safe-area-inset-bottom)]">
            {/* Glassmorphism Background */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl border-t border-white/5 shadow-[0_-1px_20px_rgba(0,0,0,0.5)]" />

            <div className="relative h-16 flex items-center justify-around px-2">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="flex flex-col items-center justify-center gap-1 w-full relative h-full"
                    >
                        <div className={`relative p-1 rounded-xl transition-all duration-300 ${item.active ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}>
                            <item.icon className="w-5 h-5" />
                            {item.active && (
                                <motion.div
                                    layoutId="bottom-nav-active"
                                    className="absolute inset-0 bg-primary/10 rounded-xl -z-10"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </div>
                        <span className={`text-[10px] font-medium transition-colors duration-300 ${item.active ? 'text-primary' : 'text-muted-foreground'}`}>
                            {item.label}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
