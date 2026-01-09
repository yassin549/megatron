'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type StatusType = 'success' | 'error' | 'info';

interface StatusModalProps {
    type: StatusType;
    message: string;
    onClose: () => void;
    title?: string;
}

const icons = {
    success: <CheckCircle2 className="w-10 h-10 text-emerald-400" />,
    error: <XCircle className="w-10 h-10 text-rose-400" />,
    info: <Info className="w-10 h-10 text-blue-400" />,
};

const styles = {
    success: 'bg-emerald-500/10 border-emerald-500/20',
    error: 'bg-rose-500/10 border-rose-500/20',
    info: 'bg-blue-500/10 border-blue-500/20',
};

export function StatusModal({ type, message, onClose, title }: StatusModalProps) {
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                onClick={onClose}
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-zinc-950 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] text-center"
            >
                <button
                    onClick={onClose}
                    className="absolute right-6 top-6 p-2 rounded-xl hover:bg-white/5 transition-colors text-zinc-500 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${styles[type]}`}>
                    {icons[type]}
                </div>

                <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">
                    {title || (type === 'success' ? 'SUCCESS' : type === 'error' ? 'FAILED' : 'INFO')}
                </h3>

                <p className="text-zinc-400 text-sm mb-8 leading-relaxed font-medium">
                    {message}
                </p>

                <button
                    onClick={onClose}
                    className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-[0.95]"
                >
                    CONTINUE
                </button>
            </motion.div>
        </div>
    );
}
