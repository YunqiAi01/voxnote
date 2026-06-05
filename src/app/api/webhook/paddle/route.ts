import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import crypto from "crypto";

export const runtime = "nodejs";

function verifyPaddleSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("PADDLE_WEBHOOK_SECRET not configured, skipping verification");
    return true; // Allow for initial setup before secret is configured
  }

  try {
    const parts = signature.split(";");
    const tsPart = parts.find((p) => p.startsWith("ts="));
    const h1Part = parts.find((p) => p.startsWith("h1="));

    if (!tsPart || !h1Part) return false;

    const ts = tsPart.split("=")[1];
    const h1 = h1Part.split("=")[1];
    const signedPayload = `${ts}:${rawBody}`;

    const expected = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    return crypto.timingSafeEqual(Buffer.from(h1), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("paddle-signature") || "";

    // Verify webhook signature
    if (!verifyPaddleSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event?.event_type;
    const data = event?.data;
    const customData = data?.custom_data || {};
    const userId = customData?.user_id;
    const plan = customData?.plan || "monthly";

    if (!userId) {
      console.warn("No user_id in webhook custom_data, skipping:", eventType);
      return NextResponse.json({ skipped: "no_user_id" }, { status: 200 });
    }

    const supabase = await createServerSupabase();

    switch (eventType) {
      // Transaction completed — payment succeeded, subscription created
      case "transaction.completed": {
        const subscriptionId = data?.subscription_id;
        const endDate = data?.billing_period?.ends_at;
        const isFlash = plan === "flash";

        await supabase.from("user_tiers").upsert({
          user_id: userId,
          tier: "pro",
          subscription_status: "active",
          subscription_end: endDate || null,
          variant: plan,
          subscription_id: subscriptionId || null,
          has_used_flash_sale: isFlash ? true : undefined,
          updated_at: new Date().toISOString(),
        });

        console.log(`💳 Payment completed for ${userId}: ${plan}, sub=${subscriptionId}`);
        break;
      }

      // Subscription activated — also set pro
      case "subscription.activated": {
        const endDate = data?.current_billing_period?.ends_at;
        const isFlash = plan === "flash";

        await supabase.from("user_tiers").upsert({
          user_id: userId,
          tier: "pro",
          subscription_status: "active",
          subscription_end: endDate || null,
          variant: plan,
          subscription_id: data?.id || null,
          has_used_flash_sale: isFlash ? true : undefined,
          updated_at: new Date().toISOString(),
        });

        console.log(`✅ Pro activated for ${userId}: ${plan}, ends ${endDate}`);
        break;
      }

      case "subscription.updated": {
        const status = data?.status;
        const endDate = data?.current_billing_period?.ends_at;

        if (status === "active" || status === "trialing") {
          await supabase.from("user_tiers").upsert({
            user_id: userId,
            tier: "pro",
            subscription_status: "active",
            subscription_end: endDate || null,
            variant: plan,
            updated_at: new Date().toISOString(),
          });

          console.log(`🔄 Pro renewed for ${userId}: ends ${endDate}`);
        } else if (status === "past_due" || status === "paused") {
          await supabase.from("user_tiers").upsert({
            user_id: userId,
            subscription_status: status,
            updated_at: new Date().toISOString(),
          });

          console.log(`⚠️ Subscription ${status} for ${userId}`);
        }
        break;
      }

      case "subscription.canceled": {
        await supabase.from("user_tiers").upsert({
          user_id: userId,
          tier: "free",
          subscription_status: "canceled",
          subscription_end: null,
          updated_at: new Date().toISOString(),
        });

        console.log(`⬇️ Subscription canceled for ${userId}`);
        break;
      }

      case "subscription.past_due": {
        await supabase.from("user_tiers").upsert({
          user_id: userId,
          tier: "free",
          subscription_status: "past_due",
          subscription_end: null,
          updated_at: new Date().toISOString(),
        });

        console.log(`⬇️ Downgraded to free (past_due) for ${userId}`);
        break;
      }

      default:
        console.log(`ℹ️ Unhandled Paddle event: ${eventType}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Paddle webhook error:", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
