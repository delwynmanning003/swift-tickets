import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, amount, orderId, fullName, reference } = body;

    if (!email || !amount || !orderId || !reference) {
      return NextResponse.json(
        { error: "Missing required payment fields" },
        { status: 400 }
      );
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json(
        { error: "Missing PAYSTACK_SECRET_KEY" },
        { status: 500 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SITE_URL" },
        { status: 500 }
      );
    }

    const paystackRes = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        const reference = `swift_${Date.now()}_${Math.random()
  .toString(36)
  .substring(2, 10)}`;

body: JSON.stringify({
  email,
  amount: Math.round(Number(amount) * 100),

  reference,

  callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment-success?reference=${reference}&orderId=${orderId}`,

  metadata: {
    orderId,
    fullName,
  },
}),
      }
    );

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      return NextResponse.json(
        { error: paystackData.message || "Failed to initialize payment" },
        { status: 400 }
      );
    }

    return NextResponse.json({
  url: paystackData.data.authorization_url,
  reference,
});
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error",
      },
      { status: 500 }
    );
  }
}