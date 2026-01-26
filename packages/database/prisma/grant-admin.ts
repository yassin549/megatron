import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function grantAdminAccess() {
    console.log('🔧 Granting admin access...\n');

    try {
        // Get the email from command line args or use default
        const email = process.argv[2] || 'admin@megatron.dev';

        console.log(`Looking for user: ${email}`);

        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, isAdmin: true }
        });

        if (!user) {
            console.error(`❌ User not found with email: ${email}`);
            console.log('\n📋 Available users:');
            const allUsers = await prisma.user.findMany({
                select: { email: true, isAdmin: true }
            });
            allUsers.forEach(u => console.log(`  - ${u.email} (admin: ${u.isAdmin})`));
            process.exit(1);
        }

        if (user.isAdmin) {
            console.log(`✅ User ${email} already has admin access`);
        } else {
            await prisma.user.update({
                where: { email },
                data: { isAdmin: true }
            });
            console.log(`✅ Granted admin access to ${email}`);
        }

        console.log('\n✨ Done! You can now create assets through the admin dashboard.');
        console.log('⚠️  Please log out and log back in for changes to take effect.');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

grantAdminAccess()
    .catch((e) => {
        console.error('Failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
