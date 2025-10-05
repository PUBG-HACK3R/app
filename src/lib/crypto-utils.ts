import crypto from 'crypto';

// Generate deterministic addresses for users
export function generateTronAddress(userId: string, seed?: string): { address: string; privateKey: string } {
  const combinedSeed = `${userId}-TRON-${seed || Date.now()}`;
  const hash = crypto.createHash('sha256').update(combinedSeed).digest('hex');
  
  // Generate TRON-like address (starts with T)
  const address = 'T' + hash.substring(0, 33).toUpperCase();
  const privateKey = crypto.createHash('sha256').update(combinedSeed + 'private').digest('hex');
  
  return { address, privateKey };
}

export function generateArbitrumAddress(userId: string, seed?: string): { address: string; privateKey: string } {
  const combinedSeed = `${userId}-ARBITRUM-${seed || Date.now()}`;
  const hash = crypto.createHash('sha256').update(combinedSeed).digest('hex');
  
  // Generate Ethereum-like address (starts with 0x)
  const address = '0x' + hash.substring(0, 40).toLowerCase();
  const privateKey = crypto.createHash('sha256').update(combinedSeed + 'private').digest('hex');
  
  return { address, privateKey };
}

// Validate addresses
export function isValidTronAddress(address: string): boolean {
  return /^T[A-Za-z0-9]{33}$/.test(address);
}

export function isValidArbitrumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Get network info
export function getNetworkInfo(network: string) {
  switch (network.toUpperCase()) {
    case 'TRON':
      return {
        name: 'TRON',
        symbol: 'USDT (TRC20)',
        contractAddress: process.env.NEXT_PUBLIC_USDT_TRC20_ADDRESS,
        hotWallet: process.env.NEXT_PUBLIC_HOT_WALLET_TRC20_ADDRESS,
        rpcUrl: process.env.TRON_RPC_URL,
        privateKey: process.env.TRON_PRIVATE_KEY,
        confirmations: 1,
        blockTime: 3000 // 3 seconds
      };
    case 'ARBITRUM':
      return {
        name: 'Arbitrum',
        symbol: 'USDT (Arbitrum)',
        contractAddress: process.env.NEXT_PUBLIC_USDT_ARBITRUM_ADDRESS,
        hotWallet: process.env.NEXT_PUBLIC_HOT_WALLET_ARBITRUM_ADDRESS,
        rpcUrl: process.env.ARBITRUM_RPC_URL,
        privateKey: process.env.ARBITRUM_PRIVATE_KEY,
        confirmations: 12,
        blockTime: 250 // 0.25 seconds
      };
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}
