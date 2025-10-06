import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ethers } from "ethers";
import crypto from 'crypto';

// Import TronWeb dynamically to avoid SSR issues
const TronWeb = require('tronweb');

// Generate REAL TRON addresses using TronWeb
function generateTronAddress(userId: string): { address: string; privateKey: string } {
  try {
    // Create deterministic seed from user ID and master key
    const masterKey = process.env.TRON_PRIVATE_KEY;
    if (!masterKey) {
      throw new Error("TRON_PRIVATE_KEY not configured");
    }

    // Create deterministic private key for this user
    const seed = `TRON-${userId}-${masterKey}`;
    const hash = crypto.createHash('sha256').update(seed).digest('hex');
    
    // Ensure the private key is valid (32 bytes)
    const privateKey = hash;
    
    // Generate real TRON address from private key
    const tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io',
    });
    
    // Create account from private key
    const account = tronWeb.address.fromPrivateKey(privateKey);
    
    return { 
      address: account, 
      privateKey: privateKey 
    };
  } catch (error) {
    console.error('Error generating TRON address:', error);
    throw new Error('Failed to generate TRON address');
  }
}

// Generate REAL Arbitrum addresses using ethers
function generateArbitrumAddress(userId: string): { address: string; privateKey: string } {
  try {
    // Create deterministic seed from user ID and master key
    const masterKey = process.env.ARBITRUM_PRIVATE_KEY;
    if (!masterKey) {
      throw new Error("ARBITRUM_PRIVATE_KEY not configured");
    }

    // Create deterministic private key for this user
    const seed = `ARBITRUM-${userId}-${masterKey}`;
    const hash = crypto.createHash('sha256').update(seed).digest('hex');
    
    // Ensure the private key is valid (32 bytes with 0x prefix)
    const privateKey = '0x' + hash;
    
    // Generate real Ethereum/Arbitrum address from private key
    const wallet = new ethers.Wallet(privateKey);
    
    return { 
      address: wallet.address, 
      privateKey: privateKey 
    };
  } catch (error) {
    console.error('Error generating Arbitrum address:', error);
    throw new Error('Failed to generate Arbitrum address');
  }
}

function getNetworkInfo(network: string) {
  switch (network.toUpperCase()) {
    case 'TRON':
      return {
        name: 'TRON',
        symbol: 'USDT (TRC20)',
        contractAddress: process.env.NEXT_PUBLIC_USDT_TRC20_ADDRESS,
        hotWallet: process.env.NEXT_PUBLIC_HOT_WALLET_TRC20_ADDRESS,
      };
    case 'ARBITRUM':
      return {
        name: 'Arbitrum',
        symbol: 'USDT (Arbitrum)',
        contractAddress: process.env.NEXT_PUBLIC_USDT_ARBITRUM_ADDRESS,
        hotWallet: process.env.NEXT_PUBLIC_HOT_WALLET_ARBITRUM_ADDRESS,
      };
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    // Get network parameter from URL
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network')?.toUpperCase() || 'TRON';
    
    // Validate network
    if (!['TRON', 'ARBITRUM'].includes(network)) {
      return NextResponse.json({ error: "Invalid network. Use TRON or ARBITRUM" }, { status: 400 });
    }
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already has a deposit address for this network
    const { data: existingAddress, error: fetchError } = await admin
      .from("deposit_addresses")
      .select("*")
      .eq("user_id", user.id)
      .eq("network", network)
      .eq("is_active", true)
      .single();

    if (existingAddress && !fetchError) {
      // Return existing address
      const networkInfo = getNetworkInfo(network);
      return NextResponse.json({
        success: true,
        address: existingAddress.address,
        network: network,
        networkName: networkInfo.name,
        symbol: networkInfo.symbol,
        contractAddress: networkInfo.contractAddress,
        hotWallet: networkInfo.hotWallet,
        created_at: existingAddress.created_at,
        balance: existingAddress.balance_usdt,
        totalReceived: existingAddress.total_received
      });
    }

    // Generate new address if none exists
    let addressData;
    if (network === 'TRON') {
      addressData = generateTronAddress(user.id);
    } else if (network === 'ARBITRUM') {
      addressData = generateArbitrumAddress(user.id);
    } else {
      return NextResponse.json({ error: "Unsupported network" }, { status: 400 });
    }

    // Store the new address in database
    const { data: newAddress, error: insertError } = await admin
      .from("deposit_addresses")
      .insert({
        user_id: user.id,
        network: network,
        address: addressData.address,
        private_key: addressData.privateKey, // In production, encrypt this!
        is_active: true,
        balance_usdt: 0,
        total_received: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating deposit address:", insertError);
      return NextResponse.json(
        { error: "Failed to create deposit address" },
        { status: 500 }
      );
    }

    const networkInfo = getNetworkInfo(network);
    
    return NextResponse.json({
      success: true,
      address: newAddress.address,
      network: network,
      networkName: networkInfo.name,
      symbol: networkInfo.symbol,
      contractAddress: networkInfo.contractAddress,
      hotWallet: networkInfo.hotWallet,
      created_at: newAddress.created_at,
      balance: newAddress.balance_usdt,
      totalReceived: newAddress.total_received,
      isNew: true
    });

  } catch (error: any) {
    console.error("Deposit address error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
