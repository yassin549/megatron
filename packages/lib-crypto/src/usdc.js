"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USDC_ABI = void 0;
exports.sendUsdc = sendUsdc;
exports.getEthBalance = getEthBalance;
exports.getUsdcBalance = getUsdcBalance;
const ethers_1 = require("ethers");
const USDC_ABI = [
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
];
exports.USDC_ABI = USDC_ABI;
/**
 * Send USDC from a derived wallet.
 */
async function sendUsdc(privateKey, toAddress, amountStr, rpcUrl, tokenAddress) {
    const provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
    const contract = new ethers_1.ethers.Contract(tokenAddress, USDC_ABI, wallet);
    // Parse amount (assume strictly formatted or handle decimals?)
    // Usually USDC is 6 decimals. We should probably accept number or string.
    // Let's assume input is human readable string "10.5"
    // Fetch decimals to be safe
    const decimals = await contract.decimals();
    const amountUnits = ethers_1.ethers.parseUnits(amountStr, decimals);
    const tx = await contract.transfer(toAddress, amountUnits);
    await tx.wait(); // Wait for 1 confirmation
    return tx.hash;
}
/**
 * Get ETH balance (for Gas check)
 */
async function getEthBalance(address, rpcUrl) {
    const provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
    return await provider.getBalance(address);
}
/**
 * Get USDC balance
 */
async function getUsdcBalance(address, rpcUrl, tokenAddress) {
    const provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers_1.ethers.Contract(tokenAddress, USDC_ABI, provider);
    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();
    return ethers_1.ethers.formatUnits(balance, decimals);
}
