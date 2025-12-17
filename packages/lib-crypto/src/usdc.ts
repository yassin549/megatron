import { ethers } from 'ethers';

const USDC_ABI = [
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
];

/**
 * Send USDC from a derived wallet.
 */
export async function sendUsdc(
    privateKey: string,
    toAddress: string,
    amountStr: string,
    rpcUrl: string,
    tokenAddress: string
): Promise<string> {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(tokenAddress, USDC_ABI, wallet);

    // Parse amount (assume strictly formatted or handle decimals?)
    // Usually USDC is 6 decimals. We should probably accept number or string.
    // Let's assume input is human readable string "10.5"
    // Fetch decimals to be safe
    const decimals = await contract.decimals();
    const amountUnits = ethers.parseUnits(amountStr, decimals);

    const tx = await contract.transfer(toAddress, amountUnits);
    await tx.wait(); // Wait for 1 confirmation
    return tx.hash;
}

/**
 * Send ETH (Native Currency)
 */
export async function sendEth(
    privateKey: string,
    toAddress: string,
    amountEth: string,
    rpcUrl: string
): Promise<string> {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const tx = await wallet.sendTransaction({
        to: toAddress,
        value: ethers.parseEther(amountEth)
    });

    await tx.wait();
    return tx.hash;
}

/**
 * Get ETH balance (for Gas check)
 */
export async function getEthBalance(address: string, rpcUrl: string): Promise<bigint> {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    return await provider.getBalance(address);
}

/**
 * Get USDC balance
 */
export async function getUsdcBalance(address: string, rpcUrl: string, tokenAddress: string): Promise<string> {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(tokenAddress, USDC_ABI, provider);
    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();
    return ethers.formatUnits(balance, decimals);
}

export { USDC_ABI };
