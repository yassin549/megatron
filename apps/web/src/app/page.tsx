import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';
import Link from 'next/link';
import { SubNavbar } from '@/components/layout/SubNavbar';
import { AssetGrid } from '@/components/assets/AssetGrid';

// Force dynamic since we are fetching live data (or use revalidate)
export const dynamic = 'force-dynamic';

async function getAssets() {
    try {
        const assets = await db.asset.findMany({
            include: {
                pool: true,
                _count: { select: { positions: true } },
                bookmarks: true, // we need to know if user bookmarked it
                oracleLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: {
                // Default sorting, e.g. trending or newest
                createdAt: 'desc'
            }
        });

        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        return assets.map(asset => {
            const lastLog = asset.oracleLogs?.[0];
            const isBookmarked = userId ? asset.bookmarks.some(b => b.userId === userId) : false;

            return {
                id: asset.id,
                name: asset.name,
                description: asset.description,
                type: asset.type,
                price: asset.price.toNumber(),
                change24h: asset.change24h.toNumber(),
                volume24h: asset.volume24h.toNumber(),
                status: asset.status as 'active' | 'funding' | 'paused',
                softCap: asset.softCap.toNumber(),
                hardCap: asset.hardCap.toNumber(),
                fundingProgress: asset.liquidity.toNumber(),
                poolLiquidity: asset.pool?.totalUsdc.toNumber() || 0,
                lastFundamental: null, // deprecated field
                aiConfidence: lastLog?.confidence.toNumber() || null,
                aiSummary: lastLog?.summary || null,
                imageUrl: asset.imageUrl || undefined,
                holders: asset._count.positions,
                isBookmarked,
            };
        });
    } catch (error) {
        console.error('Failed to fetch assets', error);
        return [];
    }
}

export default async function HomePage({ searchParams }: { searchParams: { q?: string, category?: string } }) {
    const session = await getServerSession(authOptions);
    const isAuthenticated = !!session;
    const assets = await getAssets();

    // Check if we show the hero banner (no search, category=all)
    const showHero = !isAuthenticated && (!searchParams.q) && (!searchParams.category || searchParams.category === 'all');

    return (
        <div className="min-h-screen bg-background relative selection:bg-primary/20 selection:text-primary">
            {/* Background Effects */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            <div className="fixed inset-0 bg-[radial-gradient(circle_800px_at_50%_-20%,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

            <SubNavbar />

            <main className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8 relative z-10">
                {/* Guest Welcome Banner - Server Rendered */}
                {showHero && (
                    <div className="mb-8 md:mb-16 relative overflow-hidden rounded-3xl border border-white/10 group animate-in slide-in-from-bottom-4 duration-700">
                        <div className="absolute inset-0 bg-gradient-to-br from-obsidian-800 to-obsidian-950/50 backdrop-blur-xl" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />

                        <div className="relative z-10 p-8 md:p-16 text-center">
                            <div className="inline-block mb-4 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono tracking-widest uppercase">
                                The Future of Trading
                            </div>

                            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 md:mb-8 tracking-tighter leading-tight">
                                Turn World Variables Into <br className="hidden md:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-neon-purple animate-gradient-x">Investable Assets</span>
                            </h1>

                            <p className="text-base md:text-xl text-muted-foreground mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed">
                                Trade AI-monitored real-world events. From climate data to political outcomes,
                                verify your thesis with institutional-grade tools.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link
                                    href="/signup"
                                    className="w-full sm:w-auto px-8 py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-95 text-sm md:text-base ring-1 ring-white/20"
                                >
                                    Start Trading Now
                                </Link>
                                <Link
                                    href="/about"
                                    className="w-full sm:w-auto px-8 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all border border-white/10 hover:border-white/20 text-sm md:text-base"
                                >
                                    How it Works
                                </Link>
                            </div>
                        </div>

                        {/* Abstract BG decorations */}
                        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 blur-3xl rounded-full transform translate-x-1/2 -translate-y-1/2 opacity-20" />
                        <div className="absolute bottom-0 left-0 w-1/3 h-full bg-neon-purple/5 blur-3xl rounded-full transform -translate-x-1/2 translate-y-1/2 opacity-20" />
                    </div>
                )}

                {/* Client-Side Grid with Server Data */}
                <AssetGrid initialAssets={assets} isAuthenticated={isAuthenticated} />
            </main>
        </div>
    );
}
