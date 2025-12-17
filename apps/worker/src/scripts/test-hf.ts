import { analyzeLLM } from '@megatron/lib-integrations';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function main() {
    console.log('Testing Hugging Face API...');

    // logic to force non-simulation mode if possible? 
    // actually analyzeLLM tries API first. We just need to capture the logs.

    // Mock search results
    const mockResults = [
        { title: "Test Article 1", link: "https://example.com/1", snippet: "This is a test snippet." },
        { title: "Test Article 2", link: "https://example.com/2", snippet: "Another test snippet." }
    ];

    try {
        const result = await analyzeLLM(mockResults);
        console.log('Result:', result);
    } catch (e) {
        console.error('Test Failed:', e);
    }
}

main();
