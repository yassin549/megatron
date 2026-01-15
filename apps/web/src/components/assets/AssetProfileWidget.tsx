'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

interface AssetProfileWidgetProps {
    name: string;
    imageUrl?: string;
    type?: string;
}

export function AssetProfileWidget({ name, imageUrl, type }: AssetProfileWidgetProps) {
    return (
        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 shadow-2xl relative overflow-hidden group">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-[40px] -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors duration-500" />

            <div className="flex items-center gap-4 relative z-10">
                {/* Image / Icon container */}
                <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-primary/30 transition-colors">
                    {imageUrl ? (
                        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                    ) : (
                        <Zap className="w-6 h-6 text-primary/40 group-hover:text-primary transition-colors" />
                    )}
                </div>

                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-0.5 truncate">
                        {type || 'Index Asset'}
                    </span>
                    <h2 className="text-sm font-black text-white uppercase tracking-tighter truncate leading-tight">
                        {name}
                    </h2>
                </div>
            </div>

            {/* Subtle bottom detail */}
            <div className="mt-3 flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                <span className="text-[7px] font-mono text-zinc-600 uppercase tracking-widest whitespace-nowrap opacity-40">Profile_Active</span>
            </div>
        </div>
    );
}
