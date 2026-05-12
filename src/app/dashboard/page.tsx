"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  price: number | string | null;
  quantity: number | string | null;
  remaining_quantity?: number | string | null;
  sold_count?: number | string | null;
  sold_out?: boolean | null;
};

type TicketRow = {
  id: string;
  ticket_type_id: string | null;
  checked_in: boolean | null;
  status: string | null;
  created_at?: string | null;
};

type EventAnalytics = {
  totalCapacity: number;
  ticketsSold: number;
  ticketsLeft: number;
  grossRevenue: number;
  ticketTypesCount: number;
  freeTickets: number;
  paidTickets: number;
  issuedTickets: number;
  checkedInTickets: number;
  notCheckedInTickets: number;
  checkInRate: number;
};

type PayoutForm = {
  account_holder_name: string;
  business_name: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  branch_code: string;
  verification_status: string;
};

function formatMoney(value: number) {
  return `R${value.toFixed(2)}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-ZA").format(value);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}

function formatDate(value?: string | null) {
  if (!value) return "Date coming soon";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date coming soon";

  return date.toLocaleString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSellThrough(stats?: EventAnalytics) {
  if (!stats || stats.totalCapacity <= 0) return 0;
  return (stats.ticketsSold / stats.totalCapacity) * 100;
}

function getEventStatus(event: EventRow, stats?: EventAnalytics) {
  const sellThrough = getSellThrough(stats);
  const eventDate = event.event_date ? new Date(event.event_date) : null;
  const isPast = eventDate ? eventDate.getTime() < Date.now() : false;

  if (stats && stats.totalCapacity > 0 && stats.ticketsLeft <= 0) {
    return {
      label: "Sold Out",
      className: "border-red-500/45 bg-red-500/10 text-red-300",
    };
  }

  if (stats && stats.totalCapacity > 0 && sellThrough >= 80) {
    return {
      label: "Low Stock",
      className: "border-orange-400/45 bg-orange-400/10 text-orange-200",
    };
  }

  if (isPast) {
    return {
      label: "Past Event",
      className: "border-white/15 bg-white/[0.04] text-white/50",
    };
  }

  return {
    label: "Live",
    className: "border-emerald-400/45 bg-emerald-400/10 text-emerald-200",
  };
}

const emptyStats: EventAnalytics = {
  totalCapacity: 0,
  ticketsSold: 0,
  ticketsLeft: 0,
  grossRevenue: 0,
  ticketTypesCount: 0,
  freeTickets: 0,
  paidTickets: 0,
  issuedTickets: 0,
  checkedInTickets: 0,
  notCheckedInTickets: 0,
  checkInRate: 0,
};

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, EventAnalytics>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isOrganiser, setIsOrganiser] = useState(false);
  const [hasCreatedEvents, setHasCreatedEvents] = useState(false);

  const [activeSection, setActiveSection] = useState<
    "overview" | "events" | "payouts"
  >("overview");

  const [payoutForm, setPayoutForm] = useState<PayoutForm>({
    account_holder_name: "",
    business_name: "",
    bank_name: "",
    account_number: "",
    account_type: "",
    branch_code: "",
    verification_status: "pending setup",
  });

  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutSaving, setPayoutSaving] = useState(false);

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

  const loadPayoutProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      setPayoutLoading(true);

      const { data, error } = await supabase
        .from("organizer_profiles")
        .select(
          "account_holder_name, business_name, bank_name, account_number, account_type, branch_code, verification_status"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw new Error(error.message);

      if (data) {
        setPayoutForm({
          account_holder_name: data.account_holder_name || "",
          business_name: data.business_name || "",
          bank_name: data.bank_name || "",
          account_number: data.account_number || "",
          account_type: data.account_type || "",
          branch_code: data.branch_code || "",
          verification_status: data.verification_status || "pending setup",
        });
      }
    } catch (error) {
      console.error("Load payout profile error:", error);
    } finally {
      setPayoutLoading(false);
    }
  }, [user]);

  const loadDashboard = useCallback(async () => {
    if (!user?.id) {
      setEvents([]);
      setAnalytics({});
      setIsOrganiser(false);
      setHasCreatedEvents(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: ownedEventsRows, error: ownedEventsError } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .order("event_date", { ascending: false });

      if (ownedEventsError) throw new Error(ownedEventsError.message);

      const ownedEvents = (ownedEventsRows || []) as EventRow[];
      setEvents(ownedEvents);

      const hasEvents = ownedEvents.length > 0;
      setHasCreatedEvents(hasEvents);

      const organiserCheck =
        ownedEvents.some(
          (event) =>
            event.creator_type?.toLowerCase() === "organiser" ||
            event.creator_type?.toLowerCase() === "venue"
        ) || false;

      setIsOrganiser(organiserCheck || hasEvents);

      if (!hasEvents) {
        setAnalytics({});
        return;
      }

      const eventIds = ownedEvents.map((event) => event.id);

      const { data: ticketTypeRows, error: ticketTypesError } = await supabase
        .from("ticket_types")
        .select(
          "id, event_id, name, price, quantity, remaining_quantity, sold_count, sold_out"
        )
        .in("event_id", eventIds);

      if (ticketTypesError) throw new Error(ticketTypesError.message);

      const typedTicketTypes = (ticketTypeRows || []) as TicketTypeRow[];
      const ticketTypeIds = typedTicketTypes.map((ticketType) => ticketType.id);

      let typedTickets: TicketRow[] = [];

      if (ticketTypeIds.length > 0) {
        const { data: ticketRows, error: ticketsError } = await supabase
          .from("tickets")
          .select("id, ticket_type_id, checked_in, status, created_at")
          .in("ticket_type_id", ticketTypeIds);

        if (ticketsError) throw new Error(ticketsError.message);

        typedTickets = (ticketRows || []) as TicketRow[];
      }

      const ticketTypesByEvent = typedTicketTypes.reduce<
        Record<string, TicketTypeRow[]>
      >((acc, ticketType) => {
        if (!acc[ticketType.event_id]) acc[ticketType.event_id] = [];
        acc[ticketType.event_id].push(ticketType);
        return acc;
      }, {});

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

      for (const event of ownedEvents) {
        const eventTicketTypes = ticketTypesByEvent[event.id] || [];

        const totalCapacity = eventTicketTypes.reduce((sum, ticketType) => {
          return sum + Number(ticketType.quantity || 0);
        }, 0);

        let ticketsSold = 0;
        let grossRevenue = 0;
        let freeTickets = 0;
        let paidTickets = 0;
        let issuedTickets = 0;
        let checkedInTickets = 0;

        for (const ticketType of eventTicketTypes) {
          const ticketPrice = Number(ticketType.price || 0);
          const soldCount = Number(ticketType.sold_count || 0);
          const ticketsForType = ticketsByTicketType[ticketType.id] || [];

          ticketsSold += soldCount;
          issuedTickets += ticketsForType.length;
          checkedInTickets += ticketsForType.filter(
            (ticket) => ticket.checked_in === true
          ).length;

          if (ticketPrice <= 0) {
            freeTickets += soldCount;
          } else {
            paidTickets += soldCount;
            grossRevenue += soldCount * ticketPrice;
          }
        }

        const ticketsLeft = eventTicketTypes.reduce((sum, ticketType) => {
          return sum + Number(ticketType.remaining_quantity || 0);
        }, 0);

        const notCheckedInTickets = Math.max(issuedTickets - checkedInTickets, 0);
        const checkInRate =
          issuedTickets > 0 ? (checkedInTickets / issuedTickets) * 100 : 0;

        analyticsMap[event.id] = {
          totalCapacity,
          ticketsSold,
          ticketsLeft,
          grossRevenue,
          ticketTypesCount: eventTicketTypes.length,
          freeTickets,
          paidTickets,
          issuedTickets,
          checkedInTickets,
          notCheckedInTickets,
          checkInRate,
        };
      }

      setAnalytics(analyticsMap);
    } catch (error) {
      console.error("Dashboard load error:", error);
      alert(error instanceof Error ? error.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!checkingAuth) loadDashboard();
  }, [checkingAuth, loadDashboard]);

  useEffect(() => {
    if (user?.id) loadPayoutProfile();
  }, [user, loadPayoutProfile]);

  const totals = useMemo(() => {
    return events.reduce(
      (acc, event) => {
        const eventStats = analytics[event.id];
        const eventDate = event.event_date ? new Date(event.event_date) : null;
        const isUpcoming = eventDate ? eventDate.getTime() >= Date.now() : false;
        const sellThrough = getSellThrough(eventStats);

        acc.events += 1;
        acc.sold += eventStats?.ticketsSold || 0;
        acc.left += eventStats?.ticketsLeft || 0;
        acc.capacity += eventStats?.totalCapacity || 0;
        acc.revenue += eventStats?.grossRevenue || 0;
        acc.ticketTypes += eventStats?.ticketTypesCount || 0;
        acc.freeTickets += eventStats?.freeTickets || 0;
        acc.paidTickets += eventStats?.paidTickets || 0;
        acc.issuedTickets += eventStats?.issuedTickets || 0;
        acc.checkedInTickets += eventStats?.checkedInTickets || 0;

        if (isUpcoming) acc.upcoming += 1;

        if (
          eventStats &&
          eventStats.totalCapacity > 0 &&
          eventStats.ticketsLeft <= 0
        ) {
          acc.soldOutEvents += 1;
        }

        if (
          eventStats &&
          eventStats.totalCapacity > 0 &&
          eventStats.ticketsLeft > 0 &&
          sellThrough >= 80
        ) {
          acc.lowStockEvents += 1;
        }

        return acc;
      },
      {
        events: 0,
        sold: 0,
        left: 0,
        capacity: 0,
        revenue: 0,
        ticketTypes: 0,
        upcoming: 0,
        soldOutEvents: 0,
        lowStockEvents: 0,
        freeTickets: 0,
        paidTickets: 0,
        issuedTickets: 0,
        checkedInTickets: 0,
      }
    );
  }, [events, analytics]);

  const sellThroughRate =
    totals.capacity > 0 ? (totals.sold / totals.capacity) * 100 : 0;

  const averageRevenuePerTicket =
    totals.paidTickets > 0 ? totals.revenue / totals.paidTickets : 0;

  const freeTicketShare =
    totals.sold > 0 ? (totals.freeTickets / totals.sold) * 100 : 0;

  const paidTicketShare =
    totals.sold > 0 ? (totals.paidTickets / totals.sold) * 100 : 0;

  const totalCheckInRate =
    totals.issuedTickets > 0
      ? (totals.checkedInTickets / totals.issuedTickets) * 100
      : 0;

  const eventInsights = useMemo(() => {
    const withStats = events.map((event) => {
      const stats = analytics[event.id] || emptyStats;

      return {
        event,
        stats,
        sellThrough: getSellThrough(stats),
      };
    });

    const highestRevenue = [...withStats].sort(
      (a, b) => b.stats.grossRevenue - a.stats.grossRevenue
    )[0];

    const bestSelling = [...withStats].sort(
      (a, b) => b.stats.ticketsSold - a.stats.ticketsSold
    )[0];

    const mostFreeTickets = [...withStats].sort(
      (a, b) => b.stats.freeTickets - a.stats.freeTickets
    )[0];

    const highestCheckIn = [...withStats].sort(
      (a, b) => b.stats.checkInRate - a.stats.checkInRate
    )[0];

    const lowestStock = [...withStats]
      .filter((item) => item.stats.totalCapacity > 0 && item.stats.ticketsLeft > 0)
      .sort((a, b) => a.stats.ticketsLeft - b.stats.ticketsLeft)[0];

    return {
      highestRevenue,
      bestSelling,
      mostFreeTickets,
      highestCheckIn,
      lowestStock,
      rankedEvents: withStats.sort(
        (a, b) => b.stats.grossRevenue - a.stats.grossRevenue
      ),
    };
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

      if (ticketTypesError) throw new Error(ticketTypesError.message);

      const ticketTypeIds = (ticketTypeRows || []).map((row: any) => row.id);

      if (ticketTypeIds.length > 0) {
        const { error: deleteTicketsError } = await supabase
          .from("tickets")
          .delete()
          .in("ticket_type_id", ticketTypeIds);

        if (deleteTicketsError) throw new Error(deleteTicketsError.message);

        const { error: deleteTicketTypesError } = await supabase
          .from("ticket_types")
          .delete()
          .eq("event_id", eventId);

        if (deleteTicketTypesError) throw new Error(deleteTicketTypesError.message);
      }

      const { error: deleteEventError } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId)
        .eq("user_id", user.id);

      if (deleteEventError) throw new Error(deleteEventError.message);

      await loadDashboard();
    } catch (error) {
      console.error("Delete event error:", error);
      alert(error instanceof Error ? error.message : "Failed to delete event");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePayoutChange = (field: keyof PayoutForm, value: string) => {
    setPayoutForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSavePayouts = async () => {
    if (!user?.id) return;

    try {
      setPayoutSaving(true);

      const payload = {
        user_id: user.id,
        account_holder_name: payoutForm.account_holder_name.trim(),
        business_name: payoutForm.business_name.trim(),
        bank_name: payoutForm.bank_name.trim(),
        account_number: payoutForm.account_number.trim(),
        account_type: payoutForm.account_type.trim(),
        branch_code: payoutForm.branch_code.trim(),
      };

      const { error } = await supabase
        .from("organizer_profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (error) throw new Error(error.message);

      await loadPayoutProfile();
      alert("Payout details saved successfully.");
    } catch (error) {
      console.error("Save payouts error:", error);
      alert(error instanceof Error ? error.message : "Failed to save payout details");
    } finally {
      setPayoutSaving(false);
    }
  };

  const StatCard = ({
    label,
    value,
    helper,
  }: {
    label: string;
    value: string | number;
    helper?: string;
  }) => (
    <div className="border border-white/15 bg-white/[0.035] p-5">
      <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">
        {label}
      </p>
      <p className="mt-3 text-[28px] font-extrabold tracking-[-0.03em] md:text-[32px]">
        {value}
      </p>
      {helper ? <p className="mt-2 text-[12px] text-white/45">{helper}</p> : null}
    </div>
  );

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
            Log in to access your organiser dashboard.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Link href="/signup" className="bg-white px-6 py-3 text-sm font-bold text-black">
              Sign Up
            </Link>
            <Link href="/login" className="border border-white/30 px-6 py-3 text-sm text-white">
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
        <p className="text-white/60">Loading organiser dashboard...</p>
      </main>
    );
  }

  if (!hasCreatedEvents) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-12">
          <div className="w-full border border-white/15 bg-white/[0.03] p-8 md:p-10">
            <p className="text-[12px] uppercase tracking-[0.16em] text-white/50">
              Swift Tickets
            </p>
            <h1 className="mt-3 text-[34px] font-extrabold tracking-[-0.03em] md:text-[46px]">
              This dashboard is for organisers
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/70">
              Create your first event to unlock organiser tools, event analytics,
              scanner access, and payout setup.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/create-event"
                className="bg-white px-6 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-white/90"
              >
                Create Your First Event
              </Link>

              <Link
                href="/"
                className="border border-white/25 px-6 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-white hover:text-black"
              >
                Back Home
              </Link>
            </div>
          </div>
        </div>
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
              Organiser Dashboard
            </h1>
            <p className="mt-2 text-[14px] text-white/75">
              Track sales, free tickets, check-ins, capacity, revenue, payouts, and event performance.
            </p>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          {(["overview", "events", "payouts"] as const).map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={`px-5 py-3 text-[12px] font-bold uppercase tracking-[0.08em] transition ${
                activeSection === section
                  ? "bg-white text-black"
                  : "border border-white/25 text-white hover:bg-white hover:text-black"
              }`}
            >
              {section === "overview"
                ? "Overview"
                : section === "events"
                ? "My Events"
                : "Payouts"}
            </button>
          ))}

          {isOrganiser && (
            <Link
              href="/scanner"
              className="border border-white/25 px-5 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-white hover:text-black"
            >
              Scanner
            </Link>
          )}

          <Link
            href="/create-event"
            className="bg-white px-5 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-white/90"
          >
            Create Event
          </Link>
        </div>

        {activeSection === "overview" && (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Gross Revenue" value={formatMoney(totals.revenue)} helper="Paid tickets only" />
              <StatCard label="Tickets Claimed / Sold" value={formatNumber(totals.sold)} helper={`${formatPercent(sellThroughRate)} sell-through`} />
              <StatCard label="Free Tickets Claimed" value={formatNumber(totals.freeTickets)} helper={`${formatPercent(freeTicketShare)} of total tickets`} />
              <StatCard label="Paid Tickets Sold" value={formatNumber(totals.paidTickets)} helper={`${formatPercent(paidTicketShare)} of total tickets`} />
              <StatCard label="Total Capacity" value={formatNumber(totals.capacity)} helper={`${formatNumber(totals.left)} tickets still available`} />
              <StatCard label="Checked In" value={formatNumber(totals.checkedInTickets)} helper={`${formatPercent(totalCheckInRate)} check-in rate`} />
              <StatCard label="Tickets Issued" value={formatNumber(totals.issuedTickets)} helper="Generated QR tickets" />
              <StatCard label="Sold Out Events" value={formatNumber(totals.soldOutEvents)} helper="Events with no tickets left" />
            </div>

            <div className="mb-8 grid gap-6 lg:grid-cols-4">
              <div className="border border-white/15 bg-white/[0.03] p-6">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Highest Revenue Event</p>
                <h3 className="mt-3 text-[22px] font-extrabold tracking-[-0.03em]">
                  {eventInsights.highestRevenue?.event.title || "No data yet"}
                </h3>
                <p className="mt-3 text-[26px] font-extrabold">
                  {formatMoney(eventInsights.highestRevenue?.stats.grossRevenue || 0)}
                </p>
              </div>

              <div className="border border-white/15 bg-white/[0.03] p-6">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Best Selling Event</p>
                <h3 className="mt-3 text-[22px] font-extrabold tracking-[-0.03em]">
                  {eventInsights.bestSelling?.event.title || "No data yet"}
                </h3>
                <p className="mt-3 text-[26px] font-extrabold">
                  {formatNumber(eventInsights.bestSelling?.stats.ticketsSold || 0)} total
                </p>
              </div>

              <div className="border border-white/15 bg-white/[0.03] p-6">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Most Free Tickets</p>
                <h3 className="mt-3 text-[22px] font-extrabold tracking-[-0.03em]">
                  {eventInsights.mostFreeTickets?.event.title || "No data yet"}
                </h3>
                <p className="mt-3 text-[26px] font-extrabold">
                  {formatNumber(eventInsights.mostFreeTickets?.stats.freeTickets || 0)} free
                </p>
              </div>

              <div className="border border-white/15 bg-white/[0.03] p-6">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Highest Check-In Rate</p>
                <h3 className="mt-3 text-[22px] font-extrabold tracking-[-0.03em]">
                  {eventInsights.highestCheckIn?.event.title || "No data yet"}
                </h3>
                <p className="mt-3 text-[26px] font-extrabold">
                  {formatPercent(eventInsights.highestCheckIn?.stats.checkInRate || 0)}
                </p>
              </div>
            </div>
          </>
        )}

        {activeSection === "events" && (
          <div className="grid gap-6">
            {events.map((event) => {
              const stats = analytics[event.id] || emptyStats;
              const sellThrough = getSellThrough(stats);
              const status = getEventStatus(event, stats);
              const eventFreeShare =
                stats.ticketsSold > 0
                  ? (stats.freeTickets / stats.ticketsSold) * 100
                  : 0;

              return (
                <div
                  key={event.id}
                  className="grid gap-5 border border-white/15 bg-white/[0.03] p-5 lg:grid-cols-[220px_1fr]"
                >
                  <div className="relative aspect-[0.82] w-full overflow-hidden bg-[linear-gradient(135deg,#334155,#0f172a,#1e293b)]">
                    {event.image_url ? (
                      <Image src={event.image_url} alt={event.title} fill className="object-cover" />
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

                        <span className={`border px-3 py-1 text-[11px] uppercase tracking-[0.12em] ${status.className}`}>
                          {status.label}
                        </span>

                        {stats.freeTickets > 0 ? (
                          <span className="border border-violet-400/40 bg-violet-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-violet-200">
                            {formatNumber(stats.freeTickets)} Free
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
                        {formatDate(event.event_date)}
                      </p>
                    </div>

                    <div>
                      <div className="mb-2 flex justify-between text-[12px] text-white/50">
                        <span>Sell-through</span>
                        <span>{formatPercent(sellThrough)}</span>
                      </div>
                      <div className="h-2 overflow-hidden bg-white/10">
                        <div className="h-full bg-white" style={{ width: `${Math.min(sellThrough, 100)}%` }} />
                      </div>

                      <div className="mt-4 mb-2 flex justify-between text-[12px] text-white/50">
                        <span>Check-in rate</span>
                        <span>{formatPercent(stats.checkInRate)}</span>
                      </div>
                      <div className="h-2 overflow-hidden bg-white/10">
                        <div className="h-full bg-emerald-300" style={{ width: `${Math.min(stats.checkInRate, 100)}%` }} />
                      </div>

                      <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-white/45">
                        <span>{formatPercent(eventFreeShare)} free ticket share</span>
                        <span>{formatNumber(stats.notCheckedInTickets)} not checked in</span>
                        <span>{formatNumber(stats.ticketsLeft)} left</span>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-6">
                      <StatCard label="Total" value={stats.ticketsSold} />
                      <StatCard label="Paid" value={stats.paidTickets} />
                      <StatCard label="Free" value={stats.freeTickets} />
                      <StatCard label="Issued" value={stats.issuedTickets} />
                      <StatCard label="Checked In" value={stats.checkedInTickets} />
                      <StatCard label="Not In" value={stats.notCheckedInTickets} />
                      <StatCard label="Left" value={stats.ticketsLeft} />
                      <StatCard label="Capacity" value={stats.totalCapacity} />
                      <StatCard label="Revenue" value={formatMoney(stats.grossRevenue)} />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link href={`/events/${event.id}`} className="border border-white/25 px-5 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-white hover:text-black">
                        View Event
                      </Link>

                      <Link href={`/edit-event/${event.id}`} className="bg-white px-5 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-white/90">
                        Edit Event / Tickets
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

        {activeSection === "payouts" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr]">
            <div className="border border-white/15 bg-white/[0.03] p-6">
              <h2 className="text-[30px] font-extrabold tracking-[-0.03em]">
                Payout Details
              </h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {[
                  ["account_holder_name", "Account Holder Name", "Account holder name"],
                  ["business_name", "Business Name", "Business name"],
                  ["bank_name", "Bank Name", "Bank name"],
                  ["account_number", "Account Number", "Account number"],
                  ["branch_code", "Branch Code", "Branch code"],
                ].map(([field, label, placeholder]) => (
                  <div key={field}>
                    <label className="mb-2 block text-[12px] font-bold uppercase tracking-[0.1em] text-white/60">
                      {label}
                    </label>
                    <input
                      value={payoutForm[field as keyof PayoutForm]}
                      onChange={(e) =>
                        handlePayoutChange(field as keyof PayoutForm, e.target.value)
                      }
                      className="w-full border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-white/40"
                      placeholder={placeholder}
                    />
                  </div>
                ))}

                <div>
                  <label className="mb-2 block text-[12px] font-bold uppercase tracking-[0.1em] text-white/60">
                    Account Type
                  </label>
                  <select
                    value={payoutForm.account_type}
                    onChange={(e) => handlePayoutChange("account_type", e.target.value)}
                    className="w-full border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-white/40"
                  >
                    <option value="">Select account type</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Current">Current</option>
                    <option value="Savings">Savings</option>
                    <option value="Business">Business</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSavePayouts}
                disabled={payoutSaving || payoutLoading}
                className="mt-6 bg-white px-6 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {payoutSaving ? "Saving..." : "Save Payout Details"}
              </button>
            </div>

            <div className="border border-white/15 bg-white/[0.03] p-6">
              <h2 className="text-[24px] font-extrabold tracking-[-0.03em]">
                Payout Summary
              </h2>

              <div className="mt-6 grid gap-4">
                <StatCard label="Available Balance" value="R0.00" />
                <StatCard label="Pending Balance" value="R0.00" />
                <StatCard
                  label="Verification Status"
                  value={
                    payoutLoading
                      ? "Loading..."
                      : payoutForm.verification_status || "Pending setup"
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}