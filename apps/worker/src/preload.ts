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
    // Fallback absolute paths
    'C:\\Users\\khoua\\OneDrive\\Desktop\\megatron\\.env',
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
    console.warn('[ENV] WARNING: Could not find .env file in any of:', possiblePaths);
}

console.log('[ENV] Environment loaded');
console.log('[ENV] ARBITRUM_RPC_URL:', process.env.ARBITRUM_RPC_URL ? 'SET' : 'NOT SET');
console.log('[ENV] USDC_CONTRACT_ADDRESS:', process.env.USDC_CONTRACT_ADDRESS ? 'SET' : 'NOT SET');
console.log('[ENV] PLATFORM_MNEMONIC:', process.env.PLATFORM_MNEMONIC ? 'SET' : 'NOT SET');
console.log('[ENV] NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET');
