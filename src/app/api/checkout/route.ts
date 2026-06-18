import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PADDLE_API = "https://api.paddle.com";
const PADDLE_API_KEY = process.env.PADDLE_API_KEY || "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const PRICE_IDS: Record<string, string> = {
  monthly: process.env.PADDLE_PRICE_MONTHLY || "",
  yearly: process.env.PADDLE_PRICE_YEARLY || "",
  flash: process.env.PADDLE_PRICE_FLASH || "",
};

/** Decode JWT payload locally — zero network calls, never fails */
function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // JWT: header.payload.signature — we need the payload (middle part)
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const plan = request.nextUrl.searchParams.get("plan") || "monthly";
  const priceId = PRICE_IDS[plan];
  const origin = request.nextUrl.origin;

  if (!priceId) {
    return NextResponse.redirect(new URL("/pricing?error=no_price", origin));
  }

  // ── Read auth cookie directly from request, no Supabase API call ──
  let userId: string | null = null;
  let customerEmail: string | undefined;

  try {
    // 1. Read the Supabase auth cookie directly from the request
    const cookieName = `sb-tjvaszcfknumpeklnlcd-auth-token`;
    const authCookie = request.cookies.get(cookieName)?.value;
    // Also try with base64-encoded name variant
    const authCookieAlt = request.cookies.get(`sb-tjvaszcfknumpeklnlcd-auth-token.0`)?.value;

    const cookieJson = authCookie || authCookieAlt;
    if (cookieJson) {
      // 2. Parse the cookie JSON (contains access_token, refresh_token, etc.)
      const parsed = JSON.parse(cookieJson);
      const accessToken = parsed?.access_token || parsed?.[0]?.access_token;
      
      if (accessToken) {
        // 3. Decode JWT locally — extract user ID and email
        const payload = parseJwtPayload(accessToken);
        if (payload?.sub) {
          userId = payload.sub as string;
          customerEmail = (payload.email as string) || undefined;
        }
      }
    }
  } catch {
    // Fall through — if cookie read fails, try Supabase client as backup
  }

  // ── Fallback: try Supabase SSR client if direct cookie read failed ──
  if (!userId) {
    try {
      const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // Not needed for read-only auth check
          },
        },
      });
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id || null;
      customerEmail = customerEmail || session?.user?.email || undefined;
    } catch {
      // Still no auth — will redirect to login
    }
  }

  if (!userId) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("redirect", `/pricing`);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const requestBody: Record<string, unknown> = {
      items: [{
        price_id: priceId,
        quantity: 1,
      }],
      custom_data: {
        user_id: userId,
        plan,
      },
      checkout: {
        ...(customerEmail ? { customer_email: customerEmail } : {}),
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
      const errorUrl = new URL("/pricing", origin);
      errorUrl.searchParams.set("error", "checkout_failed");
      errorUrl.searchParams.set("detail", encodeURIComponent(responseText.substring(0, 200)));
      return NextResponse.redirect(errorUrl);
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

    console.log(`✅ Checkout created for user ${userId}: ${plan} → ${checkoutUrl}`);
    return NextResponse.redirect(checkoutUrl);
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.redirect(new URL("/pricing?error=checkout_error", origin));
  }
}
