import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const qrCode = body?.qr_code?.trim();

    if (!qrCode) {
      return NextResponse.json(
        { error: "Missing qr_code" },
        { status: 400 }
      );
    }

    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("*")
      .eq("qr_code", qrCode)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const { data: ticketType } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("id", ticket.ticket_type_id)
      .single();

    let eventRow = null;

    if (ticketType?.event_id) {
      const { data: eventData } = await supabase
        .from("events")
        .select("*")
        .eq("id", ticketType.event_id)
        .single();

      eventRow = eventData;
    }

    if (ticket.checked_in) {
      return NextResponse.json({
        success: false,
        status: "already_used",
        message: "Ticket has already been used",
        ticket: {
          ...ticket,
          ticketType,
          eventRow,
        },
      });
    }

    const { error: updateError } = await supabase
      .from("tickets")
      .update({ checked_in: true })
      .eq("id", ticket.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "checked_in",
      message: "Ticket checked in successfully",
      ticket: {
        ...ticket,
        checked_in: true,
        ticketType,
        eventRow,
      },
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