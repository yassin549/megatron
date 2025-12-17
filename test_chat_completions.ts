// Direct test of the chat/completions endpoint format
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

async function testChatCompletions() {
    console.log('--- Testing Chat Completions Endpoint ---\n');

    // Different URL formats to try
    const urls = [
        'https://router.huggingface.co/v1/chat/completions',
        'https://router.huggingface.co/hf-inference/v1/chat/completions',
        'https://huggingface.co/api/inference-proxy/together/v1/chat/completions',
    ];

    const models = [
        'mistralai/Mistral-7B-Instruct-v0.3',
        'meta-llama/Llama-3.2-1B-Instruct',
        'Qwen/Qwen2.5-72B-Instruct',
    ];

    for (const url of urls) {
        for (const model of models) {
            console.log(`URL: ${url}`);
            console.log(`Model: ${model}`);

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'user', content: 'Say hello in one word.' }
                        ],
                        max_tokens: 10,
                    }),
                });

                console.log(`  Status: ${response.status} ${response.statusText}`);
                const text = await response.text();
                console.log(`  Response:`, text.slice(0, 400));
            } catch (err: any) {
                console.log(`  Exception:`, err.message);
            }
            console.log('');
        }
    }
}

testChatCompletions();
