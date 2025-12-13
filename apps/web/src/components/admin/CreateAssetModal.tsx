'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

interface AssetData {
    id?: string;
    name: string;
    type: string;
    description?: string;
    softCap: number;
    hardCap: number;
    imageUrl?: string;
}

interface CreateAssetModalProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: AssetData;
}

export function CreateAssetModal({ onClose, onSuccess, initialData }: CreateAssetModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState<AssetData>({
        name: '',
        type: 'social',
        description: '',
        softCap: 1000,
        hardCap: 5000,
        imageUrl: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                type: initialData.type,
                description: initialData.description || '',
                softCap: Number(initialData.softCap),
                hardCap: Number(initialData.hardCap),
                id: initialData.id,
                imageUrl: initialData.imageUrl || ''
            });
        }
    }, [initialData]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const uploadData = new FormData();
            uploadData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: uploadData
            });

            if (!res.ok) throw new Error('Upload failed');

            const data = await res.json();
            setFormData(prev => ({ ...prev, imageUrl: data.url }));
        } catch (err) {
            console.error('Upload error:', err);
            setError('Failed to upload image');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const url = '/api/admin/assets';
            const method = initialData ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || `Failed to ${initialData ? 'update' : 'create'} asset`);
            }

            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const isEditing = !!initialData;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-950 border border-white/10 rounded-xl p-8 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">
                    {isEditing ? 'Edit Asset' : 'Create New Asset'}
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Asset Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-zinc-900 border border-white/5 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            placeholder="e.g. Will Bitcoin hit 100k?"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Asset Image</label>
                        <div className="space-y-3">
                            {formData.imageUrl && (
                                <div className="relative w-full h-32 bg-zinc-900 rounded-lg overflow-hidden border border-white/5 group">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={formData.imageUrl}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, imageUrl: '' })}
                                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-500/80 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formData.imageUrl || ''}
                                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                    className="flex-1 bg-zinc-900 border border-white/5 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                                    placeholder="Enter URL or upload..."
                                />
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        disabled={isUploading}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                        id="file-upload"
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className={`flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-white/5 transition-colors cursor-pointer whitespace-nowrap text-sm ${isUploading ? 'opacity-50' : ''}`}
                                    >
                                        {isUploading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <span className="font-medium">Upload</span>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full bg-zinc-900 border border-white/5 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                            <option value="social">Social</option>
                            <option value="economics">Economics</option>
                            <option value="sports">Sports</option>
                            <option value="crypto">Crypto</option>
                            <option value="politics">Politics</option>
                            <option value="science">Science</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Description</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-zinc-900 border border-white/5 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                            placeholder="Detailed description of the prediction market..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Soft Cap (USDC)</label>
                            <input
                                type="number"
                                min="100"
                                value={formData.softCap}
                                onChange={(e) => setFormData({ ...formData, softCap: parseInt(e.target.value) })}
                                className="w-full bg-zinc-900 border border-white/5 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Hard Cap (USDC)</label>
                            <input
                                type="number"
                                min="1000"
                                value={formData.hardCap}
                                onChange={(e) => setFormData({ ...formData, hardCap: parseInt(e.target.value) })}
                                className="w-full bg-zinc-900 border border-white/5 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium rounded-lg transition-colors border border-white/5 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {isEditing ? 'Updating...' : 'Creating...'}
                                </>
                            ) : (isEditing ? 'Update Asset' : 'Create Asset')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
