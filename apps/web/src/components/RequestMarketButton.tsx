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

export function RequestMarketButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<FeedbackMode>('menu');

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
            setTimeout(() => {
                setMode('menu');
                setIsSuccess(false);
                setTitle('');
                setDescription('');
                setImage(null);
                setImagePreview(null);
            }, 300);
        }
    }, [isOpen]);

    // Initial button animation
    const buttonVariants: Variants = {
        initial: { scale: 0, opacity: 0 },
        animate: { scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } },
        hover: { scale: 1.05, y: -2, transition: { duration: 0.2 } },
        tap: { scale: 0.95 }
    };

    // Modal animation
    const modalVariants: Variants = {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0.3, duration: 0.4 } },
        exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }
    };

    // Content slide animation
    const contentVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 100 : -100,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 100 : -100,
            opacity: 0
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
                className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[60] group overflow-hidden"
            >
                <div className={`relative flex items-center gap-2 p-3 md:px-5 md:py-3 rounded-full shadow-xl backdrop-blur-md border transition-all duration-300 ${isOpen
                    ? 'bg-zinc-800 text-white border-white/10'
                    : 'bg-primary text-white border-white/10 shadow-primary/25 hover:bg-primary/90'
                    }`}>
                    {!isOpen && (
                        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
                    )}

                    <motion.span className="hidden md:inline-block relative z-10 font-bold tracking-tight">
                        Feedback
                    </motion.span>

                    {isOpen ? (
                        <X className="w-6 h-6 md:w-5 md:h-5 relative z-10" />
                    ) : (
                        <MessageSquare className="w-6 h-6 md:w-5 md:h-5 relative z-10" />
                    )}
                </div>
            </motion.button>

            {/* Modal */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-[59] bg-black/60 md:bg-black/40 backdrop-blur-sm"
                                onClick={() => setIsOpen(false)}
                            />

                            <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none md:inset-auto md:bottom-24 md:right-8 px-4 md:px-0">
                                <motion.div
                                    variants={modalVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    layout
                                    className="bg-[#0C0F14] border border-white/10 shadow-2xl overflow-hidden pointer-events-auto rounded-2xl w-full max-w-[380px] md:w-[380px] flex flex-col"
                                >
                                    {/* Header */}
                                    <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {mode !== 'menu' && !isSuccess && (
                                                <button
                                                    onClick={() => setMode('menu')}
                                                    className="p-1 -ml-2 text-zinc-400 hover:text-white transition-colors"
                                                >
                                                    <ChevronLeft className="w-5 h-5" />
                                                </button>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <div>
                                                    <h3 className="font-bold text-white text-sm">
                                                        {isSuccess ? 'Received!' : 'Share Feedback'}
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Content Area */}
                                    <div className="relative overflow-hidden">
                                        <AnimatePresence mode="wait" initial={false} custom={mode === 'menu' ? -1 : 1}>
                                            {isSuccess ? (
                                                <motion.div
                                                    key="success"
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="p-8 text-center"
                                                >
                                                    <h3 className="text-lg font-bold text-white mb-2">Thanks for your input!</h3>
                                                    <p className="text-zinc-400 text-sm">We review all requests carefully.</p>
                                                </motion.div>
                                            ) : mode === 'menu' ? (
                                                <motion.div
                                                    key="menu"
                                                    custom={-1}
                                                    variants={contentVariants}
                                                    initial="enter"
                                                    animate="center"
                                                    exit="exit"
                                                    className="p-4 space-y-3"
                                                >
                                                    <button
                                                        onClick={() => setMode('market')}
                                                        className="w-full p-4 bg-zinc-900/50 hover:bg-zinc-800/80 border border-white/5 hover:border-white/10 rounded-xl text-left transition-all group"
                                                    >
                                                        <h4 className="font-bold text-white">New Measurable Asset</h4>
                                                        <p className="text-xs text-zinc-400 mt-1">Suggest a new prediction asset</p>
                                                    </button>

                                                    <button
                                                        onClick={() => setMode('feature')}
                                                        className="w-full p-4 bg-zinc-900/50 hover:bg-zinc-800/80 border border-white/5 hover:border-white/10 rounded-xl text-left transition-all group"
                                                    >
                                                        <h4 className="font-bold text-white">Feature Request</h4>
                                                        <p className="text-xs text-zinc-400 mt-1">Suggest features or improvements</p>
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
                                                    className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar"
                                                >
                                                    <form onSubmit={handleSubmit} className="space-y-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                                                {mode === 'market' ? 'Asset Name' : 'Feature Title'}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={title}
                                                                onChange={(e) => setTitle(e.target.value)}
                                                                placeholder={mode === 'market' ? "e.g. Bitcoin 100k?" : "e.g. Dark Mode"}
                                                                className="w-full bg-zinc-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                                                                required
                                                                autoFocus
                                                            />
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                                                {mode === 'market' ? 'Resolution Criteria' : 'Details & Impact'}
                                                            </label>
                                                            <textarea
                                                                value={description}
                                                                onChange={(e) => setDescription(e.target.value)}
                                                                placeholder={mode === 'market' ? "How do we know who wins?" : "Describe how this helps..."}
                                                                className="w-full h-24 bg-zinc-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors resize-none"
                                                                required
                                                            />
                                                        </div>

                                                        {mode === 'market' && (
                                                            <div className="space-y-1.5">
                                                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Icon (Optional)</label>
                                                                <div className={`relative border border-dashed rounded-lg p-3 transition-colors ${imagePreview ? 'border-primary/50 bg-primary/5' : 'border-white/10 hover:border-white/20'}`}>
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={handleImageChange}
                                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                                    />
                                                                    {imagePreview ? (
                                                                        <div className="flex items-center gap-3">
                                                                            <img src={imagePreview} alt="Preview" className="w-8 h-8 rounded object-cover" />
                                                                            <span className="text-xs text-zinc-400">Selected</span>
                                                                            <button type="button" onClick={(e) => { e.preventDefault(); setImage(null); setImagePreview(null); }} className="ml-auto text-xs text-red-400 z-20">Remove</button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center justify-center gap-2 text-zinc-500 py-1">
                                                                            <Upload className="w-3 h-3" />
                                                                            <span className="text-xs">Upload</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <button
                                                            type="submit"
                                                            disabled={isSubmitting}
                                                            className="w-full mt-2 bg-white text-black hover:bg-zinc-200 font-bold py-3 rounded-lg disabled:opacity-70 transition-colors flex items-center justify-center gap-2 text-sm"
                                                        >
                                                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                            {isSubmitting ? 'Sending...' : 'Submit Request'}
                                                        </button>
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
