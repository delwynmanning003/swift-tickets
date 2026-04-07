import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { reference } = await req.json();

    if (!reference) {
      return NextResponse.json(
        { success: false, message: "Missing reference" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok || data?.data?.status !== "success") {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Payment not successful",
          data,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified",
      data,
    });
  } catch (error) {
    console.error("Paystack verify error:", error);
    return NextResponse.json(
      { success: false, message: "Verification failed" },
      { status: 500 }
    );
  }
}
