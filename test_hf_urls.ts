// Test the new router.huggingface.co endpoint directly
import fs from 'fs';
import path from 'path';

// Manual .env loading
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value && !key.startsWith('#')) {
            process.env[key.trim()] = value.trim();
        }
    });
}

const apiKey = process.env.HUGGINGFACE_API_KEY;
if (!apiKey) {
    console.error('HUGGINGFACE_API_KEY not set');
    process.exit(1);
}

const URLS_TO_TEST = [
    'https://router.huggingface.co/hf-inference/models/gpt2',
    'https://router.huggingface.co/models/gpt2',
    'https://api-inference.huggingface.co/models/gpt2',
    // Try with v1 prefix (some APIs use this)
    'https://router.huggingface.co/v1/models/gpt2',
    // Try the inference endpoints pattern
    'https://api.huggingface.co/models/gpt2',
];

async function testUrl(url: string) {
    console.log(`Testing: ${url}`);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: 'Hello',
            }),
        });
        console.log(`  Status: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.log(`  Response:`, text.slice(0, 300));
    } catch (err: any) {
        console.log(`  Exception:`, err.message);
    }
    console.log('');
}

async function main() {
    console.log('--- HuggingFace Router URL Test ---\n');
    for (const url of URLS_TO_TEST) {
        await testUrl(url);
    }
}

main();
