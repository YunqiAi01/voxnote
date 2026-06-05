import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

const LEMONSQUEEZY_STORE = process.env.LEMONSQUEEZY_STORE_ID || "";

const VARIANT_IDS: Record<string, string> = {
  monthly: process.env.LEMONSQUEEZY_VARIANT_MONTHLY || "",
  yearly: process.env.LEMONSQUEEZY_VARIANT_YEARLY || "",
  flash: process.env.LEMONSQUEEZY_VARIANT_FLASH || "",
};

export async function GET(request: NextRequest) {
  const plan = request.nextUrl.searchParams.get("plan") || "monthly";
  const variantId = VARIANT_IDS[plan];

  if (!variantId) {
    return NextResponse.redirect(new URL("/pricing", request.url));
  }

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to login first
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", "/pricing");
    return NextResponse.redirect(loginUrl);
  }

  // Build Lemon Squeezy checkout URL
  const checkoutUrl = new URL(`https://${LEMONSQUEEZY_STORE}.lemonsqueezy.com/checkout/buy/${variantId}`);
  checkoutUrl.searchParams.set("checkout[custom][user_id]", user.id);
  checkoutUrl.searchParams.set("checkout[custom][variant]", plan);

  return NextResponse.redirect(checkoutUrl.toString());
}
