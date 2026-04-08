"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type EventRow = {
  id: string;
  title: string;
  location: string;
  event_date: string;
  organizer_email: string | null;
};

type TicketTypeRow = {
  id: string;
  event_id: string;
  quantity: number | null;
};

type OrderRow = {
  id: string;
  ticket_type_id: string;
  buyer_total: number | null;
  status: string | null;
};

export default function DashboardPage() {
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = "/login";
          return;
        }

        const userEmail = user.email || "";
        setEmail(userEmail);

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profile) {
          setAccountType(profile.account_type || "");
        }

        const { data: eventsData, error: eventsError } = await supabase
          .from("events")
          .select("*")
          .eq("organizer_email", userEmail)
          .order("event_date", { ascending: false });

        if (eventsError) {
          console.error("Events load error:", eventsError);
          setEvents([]);
          setTicketTypes([]);
          setOrders([]);
          return;
        }

        const loadedEvents = (eventsData || []) as EventRow[];
        setEvents(loadedEvents);

        if (loadedEvents.length === 0) {
          setTicketTypes([]);
          setOrders([]);
          return;
        }

        const eventIds = loadedEvents.map((event) => event.id);

        const { data: ticketTypeData, error: ticketTypeError } = await supabase
          .from("ticket_types")
          .select("*")
          .in("event_id", eventIds);

        if (ticketTypeError) {
          console.error("Ticket types load error:", ticketTypeError);
          setTicketTypes([]);
          setOrders([]);
          return;
        }

        const loadedTicketTypes = (ticketTypeData || []) as TicketTypeRow[];
        setTicketTypes(loadedTicketTypes);

        if (loadedTicketTypes.length === 0) {
          setOrders([]);
          return;
        }

        const ticketTypeIds = loadedTicketTypes.map((ticket) => ticket.id);

        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .in("ticket_type_id", ticketTypeIds);

        if (orderError) {
          console.error("Orders load error:", orderError);
          setOrders([]);
          return;
        }

        setOrders((orderData || []) as OrderRow[]);
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const eventIds = events.map((event) => event.id);
    const eventIdSet = new Set(eventIds);

    const relevantTicketTypes = ticketTypes.filter((ticket) =>
      eventIdSet.has(ticket.event_id)
    );

    const relevantTicketTypeIds = new Set(relevantTicketTypes.map((t) => t.id));

    const paidOrders = orders.filter(
      (order) =>
        relevantTicketTypeIds.has(order.ticket_type_id) &&
        order.status === "paid"
    );

    const totalRevenue = paidOrders.reduce(
      (sum, order) => sum + Number(order.buyer_total || 0),
      0
    );

    const totalOrders = paidOrders.length;

    const totalTicketsRemaining = relevantTicketTypes.reduce(
      (sum, ticket) => sum + Number(ticket.quantity || 0),
      0
    );

    return {
      totalEvents: events.length,
      totalOrders,
      totalRevenue,
      totalTicketsRemaining,
    };
  }, [events, ticketTypes, orders]);

  const deleteEvent = async (eventId: string, eventTitle: string) => {
    const confirmed = window.confirm(
      `Delete "${eventTitle}" and all its related tickets/orders?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(eventId);

      const eventTicketTypes = ticketTypes.filter(
        (ticket) => ticket.event_id === eventId
      );
      const ticketTypeIds = eventTicketTypes.map((ticket) => ticket.id);

      if (ticketTypeIds.length > 0) {
        const eventOrders = orders.filter((order) =>
          ticketTypeIds.includes(order.ticket_type_id)
        );
        const orderIds = eventOrders.map((order) => order.id);

        if (orderIds.length > 0) {
          const { error: ticketsDeleteError } = await supabase
            .from("tickets")
            .delete()
            .in("order_id", orderIds);

          if (ticketsDeleteError) {
            alert(ticketsDeleteError.message);
            return;
          }
        }

        const { error: ordersDeleteError } = await supabase
          .from("orders")
          .delete()
          .in("ticket_type_id", ticketTypeIds);

        if (ordersDeleteError) {
          alert(ordersDeleteError.message);
          return;
        }

        const { error: ticketTypesDeleteError } = await supabase
          .from("ticket_types")
          .delete()
          .in("id", ticketTypeIds);

        if (ticketTypesDeleteError) {
          alert(ticketTypesDeleteError.message);
          return;
        }
      }

      const { error: eventDeleteError } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (eventDeleteError) {
        alert(eventDeleteError.message);
        return;
      }

      setEvents((prev) => prev.filter((event) => event.id !== eventId));
      setTicketTypes((prev) => prev.filter((ticket) => ticket.event_id !== eventId));

      const deletedTicketTypeIds = new Set(ticketTypeIds);
      setOrders((prev) =>
        prev.filter((order) => !deletedTicketTypeIds.has(order.ticket_type_id))
      );

      alert("Event deleted successfully");
    } catch (error) {
      console.error("Delete event error:", error);
      alert("Something went wrong while deleting the event");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 border border-white/10 bg-white/[0.03] p-6">
          <p className="mb-2 text-sm uppercase tracking-[0.18em] text-white/55">
            Swift Tickets
          </p>
          <h1 className="text-4xl font-extrabold tracking-[-0.03em]">
            Dashboard
          </h1>
          <p className="mt-3 text-white/70">Welcome back {email}</p>
          <p className="text-white/50">
            Account type: {accountType || "Unknown"}
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-white/55">Events</p>
            <p className="mt-2 text-3xl font-bold">{stats.totalEvents}</p>
          </div>

          <div className="border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-white/55">Paid Orders</p>
            <p className="mt-2 text-3xl font-bold">{stats.totalOrders}</p>
          </div>

          <div className="border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-white/55">Revenue</p>
            <p className="mt-2 text-3xl font-bold">
              R{stats.totalRevenue.toFixed(2)}
            </p>
          </div>

          <div className="border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-white/55">Tickets Remaining</p>
            <p className="mt-2 text-3xl font-bold">
              {stats.totalTicketsRemaining}
            </p>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          <Link
            href="/create-event"
            className="border border-white/20 px-5 py-3 text-sm font-semibold hover:bg-white hover:text-black"
          >
            Create Event
          </Link>

          <Link
            href="/dashboard/orders"
            className="border border-white/20 px-5 py-3 text-sm font-semibold hover:bg-white hover:text-black"
          >
            View Orders
          </Link>

          <Link
            href="/my-tickets"
            className="border border-white/20 px-5 py-3 text-sm font-semibold hover:bg-white hover:text-black"
          >
            My Tickets
          </Link>
        </div>

        <div className="border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Your Events</h2>
          </div>

          {loading ? (
            <p className="text-white/65">Loading dashboard...</p>
          ) : events.length === 0 ? (
            <p className="text-white/65">You have not created any events yet.</p>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-4 border border-white/10 p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h3 className="text-xl font-bold">{event.title}</h3>
                    <p className="mt-1 text-sm text-white/60">
                      {event.location || "No location"}
                    </p>
                    <p className="text-sm text-white/45">
                      {event.event_date
                        ? new Date(event.event_date).toLocaleString("en-ZA", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "No date"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/events/${event.id}`}
                      className="border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white hover:text-black"
                    >
                      View
                    </Link>

                    <button
                      onClick={() => deleteEvent(event.id, event.title)}
                      disabled={deletingId === event.id}
                      className="border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === event.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
