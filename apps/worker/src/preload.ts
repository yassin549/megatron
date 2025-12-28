// Preload script - must be imported FIRST to load env vars
// before any other module reads process.env
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Try multiple paths to find .env file
const possiblePaths = [
    // When running from monorepo root with pnpm dev
    path.resolve(process.cwd(), '.env'),
    // When running from apps/worker directory
    path.resolve(process.cwd(), '../../.env'),
];

let envLoaded = false;
for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
        console.log('[ENV] Loading from:', envPath);
        dotenv.config({ path: envPath });
        envLoaded = true;
        break;
    }
}

if (!envLoaded) {
    console.warn('[ENV] No .env file found; relying on system environment variables.');
}

console.log('[ENV] Initialization complete');
console.log('[ENV] ARBITRUM_RPC_URL:', process.env.ARBITRUM_RPC_URL ? 'SET' : 'NOT SET');
console.log('[ENV] UPSTASH_REDIS_URL:', process.env.UPSTASH_REDIS_URL ? 'SET' : 'NOT SET');
