import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';

// Helper to check admin status
async function isAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return false;

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true }
    });

    return user?.isAdmin === true;
}

export async function GET(request: Request) {
    try {
        if (!await isAdmin()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limitParam = Number(searchParams.get('limit') || 200);
        const limit = Math.min(Math.max(limitParam, 1), 500);
        const cursor = searchParams.get('cursor');

        const requests = await db.assetRequest.findMany({
            include: { user: { select: { email: true } } },
            orderBy: { createdAt: 'desc' },
            take: limit,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
        });

        const nextCursor = requests.length === limit ? requests[requests.length - 1]?.id : null;
        return NextResponse.json({ requests, nextCursor });
    } catch (error) {
        console.error('Failed to fetch requests:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        if (!await isAdmin()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { requestId, status, adminNotes } = body;

        if (!requestId || !['approved', 'rejected'].includes(status)) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        const assetRequest = await db.assetRequest.findUnique({
            where: { id: requestId }
        });

        if (!assetRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // If approving, we need to check if it's a Feature Request or a Market Request
        if (status === 'approved') {
            // Check if it's a feature request based on our metadata convention
            const isFeatureRequest = Array.isArray(assetRequest.suggestedQueries) &&
                assetRequest.suggestedQueries.some((q: any) => typeof q === 'string' && q.includes('TYPE:FEATURE'));

            if (isFeatureRequest) {
                // For feature requests, we just update the status
                await db.assetRequest.update({
                    where: { id: requestId },
                    data: { status, adminNotes, reviewedAt: new Date() }
                });
            } else {
                // For market requests, we create the Asset and Pool
                await db.$transaction(async (tx: any) => {
                    // 1. Create Asset
                    const asset = await tx.asset.create({
                        data: {
                            name: assetRequest.variableName,
                            description: assetRequest.description,
                            type: 'generated', // Default type for requests
                            oracleQueries: assetRequest.suggestedQueries || [],
                            status: 'funding',
                            softCap: 1000,
                            hardCap: 5000,
                            pricingParams: { P0: 10, k: 0.05 }, // Defaults
                        }
                    });

                    // 2. Create Pool
                    await tx.liquidityPool.create({
                        data: {
                            assetId: asset.id,
                            status: 'funding',
                            totalUsdc: 0,
                            totalLPShares: 0
                        }
                    });

                    // 3. Update Request Status
                    await tx.assetRequest.update({
                        where: { id: requestId },
                        data: { status, adminNotes, reviewedAt: new Date() }
                    });
                });
            }
        } else {
            // Just update status for Rejection
            await db.assetRequest.update({
                where: { id: requestId },
                data: { status, adminNotes, reviewedAt: new Date() }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to update request:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
