'use client';

import { motion } from 'framer-motion';

export type MobileTab = 'chart' | 'book' | 'oracle' | 'stats';

interface MobileTabBarProps {
    activeTab: MobileTab;
    onTabChange: (tab: MobileTab) => void;
}

const tabs: { id: MobileTab; label: string }[] = [
    { id: 'chart', label: 'Chart' },
    { id: 'book', label: 'Book' },
    { id: 'oracle', label: 'Oracle' },
    { id: 'stats', label: 'Stats' },
];

export function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
    return (
        <div className="flex bg-white/[0.02] border border-white/5 rounded-2xl p-1 mx-4">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`relative flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors rounded-xl ${activeTab === tab.id ? 'text-white' : 'text-zinc-600'
                        }`}
                >
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="mobile-tab-indicator"
                            className="absolute inset-0 bg-white/5 border border-white/10 rounded-xl"
                            transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                        />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                </button>
            ))}
        </div>
    );
}
