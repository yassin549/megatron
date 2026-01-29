
import { db } from './packages/database/src';

async function listTables() {
    try {
        const tables = await db.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `;
        console.log('Tables in database:', tables);
    } catch (error) {
        console.error('Failed to list tables:', error);
    } finally {
        await db.$disconnect();
    }
}

listTables();
