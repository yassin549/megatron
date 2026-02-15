'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await fetch('/api/user/me');
                if (!res.ok) {
                    if (active) setLoading(false);
                    return;
                }
                const data = await res.json();
                if (data?.isAdmin) {
                    router.push('/admin/dashboard');
                    return;
                }
                if (active) setLoading(false);
            } catch {
                if (active) {
                    setError('Unable to verify admin access.');
                    setLoading(false);
                }
            }
        })();
        return () => { active = false; };
    }, [router]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-card border border-border rounded-lg p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-8 h-8 text-primary"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Admin Access
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Admin access requires a logged-in user with the `isAdmin` flag.
                        </p>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-6">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center text-muted-foreground">
                            Verifying admin access...
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Link
                                href="/login"
                                className="inline-block w-full text-center py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                Go to user login
                            </Link>
                        </div>
                    )}

                    <p className="text-center text-muted-foreground mt-6">
                        <Link href="/" className="text-primary hover:underline">
                            Back to home
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
