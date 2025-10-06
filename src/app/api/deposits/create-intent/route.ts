import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { network, amount_usdt } = body;

    // Validate input
    if (!network || !['TRC20', 'BEP20'].includes(network)) {
      return NextResponse.json({ 
        error: "Invalid network. Must be TRC20 or BEP20" 
      }, { status: 400 });
    }

    if (!amount_usdt || amount_usdt <= 0) {
      return NextResponse.json({ 
        error: "Invalid amount. Must be greater than 0" 
      }, { status: 400 });
    }

    // Get main wallet for this network
    const { data: mainWallet, error: walletError } = await admin
      .from('main_wallets')
      .select('*')
      .eq('network', network)
      .eq('is_active', true)
      .single();

    if (walletError || !mainWallet) {
      return NextResponse.json({ 
        error: `Main wallet not configured for ${network}` 
      }, { status: 500 });
    }

    // Check if user has pending deposit intent for this network
    const { data: existingIntent } = await admin
      .from('deposit_intents')
      .select('*')
      .eq('user_id', user.id)
      .eq('network', network)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingIntent) {
      return NextResponse.json({
        success: true,
        deposit_intent: {
          id: existingIntent.id,
          reference_code: existingIntent.reference_code,
          amount_usdt: existingIntent.amount_usdt,
          network: existingIntent.network,
          main_wallet_address: existingIntent.main_wallet_address,
          expires_at: existingIntent.expires_at,
          status: existingIntent.status,
          created_at: existingIntent.created_at
        },
        message: "Using existing pending deposit intent"
      });
    }

    // Generate unique reference code
    const { data: referenceCode, error: codeError } = await admin
      .rpc('generate_deposit_reference_code');

    if (codeError || !referenceCode) {
      return NextResponse.json({ 
        error: "Failed to generate reference code" 
      }, { status: 500 });
    }

    // Create new deposit intent
    const { data: newIntent, error: insertError } = await admin
      .from('deposit_intents')
      .insert({
        user_id: user.id,
        network: network,
        amount_usdt: amount_usdt,
        reference_code: referenceCode,
        main_wallet_address: mainWallet.address,
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating deposit intent:", insertError);
      return NextResponse.json({ 
        error: "Failed to create deposit intent" 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deposit_intent: {
        id: newIntent.id,
        reference_code: newIntent.reference_code,
        amount_usdt: newIntent.amount_usdt,
        network: newIntent.network,
        main_wallet_address: newIntent.main_wallet_address,
        expires_at: newIntent.expires_at,
        status: newIntent.status,
        created_at: newIntent.created_at
      },
      instructions: {
        TRC20: network === 'TRC20' ? {
          wallet_address: mainWallet.address,
          contract_address: mainWallet.contract_address,
          reference_code: newIntent.reference_code,
          amount: amount_usdt,
          note: "Send exactly the specified amount to ensure automatic detection"
        } : undefined,
        BEP20: network === 'BEP20' ? {
          wallet_address: mainWallet.address,
          contract_address: mainWallet.contract_address,
          reference_code: newIntent.reference_code,
          amount: amount_usdt,
          note: "Send exactly the specified amount to ensure automatic detection"
        } : undefined
      }
    });

  } catch (error: any) {
    console.error("Create deposit intent error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
