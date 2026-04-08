import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json(
        { error: "Missing payment reference" },
        { status: 400 }
      );
    }

    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data.status !== "success") {
      return NextResponse.json(
        { error: "Payment not successful" },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("reference", reference)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.status === "paid") {
      return NextResponse.json({
        success: true,
        message: "Already processed",
      });
    }

    const { data: ticketType, error: ticketError } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("id", order.ticket_type_id)
      .single();

    if (ticketError || !ticketType) {
      return NextResponse.json(
        { error: "Ticket type not found" },
        { status: 404 }
      );
    }

    if (Number(ticketType.quantity) < Number(order.quantity)) {
      return NextResponse.json(
        { error: "Not enough tickets available" },
        { status: 400 }
      );
    }

    const tickets = Array.from({ length: order.quantity }).map(() => ({
      order_id: order.id,
      ticket_type_id: order.ticket_type_id,
      qr_code: crypto.randomUUID(),
      checked_in: false,
    }));

    const { error: ticketInsertError } = await supabase
      .from("tickets")
      .insert(tickets);

    if (ticketInsertError) {
      return NextResponse.json(
        { error: ticketInsertError.message },
        { status: 500 }
      );
    }

    const newQuantity = Number(ticketType.quantity) - Number(order.quantity);

    const { error: updateQtyError } = await supabase
      .from("ticket_types")
      .update({ quantity: newQuantity })
      .eq("id", order.ticket_type_id);

    if (updateQtyError) {
      return NextResponse.json(
        { error: updateQtyError.message },
        { status: 500 }
      );
    }

    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({ status: "paid" })
      .eq("id", order.id);

    if (updateOrderError) {
      return NextResponse.json(
        { error: updateOrderError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and tickets issued",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Server error",
      },
      { status: 500 }
    );
  }
}
