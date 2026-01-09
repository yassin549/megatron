'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    type: ToastType;
    message: string;
    onClose: () => void;
}

const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
};

const styles = {
    success: 'border-emerald-500/30 bg-zinc-900 shadow-emerald-500/20',
    error: 'border-rose-500/30 bg-zinc-900 shadow-rose-500/20',
    info: 'border-blue-500/30 bg-zinc-900 shadow-blue-500/20',
};

export function Toast({ type, message, onClose }: ToastProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
            className={`pointer-events-auto flex items-center gap-4 p-4 pr-12 rounded-2xl border backdrop-blur-xl shadow-2xl relative min-w-[320px] max-w-[400px] ${styles[type]}`}
        >
            <div className="flex-shrink-0">
                {icons[type]}
            </div>

            <p className="text-sm font-medium text-white/90 leading-tight">
                {message}
            </p>

            <button
                onClick={onClose}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-white/5 transition-colors text-white/30 hover:text-white"
            >
                <X className="w-4 h-4" />
            </button>

            {/* Progress bar at the bottom */}
            <motion.div
                initial={{ width: '100%' }}
                animate={{ width: 0 }}
                transition={{ duration: 5, ease: 'linear' }}
                className={`absolute bottom-0 left-4 right-12 h-[2px] rounded-full opacity-30 ${type === 'success' ? 'bg-emerald-400' : type === 'error' ? 'bg-rose-400' : 'bg-blue-400'
                    }`}
            />
        </motion.div>
    );
}
