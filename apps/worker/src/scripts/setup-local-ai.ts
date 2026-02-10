import { LocalSentinel } from '../../../../packages/lib-integrations/src/local-sentinel';
import * as fs from 'fs';
import * as path from 'path';

// Force immediate console output
// const originalLog = console.log;
// console.log = (...args) => originalLog(`[SETUP]`, ...args);

async function main() {
    console.log('----------------------------------------');
    console.log('   MEGATRON LOCAL AI SETUP ASSISTANT    ');
    console.log('----------------------------------------');

    // Determine mode from args or env
    const mode = (process.env.LOCAL_MODEL_SIZE || 'tiny') as any;
    console.log(`Target Mode: ${mode.toUpperCase()}`);
    console.log(`(To change, run: LOCAL_MODEL_SIZE=standard pnpm run setup-ai)`);
    console.log('');

    const cacheDir = path.resolve(process.cwd(), '.cache');
    if (!fs.existsSync(cacheDir)) {
        console.log(`Creating cache directory at: ${cacheDir}`);
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    try {
        console.log('1. Initializing LocalSentinel...');
        await LocalSentinel.init(mode);

        console.log('2. Download & Cache Complete!');
        console.log('   Models are stored in:', cacheDir);
        console.log('   You are ready to run the worker in offline AI mode.');

    } catch (error) {
        console.error('Setup Failed:', error);
        process.exit(1);
    }
}

main();
