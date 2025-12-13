import { deriveAddress, derivePrivateKey, isValidAddress, getXpubFromMnemonic } from '@megatron/lib-crypto';
import { ethers } from 'ethers';

const TEST_MNEMONIC = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

async function main() {
    console.log("--- Crypto Verification Start ---");

    try {
        console.log("Generating XPUB from mnemonic...");
        const TEST_XPUB = getXpubFromMnemonic(TEST_MNEMONIC);
        console.log(`Generated XPUB: ${TEST_XPUB.slice(0, 20)}...`);

        const idx = 0;
        console.log(`Deriving address for index ${idx}...`);
        const addrIndex0 = deriveAddress(TEST_XPUB, idx);
        console.log(`Address: ${addrIndex0}`);

        console.log(`Deriving private key for index ${idx}...`);
        const pkIndex0 = derivePrivateKey(TEST_MNEMONIC, idx);
        console.log(`PrivKey: ${pkIndex0.slice(0, 6)}...`);

        console.log("Verifying match...");
        const wallet = new ethers.Wallet(pkIndex0);
        console.log(`Wallet Address: ${wallet.address}`);

        if (wallet.address !== addrIndex0) {
            console.error(`MISMATCH: ${addrIndex0} vs ${wallet.address}`);
            process.exit(1);
        } else {
            console.log("✅ MATCH!");
        }

        if (isValidAddress(wallet.address)) {
            console.log("✅ Valid Address Check Passed");
        } else {
            console.error("❌ Valid Address Check Failed");
            process.exit(1);
        }

    } catch (e) {
        console.error("CRASH:", e);
        process.exit(1);
    }
}

main();
