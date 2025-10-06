import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyAdminAuth } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin endpoint to simulate deposits for testing
export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    const body = await request.json();
    
    const { userId, network, amount } = body;
    
    if (!userId || !network || !amount) {
      return NextResponse.json({ 
        error: "Missing required fields: userId, network, amount" 
      }, { status: 400 });
    }

    console.log(`🧪 Simulating ${amount} USDT deposit for user ${userId} on ${network}`);

    // Get or create deposit address for this user and network
    let { data: depositAddress, error: fetchError } = await admin
      .from("deposit_addresses")
      .select("*")
      .eq("user_id", userId)
      .eq("network", network.toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching deposit address:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch deposit address' 
      }, { status: 500 });
    }

    // If no deposit address exists, create one
    if (!depositAddress) {
      // Generate address for this user
      const addressData = network.toUpperCase() === 'TRON' 
        ? generateTronAddress(userId)
        : generateArbitrumAddress(userId);

      const { data: newAddress, error: createError } = await admin
        .from("deposit_addresses")
        .insert({
          user_id: userId,
          network: network.toUpperCase(),
          address: addressData.address,
          private_key: addressData.privateKey,
          is_active: true,
          balance_usdt: 0,
          total_received: 0
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating deposit address:', createError);
        return NextResponse.json({ 
          error: 'Failed to create deposit address' 
        }, { status: 500 });
      }

      depositAddress = newAddress;
    }

    // Simulate deposit by updating the address balance
    const currentBalance = Number(depositAddress.balance_usdt || 0);
    const newBalance = currentBalance + Number(amount);

    const { error: updateError } = await admin
      .from("deposit_addresses")
      .update({
        balance_usdt: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq("id", depositAddress.id);

    if (updateError) {
      console.error('Error updating deposit address balance:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update deposit address balance' 
      }, { status: 500 });
    }

    console.log(`✅ Simulated deposit: ${amount} USDT added to ${depositAddress.address}`);
    console.log(`💰 New balance: ${newBalance} USDT`);

    return NextResponse.json({
      success: true,
      message: `Successfully simulated ${amount} USDT deposit`,
      deposit_address: depositAddress.address,
      network: network.toUpperCase(),
      amount_deposited: Number(amount),
      new_balance: newBalance,
      user_id: userId
    });

  } catch (error: any) {
    console.error('Simulate deposit error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

// Helper functions for address generation (same as in deposit-address route)
function generateTronAddress(userId: string): { address: string; privateKey: string } {
  const crypto = require('crypto');
  const seed = `TRON-${userId}-${process.env.TRON_PRIVATE_KEY?.slice(-8)}`;
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  const addressSuffix = hash.substring(0, 32);
  const address = 'T' + addressSuffix.toUpperCase();
  const privateKeySeed = `${process.env.TRON_PRIVATE_KEY}-${userId}`;
  const privateKey = crypto.createHash('sha256').update(privateKeySeed).digest('hex');
  return { address, privateKey };
}

function generateArbitrumAddress(userId: string): { address: string; privateKey: string } {
  const crypto = require('crypto');
  const seed = `ARBITRUM-${userId}-${process.env.ARBITRUM_PRIVATE_KEY?.slice(-8)}`;
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  const address = '0x' + hash.substring(0, 40).toLowerCase();
  const privateKeySeed = `${process.env.ARBITRUM_PRIVATE_KEY}-${userId}`;
  const privateKey = crypto.createHash('sha256').update(privateKeySeed).digest('hex');
  return { address, privateKey };
}
