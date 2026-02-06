import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@megatron/database';
import { TradeExecutor } from '@megatron/lib-common';
import { Redis } from 'ioredis';

// Initialize Redis
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { type, assetId, amount, stopLoss, takeProfit, isGradual, chunks = 10, minOutputAmount, maxInputAmount } = body;
    // Guidelines:
    // BUY: amount is USDC usually. IF 'shares' provided in body, amounts to specific shares.
    // SELL: amount is SHARES.

    if (!type || !['buy', 'sell'].includes(type)) {
        return NextResponse.json({ error: 'Invalid trade type' }, { status: 400 });
    }
    if (!assetId) {
        return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Amount validation
    if (!amount && !body.shares) {
        return NextResponse.json({ error: 'Amount or shares required' }, { status: 400 });
    }

    const tradeAmount = amount ? parseFloat(amount) : 0;
    const sl = stopLoss !== undefined ? parseFloat(stopLoss) : undefined;
    const tp = takeProfit !== undefined ? parseFloat(takeProfit) : undefined;

    // --- GRADUAL EXIT LOGIC ---
    if (isGradual && type === 'sell' && body.shares) {
        const shareAmount = parseFloat(body.shares);
        try {
            const result = await db.$transaction(async (tx: any) => {
                const asset = await tx.asset.findUnique({
                    where: { id: assetId },
                    include: { pool: true },
                });

                if (!asset || !asset.pool) throw new Error('Asset or Liquidity Pool not found');

                // Check if user has enough shares
                const position = await tx.position.findUnique({
                    where: { userId_assetId: { userId, assetId } }
                });

                // Precision Clamping for Gradual Exit
                // If requested shareAmount is very close to position.shares, we treat it as "ALL"
                // and avoid "insufficient shares" error due to float noise.
                const currentShares = position ? position.shares.toNumber() : 0;
                if (Math.abs(currentShares - shareAmount) < 0.0001 && currentShares > 0) {
                    // It's effectively a full exit request
                    // We don't change shareAmount variable itself (it's used for the TimedExit record),
                    // but we pass the validation.
                    // Actually, we SHOULD clamp shareAmount to store exact value in TimedExit to be clean.
                    // But `shareAmount` is const from body.shares. 
                    // We can't reassign const, let's verify if we should.
                    // Wait, shareAmount is defined as const above. 
                }

                // Let's rely on loose comparison logic or just checking if position.shares < shareAmount - epsilon.
                if (!position || position.shares.toNumber() < shareAmount - 0.0001) {
                    throw new Error(`Insufficient shares for gradual exit. Have ${position?.shares.toNumber()}, requested ${shareAmount}`);
                }

                // Check if there's already an active timed exit
                const activeTimedExit = await tx.timedExit.findFirst({
                    where: { userId, assetId, status: 'active' }
                });
                if (activeTimedExit) throw new Error('A gradual exit is already in progress for this asset');

                // Create TimedExit Record
                const timedExit = await tx.timedExit.create({
                    data: {
                        userId,
                        assetId,
                        totalShares: shareAmount,
                        chunksTotal: chunks,
                        intervalMs: 300000, // 5 minutes
                        nextExecutionAt: new Date(), // Start immediately
                    }
                });

                return timedExit;
            });

            return NextResponse.json({ success: true, timedExitId: result.id, isGradual: true });
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }

    try {
        let result;
        const limits = { maxInput: maxInputAmount ? parseFloat(maxInputAmount) : undefined, minOutput: minOutputAmount ? parseFloat(minOutputAmount) : undefined };
        const positionOptions = { stopLoss: sl, takeProfit: tp };

        if (type === 'buy') {
            // BUY
            if (body.shares) {
                // Buy by Shares
                const targetShares = parseFloat(body.shares);
                result = await TradeExecutor.executeBuy(userId, assetId, 0, targetShares, limits, positionOptions);
            } else {
                // Buy by USDC
                result = await TradeExecutor.executeBuy(userId, assetId, tradeAmount, undefined, limits, positionOptions);
            }
        } else {
            // SELL
            if (body.shares) {
                // Sell by Shares
                const shareAmount = parseFloat(body.shares);
                result = await TradeExecutor.executeSell(userId, assetId, shareAmount, undefined, limits, positionOptions);
            } else {
                // Sell by USDC (Revenue)
                const targetUsdc = tradeAmount;
                result = await TradeExecutor.executeSell(userId, assetId, undefined, targetUsdc, limits, positionOptions);
            }
        }

        // Publish Event
        redis.publish('megatron:events', JSON.stringify(result.eventData)).catch(console.error);

        return NextResponse.json({ success: true, tradeId: result.trade.id, outputAmount: result.outputAmount });

    } catch (error: any) {
        console.error('Trade failed:', error);
        return NextResponse.json({ error: error.message || 'Trade failed' }, { status: 500 });
    }
}
