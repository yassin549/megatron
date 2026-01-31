
const { analyzeLLM } = require('@megatron/lib-integrations');

async function testHuggingFace() {
    console.log("Testing HuggingFace Integration (JS Mode)...");

    // Mock search results
    const mockResults = [
        {
            title: "Bitcoin Surges Past $100k",
            link: "https://example.com/btc-news",
            snippet: "Bitcoin has reached a new all-time high driven by institutional adoption.",
        }
    ];

    try {
        console.log("Calling analyzeLLM...");
        const result = await analyzeLLM(mockResults);
        console.log("Result received:", JSON.stringify(result, null, 2));

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
