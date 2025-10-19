import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    console.log('🔍 Setting up referral levels system...');
    
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if user is admin
    const admin = getSupabaseAdminClient();
    const { data: profile } = await admin
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    console.log('✅ Admin verified, checking tables...');

    // First, check if referral_levels table exists by trying to select from it
    const { data: existingLevels, error: checkError } = await admin
      .from("referral_levels")
      .select("level_name")
      .limit(1);

    if (checkError) {
      console.log('❌ Tables do not exist. Error:', checkError.message);
      return NextResponse.json({ 
        error: "Database tables not found", 
        message: "Please run the manual SQL setup first",
        details: checkError.message,
        sql_file: "Use SETUP_DATABASE.sql in your Supabase SQL editor"
      }, { status: 500 });
    }

    console.log('✅ Tables exist, inserting default levels...');

    // Insert default referral levels one by one to get better error info
    const levels = [
      {
        level_name: 'Bronze',
        level_order: 0,
        min_referrals: 0,
        reward_amount: 0,
        level_color: '#CD7F32',
        level_icon: 'Shield'
      },
      {
        level_name: 'Silver',
        level_order: 1,
        min_referrals: 5,
        reward_amount: 10.00,
        level_color: '#C0C0C0',
        level_icon: 'Award'
      },
      {
        level_name: 'Gold',
        level_order: 2,
        min_referrals: 20,
        reward_amount: 50.00,
        level_color: '#FFD700',
        level_icon: 'Crown'
      },
      {
        level_name: 'Diamond',
        level_order: 3,
        min_referrals: 50,
        reward_amount: 300.00,
        level_color: '#B9F2FF',
        level_icon: 'Gem'
      }
    ];

    let insertedCount = 0;
    const errors = [];

    for (const level of levels) {
      const { error: insertError } = await admin
        .from("referral_levels")
        .upsert([level], {
          onConflict: 'level_name',
          ignoreDuplicates: false
        });

      if (insertError) {
        console.error(`❌ Failed to insert ${level.level_name}:`, insertError);
        errors.push({ level: level.level_name, error: insertError.message });
      } else {
        insertedCount++;
        console.log(`✅ Inserted ${level.level_name} level`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ 
        error: "Some levels failed to insert",
        inserted_count: insertedCount,
        errors: errors
      }, { status: 500 });
    }

    console.log('✅ Default levels inserted successfully!');

    console.log('✅ Referral levels system setup complete!');

    return NextResponse.json({ 
      success: true,
      message: "Referral levels system setup complete",
      levels_created: 4
    });

  } catch (error: any) {
    console.error('❌ Setup error:', error);
    return NextResponse.json({ 
      error: "Setup failed",
      details: error.message 
    }, { status: 500 });
  }
}
