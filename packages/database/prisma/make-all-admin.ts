import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAllUsersAdmin() {
    console.log('🔧 Making all users admins...\n');

    try {
        const result = await prisma.user.updateMany({
            data: { isAdmin: true }
        });

        console.log(`✅ Updated ${result.count} users to admin`);

        // Show all users
        const users = await prisma.user.findMany({
            select: { email: true, isAdmin: true }
        });

        console.log('\n📋 Current users:');
        users.forEach(u => console.log(`  ✓ ${u.email} (admin: ${u.isAdmin})`));

        console.log('\n✨ Done! Please refresh your browser and try again.');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

makeAllUsersAdmin()
    .catch((e) => {
        console.error('Failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
