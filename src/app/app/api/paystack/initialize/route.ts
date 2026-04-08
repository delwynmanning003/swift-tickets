import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { email, amount, orderId, fullName } = body;

    if (!email || !amount || !orderId) {
      return NextResponse.json(
        { error: "Missing required payment fields" },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: Math.round(Number(amount) * 100),
          callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment-success`,
          metadata: {
            orderId,
            fullName,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      return NextResponse.json(
        { error: data.message || "Failed to initialize payment" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      url: data.data.authorization_url,
      reference: data.data.reference,
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
