import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAssetDetail } from '@/lib/assets';
import { AssetDetailClient } from './AssetDetailClient';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const data = await getAssetDetail(params.id);
    if (!data) return { title: 'Asset Not Found' };

    return {
        title: `${data.asset.name} | Megatron`,
        description: data.asset.description || `Trade ${data.asset.name} on Megatron`,
    };
}

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    const data = await getAssetDetail(params.id, session?.user?.id);

    if (!data) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
                <h1 className="text-2xl font-bold mb-4">Asset Not Found</h1>
                <Link href="/" className="text-blue-500 hover:underline">Return to Market Grid</Link>
            </div>
        );
    }

    return (
        <div className="h-full bg-transparent text-gray-200 selection:bg-blue-500/30 overflow-hidden">
            <main className="w-full h-full">
                <Suspense fallback={
                    <div className="flex items-center justify-center py-20 font-mono text-zinc-500 animate-pulse uppercase tracking-widest text-xs">
                        Loading_Dynamic_Data...
                    </div>
                }>
                    <AssetDetailClient
                        initialAsset={data.asset as any}
                        initialOracleLogs={data.oracleLogs as any}
                        initialPriceHistory={data.priceHistory as any}
                    />
                </Suspense>
            </main>
        </div>
    );
}
