'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
    Plus,
    X,
    Upload,
    Sparkles,
    Loader2,
    MessageSquare,
    TrendingUp,
    Lightbulb,
    ChevronLeft,
    Send
} from 'lucide-react';
import { createPortal } from 'react-dom';

type FeedbackMode = 'menu' | 'market' | 'feature';

import { usePathname } from 'next/navigation';

export function RequestMarketButton() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<FeedbackMode>('menu');

    // Hide on mobile for asset detail pages to avoid collision with trading button
    const isAssetPage = pathname?.startsWith('/assets/') && pathname !== '/assets/request';

    // Form States
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Reset state when closing
    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                setMode('menu');
                setIsSuccess(false);
                setTitle('');
                setDescription('');
                setImage(null);
                setImagePreview(null);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Initial button animation
    const buttonVariants: Variants = {
        initial: { scale: 0, opacity: 0 },
        animate: {
            scale: 1,
            opacity: 1,
            y: 0,
            transition: {
                type: "spring",
                stiffness: 400,
                damping: 15,
                mass: 0.8
            }
        },
        hover: {
            scale: 1.1,
            y: -4,
            rotate: 2,
            transition: {
                type: "spring",
                stiffness: 400,
                damping: 10
            }
        },
        tap: { scale: 0.9, rotate: -2 }
    };

    // Modal animation - Simplified for performance
    const modalVariants: Variants = {
        hidden: {
            opacity: 0,
            y: 20,
            scale: 0.95
        },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 25,
                mass: 1
            }
        },
        exit: {
            opacity: 0,
            y: 20,
            scale: 0.95,
            transition: {
                duration: 0.2,
                ease: "easeOut"
            }
        }
    };

    // Content slide animation - Snappier
    const contentVariants: Variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 100 : -100,
            opacity: 0,
            filter: "blur(4px)"
        }),
        center: {
            x: 0,
            opacity: 1,
            filter: "blur(0px)",
            transition: {
                x: { type: "spring", stiffness: 400, damping: 30 },
                opacity: { duration: 0.2 }
            }
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 100 : -100,
            opacity: 0,
            filter: "blur(4px)",
            transition: {
                duration: 0.2
            }
        })
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: mode,
                    title,
                    description,
                    // Note: Image upload not fully implemented in API yet, skipping for now
                })
            });

            if (res.ok) {
                setIsSuccess(true);
                setTimeout(() => {
                    setIsOpen(false);
                }, 2000);
            } else {
                console.error('Failed to submit feedback');
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Client-only portal
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    return (
        <>
            {/* Main Floating Button */}
            <motion.button
                variants={buttonVariants}
                initial="initial"
                animate="animate"
                whileHover="hover"
                whileTap="tap"
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-32 right-4 md:bottom-8 md:right-8 z-[60] group ${isAssetPage ? 'hidden md:block' : ''}`}
            >
                <div className={`relative flex items-center justify-center p-4 rounded-full shadow-[0_0_40px_rgba(16,185,129,0.3)] backdrop-blur-xl border border-white/20 transition-all duration-200 ${isOpen
                    ? 'bg-zinc-900 text-white'
                    : 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white hover:from-emerald-400 hover:to-emerald-600'
                    }`}>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 animate-[shine_1.5s_infinite]" />

                    {isOpen ? (
                        <X className="w-6 h-6 relative z-10" />
                    ) : (
                        <div className="relative z-10">
                            <MessageSquare className="w-6 h-6" />
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-emerald-600" />
                        </div>
                    )}
                </div>
            </motion.button>

            {/* Modal */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[59] bg-zinc-950/60 backdrop-blur-sm"
                                onClick={() => setIsOpen(false)}
                            />

                            <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none md:inset-auto md:bottom-28 md:right-8 px-4 md:px-0">
                                <motion.div
                                    variants={modalVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    layout
                                    className="bg-zinc-900/95 border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.7)] backdrop-blur-xl overflow-hidden pointer-events-auto rounded-[32px] w-full max-w-[380px] md:w-[380px] flex flex-col relative will-change-transform"
                                >
                                    {/* Gradient borders */}
                                    <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                                    <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

                                    {/* Header */}
                                    <div className="p-6 pb-2 flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-3">
                                            <AnimatePresence mode="popLayout">
                                                {mode !== 'menu' && !isSuccess && (
                                                    <motion.button
                                                        initial={{ opacity: 0, x: -10, rotate: -180 }}
                                                        animate={{ opacity: 1, x: 0, rotate: 0 }}
                                                        exit={{ opacity: 0, x: -10, rotate: 180 }}
                                                        onClick={() => setMode('menu')}
                                                        className="p-2 -ml-2 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition-all"
                                                    >
                                                        <ChevronLeft className="w-5 h-5" />
                                                    </motion.button>
                                                )}
                                            </AnimatePresence>
                                            <motion.h3
                                                className="font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 text-lg tracking-tight"
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                key={mode + isSuccess}
                                            >
                                                {isSuccess ? 'Received!' : mode === 'market' ? 'Suggest Asset' : mode === 'feature' ? 'Suggest Feature' : 'Feedback'}
                                            </motion.h3>
                                        </div>
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="p-2 -mr-2 rounded-full hover:bg-white/5 text-zinc-500 hover:text-white transition-all transform hover:rotate-90 duration-200"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Content Area */}
                                    <div className="relative overflow-hidden min-h-[420px]">
                                        <AnimatePresence mode="wait" initial={false} custom={mode === 'menu' ? -1 : 1}>
                                            {isSuccess ? (
                                                <motion.div
                                                    key="success"
                                                    initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                                                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                                    className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                                                >
                                                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] mb-6">
                                                        <Sparkles className="w-8 h-8 text-white" />
                                                    </div>
                                                    <h3 className="text-xl font-black text-white mb-2 tracking-tight">Received!</h3>
                                                    <p className="text-zinc-400 text-sm leading-relaxed max-w-[200px]">We'll review your suggestion and see if it fits!</p>
                                                </motion.div>
                                            ) : mode === 'menu' ? (
                                                <motion.div
                                                    key="menu"
                                                    custom={-1}
                                                    variants={contentVariants}
                                                    initial="enter"
                                                    animate="center"
                                                    exit="exit"
                                                    className="absolute inset-0 p-4 space-y-3 flex flex-col justify-center"
                                                >
                                                    <button
                                                        onClick={() => setMode('market')}
                                                        className="group relative w-full p-5 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 hover:from-emerald-900/20 hover:to-zinc-900/50 border border-white/5 hover:border-emerald-500/30 rounded-2xl text-left transition-all duration-200 shadow-lg hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] hover:-translate-y-1"
                                                    >
                                                        <div className="flex items-start gap-4">
                                                            <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:scale-110 transition-transform duration-200 group-hover:bg-emerald-500/20">
                                                                <TrendingUp className="w-6 h-6 text-emerald-400 group-hover:text-emerald-300" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-white text-lg tracking-tight mb-1 group-hover:text-emerald-300 transition-colors">New Measurable Asset</h4>
                                                                <p className="text-sm text-zinc-500 group-hover:text-zinc-400 transition-colors line-clamp-2">Propose a new market or asset to be added.</p>
                                                            </div>
                                                        </div>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-4 group-hover:translate-x-0">
                                                            <ChevronLeft className="w-5 h-5 text-emerald-500 rotate-180" />
                                                        </div>
                                                    </button>

                                                    <button
                                                        onClick={() => setMode('feature')}
                                                        className="group relative w-full p-5 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 hover:from-purple-900/20 hover:to-zinc-900/50 border border-white/5 hover:border-purple-500/30 rounded-2xl text-left transition-all duration-200 shadow-lg hover:shadow-[0_0_30px_rgba(168,85,247,0.1)] hover:-translate-y-1"
                                                    >
                                                        <div className="flex items-start gap-4">
                                                            <div className="p-3 bg-purple-500/10 rounded-xl group-hover:scale-110 transition-transform duration-200 group-hover:bg-purple-500/20">
                                                                <Lightbulb className="w-6 h-6 text-purple-400 group-hover:text-purple-300" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-white text-lg tracking-tight mb-1 group-hover:text-purple-300 transition-colors">Feature Request</h4>
                                                                <p className="text-sm text-zinc-500 group-hover:text-zinc-400 transition-colors line-clamp-2">Ideas to make the platform better.</p>
                                                            </div>
                                                        </div>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-4 group-hover:translate-x-0">
                                                            <ChevronLeft className="w-5 h-5 text-purple-500 rotate-180" />
                                                        </div>
                                                    </button>
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="form"
                                                    custom={1}
                                                    variants={contentVariants}
                                                    initial="enter"
                                                    animate="center"
                                                    exit="exit"
                                                    className="absolute inset-0 p-6 overflow-y-auto custom-scrollbar flex flex-col"
                                                >
                                                    <form onSubmit={handleSubmit} className="space-y-5">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                                                                {mode === 'market' ? 'Asset Name?' : 'What\'s the Idea?'}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={title}
                                                                onChange={(e) => setTitle(e.target.value)}
                                                                placeholder={mode === 'market' ? "e.g. Bitcoin 100k December" : "e.g. Dark Mode Toggle"}
                                                                className="w-full bg-black/20 focus:bg-black/40 border-2 border-white/5 rounded-xl px-4 py-3 text-base font-bold text-white placeholder-zinc-700 focus:outline-none focus:border-white/20 transition-all"
                                                                required
                                                                autoFocus
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                                                                {mode === 'market' ? 'Resolution Criteria' : 'Why is it useful?'}
                                                            </label>
                                                            <textarea
                                                                value={description}
                                                                onChange={(e) => setDescription(e.target.value)}
                                                                placeholder={mode === 'market' ? "How do we decide the outcome? Be specific." : "Explain how this helps you..."}
                                                                className="w-full h-32 bg-black/20 focus:bg-black/40 border-2 border-white/5 rounded-xl px-4 py-3 text-sm font-medium text-white placeholder-zinc-700 focus:outline-none focus:border-white/20 transition-all resize-none"
                                                                required
                                                            />
                                                        </div>

                                                        {mode === 'market' && (
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Icon (Optional)</label>
                                                                <div className={`relative border-2 border-dashed rounded-xl p-4 transition-all duration-200 group ${imagePreview ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/5 hover:border-white/20 hover:bg-white/5'}`}>
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={handleImageChange}
                                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                                    />
                                                                    {imagePreview ? (
                                                                        <div className="flex items-center gap-4">
                                                                            <img src={imagePreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover shadow-lg" />
                                                                            <div>
                                                                                <p className="text-xs font-bold text-emerald-400">Image Selected</p>
                                                                                <button type="button" onClick={(e) => { e.preventDefault(); setImage(null); setImagePreview(null); }} className="text-[10px] font-bold text-red-400 uppercase tracking-wider hover:text-red-300 relative z-20 mt-1">Remove</button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center justify-center gap-3 text-zinc-500 py-2 group-hover:text-zinc-300 transition-colors">
                                                                            <Upload className="w-5 h-5" />
                                                                            <span className="text-xs font-bold uppercase tracking-wider">Upload Icon</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="pt-2">
                                                            <button
                                                                type="submit"
                                                                disabled={isSubmitting}
                                                                className={`w-full py-4 rounded-xl font-black text-sm tracking-widest shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase flex items-center justify-center gap-3
                                                                    ${mode === 'market'
                                                                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300 text-white shadow-emerald-900/20'
                                                                        : 'bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 text-white shadow-purple-900/20'
                                                                    }`}
                                                            >
                                                                {isSubmitting ? (
                                                                    <>
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                        SENDING...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Send className="w-4 h-4" />
                                                                        SUBMIT REQUEST
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </form>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            </div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
