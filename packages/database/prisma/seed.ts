import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { seedAssets } from './seed-assets';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@megatron.dev' },
        update: {},
        create: {
            email: 'admin@megatron.dev',
            passwordHash: adminPassword,
            isAdmin: true,
            walletHotBalance: 100000,
            depositAddress: '0x1234567890123456789012345678901234567890'
        }
    });

    console.log('✅ Admin:', admin.email);

    // Test users
    for (let i = 1; i <= 5; i++) {
        const user = await prisma.user.upsert({
            where: { email: `user${i}@test.com` },
            update: {},
            create: {
                email: `user${i}@test.com`,
                passwordHash: await bcrypt.hash('password123', 10),
                walletHotBalance: 10000,
                depositAddress: `0x${i.toString().repeat(40)}`
            }
        });
        console.log(`✅ User ${i}:`, user.email);
    }

    // Platform config
    await prisma.platformConfig.upsert({
        where: { key: 'treasury_balance' },
        update: {},
        create: { key: 'treasury_balance', value: '0' }
    });

    console.log('✅ Platform config created');

    // Seed initial assets
    await seedAssets();

    console.log('\n🎉 Seed completed!');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
