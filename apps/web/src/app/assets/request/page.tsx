'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationContext';

export default function AssetRequestPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        type: 'social',
        shortDescription: '',
        description: '',
        oracleQuery1: '',
        oracleQuery2: '',
        oracleQuery3: '',
        justification: '',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground">Loading...</div>
            </div>
        );
    }

    const { showNotification } = useNotification();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        // TODO: API call
        await new Promise((r) => setTimeout(r, 1000));
        setSubmitting(false);
        showNotification('success', 'Request submitted! An admin will review it shortly.');
        router.push('/assets');
    };

    return (
        <div className="min-h-screen bg-transparent">

            <div className="max-w-2xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">
                        Request New Asset
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Submit a request to create a new synthetic asset
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                        <h2 className="font-semibold text-foreground">Asset Details</h2>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Asset Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Bitcoin Twitter Sentiment"
                                className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Category *
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="social">Social</option>
                                <option value="sports">Sports</option>
                                <option value="economics">Economics</option>
                                <option value="weather">Weather</option>
                                <option value="crypto">Crypto</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Short Description *
                            </label>
                            <input
                                type="text"
                                value={formData.shortDescription}
                                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                                placeholder="One-line summary"
                                className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Full Description *
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Explain what this asset tracks and how it should be priced..."
                                rows={4}
                                className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                        <h2 className="font-semibold text-foreground">Oracle Queries</h2>
                        <p className="text-sm text-muted-foreground">
                            Provide 1-3 search queries the LLM will use to analyze fundamental value.
                        </p>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Query 1 *
                            </label>
                            <input
                                type="text"
                                value={formData.oracleQuery1}
                                onChange={(e) => setFormData({ ...formData, oracleQuery1: e.target.value })}
                                placeholder="e.g., Bitcoin sentiment analysis"
                                className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Query 2
                            </label>
                            <input
                                type="text"
                                value={formData.oracleQuery2}
                                onChange={(e) => setFormData({ ...formData, oracleQuery2: e.target.value })}
                                placeholder="Optional additional query"
                                className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Query 3
                            </label>
                            <input
                                type="text"
                                value={formData.oracleQuery3}
                                onChange={(e) => setFormData({ ...formData, oracleQuery3: e.target.value })}
                                placeholder="Optional additional query"
                                className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                        <h2 className="font-semibold text-foreground">Why this asset?</h2>
                        <textarea
                            value={formData.justification}
                            onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                            placeholder="Explain why this asset would be interesting to trade..."
                            rows={3}
                            className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                        {submitting ? 'Submitting...' : 'Submit Request'}
                    </button>

                    <p className="text-sm text-muted-foreground text-center">
                        Requests are reviewed within 24-48 hours. You'll be notified when approved.
                    </p>
                </form>
            </div>
        </div>
    );
}
