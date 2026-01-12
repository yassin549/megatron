'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { ChartBar, Trophy, LogOut, Copy, Check, PieChart, Layers, Menu, X, Shield, Wallet, Settings, ExternalLink } from 'lucide-react';
import { NavMegaCard } from '@/components/layout/NavMegaCard';

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

            <NavMegaCard
                isOpen={isOpen}
                onClose={() => onToggle ? onToggle() : setInternalOpen(false)}
                title="Account"
                description="Identity & Settings"
                icon={Menu}
                footer={
                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-all font-bold text-xs uppercase tracking-widest group"
                    >
                        <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Log Out Session
                    </button>
                }
            >
                <div className="space-y-8">


                    {/* Navigation Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <Link href="/dashboard" className="flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all group">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                <ChartBar className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-white">Dashboard</span>
                        </Link>
                        <Link href="/portfolio" className="flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all group">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                <PieChart className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-white">Portfolio</span>
                        </Link>
                        <Link href="/lp" className="flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all group">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                                <Layers className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-white">Pools</span>
                        </Link>
                        <Link href="/wallet" className="flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all group">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                                <Wallet className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-white">Wallet</span>
                        </Link>
                    </div>

                    {/* Footer Actions */}
                    <div className="space-y-1">
                        <Link href="/leaderboard" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all text-xs font-medium">
                            <div className="flex items-center gap-3">
                                <Trophy className="w-4 h-4 text-amber-500/50" />
                                Leaderboard
                            </div>
                            <Check className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                        </Link>
                        <Link href="/settings" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all text-xs font-medium">
                            <div className="flex items-center gap-3">
                                <Settings className="w-4 h-4 text-zinc-600" />
                                My Settings
                            </div>
                        </Link>
                    </div>
                </div>
            </NavMegaCard>
        </div>
    );
}
