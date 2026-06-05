import { createServerSupabase } from "@/lib/supabase/server";

export interface UserTier {
  user_id: string;
  tier: "free" | "pro";
  notes_count_total: number;
  organize_count_total: number;
  subscription_status: string | null;
  subscription_end: string | null;
  variant: string | null;
  has_used_flash_sale: boolean;
}

export const FREE_LIMITS = {
  MAX_NOTES: 3,
  MAX_ORGANIZE: 3,
  MAX_DURATION_SECONDS: 600, // Free: first 10 minutes transcribed, rest locked
  MAX_RECORDING_SECONDS: 3600, // Free: allow recording up to 60 min (not cut off)
};

export const PRO_LIMITS = {
  MAX_NOTES: Infinity,
  MAX_ORGANIZE: Infinity,
  MAX_DURATION_SECONDS: 3600, // 60 minutes
  MAX_RECORDING_SECONDS: 3600,
};

export async function getUserTier(): Promise<UserTier | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("user_tiers")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data;
}

export async function checkNoteLimit(): Promise<{
  allowed: boolean;
  tier: "free" | "pro";
  count: number;
  limit: number;
  remaining: number;
}> {
  const tier = await getUserTier();
  if (!tier) return { allowed: false, tier: "free", count: 0, limit: 0, remaining: 0 };

  const limit = tier.tier === "pro" ? PRO_LIMITS.MAX_NOTES : FREE_LIMITS.MAX_NOTES;
  return {
    allowed: tier.tier === "pro" || tier.notes_count_total < FREE_LIMITS.MAX_NOTES,
    tier: tier.tier,
    count: tier.notes_count_total,
    limit,
    remaining: Math.max(0, limit - tier.notes_count_total),
  };
}

export async function checkOrganizeLimit(): Promise<{
  allowed: boolean;
  tier: "free" | "pro";
  count: number;
  limit: number;
  remaining: number;
}> {
  const tier = await getUserTier();
  if (!tier) return { allowed: false, tier: "free", count: 0, limit: 0, remaining: 0 };

  const limit = tier.tier === "pro" ? Infinity : FREE_LIMITS.MAX_ORGANIZE;
  return {
    allowed: tier.tier === "pro" || tier.organize_count_total < FREE_LIMITS.MAX_ORGANIZE,
    tier: tier.tier,
    count: tier.organize_count_total,
    limit,
    remaining: tier.tier === "pro" ? Infinity : Math.max(0, limit - tier.organize_count_total),
  };
}

export async function incrementNoteCount() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.rpc("increment_notes_count");
}

export async function incrementOrganizeCount() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.rpc("increment_organize_count");
}
