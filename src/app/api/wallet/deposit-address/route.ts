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
    
    // Validate network
    if (!['trc20', 'arbitrum'].includes(network)) {
      return NextResponse.json({ error: "Invalid network" }, { status: 400 });
    }
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's deposit address for the specified network
    let query = supabase
      .from("user_deposit_addresses")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);
    
    // Add network filter if the column exists (for backward compatibility)
    try {
      query = query.eq("network", network);
    } catch (err) {
      console.log('Network column may not exist, using default query');
    }
    
    const { data: depositAddress, error: addressError } = await query.single();

    if (addressError) {
      // If no address exists, create one using service role
      if (addressError.code === 'PGRST116') {
        console.log(`Creating new deposit address for user: ${user.id}`);

        // Try new multi-network function first, fallback to old function
        let createError;
        try {
          const { error } = await serviceSupabase
            .rpc('generate_user_deposit_address', { 
              user_uuid: user.id,
              network_type: network 
            });
          createError = error;
        } catch (err) {
          // Fallback to old function signature for backward compatibility
          console.log('Falling back to old function signature');
          const { error } = await serviceSupabase
            .rpc('generate_user_deposit_address', { user_uuid: user.id });
          createError = error;
        }

        if (createError) {
          console.error("Error creating deposit address:", createError);
          return NextResponse.json(
            { error: "Failed to create deposit address" },
            { status: 500 }
          );
        }

        // Fetch the newly created address
        let fetchQuery = supabase
          .from("user_deposit_addresses")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true);
        
        // Add network filter if supported
        try {
          fetchQuery = fetchQuery.eq("network", network);
        } catch (err) {
          console.log('Using default query for fetching created address');
        }
        
        const { data: createdAddress, error: fetchError } = await fetchQuery.single();

        if (fetchError) {
          console.error("Error fetching created address:", fetchError);
          return NextResponse.json(
            { error: "Failed to fetch deposit address" },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          address: createdAddress.deposit_address,
          network: createdAddress.network || 'trc20', // Default to trc20 for backward compatibility
          derivation_path: createdAddress.derivation_path,
          address_index: createdAddress.address_index,
          created_at: createdAddress.created_at
        });
      }

      console.error("Error fetching deposit address:", addressError);
      return NextResponse.json(
        { error: "Failed to fetch deposit address" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      address: depositAddress.deposit_address,
      network: depositAddress.network || 'trc20', // Default to trc20 for backward compatibility
      derivation_path: depositAddress.derivation_path,
      address_index: depositAddress.address_index,
      created_at: depositAddress.created_at
    });

  } catch (error) {
    console.error("Deposit address error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
