import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import crypto from "crypto";

export const runtime = "nodejs";

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return false;

  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-signature") || "";

    // Verify webhook signature
    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventName = event?.meta?.event_name;
    const attributes = event?.data?.attributes;
    const customData = event?.meta?.custom_data;
    const userId = customData?.user_id;

    if (!userId) {
      return NextResponse.json({ error: "No user_id in custom_data" }, { status: 400 });
    }

    const supabase = await createServerSupabase();

    switch (eventName) {
      case "order_created": {
        const variant = customData?.variant || "monthly";
        const isFlash = variant === "flash_3months";
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + (isFlash ? 3 : 1));
        endDate.setFullYear(endDate.getFullYear() + (variant === "yearly" ? 1 : 0));

        await supabase.from("user_tiers").upsert({
          user_id: userId,
          tier: "pro",
          subscription_status: "active",
          subscription_end: endDate.toISOString(),
          variant,
          has_used_flash_sale: isFlash ? true : undefined,
          updated_at: new Date().toISOString(),
        });

        console.log(`✅ Pro activated for ${userId}: ${variant}, ends ${endDate}`);
        break;
      }

      case "subscription_updated": {
        const status = attributes?.status;
        if (status === "cancelled" || status === "expired" || status === "unpaid") {
          await supabase.from("user_tiers").upsert({
            user_id: userId,
            tier: "free",
            subscription_status: status,
            subscription_end: null,
            updated_at: new Date().toISOString(),
          });

          console.log(`⬇️ Downgraded to free for ${userId}: ${status}`);
        }
        break;
      }

      case "subscription_cancelled": {
        await supabase.from("user_tiers").upsert({
          user_id: userId,
          tier: "free",
          subscription_status: "cancelled",
          subscription_end: null,
          updated_at: new Date().toISOString(),
        });

        console.log(`⬇️ Subscription cancelled for ${userId}`);
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
