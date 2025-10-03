import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Get network parameter from URL
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network') || 'trc20';
    const testMode = searchParams.get('test') === 'true';
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const debugInfo: any = {
      user_id: user.id,
      network: network,
      timestamp: new Date().toISOString()
    };

    // Test 1: Check if user_deposit_addresses table exists and its structure
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .from('user_deposit_addresses')
        .select('*')
        .limit(1);
      
      debugInfo.table_exists = !tableError;
      debugInfo.table_error = tableError?.message;
    } catch (err) {
      debugInfo.table_exists = false;
      debugInfo.table_error = err instanceof Error ? err.message : 'Unknown error';
    }

    // Test 2: Check existing addresses for this user
    try {
      const { data: existingAddresses, error: addressError } = await supabase
        .from('user_deposit_addresses')
        .select('*')
        .eq('user_id', user.id);
      
      debugInfo.existing_addresses = existingAddresses;
      debugInfo.address_query_error = addressError?.message;
    } catch (err) {
      debugInfo.address_query_error = err instanceof Error ? err.message : 'Unknown error';
    }

    // Test 3: Check if functions exist
    try {
      // Test old function signature
      const { data: oldFunctionTest, error: oldFunctionError } = await serviceSupabase
        .rpc('generate_user_deposit_address', { user_uuid: user.id });
      
      debugInfo.old_function_works = !oldFunctionError;
      debugInfo.old_function_error = oldFunctionError?.message;
      debugInfo.old_function_result = oldFunctionTest;
    } catch (err) {
      debugInfo.old_function_works = false;
      debugInfo.old_function_error = err instanceof Error ? err.message : 'Unknown error';
    }

    // Test 4: Check new function signature
    try {
      const { data: newFunctionTest, error: newFunctionError } = await serviceSupabase
        .rpc('generate_user_deposit_address', { 
          user_uuid: user.id,
          network_type: network 
        });
      
      debugInfo.new_function_works = !newFunctionError;
      debugInfo.new_function_error = newFunctionError?.message;
      debugInfo.new_function_result = newFunctionTest;
    } catch (err) {
      debugInfo.new_function_works = false;
      debugInfo.new_function_error = err instanceof Error ? err.message : 'Unknown error';
    }

    // Test 5: Check wallet config
    try {
      const { data: walletConfig, error: configError } = await supabase
        .from('wallet_config')
        .select('*');
      
      debugInfo.wallet_config = walletConfig;
      debugInfo.config_error = configError?.message;
    } catch (err) {
      debugInfo.config_error = err instanceof Error ? err.message : 'Unknown error';
    }

    // If test mode, don't actually create an address
    if (testMode) {
      return NextResponse.json({
        success: true,
        debug: debugInfo,
        message: "Debug mode - no address created"
      });
    }

    // Test 6: Try to create an address using the actual API logic
    try {
      let createError;
      let createResult;

      // Try new function first
      try {
        const { data, error } = await serviceSupabase
          .rpc('generate_user_deposit_address', { 
            user_uuid: user.id,
            network_type: network 
          });
        createError = error;
        createResult = data;
        debugInfo.creation_method = 'new_function';
      } catch (err) {
        // Fallback to old function
        const { data, error } = await serviceSupabase
          .rpc('generate_user_deposit_address', { user_uuid: user.id });
        createError = error;
        createResult = data;
        debugInfo.creation_method = 'old_function_fallback';
      }

      debugInfo.creation_error = createError?.message;
      debugInfo.creation_result = createResult;

      if (createError) {
        return NextResponse.json({
          success: false,
          error: "Failed to create address",
          debug: debugInfo
        }, { status: 500 });
      }

      // Fetch the created address
      const { data: createdAddress, error: fetchError } = await supabase
        .from('user_deposit_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      debugInfo.fetch_error = fetchError?.message;
      debugInfo.created_address = createdAddress;

      return NextResponse.json({
        success: true,
        address: createdAddress?.deposit_address,
        network: createdAddress?.network || network,
        debug: debugInfo
      });

    } catch (err) {
      debugInfo.creation_exception = err instanceof Error ? err.message : 'Unknown error';
      
      return NextResponse.json({
        success: false,
        error: "Exception during address creation",
        debug: debugInfo
      }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      debug: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}
