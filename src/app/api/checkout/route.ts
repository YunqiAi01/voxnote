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

  if (!priceId) {
    return NextResponse.redirect(new URL("/pricing", request.url));
  }

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", "/pricing");
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Create Paddle transaction
    const response = await fetch(`${PADDLE_API}/transactions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PADDLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{
          price_id: priceId,
          quantity: 1,
        }],
        custom_data: {
          user_id: user.id,
          plan,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Paddle transaction error:", errorText);
      return NextResponse.redirect(new URL("/pricing?error=checkout_failed", request.url));
    }

    const result = await response.json();
    const checkoutUrl = result?.data?.checkout?.url;

    if (!checkoutUrl) {
      console.error("No checkout URL in Paddle response:", JSON.stringify(result));
      return NextResponse.redirect(new URL("/pricing?error=no_checkout_url", request.url));
    }

    return NextResponse.redirect(checkoutUrl);
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.redirect(new URL("/pricing?error=checkout_error", request.url));
  }
}
