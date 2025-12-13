'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { ChartBar, Trophy, LogOut, Copy, Check, PieChart, Layers, Menu, X } from 'lucide-react';

interface ProfileHoverCardProps {
    isOpen?: boolean;
    onToggle?: () => void;
}

export function ProfileHoverCard({ isOpen: controlledIsOpen, onToggle }: ProfileHoverCardProps) {
    const { data: session } = useSession();
    // Fallback to internal state if not controlled (backward compatibility)
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = controlledIsOpen ?? internalOpen;
    const [copied, setCopied] = useState(false);

    if (!session?.user) return null;

    const copyId = () => {
        navigator.clipboard.writeText(session.user.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative z-50">
            <button
                className="nav-popover-trigger outline-none"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle ? onToggle() : setInternalOpen(!internalOpen);
                }}
            >
                <div className={`flex items-center gap-3 pl-1 pr-3 py-1 rounded-full border transition-all duration-200 group ${isOpen
                    ? 'bg-secondary border-primary ring-2 ring-primary/10'
                    : 'bg-secondary/30 hover:bg-secondary border-white/5 hover:border-white/10'
                    }`}>

                    {/* PFP Circle */}
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5 overflow-hidden relative">
                        {session.user.image ? (
                            <img src={session.user.image} alt={session.user.name || 'User'} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 text-white text-xs font-bold">
                                {session.user.email?.[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Hamburger / Close Icon */}
                    <div className="text-zinc-400 group-hover:text-white transition-colors">
                        {isOpen ? (
                            <X className="w-4 h-4 animate-in spin-in-90 duration-300" />
                        ) : (
                            <Menu className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
                        )}
                    </div>
                </div>
            </button>

            {/* Popover Content */}
            {isOpen && (
                <div className="nav-popover-content absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-top-2 origin-top-right">
                    {/* Header */}
                    <div className="p-4 bg-secondary/50 border-b border-border">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-foreground truncate">
                                {session.user.email}
                            </p>
                            {session.user.isAdmin && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-mono">
                                    ADMIN
                                </span>
                            )}
                        </div>
                        <button
                            onClick={copyId}
                            className="flex items-center gap-1.5 mt-1 cursor-pointer hover:text-foreground text-xs text-muted-foreground transition-colors group/copy"
                        >
                            <span className="font-mono">
                                {session.user.id.slice(0, 6)}...{session.user.id.slice(-4)}
                            </span>
                            {copied ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                                <Copy className="w-3 h-3 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                            )}
                        </button>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2 space-y-1">
                        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all hover:pl-4">
                            <ChartBar className="w-4 h-4" />
                            Dashboard
                        </Link>
                        <Link href="/portfolio" className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all hover:pl-4">
                            <PieChart className="w-4 h-4" />
                            Portfolio
                        </Link>
                        <Link href="/lp" className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all hover:pl-4">
                            <Layers className="w-4 h-4" />
                            Liquidity Pools
                        </Link>
                        <Link href="/leaderboard" className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all hover:pl-4">
                            <Trophy className="w-4 h-4" />
                            Leaderboard
                        </Link>
                    </div>

                    <div className="p-2 border-t border-border">
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors font-medium hover:pl-4"
                        >
                            <LogOut className="w-4 h-4" />
                            Log Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
