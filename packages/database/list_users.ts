
import { db } from './src/client';

async function main() {
    console.log('Fetching all users...');
    const users = await db.user.findMany({
        select: {
            id: true,
            email: true
        }
    });
    console.log('TOTAL_USERS_COUNT:' + users.length);
    console.log('USERS_LIST_START');
    console.log(JSON.stringify(users, null, 2));
    console.log('USERS_LIST_END');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
