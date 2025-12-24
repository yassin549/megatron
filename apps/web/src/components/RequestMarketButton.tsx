'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Upload, Sparkles, Loader2 } from 'lucide-react';
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
    const buttonVariants = {
        initial: { scale: 0, opacity: 0 },
        animate: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 260, damping: 20 } },
        hover: { scale: 1.1, rotate: 90, transition: { duration: 0.3 } },
        tap: { scale: 0.9 }
    };

    // Modal animation variants
    const modalVariants = {
        hidden: { opacity: 0, y: 50, scale: 0.9 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0.3 } },
        exit: { opacity: 0, y: 50, scale: 0.9, transition: { duration: 0.2 } }
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

    // Determine if we are on client to use portals
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    return (
        <>
            <motion.button
                variants={buttonVariants}
                initial="initial"
                animate="animate"
                whileHover="hover"
                whileTap="tap"
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-[60] p-4 bg-primary text-primary-foreground rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-white/20 hover:shadow-[0_0_30px_rgba(59,130,246,0.8)] backdrop-blur-md group"
            >
                <Plus className="w-6 h-6 md:w-8 md:h-8" />
            </motion.button>

            {mounted && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsOpen(false)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            />

                            {/* Modal Card */}
                            <motion.div
                                variants={modalVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="relative w-full max-w-lg bg-[#0C0F14] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                            >
                                {/* Glow Effect */}
                                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
                                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

                                <div className="relative p-6 md:p-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-primary/10 rounded-xl">
                                                <Sparkles className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold text-white tracking-tight">Request Market</h2>
                                                <p className="text-sm text-zinc-400">Propose a new asset for the ecosystem</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {!isSuccess ? (
                                        <form onSubmit={handleSubmit} className="space-y-5">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-zinc-300 ml-1">Market Title</label>
                                                <input
                                                    type="text"
                                                    value={title}
                                                    onChange={(e) => setTitle(e.target.value)}
                                                    placeholder="e.g. Will SpaceX launch Starship in 2025?"
                                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-zinc-300 ml-1">Description</label>
                                                <textarea
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                    placeholder="Describe the criteria for resolution..."
                                                    className="w-full h-32 bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none"
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-zinc-300 ml-1">Market Image</label>
                                                <div
                                                    className={`relative border-2 border-dashed rounded-xl p-4 transition-all ${imagePreview ? 'border-primary/50 bg-primary/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}
                                                >
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageChange}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />

                                                    {imagePreview ? (
                                                        <div className="relative h-40 w-full rounded-lg overflow-hidden">
                                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                                <span className="text-white font-medium text-sm">Click to change</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                                                            <Upload className="w-8 h-8 mb-3 opacity-50" />
                                                            <p className="text-sm font-medium">Click to upload image</p>
                                                            <p className="text-xs opacity-60 mt-1">PNG, JPG up to 5MB</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="pt-2">
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                                >
                                                    {isSubmitting ? (
                                                        <>
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                            Submitting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            Create Request
                                                            <Sparkles className="w-4 h-4 ml-1" />
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="flex flex-col items-center justify-center py-12 text-center"
                                        >
                                            <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-6">
                                                <Sparkles className="w-10 h-10" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-white mb-2">Request Submitted!</h3>
                                            <p className="text-zinc-400 max-w-xs mx-auto">
                                                Your market proposal has been sent to our team for review. You'll be notified once it's live.
                                            </p>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
