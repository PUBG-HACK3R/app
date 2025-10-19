import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { calculateReferralLevelProgress, checkForNewLevelRewards } from "@/lib/referral-levels";
import { ReferralLevel, UserReferralLevel, ReferralLevelReward } from "@/types/referral-levels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    console.log('🔍 Referral Levels API called...');
    
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ Authentication failed:', authError?.message);
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

    const admin = getSupabaseAdminClient();

    // Step 1: Get all referral levels
    const { data: allLevels, error: levelsError } = await admin
      .from("referral_levels")
      .select("*")
      .eq("is_active", true)
      .order("level_order", { ascending: true });

    if (levelsError) {
      console.log('❌ Levels fetch failed:', levelsError.message);
      return NextResponse.json({ error: "Failed to fetch levels" }, { status: 500 });
    }

    // Step 2: Get qualified referrals (users who deposited AND purchased plans)
    const { data: qualifiedReferrals, error: referredError } = await admin
      .from("user_profiles")
      .select(`
        user_id,
        user_investments!inner(id),
        deposits!inner(id, status)
      `)
      .eq("referred_by", user.id)
      .eq("deposits.status", "completed")
      .eq("user_investments.status", "active");

    if (referredError) {
      console.log('❌ Qualified referrals fetch failed:', referredError.message);
      // Fallback to basic referral count if qualified check fails
      const { data: basicReferrals } = await admin
        .from("user_profiles")
        .select("user_id")
        .eq("referred_by", user.id);
      
      const currentReferrals = basicReferrals?.length || 0;
      console.log('⚠️ Using basic referral count:', currentReferrals);
    } else {
      console.log('✅ Qualified referrals found:', qualifiedReferrals);
    }

    // Count only users who have both deposits and investments
    const currentReferrals = qualifiedReferrals?.length || 0;

    // Step 3: Get or create user's level data
    let { data: userLevelData, error: userLevelError } = await admin
      .from("user_referral_levels")
      .select(`
        *,
        current_level:referral_levels(*)
      `)
      .eq("user_id", user.id)
      .single();

    if (userLevelError && userLevelError.code !== 'PGRST116') {
      console.log('❌ User level fetch failed:', userLevelError.message);
      return NextResponse.json({ error: "Failed to fetch user level" }, { status: 500 });
    }

    // Create user level record if it doesn't exist
    if (!userLevelData) {
      const bronzeLevel = allLevels.find(l => l.level_order === 0);
      const { data: newUserLevel, error: createError } = await admin
        .from("user_referral_levels")
        .insert({
          user_id: user.id,
          current_level_id: bronzeLevel?.id,
          total_referrals: currentReferrals,
          total_level_rewards: 0
        })
        .select(`
          *,
          current_level:referral_levels(*)
        `)
        .single();

      if (createError) {
        console.log('❌ User level creation failed:', createError.message);
        return NextResponse.json({ error: "Failed to create user level" }, { status: 500 });
      }

      userLevelData = newUserLevel;
    }

    // Step 4: Check if user needs level updates
    const previousReferrals = userLevelData.total_referrals;
    let updatedUserLevelData = userLevelData;

    if (currentReferrals !== previousReferrals) {
      // Check for new level rewards
      const newLevelsEarned = checkForNewLevelRewards(currentReferrals, previousReferrals, allLevels);
      
      // Calculate new current level
      const progress = calculateReferralLevelProgress(currentReferrals, allLevels);
      const newCurrentLevelId = progress.current_level?.id || allLevels[0]?.id;

      // Update user level data
      const { data: updated, error: updateError } = await admin
        .from("user_referral_levels")
        .update({
          current_level_id: newCurrentLevelId,
          total_referrals: currentReferrals,
          last_level_update: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id)
        .select(`
          *,
          current_level:referral_levels(*)
        `)
        .single();

      if (updateError) {
        console.log('❌ User level update failed:', updateError.message);
      } else {
        updatedUserLevelData = updated;
      }

      // Create level reward records for new levels earned
      for (const level of newLevelsEarned) {
        await admin
          .from("referral_level_rewards")
          .insert({
            user_id: user.id,
            level_id: level.id,
            reward_amount: level.reward_amount,
            referrals_at_time: currentReferrals,
            status: 'pending'
          });

        // Update total level rewards
        await admin
          .from("user_referral_levels")
          .update({
            total_level_rewards: (updatedUserLevelData.total_level_rewards || 0) + level.reward_amount
          })
          .eq("user_id", user.id);
      }
    }

    // Step 5: Get user's level rewards
    const { data: levelRewards, error: rewardsError } = await admin
      .from("referral_level_rewards")
      .select(`
        *,
        level:referral_levels(*)
      `)
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false });

    if (rewardsError) {
      console.log('❌ Level rewards fetch failed:', rewardsError.message);
    }

    // Step 6: Calculate progress
    const progress = calculateReferralLevelProgress(currentReferrals, allLevels, updatedUserLevelData);
    progress.pending_rewards = levelRewards?.filter(r => r.status === 'pending') || [];

    // Step 7: Return response
    const response = {
      user_level_data: updatedUserLevelData,
      progress: progress,
      level_rewards: levelRewards || [],
      all_levels: allLevels
    };

    console.log('✅ Returning referral levels response');

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Referral Levels API error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
