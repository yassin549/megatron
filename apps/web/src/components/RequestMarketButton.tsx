'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Upload, Sparkles, Loader2, Send } from 'lucide-react';
import { createPortal } from 'react-dom';

export function RequestMarketButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Initial button animation variants
    const buttonVariants: any = {
        initial: { scale: 0, opacity: 0 },
        animate: { scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } },
        hover: { scale: 1.05, y: -2, transition: { duration: 0.2 } },
        tap: { scale: 0.95 }
    };

    // Card animation: Popover for Desktop, Bottom Sheet for Mobile
    const cardVariants: any = {
        hidden: {
            opacity: 0,
            y: 20,
            scale: 0.95,
            transformOrigin: "bottom right"
        },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: "spring", bounce: 0.3, duration: 0.4 }
        },
        exit: {
            opacity: 0,
            y: 20,
            scale: 0.95,
            transition: { duration: 0.2 }
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSubmitting(false);
        setIsSuccess(true);
        // Reset after success
        setTimeout(() => {
            setIsOpen(false);
            setIsSuccess(false);
            setTitle('');
            setDescription('');
            setImage(null);
            setImagePreview(null);
        }, 1500);
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
                <div className={`relative flex items-center gap-2 p-3 md:px-5 md:py-3 rounded-full shadow-xl shadow-blue-500/20 backdrop-blur-md border border-white/10 transition-colors duration-300 ${isOpen ? 'bg-zinc-800 text-white' : 'bg-primary text-white hover:bg-blue-600'}`}>

                    {/* Shimmer Effect (only when not open) */}
                    {!isOpen && (
                        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
                    )}

                    <motion.span
                        variants={{
                            hover: {
                                scale: [1, 1.08, 1],
                                transition: {
                                    duration: 1.2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }
                            }
                        }}
                        className="hidden md:inline-block relative z-10 font-bold tracking-tight"
                    >
                        Request Market
                    </motion.span>
                    {isOpen ? (
                        <X className="w-6 h-6 md:w-5 md:h-5 relative z-10" />
                    ) : (
                        <>
                            <Plus className="md:hidden w-6 h-6 relative z-10" />
                            <Sparkles className="hidden md:block w-5 h-5 relative z-10 animate-pulse" />
                        </>
                    )}
                </div>
            </motion.button>

            {/* Popover / Bottom Sheet */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <>
                            {/* Invisible Backdrop to close on click outside */}
                            <div
                                className="fixed inset-0 z-[59] bg-black/20 md:bg-transparent"
                                onClick={() => setIsOpen(false)}
                            />

                            <motion.div
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className={`
                                    fixed z-[60] bg-[#0C0F14] border border-white/10 shadow-2xl overflow-hidden
                                    /* Mobile: Bottom Sheet */
                                    bottom-0 left-0 right-0 rounded-t-3xl border-b-0 pb-safe
                                    /* Desktop: Popover */
                                    md:bottom-24 md:right-8 md:left-auto md:w-[380px] md:rounded-2xl md:border-b md:pb-0
                                `}
                            >
                                {/* Header */}
                                <div className="p-5 border-b border-white/5 bg-white/5 flex items-center justify-between relative">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                            <Send className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-sm">New Market</h3>
                                            <p className="text-xs text-zinc-400">What should we add next?</p>
                                        </div>
                                    </div>

                                    {/* Close Button (Always visible now for accessibility) */}
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 -mr-2 text-zinc-500 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>

                                    {/* Mobile Drag Handle Visual */}
                                    <div className="md:hidden w-12 h-1 bg-white/20 rounded-full mx-auto absolute top-2 left-0 right-0 pointer-events-none" />
                                </div>

                                {/* Body */}
                                <div className="p-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                    {!isSuccess ? (
                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Title</label>
                                                <input
                                                    type="text"
                                                    value={title}
                                                    onChange={(e) => setTitle(e.target.value)}
                                                    placeholder="e.g. BTC to $100k?"
                                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-base md:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 transition-colors"
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Details</label>
                                                <textarea
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                    placeholder="Resolution criteria..."
                                                    className="w-full h-24 bg-zinc-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-base md:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 transition-colors resize-none"
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Image (Optional)</label>
                                                <div className={`relative border border-dashed rounded-lg p-3 transition-colors ${imagePreview ? 'border-primary/50 bg-primary/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageChange}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />
                                                    {imagePreview ? (
                                                        <div className="flex items-center gap-3">
                                                            <img src={imagePreview} alt="Preview" className="w-10 h-10 rounded object-cover" />
                                                            <span className="text-xs text-zinc-400">Image selected</span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.preventDefault(); setImage(null); setImagePreview(null); }}
                                                                className="ml-auto text-xs text-red-400 hover:text-red-300 z-20"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-2 text-zinc-500 py-1">
                                                            <Upload className="w-4 h-4" />
                                                            <span className="text-xs">Click to upload</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full mt-2 bg-white text-black hover:bg-zinc-200 font-bold py-3 rounded-lg disabled:opacity-70 transition-colors flex items-center justify-center gap-2 text-sm"
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    "Submit Request"
                                                )}
                                            </button>
                                        </form>
                                    ) : (
                                        <div className="py-8 text-center flex flex-col items-center">
                                            <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-3">
                                                <Sparkles className="w-6 h-6" />
                                            </div>
                                            <h3 className="text-lg font-bold text-white">Sent!</h3>
                                            <p className="text-xs text-zinc-400 mt-1">We'll review your market shortly.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
