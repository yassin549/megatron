/**
 * Platform Wallet Setup Script
 * 
 * Run with: npx tsx apps/worker/src/scripts/generate-platform-wallet.ts
 * 
 * This generates:
 * 1. A new mnemonic (seed phrase) - KEEP THIS SECRET, store securely
 * 2. The XPUB derived from it - Safe to use in API server
 * 3. The first 3 addresses for verification
 */

import { ethers } from 'ethers';

console.log('='.repeat(70));
console.log('MEGATRON PLATFORM WALLET GENERATOR');
console.log('='.repeat(70));
console.log('');

// Generate a new random mnemonic (24 words for extra security)
const mnemonic = ethers.Mnemonic.fromEntropy(ethers.randomBytes(32));
const phrase = mnemonic.phrase;

console.log('⚠️  CRITICAL: Store this mnemonic in a SECURE location!');
console.log('⚠️  Anyone with this phrase can steal all platform funds!');
console.log('');
console.log('PLATFORM_MNEMONIC:');
console.log('-'.repeat(70));
console.log(phrase);
console.log('-'.repeat(70));
console.log('');

// Derive the XPUB at the standard path m/44'/60'/0'/0
const node = ethers.HDNodeWallet.fromPhrase(phrase, undefined, "m/44'/60'/0'/0");
const xpub = node.neuter().extendedKey;

console.log('PLATFORM_XPUB (safe for API server):');
console.log('-'.repeat(70));
console.log(xpub);
console.log('-'.repeat(70));
console.log('');

// Show first 3 addresses for verification
console.log('First 3 deposit addresses (for verification):');
console.log('  Index 0 (Reserved for Hot Wallet):', node.deriveChild(0).address);
console.log('  Index 1 (First user deposit address):', node.deriveChild(1).address);
console.log('  Index 2 (Second user deposit address):', node.deriveChild(2).address);
console.log('');

console.log('='.repeat(70));
console.log('Add these to your .env file:');
console.log('='.repeat(70));
console.log('');
console.log(`PLATFORM_MNEMONIC="${phrase}"`);
console.log(`PLATFORM_XPUB=${xpub}`);
console.log('');
console.log('⚠️  NEVER commit the mnemonic to git!');
console.log('⚠️  NEVER share the mnemonic with anyone!');
console.log('='.repeat(70));
