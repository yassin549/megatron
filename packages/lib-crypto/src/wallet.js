"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveAddress = deriveAddress;
exports.derivePrivateKey = derivePrivateKey;
exports.isValidAddress = isValidAddress;
exports.getXpubFromMnemonic = getXpubFromMnemonic;
const ethers_1 = require("ethers");
// Derivation path: m / purpose' / coin_type' / account' / change / address_index
// Standard Ethereum: m/44'/60'/0'/0/{index}
const DERIVATION_PATH_BASE = "m/44'/60'/0'/0";
/**
 * Derive a public address from an XPUB (Extended Public Key) at a specific index.
 * Used by the API to generate deposit addresses without knowing the private key.
 *
 * @param xpub The extended public key (xpub...)
 * @param index The address index (0, 1, 2...)
 * @returns The Ethereum address (0x...)
 */
function deriveAddress(xpub, index) {
    const node = ethers_1.ethers.HDNodeWallet.fromExtendedKey(xpub);
    const child = node.deriveChild(index);
    return child.address;
}
/**
 * Derive a private key from a Mnemonic at a specific index.
 * Used by the Worker to sign transactions.
 *
 * @param mnemonic The seed phrase
 * @param index The address index (0, 1, 2...)
 * @returns The private key (0x...)
 */
function derivePrivateKey(mnemonic, index) {
    const wallet = ethers_1.ethers.HDNodeWallet.fromPhrase(mnemonic);
    // wallet fromPhrase is at "m/44'/60'/0'/0/0" by default? 
    // ethers v6 docs say: default path is "m/44'/60'/0'/0/0"
    // We want to access "m/44'/60'/0'/0/{index}"
    // So we should instantiate master node then derive.
    // Actually ethers.HDNodeWallet.fromPhrase(mnemonic, password, path) 
    // If path is not specified, it defaults to standard.
    // However, if we want to derive arbitrary index, we should probably start from root or account.
    // Let's rely on deriving from the specific path.
    const path = `${DERIVATION_PATH_BASE}/${index}`;
    const child = ethers_1.ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, path); // Derive directly
    return child.privateKey;
}
function isValidAddress(address) {
    return ethers_1.ethers.isAddress(address);
}
/**
 * Helper to get XPUB from Mnemonic (for Platform Setup)
 */
function getXpubFromMnemonic(mnemonic) {
    // We want the XPUB at the account level m/44'/60'/0'/0
    // So that we can derive /0, /1, /2 from it (which corresponds to "change" 0 and indices)
    // Wait, the standard is m / 44' / 60' / 0' / 0 / index
    // So the xpub should be at m / 44' / 60' / 0' / 0
    const node = ethers_1.ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0");
    return node.neuter().extendedKey;
}
