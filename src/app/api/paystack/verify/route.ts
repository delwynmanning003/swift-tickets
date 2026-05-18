import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
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
    ? new Date(eventDate).toLocaleString("en-ZA", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Date TBA";

  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://swifttickets.co.za";

  try {
    await resend.emails.send({
      from: "Swift Tickets <onboarding@resend.dev>",
      to: buyerEmail,
      subject: `Your tickets for ${eventTitle || "your event"}`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;background:#f5f5f5;padding:32px;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;padding:32px;border:1px solid #e5e7eb;">
            <p style="margin:0 0 8px;color:#6b7280;font-size:12px;letter-spacing:2px;text-transform:uppercase;">
              Swift Tickets
            </p>

            <h1 style="margin:0 0 16px;font-size:28px;color:#111827;">
              Payment Successful 🎉
            </h1>

            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
              Hi ${buyerName || "there"}, your ticket${
                quantity > 1 ? "s have" : " has"
              } been issued successfully.
            </p>

            <div style="padding:16px;background:#f9fafb;border:1px solid #e5e7eb;margin-bottom:20px;">
              <p style="margin:0 0 8px;"><strong>Event:</strong> ${
                eventTitle || "-"
              }</p>
              <p style="margin:0 0 8px;"><strong>Ticket Type:</strong> ${
                ticketTypeName || "-"
              }</p>
              <p style="margin:0 0 8px;"><strong>Quantity:</strong> ${quantity}</p>
              <p style="margin:0 0 8px;"><strong>Location:</strong> ${
                eventLocation || "-"
              }</p>
              <p style="margin:0 0 8px;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin:0;"><strong>Reference:</strong> ${reference}</p>
            </div>

            <a href="${appUrl}/my-tickets" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 20px;font-weight:700;">
              View My Tickets
            </a>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("Unexpected email send error:", error);
  }
}

async function verifyPaystack(reference: string) {
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

  if (!paystackSecret) {
    return { ok: false, error: "Missing PAYSTACK_SECRET_KEY", status: 500 };
  }

  const paystackRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(
      reference
    )}`,
    {
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
      },
    }
  );

  const paystackData = await paystackRes.json();

  if (
    !paystackRes.ok ||
    !paystackData.status ||
    paystackData.data?.status !== "success"
  ) {
    console.error("Paystack verify failed:", paystackData);
    return { ok: false, error: "Payment not successful", status: 400 };
  }

  return { ok: true };
}

async function finalizeOrder(reference: string, skipPaystack = false) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();

  if (orderError || !order) {
    console.error("Order lookup failed:", orderError);
    return { error: "Order not found", status: 404 };
  }

  if (order.status === "paid" && order.payment_status === "paid") {
    return { success: true, message: "Already processed" };
  }

  if (!skipPaystack) {
    const paystackCheck = await verifyPaystack(reference);

    if (!paystackCheck.ok) {
      return {
        error: paystackCheck.error,
        status: paystackCheck.status,
      };
    }
  }

  const { data: ticketType, error: ticketError } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("id", order.ticket_type_id)
    .maybeSingle();

  if (ticketError || !ticketType) {
    return { error: "Ticket type not found", status: 404 };
  }

  const { data: eventRow, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", ticketType.event_id)
    .maybeSingle();

  if (eventError || !eventRow) {
    return { error: "Event not found", status: 404 };
  }

  if (order.resale_id) {
    const { data: resaleRow, error: resaleError } = await supabase
      .from("resales")
      .select("*")
      .eq("id", order.resale_id)
      .maybeSingle();

    if (resaleError || !resaleRow) {
      return { error: "Resale listing not found", status: 404 };
    }

    if (resaleRow.status !== "active" && resaleRow.status !== "listed") {
      return { error: "Resale ticket already sold", status: 400 };
    }

    const { error: transferError } = await supabase
      .from("tickets")
      .update({
        user_id: order.user_id,
        buyer_email: order.buyer_email,
        qr_code: crypto.randomUUID(),
        checked_in: false,
        status: "valid",
      })
      .eq("id", resaleRow.ticket_id);

    if (transferError) {
      return { error: transferError.message, status: 500 };
    }

    const { error: resaleUpdateError } = await supabase
      .from("resales")
      .update({
        status: "sold",
        buyer_user_id: order.user_id,
        buyer_id: order.user_id,
        sold_at: new Date().toISOString(),
      })
      .eq("id", resaleRow.id);

    if (resaleUpdateError) {
      return { error: resaleUpdateError.message, status: 500 };
    }

    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        payment_status: "paid",
      })
      .eq("id", order.id);

    if (updateOrderError) {
      return { error: updateOrderError.message, status: 500 };
    }

    if (order.buyer_email) {
      await sendTicketEmail({
        buyerEmail: order.buyer_email,
        buyerName: order.buyer_name,
        eventTitle: eventRow.title,
        eventLocation: eventRow.location,
        eventDate: eventRow.event_date,
        ticketTypeName: ticketType.name,
        quantity: 1,
        reference,
      });
    }

    return {
      success: true,
      message: "Resale ticket transferred successfully",
    };
  }

  const orderQuantity = Number(order.quantity);

  if (Number(ticketType.quantity) < orderQuantity) {
    return { error: "Not enough tickets available", status: 400 };
  }

  const existingTickets = await supabase
    .from("tickets")
    .select("id")
    .eq("order_id", order.id);

  if ((existingTickets.data || []).length === 0) {
    const tickets = Array.from({ length: orderQuantity }).map(() => ({
      order_id: order.id,
      ticket_type_id: order.ticket_type_id,
      user_id: order.user_id ?? null,
      buyer_email: order.buyer_email ?? null,
      status: "valid",
      qr_code: crypto.randomUUID(),
      checked_in: false,
    }));

    const { error: ticketInsertError } = await supabase
      .from("tickets")
      .insert(tickets);

    if (ticketInsertError) {
      return { error: ticketInsertError.message, status: 500 };
    }

    const newQuantity = Number(ticketType.quantity) - orderQuantity;

    const { error: updateQtyError } = await supabase
      .from("ticket_types")
      .update({ quantity: newQuantity })
      .eq("id", order.ticket_type_id);

    if (updateQtyError) {
      return { error: updateQtyError.message, status: 500 };
    }
  }

  const { error: updateOrderError } = await supabase
    .from("orders")
    .update({
      status: "paid",
      payment_status: "paid",
    })
    .eq("id", order.id);

  if (updateOrderError) {
    return { error: updateOrderError.message, status: 500 };
  }

  if (order.buyer_email) {
    await sendTicketEmail({
      buyerEmail: order.buyer_email,
      buyerName: order.buyer_name,
      eventTitle: eventRow.title,
      eventLocation: eventRow.location,
      eventDate: eventRow.event_date,
      ticketTypeName: ticketType.name,
      quantity: orderQuantity,
      reference,
    });
  }

  return {
    success: true,
    message: "Order finalized successfully",
  };
}

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

    const result = await finalizeOrder(reference, reference.startsWith("free_"));

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Verify route error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Server error",
      },
      { status: 500 }
    );
  }
}