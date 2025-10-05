// Check what type of private key you have
// Run this with: node check-private-key-type.js

const { ethers } = require('ethers');

// Your private key from Trust Wallet
const privateKey = "YOUR_PRIVATE_KEY_HERE"; // Replace with your actual key

try {
    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKey);
    
    console.log("🔑 Private Key Analysis:");
    console.log("Ethereum/ARB Address:", wallet.address);
    
    // Check if it's a valid Ethereum-style address
    if (wallet.address.startsWith('0x')) {
        console.log("✅ This is an ETHEREUM/ARBITRUM compatible key");
        console.log("❌ This is NOT a TRON key");
        console.log("");
        console.log("🚨 PROBLEM: Your hot wallet address in .env is TRON format:");
        console.log("HOT_WALLET_ADDRESS=TTCNv3AqHjiTejC4snW6rH72kH3gtRVXCE");
        console.log("");
        console.log("But your private key generates ETH address:", wallet.address);
        console.log("");
        console.log("❌ MISMATCH! Your system won't work!");
    }
    
} catch (error) {
    console.log("❌ Invalid private key format");
    console.log("Error:", error.message);
}

// Instructions
console.log("\n📋 INSTRUCTIONS:");
console.log("1. Replace YOUR_PRIVATE_KEY_HERE with your actual private key");
console.log("2. Run: node check-private-key-type.js");
console.log("3. This will tell you if your key is TRON or ETH compatible");
