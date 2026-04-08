import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventId, organizerEmail } = body;

    if (!eventId || !organizerEmail) {
      return NextResponse.json(
        { error: "Missing eventId or organizerEmail" },
        { status: 400 }
      );
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .eq("organizer_email", organizerEmail)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found or not authorized" },
        { status: 404 }
      );
    }

    const { data: ticketTypes, error: ticketTypesError } = await supabase
      .from("ticket_types")
      .select("id")
      .eq("event_id", eventId);

    if (ticketTypesError) {
      return NextResponse.json(
        { error: ticketTypesError.message },
        { status: 500 }
      );
    }

    const ticketTypeIds = (ticketTypes || []).map((t) => t.id);

    if (ticketTypeIds.length > 0) {
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id")
        .in("ticket_type_id", ticketTypeIds);

      if (ordersError) {
        return NextResponse.json(
          { error: ordersError.message },
          { status: 500 }
        );
      }

      const orderIds = (orders || []).map((o) => o.id);

      if (orderIds.length > 0) {
        const { error: ticketsDeleteError } = await supabase
          .from("tickets")
          .delete()
          .in("order_id", orderIds);

        if (ticketsDeleteError) {
          return NextResponse.json(
            { error: ticketsDeleteError.message },
            { status: 500 }
          );
        }
      }

      const { error: ordersDeleteError } = await supabase
        .from("orders")
        .delete()
        .in("ticket_type_id", ticketTypeIds);

      if (ordersDeleteError) {
        return NextResponse.json(
          { error: ordersDeleteError.message },
          { status: 500 }
        );
      }

      const { error: ticketTypesDeleteError } = await supabase
        .from("ticket_types")
        .delete()
        .in("id", ticketTypeIds);

      if (ticketTypesDeleteError) {
        return NextResponse.json(
          { error: ticketTypesDeleteError.message },
          { status: 500 }
        );
      }
    }

    const { error: eventDeleteError } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId);

    if (eventDeleteError) {
      return NextResponse.json(
        { error: eventDeleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully",
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
