import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdmins() {
    const admins = await prisma.user.findMany({
        where: { isAdmin: true },
        select: { id: true, email: true, isAdmin: true }
    });
    console.log('Admin Users:', JSON.stringify(admins, null, 2));

    const allUsers = await prisma.user.findMany({
        select: { id: true, email: true, isAdmin: true }
    });
    console.log('All Users:', JSON.stringify(allUsers, null, 2));
}

checkAdmins()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
