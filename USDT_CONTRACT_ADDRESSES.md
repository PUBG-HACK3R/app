# USDT Contract Addresses for WeEarn

## Official USDT Contract Addresses

### TRC20 (TRON Network)
- **Contract Address**: `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`
- **Network**: TRON Mainnet
- **Decimals**: 6
- **Explorer**: https://tronscan.org/#/token20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t

### Arbitrum Network
- **Contract Address**: `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9`
- **Network**: Arbitrum One (Mainnet)
- **Chain ID**: 42161
- **Decimals**: 6
- **Explorer**: https://arbiscan.io/token/0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9

## Environment Variable Configuration

### For TRC20 (TRON):
```env
TRON_PRIVATE_KEY=e177a6b4a6d706f69d55182bff97754f101e38988787952960e1094c9d1d8650
TRON_RPC_URL=https://api.trongrid.io
USDT_TRC20_ADDRESS=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
HOT_WALLET_TRC20_ADDRESS=TXpa1Vc35nqE8hEdRBziSezt5n3pmNShaX
NEXT_PUBLIC_USDT_TRC20_ADDRESS=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
NEXT_PUBLIC_HOT_WALLET_TRC20_ADDRESS=TXpa1Vc35nqE8hEdRBziSezt5n3pmNShaX
```

### For Arbitrum:
```env
ARBITRUM_PRIVATE_KEY=b5709419252aee7116f8afeb822aa191bed71ad040223271919a31909b9b2775
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
USDT_ARBITRUM_ADDRESS=0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9
HOT_WALLET_ARBITRUM_ADDRESS=0x74061Fd46584513CB94d841dEb377F055fE7252C
NEXT_PUBLIC_USDT_ARBITRUM_ADDRESS=0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9
NEXT_PUBLIC_HOT_WALLET_ARBITRUM_ADDRESS=0x74061Fd46584513CB94d841dEb377F055fE7252C
```

## Gas Requirements

### TRC20 (TRON):
- **Gas Token**: TRX
- **Typical Fee**: ~1-3 TRX per transaction
- **Energy/Bandwidth**: May require energy for contract calls

### Arbitrum:
- **Gas Token**: ETH
- **Typical Fee**: ~$0.10-$1.00 per transaction
- **Gas Limit**: ~50,000-100,000 for USDT transfers

## Important Notes

1. **Always verify contract addresses** before using in production
2. **Test with small amounts** first on testnets if available
3. **Keep hot wallet private keys secure** and never expose them
4. **Fund hot wallets** with native tokens (TRX/ETH) for gas fees
5. **Monitor transactions** for successful processing
6. **Use official RPC endpoints** or trusted providers like Infura/Alchemy

## Testnet Addresses (for development)

### TRON Shasta Testnet:
- **USDT TRC20**: `TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs` (example - verify current)
- **RPC**: `https://api.shasta.trongrid.io`

### Arbitrum Goerli Testnet (deprecated):
- Use Arbitrum Sepolia for testing instead
- **RPC**: `https://sepolia-rollup.arbitrum.io/rpc`
