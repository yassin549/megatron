import { NextResponse } from 'next/server';
import { getAssetDetail } from '@/lib/assets';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
): Promise<NextResponse> {
    try {
        const session = await getServerSession(authOptions);
        const data = await getAssetDetail(params.id, session?.user?.id);

        if (!data) {
            return NextResponse.json(
                { error: 'Asset not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('[API/assets/[id]] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch asset' },
            { status: 500 }
        );
    }
}
