'use client';

import { motion } from 'framer-motion';
import { Palette, Monitor, User, Shield, Bell } from 'lucide-react';
import Link from 'next/link';
import { ThemeCard } from '@/components/settings/ThemeCard';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import { MobileListRow } from '@/components/mobile/MobileListRow';

export default function SettingsPage() {
    return (
        <div className="min-h-screen bg-black">
            {/* =========================================
                DESKTOP VIEW (Hidden on Mobile)
               ========================================= */}
            <div className="hidden md:block pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Theme Customization - Large Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                        className="md:col-span-8 glass-card rounded-3xl p-8 relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                    <Palette className="w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">Appearance</h2>
                            </div>

                            <p className="text-zinc-400 mb-8 max-w-lg">
                                Choose a visual theme that suits your trading style. Changes apply immediately across the entire platform.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <ThemeCard preset="default" label="Deep Obsidian" />
                                <ThemeCard preset="ocean" label="Midnight Ocean" />
                                <ThemeCard preset="neon" label="Neon Cyberpunk" />
                                <ThemeCard preset="crimson" label="Crimson Protocol" />
                                <ThemeCard preset="sunset" label="Sunset Blaze" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Account / Profile - Medium Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                        className="md:col-span-4 glass-card rounded-3xl p-8 relative overflow-hidden"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                                <User className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Account</h2>
                        </div>
                        <div className="space-y-4">
                            <button className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-colors flex items-center justify-between group">
                                <span className="text-zinc-300 font-medium">Profile Details</span>
                                <span className="text-zinc-600 group-hover:text-white transition-colors">→</span>
                            </button>
                            <button className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-colors flex items-center justify-between group">
                                <span className="text-zinc-300 font-medium">Preferences</span>
                                <span className="text-zinc-600 group-hover:text-white transition-colors">→</span>
                            </button>
                        </div>
                    </motion.div>

                    {/* Notifications - Small Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="md:col-span-4 glass-card rounded-3xl p-8 relative overflow-hidden"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                                <Bell className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Notifications</h2>
                        </div>
                        {/* Placeholder toggle */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-black/20">
                            <span className="text-sm text-zinc-400">Push Alerts</span>
                            <div className="w-10 h-6 rounded-full bg-emerald-500/20 relative cursor-pointer">
                                <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-emerald-500" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Interface - Wide Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.4 }}
                        className="md:col-span-8 glass-card rounded-3xl p-8 relative overflow-hidden"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                                <Monitor className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Interface</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/50 cursor-pointer transition-all">
                                <h3 className="font-bold text-white mb-1">Comfort</h3>
                                <p className="text-xs text-zinc-500">Standard spacing and font sizes.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/50 cursor-pointer transition-all">
                                <h3 className="font-bold text-white mb-1">Compact</h3>
                                <p className="text-xs text-zinc-500">High density for data heavy views.</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* =========================================
                MOBILE VIEW (Visible on Mobile)
               ========================================= */}
            <div className="md:hidden pb-24">
                <MobilePageHeader
                    title="Settings"
                    description="Preferences & Account"
                />

                <div className="px-4 py-6 space-y-8">
                    {/* Appearance */}
                    <div>
                        <h3 className="text-sm font-bold text-foreground mb-4 px-1">Appearance</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <ThemeCard preset="default" label="Obsidian" />
                            <ThemeCard preset="ocean" label="Ocean" />
                            <ThemeCard preset="neon" label="Neon" />
                            <ThemeCard preset="crimson" label="Crimson" />
                            <ThemeCard preset="sunset" label="Sunset" />
                        </div>
                    </div>

                    {/* Account */}
                    <div>
                        <h3 className="text-sm font-bold text-foreground mb-3 px-1">Account</h3>
                        <div className="space-y-3">
                            <MobileListRow
                                label="Profile Details"
                                subLabel="Manage your personal info"
                                icon={<User size={18} className="text-purple-400" />}
                                onClick={() => { }}
                            />
                            <MobileListRow
                                label="Security"
                                subLabel="2FA and Password"
                                icon={<Shield size={18} className="text-amber-400" />}
                                onClick={() => { }}
                            />
                        </div>
                    </div>

                    {/* Notifications */}
                    <div>
                        <h3 className="text-sm font-bold text-foreground mb-3 px-1">Notifications</h3>
                        <div className="space-y-3">
                            <MobileListRow
                                label="Push Alerts"
                                icon={<Bell size={18} className="text-emerald-400" />}
                                value={
                                    <div className="w-10 h-6 rounded-full bg-emerald-500/20 relative cursor-pointer">
                                        <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-emerald-500" />
                                    </div>
                                }
                            />
                        </div>
                    </div>

                    {/* Interface */}
                    <div>
                        <h3 className="text-sm font-bold text-foreground mb-3 px-1">Interface Density</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/50 cursor-pointer transition-all active:scale-95 text-center">
                                <h3 className="font-bold text-white text-sm mb-1">Comfort</h3>
                            </div>
                            <div className="p-4 rounded-xl bg-primary/20 border border-primary/50 cursor-pointer transition-all active:scale-95 text-center">
                                <h3 className="font-bold text-primary text-sm mb-1">Compact</h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
