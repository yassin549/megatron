import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function grantAdmin() {
    const email = 'khoualdiyassin26@gmail.com';
    const user = await prisma.user.update({
        where: { email },
        data: { isAdmin: true }
    });
    console.log(`✅ Admin status granted to: ${user.email}`);
}

grantAdmin()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
