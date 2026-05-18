import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("RESEND_API_KEY missing");
    return null;
  }

  return new Resend(apiKey);
}

async function sendTicketEmail(params: {
  buyerEmail: string;
  buyerName?: string | null;
  eventTitle?: string | null;
  eventLocation?: string | null;
  eventDate?: string | null;
  ticketTypeName?: string | null;
  quantity: number;
  reference: string;
}) {
  const resend = getResendClient();

  if (!resend) return;

  const {
    buyerEmail,
    buyerName,
    eventTitle,
    eventLocation,
    eventDate,
    ticketTypeName,
    quantity,
    reference,
  } = params;

  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleString("en-ZA")
    : "Date TBA";

  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    await resend.emails.send({
      from: "Swift Tickets <onboarding@resend.dev>",
      to: buyerEmail,
      subject: `Your tickets for ${eventTitle || "your event"}`,
      html: `
        <div style="font-family:Arial;padding:32px;">
          <h1>Payment Successful 🎉</h1>

          <p>Hi ${buyerName || "there"}, your ticket has been issued.</p>

          <p><strong>Event:</strong> ${eventTitle || "-"}</p>
          <p><strong>Ticket:</strong> ${ticketTypeName || "-"}</p>
          <p><strong>Quantity:</strong> ${quantity}</p>
          <p><strong>Location:</strong> ${eventLocation || "-"}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Reference:</strong> ${reference}</p>

          <a href="${appUrl}/my-tickets">
            View My Tickets
          </a>
        </div>
      `,
    });
  } catch (error) {
    console.error(error);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const reference = searchParams.get("reference");
    const orderId = searchParams.get("orderId");

    if (!reference || !orderId) {
      return NextResponse.json(
        { error: "Missing payment details" },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
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

    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paystackData = await paystackRes.json();

    if (
      !paystackRes.ok ||
      !paystackData.status ||
      paystackData.data?.status !== "success"
    ) {
      return NextResponse.json(
        { error: "Payment not successful" },
        { status: 400 }
      );
    }

    const { data: ticketType } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("id", order.ticket_type_id)
      .single();

    const { data: eventRow } = await supabase
      .from("events")
      .select("*")
      .eq("id", ticketType.event_id)
      .single();

    // RESALE FLOW
    if (order.resale_id) {
      const { data: resaleRow } = await supabase
        .from("resales")
        .select("*")
        .eq("id", order.resale_id)
        .single();

      if (!resaleRow) {
        return NextResponse.json(
          { error: "Resale listing not found" },
          { status: 404 }
        );
      }

      await supabase
        .from("tickets")
        .update({
          user_id: order.user_id,
          buyer_email: order.buyer_email,
          qr_code: crypto.randomUUID(),
          checked_in: false,
        })
        .eq("id", resaleRow.ticket_id);

      await supabase
        .from("resales")
        .update({
          status: "sold",
          buyer_user_id: order.user_id,
          sold_at: new Date().toISOString(),
        })
        .eq("id", resaleRow.id);

      await supabase
        .from("orders")
        .update({
          status: "paid",
          payment_status: "paid",
        })
        .eq("id", order.id);

      return NextResponse.json({
        success: true,
        message: "Resale ticket transferred successfully",
      });
    }

    // NORMAL TICKETS
    const quantity = Number(order.quantity);

    const tickets = Array.from({ length: quantity }).map(() => ({
      order_id: order.id,
      ticket_type_id: order.ticket_type_id,
      user_id: order.user_id,
      buyer_email: order.buyer_email,
      status: "valid",
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

    await supabase
      .from("ticket_types")
      .update({
        quantity: Number(ticketType.quantity) - quantity,
      })
      .eq("id", order.ticket_type_id);

    await supabase
      .from("orders")
      .update({
        status: "paid",
        payment_status: "paid",
      })
      .eq("id", order.id);

    if (order.buyer_email) {
      await sendTicketEmail({
        buyerEmail: order.buyer_email,
        buyerName: order.buyer_name,
        eventTitle: eventRow?.title,
        eventLocation: eventRow?.location,
        eventDate: eventRow?.event_date,
        ticketTypeName: ticketType?.name,
        quantity,
        reference,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Order finalized successfully",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Server error",
      },
      { status: 500 }
    );
  }
}