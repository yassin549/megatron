'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Mock data
const mockUsers = [
    { id: '1', email: 'admin@megatron.dev', isAdmin: true, balance: 100000, isBlacklisted: false, createdAt: '2024-11-01' },
    { id: '2', email: 'whale@trader.com', isAdmin: false, balance: 50000, isBlacklisted: false, createdAt: '2024-11-15' },
    { id: '3', email: 'active@user.com', isAdmin: false, balance: 5420, isBlacklisted: false, createdAt: '2024-12-01' },
    { id: '4', email: 'suspicious@test.com', isAdmin: false, balance: 100, isBlacklisted: true, createdAt: '2024-12-03' },
    { id: '5', email: 'newbie@example.com', isAdmin: false, balance: 250, isBlacklisted: false, createdAt: '2024-12-05' },
];

export default function AdminUsersPage() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();

    useEffect(() => {
        const adminSession = localStorage.getItem('megatron_admin');
        if (adminSession !== 'true') {
            router.push('/admin/login');
            return;
        }
        setIsAdmin(true);
        setLoading(false);
    }, [router]);

    if (loading || !isAdmin) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground">Loading...</div>
            </div>
        );
    }

    const filteredUsers = mockUsers.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background">
            {/* Admin Header */}
            <header className="border-b border-border bg-card">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/dashboard" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                                <span className="text-primary-foreground font-bold text-sm">M</span>
                            </div>
                            <span className="font-bold text-foreground">Admin</span>
                        </Link>
                        <nav className="flex items-center gap-4 ml-8">
                            <Link href="/admin/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
                                Dashboard
                            </Link>
                            <Link href="/admin/assets" className="text-sm text-muted-foreground hover:text-foreground">
                                Assets
                            </Link>
                            <Link href="/admin/requests" className="text-sm text-muted-foreground hover:text-foreground">
                                Requests
                            </Link>
                            <Link href="/admin/users" className="text-sm text-primary font-medium">
                                Users
                            </Link>
                        </nav>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.removeItem('megatron_admin');
                            router.push('/admin/login');
                        }}
                        className="text-sm text-muted-foreground hover:text-foreground"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Users</h1>
                        <p className="text-muted-foreground">{mockUsers.length} total users</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <input
                            type="text"
                            placeholder="Search by email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-64"
                        />
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-sm text-muted-foreground border-b border-border">
                                <th className="px-6 py-4 font-medium">Email</th>
                                <th className="px-6 py-4 font-medium">Role</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Balance</th>
                                <th className="px-6 py-4 font-medium">Joined</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-foreground">{user.email}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full ${user.isAdmin ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                                            }`}>
                                            {user.isAdmin ? 'Admin' : 'User'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full ${user.isBlacklisted ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                                            }`}>
                                            {user.isBlacklisted ? 'Blacklisted' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-foreground">
                                        ${user.balance.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                        {user.createdAt}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-sm text-primary hover:underline mr-4">
                                            View
                                        </button>
                                        {!user.isAdmin && (
                                            <button className={`text-sm hover:underline ${user.isBlacklisted ? 'text-green-500' : 'text-red-500'
                                                }`}>
                                                {user.isBlacklisted ? 'Unblock' : 'Block'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
