'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
}

export function ConfirmModal({
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
}: ConfirmModalProps) {
    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onCancel}
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
                <button
                    onClick={onCancel}
                    className="absolute right-6 top-6 p-2 rounded-xl hover:bg-white/5 transition-colors text-zinc-500 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6">
                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                </div>

                <h3 className="text-xl font-bold text-white mb-3">
                    Are you sure?
                </h3>

                <p className="text-zinc-400 text-sm mb-8 leading-relaxed font-medium">
                    {message}
                </p>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onCancel}
                        className="py-4 bg-zinc-800 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-zinc-700 transition-all active:scale-[0.95]"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="py-4 bg-white text-black rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-[0.95] shadow-xl shadow-white/5"
                    >
                        {confirmText}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
