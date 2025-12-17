
import './setup-env'; // Must be first
import { ethers } from 'ethers';
import { deriveAddress } from '@megatron/lib-crypto'; // Assumes available via package
// If package import fails in script, we might need relative path or transpilation
// For now, let's try direct package import or manual derivation if simple.
// deriveAddress logic: BIP32.
// To avoid deep dependency issues in this script, we can implement a simple check or try import.
// Let's rely on standard ethers for RPC checks.

async function main() {
    console.log("=== FINAL PRODUCTION READINESS CHECK ===");

    // 1. ENV VARS
    const rpcUrl = process.env.ARBITRUM_RPC_URL;
    const usdcAddr = process.env.USDC_CONTRACT_ADDRESS;
    const xpub = process.env.PLATFORM_XPUB;
    const mnemonic = process.env.PLATFORM_MNEMONIC;

    console.log("\n[1] Environment Variables:");
    console.log(`- ARBITRUM_RPC_URL: ${rpcUrl ? 'OK' : 'MISSING'}`);
    console.log(`- USDC_CONTRACT_ADDRESS: ${usdcAddr ? 'OK' : 'MISSING'}`);
    console.log(`- PLATFORM_XPUB: ${xpub ? 'OK' : 'MISSING'}`);
    console.log(`- PLATFORM_MNEMONIC: ${mnemonic ? 'OK' : 'MISSING'}`);

    if (!rpcUrl || !usdcAddr || !xpub || !mnemonic) {
        throw new Error("Missing critical environment variables.");
    }

    // 2. RPC CONNECTION
    console.log("\n[2] RPC Connection:");
    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const network = await provider.getNetwork();
        const block = await provider.getBlockNumber();
        console.log(`- Connected to Chain ID: ${network.chainId}`);
        console.log(`- Current Block: ${block}`);
        console.log("- Status: GREEN");
    } catch (e: any) {
        console.error("- Status: RED (Connection Failed)");
        throw e;
    }

    // 3. USDC CONTRACT
    console.log("\n[3] USDC Contract Check:");
    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        // Minimal ABI for check
        const abi = [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)"
        ];
        const contract = new ethers.Contract(usdcAddr, abi, provider);
        const name = await contract.name();
        const symbol = await contract.symbol();
        const decimals = await contract.decimals();

        console.log(`- Name: ${name}`);
        console.log(`- Symbol: ${symbol}`);
        console.log(`- Decimals: ${decimals}`);
        console.log(`- Address: ${usdcAddr}`);

        if (symbol !== 'USDC' && symbol !== 'USDC.e' && symbol !== 'TEST') {
            console.warn("⚠️ WARNING: Symbol is not USDC. Verify if this is intentional (e.g. Testnet).");
        }
        console.log("- Status: GREEN");

    } catch (e: any) {
        console.error(`- Status: RED (Contract Call Failed: ${e.message})`);
        throw e;
    }

    // 4. DEPOSIT ADDRESS GENERATION
    console.log("\n[4] Wallet Configuration:");
    try {
        // Simple HD Node check using ethers if lib-crypto fails
        const root = ethers.HDNodeWallet.fromExtendedKey(xpub);
        const child = root.derivePath("0"); // Checking derivation
        console.log(`- XPUB Valid. Root Address: ${root.address} (Not used directly)`);
        console.log(`- Derived Index 0 Address: ${child.address}`);
        console.log("- Status: GREEN");
    } catch (e: any) {
        console.error(`- Status: RED (XPUB Invalid: ${e.message})`);
        throw e;
    }

    console.log("\n=== SYSTEM ONLINE AND READY FOR DEPOSITS ===");
}

main().catch(e => {
    console.error("\n!!! SYSTEM NOT READY !!!");
    console.error(e);
    process.exit(1);
});
