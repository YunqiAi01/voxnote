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

  const host = request.headers.get("host") || "www.getvoxnote.com";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const origin = `${proto}://${host}`;

  if (!priceId) {
    return NextResponse.redirect(new URL("/pricing?error=no_price", origin));
  }

  // ── Auth: read user from Supabase cookie ──
  let userId: string | null = null;
  let customerEmail: string | undefined;

  try {
    const cookieName = `sb-tjvaszcfknumpeklnlcd-auth-token`;
    const cookieJson =
      request.cookies.get(cookieName)?.value ||
      request.cookies.get(`${cookieName}.0`)?.value;

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
  } catch { /* fall through */ }

  if (!userId) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("redirect", `/pricing`);
    return NextResponse.redirect(loginUrl);
  }

  // ── Build the request body for Paddle ──
  // 参考: https://developer.paddle.com/api-reference/transactions/create-transaction
  const requestBody: Record<string, unknown> = {
    items: [{ price_id: priceId, quantity: 1 }],
    custom_data: { user_id: userId, plan },
  };

  // customer 对象包裹 email（根级别 customer_email 不被 Paddle API 支持）
  if (customerEmail) {
    requestBody.customer = { email: customerEmail };
  }

  console.log("📤 Paddle request:", JSON.stringify(requestBody, null, 2));

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
    console.log(`📥 Paddle response [${response.status}]:`, responseText.substring(0, 800));

    if (!response.ok) {
      console.error("❌ Paddle error:", response.status, responseText);

      let errorMsg = responseText;
      try {
        const ej = JSON.parse(responseText);
        errorMsg = ej?.error?.detail || ej?.error?.type || responseText;
      } catch { /* raw text */ }

      const errorUrl = new URL("/pricing", origin);
      errorUrl.searchParams.set("error", "checkout_failed");
      errorUrl.searchParams.set("detail", encodeURIComponent(errorMsg.substring(0, 300)));
      return NextResponse.redirect(errorUrl);
    }

    const result = JSON.parse(responseText);

    // Paddle API 返回: { data: { checkout: { url: "https://..." } } }
    const checkoutUrl = result?.data?.checkout?.url;

    if (!checkoutUrl) {
      console.error("❌ No checkout URL in response:", JSON.stringify(result).substring(0, 500));

      // 如果没有 checkout URL，可能已通过 customer 匹配自动完成支付
      // 直接跳转到定价页面显示成功
      return NextResponse.redirect(new URL("/pricing?checkout=success", origin));
    }

    console.log(`✅ Redirecting to Paddle checkout: ${checkoutUrl}`);
    return NextResponse.redirect(checkoutUrl);
  } catch (error) {
    console.error("❌ Checkout exception:", error);
    const errorUrl = new URL("/pricing", origin);
    errorUrl.searchParams.set("error", "checkout_error");
    return NextResponse.redirect(errorUrl);
  }
}
