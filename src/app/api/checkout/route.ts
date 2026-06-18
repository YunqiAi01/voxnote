import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PADDLE_API = "https://api.paddle.com";
const PADDLE_API_KEY = process.env.PADDLE_API_KEY || "";
const WEB_BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.getvoxnote.com";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const PRICE_IDS: Record<string, string> = {
  monthly: process.env.PADDLE_PRICE_MONTHLY || "",
  yearly: process.env.PADDLE_PRICE_YEARLY || "",
  flash: process.env.PADDLE_PRICE_FLASH || "",
};

/** Decode JWT payload locally — zero network calls */
function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
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

  // ── Determine origin properly even behind proxies ──
  const host = request.headers.get("host") || "www.getvoxnote.com";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const origin = `${proto}://${host}`;

  if (!priceId) {
    return NextResponse.redirect(new URL("/pricing?error=no_price", origin));
  }

  // ── Read auth cookie directly from request ──
  let userId: string | null = null;
  let customerEmail: string | undefined;

  try {
    const cookieName = `sb-tjvaszcfknumpeklnlcd-auth-token`;
    const authCookie = request.cookies.get(cookieName)?.value;
    const authCookieAlt = request.cookies.get(`sb-tjvaszcfknumpeklnlcd-auth-token.0`)?.value;

    const cookieJson = authCookie || authCookieAlt;
    if (cookieJson) {
      const parsed = JSON.parse(cookieJson);
      const accessToken = parsed?.access_token || parsed?.[0]?.access_token;

      if (accessToken) {
        const payload = parseJwtPayload(accessToken);
        if (payload?.sub) {
          userId = payload.sub as string;
          customerEmail = (payload.email as string) || undefined;
        }
      }
    }
  } catch {
    // Fall through
  }

  // ── Fallback: Supabase SSR client ──
  if (!userId) {
    try {
      const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // Read-only
          },
        },
      });
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id || null;
      customerEmail = customerEmail || session?.user?.email || undefined;
    } catch {
      // Still no auth
    }
  }

  if (!userId) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("redirect", `/pricing`);
    return NextResponse.redirect(loginUrl);
  }

  // ── Build Paddle request ──
  const successUrl = `${origin}/pricing?checkout=success`;
  const requestBody: Record<string, unknown> = {
    items: [
      {
        price_id: priceId,
        quantity: 1,
      },
    ],
    custom_data: {
      user_id: userId,
      plan,
    },
    checkout: {
      // ✅ FIX 1: 必须指定返回 URL —— 付款完成后 Paddle 把用户送回这里
      url: successUrl,
    },
  };

  // ✅ FIX 2: customer_email 放在顶层，不是 checkout 里面
  if (customerEmail) {
    requestBody.customer_email = customerEmail;
  }

  // ✅ FIX 3: 日志输出完整的请求体用于调试
  console.log("📤 Paddle request:", JSON.stringify({
    ...requestBody,
    // 隐藏敏感信息
  }, null, 2));
  console.log("🔑 Paddle API Key prefix:", PADDLE_API_KEY.substring(0, 12) + "...");
  console.log("🏷️  Price ID:", priceId, "| Plan:", plan);

  try {
    const response = await fetch(`${PADDLE_API}/transactions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PADDLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    console.log(`📥 Paddle response [${response.status}]:`, responseText.substring(0, 500));

    if (!response.ok) {
      // ✅ FIX 4: 详细错误日志
      console.error("❌ Paddle error:", {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
        requestPriceId: priceId,
        requestPlan: plan,
        apiKeyPrefix: PADDLE_API_KEY.substring(0, 12),
      });

      // Try to parse the error
      let errorMessage = responseText;
      try {
        const errorJson = JSON.parse(responseText);
        errorMessage = errorJson?.error?.detail || errorJson?.error?.type || responseText;
      } catch {
        // Use raw text
      }

      const errorUrl = new URL("/pricing", origin);
      errorUrl.searchParams.set("error", "checkout_failed");
      errorUrl.searchParams.set("detail", encodeURIComponent(errorMessage.substring(0, 300)));
      return NextResponse.redirect(errorUrl);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error("❌ Failed to parse Paddle JSON:", responseText);
      return NextResponse.redirect(new URL("/pricing?error=checkout_failed", origin));
    }

    const checkoutUrl = result?.data?.checkout?.url;

    if (!checkoutUrl) {
      console.error("❌ No checkout URL in response:", JSON.stringify(result).substring(0, 500));
      return NextResponse.redirect(new URL("/pricing?error=no_checkout_url", origin));
    }

    console.log(`✅ Checkout created for user ${userId}: ${plan} → ${checkoutUrl}`);
    return NextResponse.redirect(checkoutUrl);
  } catch (error) {
    console.error("❌ Checkout exception:", error);
    const errorUrl = new URL("/pricing", origin);
    errorUrl.searchParams.set("error", "checkout_error");
    errorUrl.searchParams.set(
      "detail",
      encodeURIComponent(error instanceof Error ? error.message : "Unknown error")
    );
    return NextResponse.redirect(errorUrl);
  }
}
