'use client';

import Link from 'next/link';
import { TrendingUp, Users, LogOut } from 'lucide-react';

interface GeneralPanelProps {
    onClose: () => void;
}

/**
 * General menu panel with navigation links and logout.
 */
export function GeneralPanel({ onClose }: GeneralPanelProps) {
    return (
        <div className="space-y-1">
            <Link href="/portfolio" onClick={onClose} className="flex items-center justify-between group w-full p-4 rounded-xl hover:bg-active transition-all">
                <div className="flex items-center gap-3 font-semibold text-zinc-300 group-hover:text-white transition-colors">
                    <TrendingUp className="w-5 h-5 text-neon-purple opacity-70 group-hover:opacity-100" />
                    Portfolio
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-primary transition-colors" />
            </Link>
            <Link href="/leaderboard" onClick={onClose} className="flex items-center justify-between group w-full p-4 rounded-xl hover:bg-active transition-all">
                <div className="flex items-center gap-3 font-semibold text-zinc-300 group-hover:text-white transition-colors">
                    <Users className="w-5 h-5 text-amber-400 opacity-70 group-hover:opacity-100" />
                    Leaderboard
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-primary transition-colors" />
            </Link>

            {/* Logout */}
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
    );
}
