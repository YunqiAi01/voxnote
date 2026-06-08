import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

const PADDLE_API = "https://api.paddle.com";
const PADDLE_API_KEY = process.env.PADDLE_API_KEY || "";

const PRICE_IDS: Record<string, string> = {
  monthly: process.env.PADDLE_PRICE_MONTHLY || "",
  yearly: process.env.PADDLE_PRICE_YEARLY || "",
  flash: process.env.PADDLE_PRICE_FLASH || "",
};

export async function GET(request: NextRequest) {
  const plan = request.nextUrl.searchParams.get("plan") || "monthly";
  const priceId = PRICE_IDS[plan];
  const origin = request.nextUrl.origin;

  if (!priceId) {
    return NextResponse.redirect(new URL("/pricing", origin));
  }

  // Try server-side auth check
  let userId: string | null = null;
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch {
    // Auth check failed, will redirect to login
  }

  if (!userId) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("redirect", `/pricing`);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Create Paddle transaction
    const requestBody: Record<string, unknown> = {
      items: [{
        price_id: priceId,
        quantity: 1,
      }],
      custom_data: {
        user_id: userId,
        plan,
      },
    };

    const response = await fetch(`${PADDLE_API}/transactions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PADDLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Paddle transaction error:", response.status, responseText);
      return NextResponse.redirect(new URL("/pricing?error=checkout_failed", origin));
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse Paddle response:", responseText);
      return NextResponse.redirect(new URL("/pricing?error=checkout_failed", origin));
    }
    const checkoutUrl = result?.data?.checkout?.url;

    if (!checkoutUrl) {
      console.error("No checkout URL in Paddle response:", JSON.stringify(result));
      return NextResponse.redirect(new URL("/pricing?error=no_checkout_url", origin));
    }

    // Log for debugging
    console.log(`✅ Checkout created for user ${userId}: ${plan} → ${checkoutUrl}`);

    return NextResponse.redirect(checkoutUrl);
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.redirect(new URL("/pricing?error=checkout_error", origin));
  }
}
