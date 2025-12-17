// Quick direct HuggingFace API test
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

const MODELS_TO_TEST = [
    'google/flan-t5-small',
    'facebook/bart-large-cnn',
    'distilbert-base-uncased-finetuned-sst-2-english',
    'gpt2',
];

async function testModel(modelId: string) {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
        console.error('HUGGINGFACE_API_KEY not set');
        return;
    }

    const url = `https://api-inference.huggingface.co/models/${modelId}`;
    console.log(`Testing: ${modelId}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: 'Hello, how are you?',
            }),
        });
        console.log(`  Status: ${response.status} ${response.statusText}`);
        if (response.ok) {
            const data = await response.json();
            console.log(`  Response:`, JSON.stringify(data).slice(0, 200));
        } else {
            const text = await response.text();
            console.log(`  Error:`, text.slice(0, 300));
        }
    } catch (err: any) {
        console.log(`  Exception:`, err.message);
    }
}

async function main() {
    console.log('--- HuggingFace API Direct Test ---\n');
    for (const model of MODELS_TO_TEST) {
        await testModel(model);
        console.log('');
    }
}

main();
