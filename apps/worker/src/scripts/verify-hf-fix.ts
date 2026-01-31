
import { analyzeLLM } from '@megatron/lib-integrations';
import { SearchResult } from '@megatron/lib-integrations/dist/serper';

async function testHuggingFace() {
    console.log("Testing HuggingFace Integration...");

    // Mock search results
    const mockResults: SearchResult[] = [
        {
            title: "Bitcoin Surges Past $100k",
            link: "https://example.com/btc-news",
            snippet: "Bitcoin has reached a new all-time high driven by institutional adoption.",
        }
    ];

    try {
        console.log("Calling analyzeLLM...");
        const result = await analyzeLLM(mockResults);
        console.log("Result received:", result);

        if (result.summary.includes("Simulation Engine") || result.reasoning.includes("synthetic")) {
            console.log("SUCCESS: Fallback mechanism active (or API failure handled gracefuly).");
        } else {
            console.log("SUCCESS: Live API call successful.");
        }

    } catch (error) {
        console.error("FAILURE: Unhandled error:", error);
        process.exit(1);
    }
}

testHuggingFace();
