import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify admin role via profiles
    const admin = getSupabaseAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // Paginate auth users
    const userIds: string[] = [];
    let page = 1;
    const perPage = 1000; // Safe, adjust if needed
    // supabase-js v2: listUsers supports page/perPage
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const list = data?.users || [];
      for (const u of list) userIds.push(u.id);
      if (list.length < perPage) break; // last page
      page += 1;
    }

    if (userIds.length === 0) {
      return NextResponse.json({ message: "No users found", created: 0, already_had: 0 });
    }

    // Get balances for these users
    const { data: balRows } = await admin
      .from("balances")
      .select("user_id, available_usdt")
      .in("user_id", userIds);

    const existingIds = new Set((balRows || []).map(r => r.user_id));
    const missing = userIds.filter(id => !existingIds.has(id));

    let created = 0;
    if (missing.length > 0) {
      // Insert in batches to avoid payload limits
      const batchSize = 1000;
      for (let i = 0; i < missing.length; i += batchSize) {
        const batch = missing.slice(i, i + batchSize).map(id => ({ user_id: id, available_usdt: 0 }));
        const { error: insErr } = await admin.from("balances").insert(batch);
        if (insErr) throw insErr;
        created += batch.length;
      }
    }

    return NextResponse.json({
      message: "Backfill completed",
      total_users: userIds.length,
      already_had: userIds.length - created,
      created,
    });
  } catch (err: any) {
    console.error("Backfill balances error:", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
