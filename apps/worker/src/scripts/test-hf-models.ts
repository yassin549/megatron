
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

const URL_PATTERNS = [
    'https://router.huggingface.co/hf-inference/models/gpt2',
    'https://router.huggingface.co/hf-inference/models/google/flan-t5-base'
];

// No specific model appended, full URL in list
const MODEL = '';

async function testUrl(fullUrl: string) {
    console.log(`\nTesting URL: ${fullUrl}`);
    try {
        const res = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: "Test.",
                parameters: { max_new_tokens: 10 },
            }),
        });

        console.log(`Status: ${res.status} ${res.statusText}`);
        try {
            const text = await res.text();
            console.log('Response:', text.substring(0, 200));
        } catch { }
    } catch (err: any) {
        console.log(`Error: ${err.message}`);
    }
}

async function main() {
    if (!HUGGINGFACE_API_KEY) {
        console.error('No HUGGINGFACE_API_KEY found');
        return;
    }

    for (const url of URL_PATTERNS) {
        await testUrl(url);
    }
}

main();
