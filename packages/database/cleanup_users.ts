
import { db } from './src/client';

const EMAILS_TO_KEEP = ['khoualdiyassin26@gmail.com', 'yassinkhfreelancer@gmail.com'];

async function main() {
    console.log('Starting simplified cleanup (fixed)...');

    const usersToKeep = await db.user.findMany({
        where: { email: { in: EMAILS_TO_KEEP } },
        select: { id: true, email: true }
    });

    const keepIds = usersToKeep.map(u => u.id);
    console.log('Keeping users:', usersToKeep.map(u => u.email).join(', '));

    console.log('Cleaning related data...');

    try { await db.position.deleteMany({ where: { userId: { notIn: keepIds } } }); } catch (e: any) { console.warn('Position fail:', e.message); }
    try { await db.trade.deleteMany({ where: { buyerId: { notIn: keepIds } } }); } catch (e: any) { console.warn('Trade buyerId fail:', e.message); }
    try { await db.lPShare.deleteMany({ where: { userId: { notIn: keepIds } } }); } catch (e: any) { console.warn('LPShare fail:', e.message); }
    try { await db.ledger.deleteMany({ where: { userId: { notIn: keepIds } } }); } catch (e: any) { console.warn('Ledger fail:', e.message); }
    try { await db.assetRequest.deleteMany({ where: { userId: { notIn: keepIds } } }); } catch (e: any) { console.warn('AssetRequest fail:', e.message); }
    try { await db.withdrawalRequest.deleteMany({ where: { userId: { notIn: keepIds } } }); } catch (e: any) { console.warn('WithdrawalRequest fail:', e.message); }
    try { await db.pendingDeposit.deleteMany({ where: { userId: { notIn: keepIds } } }); } catch (e: any) { console.warn('PendingDeposit fail:', e.message); }
    try { await db.bookmark.deleteMany({ where: { userId: { notIn: keepIds } } }); } catch (e: any) { console.warn('Bookmark fail:', e.message); }

    // Try TimedExit if it exists in the client
    // @ts-ignore
    if (db.timedExit) {
        // @ts-ignore
        try { await db.timedExit.deleteMany({ where: { userId: { notIn: keepIds } } }); } catch (e: any) { console.warn('TimedExit fail:', e.message); }
    }

    console.log('Deleting users...');
    const result = await db.user.deleteMany({ where: { id: { notIn: keepIds } } });
    console.log(`Deleted ${result.count} users.`);

    console.log('Cleanup completed successfully.');
}

main()
    .catch((e) => {
        console.error('Cleanup failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
