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

export async function GET(request: NextRequest) {
  const plan = request.nextUrl.searchParams.get("plan") || "monthly";
  const priceId = PRICE_IDS[plan];

  const host = request.headers.get("host") || "www.getvoxnote.com";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const origin = `${proto}://${host}`;

  if (!priceId) {
    return NextResponse.redirect(new URL("/pricing?error=no_price", origin));
  }

  // ── Auth: use Supabase SSR properly ──
  let userId: string | null = null;
  let customerEmail: string | undefined;

  // 使用 Supabase SSR client —— 这是 proxy.ts 中已验证可行的方式
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // 只读场景，不需要写 cookie
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  userId = session?.user?.id || null;
  customerEmail = session?.user?.email || undefined;

  if (!userId) {
    console.log("🔒 Checkout: no session found, redirecting to login");
    console.log("   cookies present:", request.cookies.getAll().map(c => c.name));
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("redirect", `/pricing`);
    return NextResponse.redirect(loginUrl);
  }

  console.log(`✅ Checkout auth OK: user=${userId}, email=${customerEmail}`);

  // ── Build Paddle request body ──
  const requestBody: Record<string, unknown> = {
    items: [{ price_id: priceId, quantity: 1 }],
    custom_data: { user_id: userId, plan },
  };

  // 用 customer 对象包裹 email（Paddle API 标准格式）
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
    const checkoutUrl = result?.data?.checkout?.url;

    if (!checkoutUrl) {
      console.error("❌ No checkout URL in response:", JSON.stringify(result).substring(0, 500));
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
