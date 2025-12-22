/**
 * Add Test Balance Script
 * 
 * Adds simulated USDC to a user account for testing purposes.
 * This creates a proper ledger entry to maintain audit trail integrity.
 * 
 * Usage: npx tsx scripts/add-test-balance.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_EMAIL = 'khoualdiyassin26@gmail.com';
const AMOUNT = 100; // USDC

async function main() {
    console.log('='.repeat(50));
    console.log('TEST BALANCE CREDIT SCRIPT');
    console.log('='.repeat(50));
    console.log(`\nTarget: ${TARGET_EMAIL}`);
    console.log(`Amount: ${AMOUNT} USDC`);

    // 1. Find the user
    const user = await prisma.user.findUnique({
        where: { email: TARGET_EMAIL }
    });

    if (!user) {
        console.error(`\n❌ User not found: ${TARGET_EMAIL}`);
        console.log('Make sure you have signed up with this email first.');
        return;
    }

    console.log(`\n✅ User found: ${user.id}`);
    console.log(`   Current Balance: ${user.walletHotBalance} USDC`);

    // 2. Add balance with ledger entry (atomic transaction)
    const result = await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: {
                walletHotBalance: { increment: AMOUNT }
            }
        }),
        prisma.ledger.create({
            data: {
                userId: user.id,
                deltaAmount: AMOUNT,
                currency: 'USDC',
                reason: 'deposit',
                refId: `test_credit_${Date.now()}`,
                metadata: {
                    type: 'test_credit',
                    note: 'Manual test balance for platform testing'
                }
            }
        })
    ]);

    const updatedUser = result[0];
    const ledgerEntry = result[1];

    console.log(`\n✅ Balance credited successfully!`);
    console.log(`   New Balance: ${updatedUser.walletHotBalance} USDC`);
    console.log(`   Ledger Entry: ${ledgerEntry.id}`);
    console.log('\n' + '='.repeat(50));
    console.log('You can now test trading on the platform!');
    console.log('='.repeat(50));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
