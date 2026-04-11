"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type EventRow = {
  id: string;
  title: string;
  location: string | null;
  event_date: string | null;
  category: string | null;
  image_url: string | null;
  description: string | null;
  creator_type: string | null;
  organizer_email: string | null;
  user_id: string | null;
};

type TicketTypeRow = {
  id: string;
  event_id: string;
  name: string;
  price: number | string;
  quantity: number | string;
};

type TicketRow = {
  id: string;
  event_id?: string | null;
  ticket_type_id: string | null;
  status?: string | null;
};

type EventAnalytics = {
  totalCapacity: number;
  ticketsSold: number;
  ticketsLeft: number;
  grossRevenue: number;
  ticketTypesCount: number;
};

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, EventAnalytics>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isOrganiser, setIsOrganiser] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);
      setCheckingAuth(false);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data: eventRows, error: eventsError } = await supabase
          .from("events")
          .select("*")
          .eq("user_id", user.id)
          .order("event_date", { ascending: false });

        if (eventsError) {
          throw new Error(eventsError.message);
        }

        const eventsData = (eventRows || []) as EventRow[];
        setEvents(eventsData);

        const organiserCheck = eventsData.some(
          (event) =>
            event.creator_type === "organiser" ||
            event.organizer_email === user.email
        );

        setIsOrganiser(organiserCheck);

        if (eventsData.length === 0) {
          setAnalytics({});
          return;
        }

        const eventIds = eventsData.map((event) => event.id);

        const { data: ticketTypeRows, error: ticketTypesError } = await supabase
          .from("ticket_types")
          .select("id, event_id, name, price, quantity")
          .in("event_id", eventIds);

        if (ticketTypesError) {
          throw new Error(ticketTypesError.message);
        }

        const typedTicketTypes = (ticketTypeRows || []) as TicketTypeRow[];
        const ticketTypeIds = typedTicketTypes.map((ticketType) => ticketType.id);

        let typedTickets: TicketRow[] = [];

        if (ticketTypeIds.length > 0) {
          const { data: ticketRows, error: ticketsError } = await supabase
            .from("tickets")
            .select("id, ticket_type_id, status")
            .in("ticket_type_id", ticketTypeIds);

          if (ticketsError) {
            throw new Error(ticketsError.message);
          }

          typedTickets = (ticketRows || []) as TicketRow[];
        }

        const ticketTypesByEvent = typedTicketTypes.reduce<Record<string, TicketTypeRow[]>>(
          (acc, ticketType) => {
            if (!acc[ticketType.event_id]) acc[ticketType.event_id] = [];
            acc[ticketType.event_id].push(ticketType);
            return acc;
          },
          {}
        );

        const ticketsByTicketType = typedTickets.reduce<Record<string, TicketRow[]>>(
          (acc, ticket) => {
            const key = ticket.ticket_type_id;
            if (!key) return acc;
            if (!acc[key]) acc[key] = [];
            acc[key].push(ticket);
            return acc;
          },
          {}
        );

        const analyticsMap: Record<string, EventAnalytics> = {};

        for (const event of eventsData) {
          const eventTicketTypes = ticketTypesByEvent[event.id] || [];

          const totalCapacity = eventTicketTypes.reduce(
            (sum, ticketType) => sum + Number(ticketType.quantity || 0),
            0
          );

          let ticketsSold = 0;
          let grossRevenue = 0;

          for (const ticketType of eventTicketTypes) {
            const soldForType = (ticketsByTicketType[ticketType.id] || []).filter(
              (ticket) => ticket.status !== "cancelled"
            ).length;

            ticketsSold += soldForType;
            grossRevenue += soldForType * Number(ticketType.price || 0);
          }

          const ticketsLeft = Math.max(totalCapacity - ticketsSold, 0);

          analyticsMap[event.id] = {
            totalCapacity,
            ticketsSold,
            ticketsLeft,
            grossRevenue,
            ticketTypesCount: eventTicketTypes.length,
          };
        }

        setAnalytics(analyticsMap);
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!checkingAuth) {
      loadDashboard();
    }
  }, [user, checkingAuth]);

  const totals = useMemo(() => {
    return events.reduce(
      (acc, event) => {
        const eventStats = analytics[event.id];

        acc.events += 1;
        acc.sold += eventStats?.ticketsSold || 0;
        acc.left += eventStats?.ticketsLeft || 0;
        acc.revenue += eventStats?.grossRevenue || 0;

        return acc;
      },
      { events: 0, sold: 0, left: 0, revenue: 0 }
    );
  }, [events, analytics]);

  const handleDeleteEvent = async (eventId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this event? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setDeletingId(eventId);

      const { data: ticketTypeRows, error: ticketTypesError } = await supabase
        .from("ticket_types")
        .select("id")
        .eq("event_id", eventId);

      if (ticketTypesError) {
        throw new Error(ticketTypesError.message);
      }

      const ticketTypeIds = (ticketTypeRows || []).map((row: any) => row.id);

      if (ticketTypeIds.length > 0) {
        const { error: deleteTicketsError } = await supabase
          .from("tickets")
          .delete()
          .in("ticket_type_id", ticketTypeIds);

        if (deleteTicketsError) {
          throw new Error(deleteTicketsError.message);
        }

        const { error: deleteTicketTypesError } = await supabase
          .from("ticket_types")
          .delete()
          .eq("event_id", eventId);

        if (deleteTicketTypesError) {
          throw new Error(deleteTicketTypesError.message);
        }
      }

      const { error: deleteEventError } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId)
        .eq("user_id", user.id);

      if (deleteEventError) {
        throw new Error(deleteEventError.message);
      }

      setEvents((prev) => prev.filter((event) => event.id !== eventId));
      setAnalytics((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
    } catch (error) {
      console.error("Delete event error:", error);
      alert(error instanceof Error ? error.message : "Failed to delete event");
    } finally {
      setDeletingId(null);
    }
  };

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-white/60">Checking your account...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="w-full max-w-md border border-white/15 bg-[#0b0b0b] p-8 text-center">
          <p className="text-[12px] uppercase tracking-[0.16em] text-white/50">
            Swift Tickets
          </p>
          <h1 className="mt-3 text-[32px] font-extrabold">Log in required</h1>
          <p className="mt-3 text-sm text-white/70">
            Log in or sign up to view your events dashboard.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/signup"
              className="bg-white px-6 py-3 text-sm font-bold text-black"
            >
              Sign Up
            </Link>
            <Link
              href="/login"
              className="border border-white/30 px-6 py-3 text-sm text-white"
            >
              Log In
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-white/60">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-[1440px] px-6 py-8 md:px-8 md:py-10">
        <div className="mb-8 overflow-hidden border border-white/10 bg-white/[0.03]">
          <div className="bg-[linear-gradient(90deg,rgba(249,115,22,0.14),rgba(59,130,246,0.14))] px-6 py-6 md:px-8">
            <p className="mb-2 text-[15px] text-gray-200">By Swift Tickets</p>
            <h1 className="text-[40px] font-extrabold leading-[0.95] tracking-[-0.03em] md:text-[56px]">
              Dashboard
            </h1>
            <p className="mt-2 text-[14px] text-white/75">
              View your events, track ticket performance, and manage listings.
            </p>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="border border-white/15 bg-white/[0.03] p-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">
              Total Events
            </p>
            <p className="mt-3 text-[30px] font-extrabold">{totals.events}</p>
          </div>

          <div className="border border-white/15 bg-white/[0.03] p-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">
              Tickets Sold
            </p>
            <p className="mt-3 text-[30px] font-extrabold">{totals.sold}</p>
          </div>

          <div className="border border-white/15 bg-white/[0.03] p-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">
              Tickets Left
            </p>
            <p className="mt-3 text-[30px] font-extrabold">{totals.left}</p>
          </div>

          <div className="border border-white/15 bg-white/[0.03] p-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">
              Gross Revenue
            </p>
            <p className="mt-3 text-[30px] font-extrabold">
              R{totals.revenue.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[32px] font-extrabold tracking-[-0.03em]">
            My Events
          </h2>

          <div className="flex gap-3">
            {isOrganiser && (
              <Link
                href="/scanner"
                className="border border-white/25 px-6 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-white hover:text-black"
              >
                Scanner
              </Link>
            )}

            <Link
              href="/create-event"
              className="bg-white px-6 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-white/90"
            >
              Create Event
            </Link>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="border border-white/15 bg-white/[0.03] p-10 text-center">
            <h3 className="text-[26px] font-extrabold">No events yet</h3>
            <p className="mt-3 text-white/65">
              Create your first event to start selling tickets on Swift Tickets.
            </p>

            <Link
              href="/create-event"
              className="mt-6 inline-block bg-white px-6 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-black"
            >
              Create Your First Event
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {events.map((event) => {
              const stats = analytics[event.id] || {
                totalCapacity: 0,
                ticketsSold: 0,
                ticketsLeft: 0,
                grossRevenue: 0,
                ticketTypesCount: 0,
              };

              return (
                <div
                  key={event.id}
                  className="grid gap-5 border border-white/15 bg-white/[0.03] p-5 lg:grid-cols-[220px_1fr]"
                >
                  <div className="relative aspect-[0.82] w-full overflow-hidden bg-[linear-gradient(135deg,#334155,#0f172a,#1e293b)]">
                    {event.image_url ? (
                      <Image
                        src={event.image_url}
                        alt={event.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(249,115,22,0.35),rgba(59,130,246,0.25),rgba(0,0,0,0.65))]" />
                    )}
                  </div>

                  <div className="flex flex-col justify-between gap-6">
                    <div>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-white/70">
                          {event.category || "Uncategorised"}
                        </span>

                        {event.creator_type ? (
                          <span className="border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-white/70">
                            {event.creator_type}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="text-[28px] font-extrabold leading-tight tracking-[-0.03em]">
                        {event.title}
                      </h3>

                      <p className="mt-2 text-[14px] text-white/70">
                        {event.location || "Location coming soon"}
                      </p>

                      <p className="mt-1 text-[13px] text-white/50">
                        {event.event_date
                          ? new Date(event.event_date).toLocaleString("en-ZA", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Date coming soon"}
                      </p>

                      {event.description ? (
                        <p className="mt-4 max-w-3xl text-[14px] leading-6 text-white/65">
                          {event.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="border border-white/10 bg-black/30 p-4">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">
                          Tickets Sold
                        </p>
                        <p className="mt-2 text-[24px] font-extrabold">
                          {stats.ticketsSold}
                        </p>
                      </div>

                      <div className="border border-white/10 bg-black/30 p-4">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">
                          Tickets Left
                        </p>
                        <p className="mt-2 text-[24px] font-extrabold">
                          {stats.ticketsLeft}
                        </p>
                      </div>

                      <div className="border border-white/10 bg-black/30 p-4">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">
                          Capacity
                        </p>
                        <p className="mt-2 text-[24px] font-extrabold">
                          {stats.totalCapacity}
                        </p>
                      </div>

                      <div className="border border-white/10 bg-black/30 p-4">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">
                          Revenue
                        </p>
                        <p className="mt-2 text-[24px] font-extrabold">
                          R{stats.grossRevenue.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/events/${event.id}`}
                        className="border border-white/25 px-5 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-white hover:text-black"
                      >
                        View Event
                      </Link>

                      <Link
                        href={`/edit-event/${event.id}`}
                        className="bg-white px-5 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-white/90"
                      >
                        Edit Event
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(event.id)}
                        disabled={deletingId === event.id}
                        className="border border-red-500/50 px-5 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-red-300 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === event.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}