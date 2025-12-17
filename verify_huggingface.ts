import { analyzeLLM } from './packages/lib-integrations/src/huggingface';
import type { SearchResult } from './packages/lib-integrations/src/serper';
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

// Debug: Print the env vars
console.log('[DEBUG] HUGGINGFACE_API_KEY:', process.env.HUGGINGFACE_API_KEY ? 'SET' : 'NOT SET');
console.log('[DEBUG] HUGGINGFACE_API_URL:', process.env.HUGGINGFACE_API_URL || 'NOT SET (will use default)');

const mockSearchResults: SearchResult[] = [
    {
        title: "Bitcoin Surges Past $100,000",
        snippet: "Bitcoin hit a new all-time high of $100,000 on Monday, driven by institutional adoption.",
        link: "https://example.com/btc-news"
    }
];

async function main() {
    console.log("Starting Hugging Face Verification...");
    if (!process.env.HUGGINGFACE_API_KEY) {
        console.error("Error: HUGGINGFACE_API_KEY is missing in .env");
        process.exit(1);
    }

    try {
        console.log("Calling analyzeLLM...");
        const result = await analyzeLLM(mockSearchResults);
        console.log("\nAnalysis Result:\n", JSON.stringify(result, null, 2));

        // Basic validation
        if (result.summary && result.reasoning) {
            console.log("\nSUCCESS: LLM returned summary and reasoning.");
        } else {
            console.error("\nFAILURE: LLM response missing required fields.");
        }

        // Check if it was fallback
        if (result.summary.includes("Simulation Engine") || result.reasoning.includes("simulation") || result.summary.includes("Bullish momentum") || result.summary.includes("Bearish pressure") || result.summary.includes("Improved sentiment")) {
            console.warn("\nWARNING: It seems the fallback simulation engine was used. This might mean the API returned 410/404/503 or failed.");
        } else {
            console.log("\nLIVE LLM analysis confirmed!");
        }

    } catch (error) {
        console.error("\nVerification Failed:", error);
    }
}

main();
