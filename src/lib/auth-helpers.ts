import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Standardized authentication and authorization helpers
 * Use these throughout the application for consistent auth patterns
 */

export interface AuthUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
  profile?: any;
}

/**
 * Get authenticated user with role information
 * Uses admin client to bypass RLS issues
 */
export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    // Get role from profiles table using admin client
    const adminClient = getSupabaseAdminClient();
    let { data: profile } = await adminClient
      .from("user_profiles")
      .select("role, email, full_name, balance_usdt, total_invested, total_earned")
      .eq("user_id", user.id)
      .single();

    // If profile doesn't exist, create it automatically
    if (!profile) {
      console.log("Profile not found, creating profile for user:", user.id);
      
      try {
        await adminClient
          .from("user_profiles")
          .insert({
            user_id: user.id,
            email: user.email,
            role: 'user'
          });

        // Fetch the newly created profile
        const { data: newProfile } = await adminClient
          .from("user_profiles")
          .select("role, email, full_name, balance_usdt, total_invested, total_earned")
          .eq("user_id", user.id)
          .single();

        profile = newProfile;
      } catch (insertError) {
        console.error("Error creating profile:", insertError);
        // Continue with default values if profile creation fails
      }
    }

    const role = profile?.role || (user.app_metadata as any)?.role || (user.user_metadata as any)?.role || "user";

    return {
      id: user.id,
      email: user.email || profile?.email || '',
      role: role as 'user' | 'admin',
      profile
    };
  } catch (error) {
    console.error("Error getting authenticated user:", error);
    return null;
  }
}

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getAuthenticatedUser();
  return user?.role === 'admin';
}

/**
 * Require admin access - throws error if not admin
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    throw new Error("Authentication required");
  }
  
  if (user.role !== 'admin') {
    throw new Error("Admin access required");
  }
  
  return user;
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    console.log("requireAuth: No authenticated user found");
    throw new Error("Authentication required");
  }
  
  console.log("requireAuth: User authenticated:", user.id, user.role);
  return user;
}

/**
 * Check if user has access to resource
 */
export async function hasResourceAccess(resourceUserId: string): Promise<boolean> {
  const user = await getAuthenticatedUser();
  
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.id === resourceUserId) return true;
  
  return false;
}

/**
 * Create or update user profile
 */
export async function ensureUserProfile(userId: string, email: string): Promise<void> {
  try {
    const adminClient = getSupabaseAdminClient();
    
    await adminClient
      .from("user_profiles")
      .upsert({
        user_id: userId,
        email: email,
        role: 'user'
      }, {
        onConflict: 'user_id'
      });
  } catch (error) {
    console.error("Error ensuring user profile:", error);
    throw error;
  }
}

/**
 * Get user profile by ID (admin only or own profile)
 */
export async function getUserProfile(userId: string) {
  const currentUser = await getAuthenticatedUser();
  
  if (!currentUser) {
    throw new Error("Authentication required");
  }
  
  // Check access
  if (currentUser.role !== 'admin' && currentUser.id !== userId) {
    throw new Error("Access denied");
  }
  
  const adminClient = getSupabaseAdminClient();
  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
    
  if (error) {
    throw new Error("Profile not found");
  }
  
  return profile;
}
