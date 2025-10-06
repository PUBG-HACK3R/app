import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import crypto from 'crypto';

// Generate unique sub-addresses for each user
function generateTronAddress(userId: string): { address: string; privateKey: string } {
  // Create deterministic seed from user ID for TRON
  const seed = `TRON-${userId}-${process.env.TRON_PRIVATE_KEY?.slice(-8)}`;
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  
  // Generate TRON-style address (T + 33 chars)
  const addressSuffix = hash.substring(0, 32);
  const address = 'T' + addressSuffix.toUpperCase();
  
  // Generate private key for this address (derived from main key + user)
  const privateKeySeed = `${process.env.TRON_PRIVATE_KEY}-${userId}`;
  const privateKey = crypto.createHash('sha256').update(privateKeySeed).digest('hex');
  
  return { address, privateKey };
}

function generateArbitrumAddress(userId: string): { address: string; privateKey: string } {
  // Create deterministic seed from user ID for Arbitrum
  const seed = `ARBITRUM-${userId}-${process.env.ARBITRUM_PRIVATE_KEY?.slice(-8)}`;
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  
  // Generate Ethereum-style address (0x + 40 chars)
  const address = '0x' + hash.substring(0, 40).toLowerCase();
  
  // Generate private key for this address (derived from main key + user)
  const privateKeySeed = `${process.env.ARBITRUM_PRIVATE_KEY}-${userId}`;
  const privateKey = crypto.createHash('sha256').update(privateKeySeed).digest('hex');
  
  return { address, privateKey };
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
