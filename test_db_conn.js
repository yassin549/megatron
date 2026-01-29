
const { Client } = require('pg');

async function testConn() {
    const connectionString = 'postgresql://neondb_owner:npg_7HXxQztwRU1u@ep-patient-dream-adyej6lf-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('Connected successfully to PostgreSQL');
        const res = await client.query('SELECT COUNT(*) FROM "User"');
        console.log('User count:', res.rows[0].count);
        await client.end();
    } catch (err) {
        console.error('Connection error:', err);
    }
}

testConn();
