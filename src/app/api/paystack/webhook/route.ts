import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const event = await req.json();

    if (event.event !== "charge.success") {
      return NextResponse.json({ received: true });
    }

    const reference = event.data?.reference;
    const orderId = event.data?.metadata?.orderId;

    if (!reference || !orderId) {
      return NextResponse.json(
        { error: "Missing reference or orderId" },
        { status: 400 }
      );
    }

    const verifyUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/paystack/verify?reference=${encodeURIComponent(
      reference
    )}&orderId=${encodeURIComponent(orderId)}`;

    const verifyRes = await fetch(verifyUrl);
    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.success) {
      return NextResponse.json(
        { error: verifyData.error || "Failed to finalize payment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true, success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook error",
      },
      { status: 500 }
    );
  }
}