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
    const { data: depositAddress, error: addressError } = await supabase
      .from("user_deposit_addresses")
      .select("*")
      .eq("user_id", user.id)
      .eq("network", network)
      .eq("is_active", true)
      .single();

    if (addressError) {
      // If no address exists, create one using service role
      if (addressError.code === 'PGRST116') {
        console.log(`Creating new deposit address for user: ${user.id}`);

        const { error: createError } = await serviceSupabase
          .rpc('generate_user_deposit_address', { 
            user_uuid: user.id,
            network_type: network 
          });

        if (createError) {
          console.error("Error creating deposit address:", createError);
          return NextResponse.json(
            { error: "Failed to create deposit address" },
            { status: 500 }
          );
        }

        // Fetch the newly created address
        const { data: createdAddress, error: fetchError } = await supabase
          .from("user_deposit_addresses")
          .select("*")
          .eq("user_id", user.id)
          .eq("network", network)
          .eq("is_active", true)
          .single();

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
          network: createdAddress.network,
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
      network: depositAddress.network,
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
