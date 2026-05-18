"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ActiveTab = "lineup" | "tickets" | "about" | "venue";

type TicketAvailability = {
  status: "available" | "coming_soon" | "sales_ended" | "sold_out";
  label: string;
  helper: string;
  canBuy: boolean;
};

function getBuyerTicketPrice(basePrice: number, feeOption?: string | null) {
  if (basePrice <= 0) return 0;

  if (feeOption === "buyer_pays_all") {
    return basePrice + 3 + basePrice * 0.04;
  }

  if (feeOption === "split") {
    return basePrice + basePrice * 0.04;
  }

  return basePrice;
}

function formatMoney(amount: number) {
  return `R${amount.toFixed(2)}`;
}

function formatShortDateTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatEventDateRange(eventDate?: string | null, endDate?: string | null) {
  if (!eventDate) return "";

  const start = new Date(eventDate);
  const end = endDate ? new Date(endDate) : null;

  const startDate = start.toLocaleDateString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const startTime = start.toLocaleTimeString("en-ZA", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (!end) {
    return `${startDate}, ${startTime}`;
  }

  const endTime = end.toLocaleTimeString("en-ZA", {
    hour: "numeric",
    minute: "2-digit",
  });

  const endYear = end.getFullYear();
  return `${startDate}, ${startTime} - ${endTime} ${endYear}`;
}

function normalizeLineup(raw: any) {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  if (typeof raw === "string") {
    return raw
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getCityLine(address?: string | null) {
  if (!address) return "Johannesburg, ZA";

  const lower = address.toLowerCase();

  if (lower.includes("johannesburg")) return "Johannesburg, ZA";
  if (lower.includes("pretoria")) return "Pretoria, ZA";
  if (lower.includes("cape town")) return "Cape Town, ZA";
  if (lower.includes("durban")) return "Durban, ZA";

  return "Johannesburg, ZA";
}

function getTicketRemainingQty(ticket: any) {
  const totalQty = Number(
    ticket.quantity ?? ticket.total_quantity ?? ticket.max_quantity ?? 0
  );

  const soldQty = Number(
    ticket.sold_count ?? ticket.quantity_sold ?? ticket.sold ?? 0
  );

  if (
    ticket.remaining_quantity !== null &&
    ticket.remaining_quantity !== undefined
  ) {
    return Number(ticket.remaining_quantity);
  }

  if (totalQty > 0) {
    return totalQty - soldQty;
  }

  return null;
}

function isTicketSoldOut(ticket: any) {
  const remainingQty = getTicketRemainingQty(ticket);

  return (
    ticket?.is_sold_out === true ||
    ticket?.sold_out === true ||
    remainingQty === 0
  );
}

function getTicketAvailability(ticket: any): TicketAvailability {
  const now = new Date();
  const soldOut = isTicketSoldOut(ticket);

  if (soldOut) {
    return {
      status: "sold_out",
      label: "Sold Out",
      helper: "This ticket type is no longer available.",
      canBuy: false,
    };
  }

  if (ticket.sales_start_at) {
    const startDate = new Date(ticket.sales_start_at);

    if (!Number.isNaN(startDate.getTime()) && startDate > now) {
      return {
        status: "coming_soon",
        label: "Coming Soon",
        helper: `Sales start ${formatShortDateTime(ticket.sales_start_at)}.`,
        canBuy: false,
      };
    }
  }

  if (ticket.sales_end_at) {
    const endDate = new Date(ticket.sales_end_at);

    if (!Number.isNaN(endDate.getTime()) && endDate < now) {
      return {
        status: "sales_ended",
        label: "Sales Ended",
        helper: `Sales ended ${formatShortDateTime(ticket.sales_end_at)}.`,
        canBuy: false,
      };
    }
  }

  return {
    status: "available",
    label: "Available",
    helper: ticket.description || "General event access.",
    canBuy: true,
  };
}

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [resaleTickets, setResaleTickets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("tickets");
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const loadEventPage = async () => {
      setLoading(true);

      const { data: eventById } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      let eventRow = eventById;

      if (!eventRow) {
        const { data: eventBySlug } = await supabase
          .from("events")
          .select("*")
          .eq("slug", id)
          .maybeSingle();

        eventRow = eventBySlug;
      }

      if (!eventRow) {
        setEvent(null);
        setTicketTypes([]);
        setResaleTickets([]);
        setLoading(false);
        return;
      }

      const eventId = eventRow.id;

      const { data: ticketRows } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", eventId)
        .order("price", { ascending: true });

      const { data: resaleRows } = await supabase
  .from("resales")
  .select("*")
  .eq("status", "active")
  .eq("event_id", eventId);
  .gt("expires_at", new Date().toISOString())

      const resaleEnriched = await Promise.all(
        (resaleRows || []).map(async (resale: any) => {
          const { data: ticket } = await supabase
            .from("tickets")
            .select("*")
            .eq("id", resale.ticket_id)
            .single();

          if (!ticket || ticket.checked_in) return null;

          const { data: ticketType } = await supabase
            .from("ticket_types")
            .select("*")
            .eq("id", ticket.ticket_type_id)
            .single();

          if (!ticketType || ticketType.event_id !== eventId) return null;

          return {
            resale,
            ticket,
            ticketType,
          };
        })
      );

      setEvent(eventRow);
      setTicketTypes(ticketRows || []);
      setResaleTickets((resaleEnriched.filter(Boolean) as any[]) || []);
      setLoading(false);
    };

    if (id) loadEventPage();
  }, [id]);

  const lineupItems = useMemo(() => {
    return normalizeLineup(
      event?.lineup ||
        event?.line_up ||
        event?.artists ||
        event?.performers ||
        event?.guest_list
    );
  }, [event]);

  useEffect(() => {
    if (lineupItems.length === 0 && activeTab === "lineup") {
      setActiveTab("tickets");
    }
  }, [lineupItems, activeTab]);

  const availableTicketTypes = useMemo(() => {
    return ticketTypes.filter((ticket) => getTicketAvailability(ticket).canBuy);
  }, [ticketTypes]);

  const lowestPrice = useMemo(() => {
    const availableNormalPrices = availableTicketTypes
      .map((t) => getBuyerTicketPrice(Number(t.price || 0), event?.fee_option))
      .filter((n) => !Number.isNaN(n) && n >= 0);

    const resalePrices = resaleTickets
      .map((r: any) => Number(r.resale?.resale_price || 0))
      .filter((n) => !Number.isNaN(n) && n >= 0);

    const all = [...availableNormalPrices, ...resalePrices];

    if (all.length === 0) return null;
    return Math.min(...all);
  }, [availableTicketTypes, resaleTickets, event]);

  const allPrimaryTicketsSoldOut = useMemo(() => {
    return (
      ticketTypes.length > 0 &&
      ticketTypes.every(
        (ticket) => getTicketAvailability(ticket).status === "sold_out"
      )
    );
  }, [ticketTypes]);

  const hasUpcomingTickets = useMemo(() => {
    return ticketTypes.some(
      (ticket) => getTicketAvailability(ticket).status === "coming_soon"
    );
  }, [ticketTypes]);

  const hasSalesEndedTickets = useMemo(() => {
    return ticketTypes.some(
      (ticket) => getTicketAvailability(ticket).status === "sales_ended"
    );
  }, [ticketTypes]);

  const eventDateText = useMemo(() => {
    return formatEventDateRange(
      event?.event_date,
      event?.end_date || event?.event_end_date
    );
  }, [event]);

  const formattedDate = useMemo(() => {
    if (!event?.event_date) return "";
    return new Date(event.event_date).toLocaleDateString("en-ZA", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [event]);

  const formattedTime = useMemo(() => {
    if (!event?.event_date) return "";
    return new Date(event.event_date).toLocaleTimeString("en-ZA", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [event]);

  const primaryVenueName = event?.venue_name || event?.location || "Venue TBA";
  const primaryVenueAddress =
    event?.venue_address || event?.location || "Address TBA";

  const cityLine = getCityLine(primaryVenueAddress);

  const handleShare = async () => {
    try {
      const url = typeof window !== "undefined" ? window.location.href : "";
      if (!url) return;

      if (navigator.share) {
        await navigator.share({
          title: event?.title || "Swift Tickets Event",
          text: `Check out ${event?.title || "this event"} on Swift Tickets`,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      setShareMessage("Link copied");
      setTimeout(() => setShareMessage(""), 2200);
    } catch {
      setShareMessage("Could not share link");
      setTimeout(() => setShareMessage(""), 2200);
    }
  };

  const goToTickets = () => {
    setActiveTab("tickets");
    const el = document.getElementById("event-tabs");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const renderTicketCard = (ticket: any, mobile: boolean) => {
    const buyerPrice = getBuyerTicketPrice(
      Number(ticket.price || 0),
      event?.fee_option
    );

    const availability = getTicketAvailability(ticket);
    const inactive = !availability.canBuy;    if (mobile) {
      const card = (
        <div
          style={{
            border: inactive
              ? "1px solid rgba(255,255,255,0.22)"
              : "1px solid rgba(255,255,255,0.75)",
            padding: "18px 16px",
            background: "#000",
            minHeight: 132,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            opacity: inactive ? 0.55 : 1,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  lineHeight: 1.2,
                  marginBottom: 14,
                  color: inactive ? "rgba(255,255,255,0.55)" : "#fff",
                  textTransform: "uppercase",
                }}
              >
                {ticket.name}
              </div>

              {availability.helper ? (
                <div
                  style={{
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: inactive
                      ? "rgba(255,255,255,0.55)"
                      : "rgba(255,255,255,0.88)",
                    marginBottom: 16,
                    textTransform: "uppercase",
                  }}
                >
                  {availability.helper}
                </div>
              ) : null}

              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: inactive ? "rgba(255,255,255,0.55)" : "#fff",
                  marginBottom: inactive ? 12 : 0,
                }}
              >
                {buyerPrice === 0 ? "FREE" : formatMoney(buyerPrice)}
              </div>

              {inactive ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border:
                      availability.status === "coming_soon"
                        ? "1px solid #60a5fa"
                        : "1px solid #ff4d57",
                    color:
                      availability.status === "coming_soon"
                        ? "#93c5fd"
                        : "#ff4d57",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "6px 10px",
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                  }}
                >
                  {availability.label}
                </div>
              ) : null}
            </div>

            {!inactive ? (
              <div
                style={{
                  whiteSpace: "nowrap",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#fff",
                  paddingTop: 2,
                }}
              >
                ↗
              </div>
            ) : null}
          </div>
        </div>
      );

      if (inactive) {
        return <div key={ticket.id}>{card}</div>;
      }

      return (
        <Link
          key={ticket.id}
          href={`/checkout/${ticket.id}`}
          style={{ textDecoration: "none", color: "#fff" }}
        >
          {card}
        </Link>
      );
    }

    const desktopCard = (
      <div
        style={{
          border: inactive
            ? "1px solid rgba(255,255,255,0.28)"
            : "1px solid rgba(255,255,255,0.75)",
          padding: "22px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 20,
          opacity: inactive ? 0.55 : 1,
          background: "#000",
        }}
      >
        <div>
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: 18,
              fontWeight: 700,
              color: inactive ? "rgba(255,255,255,0.6)" : "#fff",
            }}
          >
            {ticket.name}
          </h3>

          {!inactive ? (
            <>
              <p
                style={{
                  margin: "0 0 8px",
                  color: "#e5e7eb",
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                {availability.helper}
              </p>
              <p
                style={{
                  margin: 0,
                  color: "#9ca3af",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                {buyerPrice === 0 ? "No extra fees" : "Includes all fees"}
              </p>
            </>
          ) : (
            <>
              <p
                style={{
                  margin: "0 0 8px",
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                {availability.helper}
              </p>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border:
                    availability.status === "coming_soon"
                      ? "1px solid #60a5fa"
                      : "1px solid #ff4d57",
                  color:
                    availability.status === "coming_soon"
                      ? "#93c5fd"
                      : "#ff4d57",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "6px 10px",
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  marginTop: 6,
                }}
              >
                {availability.label}
              </div>
            </>
          )}
        </div>

        <div
          style={{
            whiteSpace: "nowrap",
            fontSize: 16,
            fontWeight: 700,
            color: inactive ? "rgba(255,255,255,0.6)" : "#fff",
          }}
        >
          {buyerPrice === 0
            ? inactive
              ? "FREE"
              : "FREE →"
            : inactive
            ? formatMoney(buyerPrice)
            : `${formatMoney(buyerPrice)} →`}
        </div>
      </div>
    );

    if (inactive) {
      return <div key={ticket.id}>{desktopCard}</div>;
    }

    return (
      <Link
        key={ticket.id}
        href={`/checkout/${ticket.id}`}
        style={{
          textDecoration: "none",
          color: "white",
        }}
      >
        {desktopCard}
      </Link>
    );
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "white",
          padding: 40,
          fontFamily:
            'ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", Arial, sans-serif',
        }}
      >
        Loading event...
      </main>
    );
  }

  if (!event) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "white",
          padding: 40,
          fontFamily:
            'ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", Arial, sans-serif',
        }}
      >
        Event not found.
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "white",
        fontFamily:
          'ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", Arial, sans-serif',
        paddingBottom: isMobile ? 110 : 0,
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: isMobile ? "0 0 32px" : "18px 24px 48px",
        }}
      >
        {!isMobile && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 18,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                flexWrap: "wrap",
              }}
            >
              <Link href="/" style={{ display: "flex", alignItems: "center" }}>
                <Image
                  src="/logo.svg"
                  alt="Swift Tickets"
                  width={130}
                  height={40}
                  style={{ objectFit: "contain" }}
                />
              </Link>

              <div
                style={{
                  border: "1px solid rgba(255,255,255,0.7)",
                  minWidth: 430,
                  maxWidth: 430,
                  height: 42,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "0 14px",
                }}
              >
                <span style={{ fontSize: 18 }}>⌕</span>
                <span style={{ color: "white", fontSize: 14 }}>
                  What do you want to experience live?
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/explore"
                style={{
                  color: "white",
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                EXPLORE
              </Link>

              <Link
                href="/create-event"
                style={{
                  textDecoration: "none",
                  background: "white",
                  color: "black",
                  padding: "11px 18px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                CREATE EVENT
              </Link>

              <Link
                href="/login"
                style={{
                  color: "white",
                  textDecoration: "none",
                  fontSize: 12,
                }}
              >
                ACCOUNT
              </Link>
            </div>
          </div>
        )}

        {isMobile ? (
          <div style={{ width: "100%", maxWidth: 640, margin: "0 auto", background: "#000" }}>
            <div
              style={{
                height: 64,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                position: "sticky",
                top: 0,
                zIndex: 30,
                background: "rgba(0,0,0,0.96)",
                backdropFilter: "blur(10px)",
              }}
            >
              <button
                type="button"
                onClick={() => router.back()}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  fontSize: 28,
                  lineHeight: 1,
                  cursor: "pointer",
                  padding: 0,
                  width: 28,
                }}
                aria-label="Back"
              >
                ←
              </button>

              <Link href="/" style={{ display: "inline-flex", alignItems: "center" }}>
                <Image
                  src="/logo.svg"
                  alt="Swift Tickets"
                  width={110}
                  height={28}
                  style={{ objectFit: "contain" }}
                />
              </Link>

              <button
                type="button"
                onClick={handleShare}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  fontSize: 20,
                  lineHeight: 1,
                  cursor: "pointer",
                  padding: 0,
                  width: 28,
                }}
                aria-label="Share"
              >
                ↗
              </button>
            </div>

            <div style={{ padding: "16px 16px 0" }}>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "1 / 1",
                  background: event.image_url ? "#111" : "#d9d9d9",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {event.image_url ? (
                  <Image
                    src={event.image_url}
                    alt={event.title}
                    fill
                    style={{ objectFit: "cover" }}
                    sizes="(max-width: 640px) 100vw, 640px"
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 18,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    Event Poster
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: "14px 16px 0" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      color: "#fff",
                      fontSize: 14,
                      lineHeight: 1.45,
                      fontWeight: 500,
                      opacity: 0.9,
                    }}
                  >
                    {eventDateText}
                  </p>

                  <h1
                    style={{
                      margin: "10px 0 0",
                      fontSize: 25,
                      lineHeight: 1.08,
                      fontWeight: 800,
                      letterSpacing: "-0.6px",
                    }}
                  >
                    {event.title}
                  </h1>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    paddingTop: 4,
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setIsWishlisted((v) => !v)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#fff",
                      fontSize: 28,
                      lineHeight: 1,
                      cursor: "pointer",
                      padding: 0,
                    }}
                    aria-label="Wishlist"
                  >
                    {isWishlisted ? "♥" : "♡"}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                {event.category ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 28,
                      padding: "0 10px",
                      border: "1px solid rgba(255,255,255,0.75)",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.6,
                      textTransform: "uppercase",
                    }}
                  >
                    {event.category}
                  </span>
                ) : null}

                {lowestPrice !== null ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 28,
                      padding: "0 12px",
                      border: "1px solid rgba(255,255,255,0.75)",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.6,
                      textTransform: "uppercase",
                    }}
                  >
                    {lowestPrice === 0 ? "FREE" : `FROM ${formatMoney(lowestPrice)}`}
                  </span>
                ) : allPrimaryTicketsSoldOut ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 28,
                      padding: "0 12px",
                      border: "1px solid #ff4d57",
                      color: "#ff4d57",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.6,
                      textTransform: "uppercase",
                    }}
                  >
                    Sold Out
                  </span>
                ) : hasUpcomingTickets ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 28,
                      padding: "0 12px",
                      border: "1px solid #60a5fa",
                      color: "#93c5fd",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.6,
                      textTransform: "uppercase",
                    }}
                  >
                    Coming Soon
                  </span>
                ) : hasSalesEndedTickets ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 28,
                      padding: "0 12px",
                      border: "1px solid #ff4d57",
                      color: "#ff4d57",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.6,
                      textTransform: "uppercase",
                    }}
                  >
                    Sales Ended
                  </span>
                ) : null}
              </div>

              <div style={{ marginTop: 18 }}>
                <p
                  style={{
                    margin: 0,
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: 500,
                    lineHeight: 1.2,
                  }}
                >
                  {primaryVenueName}
                </p>

                <p
                  style={{
                    margin: "4px 0 0",
                    color: "#fff",
                    opacity: 0.9,
                    fontSize: 13,
                    lineHeight: 1.4,
                  }}
                >
                  {cityLine}
                </p>
              </div>

              <div
                id="event-tabs"
                style={{
                  marginTop: 22,
                  padding: "0",
                  borderBottom: "1px solid rgba(255,255,255,0.14)",
                  overflowX: "auto",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 28,
                    minWidth: "max-content",
                  }}
                >
                  {lineupItems.length > 0 ? (
                    <button
                      onClick={() => setActiveTab("lineup")}
                      style={{
                        background: "transparent",
                        border: "none",
                        color:
                          activeTab === "lineup"
                            ? "#fff"
                            : "rgba(255,255,255,0.78)",
                        fontSize: 14,
                        fontWeight: 700,
                        padding: "0 0 14px",
                        cursor: "pointer",
                        borderBottom:
                          activeTab === "lineup"
                            ? "2px solid #fff"
                            : "2px solid transparent",
                      }}
                    >
                      LINE UP
                    </button>
                  ) : null}

                  {(["tickets", "about", "venue"] as ActiveTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color:
                          activeTab === tab
                            ? "#fff"
                            : "rgba(255,255,255,0.78)",
                        fontSize: 14,
                        fontWeight: 700,
                        padding: "0 0 14px",
                        cursor: "pointer",
                        borderBottom:
                          activeTab === tab
                            ? "2px solid #fff"
                            : "2px solid transparent",
                      }}
                    >
                      {tab.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: "18px 16px 36px" }}>
              {activeTab === "tickets" ? (
                <div style={{ display: "grid", gap: 14 }}>
                  {ticketTypes.map((ticket: any) =>
                    renderTicketCard(ticket, true)
                  )}

                  {resaleTickets.map((item: any) => (
                    <Link
                      key={item.resale.id}
                      href={`/resale/${item.resale.id}`}
                      style={{ textDecoration: "none", color: "#fff" }}
                    >
                      <div
                        style={{
                          border: "1px solid rgba(249,115,22,0.55)",
                          padding: "16px 14px",
                          background: "rgba(249,115,22,0.06)",
                        }}
                      >
                        <strong>{item.ticketType?.name} · Resale</strong>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.78)" }}>
                          Verified fan-to-fan resale ticket bought through Swift Tickets.
                        </p>
                        <strong style={{ color: "#fdba74" }}>
                          {formatMoney(Number(item.resale.resale_price || 0))} →
                        </strong>
                      </div>
                    </Link>
                  ))}

                  {ticketTypes.length === 0 && resaleTickets.length === 0 ? (
                    <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
                      No tickets available yet.
                    </div>
                  ) : null}
                </div>
              ) : activeTab === "about" ? (
                <div
                  style={{
                    color: "#fff",
                    fontSize: 14,
                    lineHeight: 1.75,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {event.description || "More event details coming soon."}
                </div>
              ) : activeTab === "venue" ? (
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                    {primaryVenueName}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      lineHeight: 1.7,
                      color: "rgba(255,255,255,0.8)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {primaryVenueAddress}
                  </div>
                </div>
              ) : lineupItems.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {lineupItems.map((artist, index) => (
                    <div key={`${artist}-${index}`} style={{ fontSize: 17 }}>
                      {artist}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div
              style={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: 0,
                background: "#000",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                padding: "14px 16px calc(14px + env(safe-area-inset-bottom))",
                zIndex: 60,
              }}
            >
              <div style={{ maxWidth: 640, margin: "0 auto" }}>
                <button
                  onClick={goToTickets}
                  style={{
                    width: "100%",
                    height: 58,
                    borderRadius: 18,
                    border: "none",
                    background: "#f1f1f1",
                    color: "#111",
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: 0.2,
                    cursor: "pointer",
                  }}
                >
                  {lowestPrice !== null
                    ? `TICKETS FROM ${
                        lowestPrice === 0 ? "FREE" : formatMoney(lowestPrice)
                      }`
                    : allPrimaryTicketsSoldOut
                    ? "SOLD OUT"
                    : hasUpcomingTickets
                    ? "COMING SOON"
                    : hasSalesEndedTickets
                    ? "SALES ENDED"
                    : "TICKETS"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "360px 1fr",
              gap: 48,
              alignItems: "start",
            }}
          >
            <div>
              <div
                style={{
                  width: "100%",
                  aspectRatio: "0.9",
                  position: "relative",
                  overflow: "hidden",
                  background: event.image_url
                    ? "#111"
                    : "linear-gradient(135deg, #334155, #0f172a, #1e293b)",
                  marginBottom: 16,
                }}
              >
                {event.image_url ? (
                  <Image
                    src={event.image_url}
                    alt={event.title}
                    fill
                    style={{ objectFit: "cover" }}
                  />
                ) : null}
              </div>

              <div style={{ marginBottom: 24 }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>
                  {primaryVenueName}
                </h3>
                <p style={{ margin: 0, color: "#d1d5db", fontSize: 13 }}>
                  {primaryVenueAddress}
                </p>
              </div>

              <button
                type="button"
                onClick={handleShare}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "white",
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                SHARE EVENT
              </button>

              {shareMessage ? (
                <p style={{ marginTop: 10, fontSize: 12, color: "#d1d5db" }}>
                  {shareMessage}
                </p>
              ) : null}
            </div>

            <div>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: 190,
                  overflow: "hidden",
                  marginBottom: 20,
                  background: event.image_url
                    ? "#111"
                    : "linear-gradient(135deg, rgba(249,115,22,0.35), rgba(59,130,246,0.35))",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {event.image_url ? (
                  <>
                    <Image
                      src={event.image_url}
                      alt={event.title}
                      fill
                      style={{
                        objectFit: "cover",
                        filter: "blur(28px) saturate(1.2)",
                        transform: "scale(1.18)",
                        opacity: 0.9,
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0.25), rgba(0,0,0,0.55))",
                      }}
                    />
                  </>
                ) : null}

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    padding: "22px 26px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <p style={{ margin: "0 0 10px", color: "#e5e7eb" }}>
                    By Swift Tickets
                  </p>
                  <h1
                    style={{
                      margin: "0 0 10px",
                      fontSize: 64,
                      lineHeight: 0.95,
                      fontWeight: 800,
                      letterSpacing: "-1px",
                    }}
                  >
                    {event.title}
                  </h1>
                  <p style={{ margin: 0, fontSize: 16, color: "#f3f4f6" }}>
                    {formattedDate} · {formattedTime}
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: "#f3f4f6",
                  color: "#111",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 18px 16px 24px",
                  marginBottom: 24,
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {lowestPrice !== null
                      ? `TICKETS FROM ${
                          lowestPrice === 0 ? "FREE" : formatMoney(lowestPrice)
                        }`
                      : allPrimaryTicketsSoldOut
                      ? "SOLD OUT"
                      : hasUpcomingTickets
                      ? "COMING SOON"
                      : hasSalesEndedTickets
                      ? "SALES ENDED"
                      : "TICKETS"}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      color: "#4b5563",
                    }}
                  >
                    {lowestPrice === 0
                      ? "No extra fees"
                      : lowestPrice !== null
                      ? "Includes all fees"
                      : "Check ticket availability below"}
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab("tickets")}
                  style={{
                    background: "black",
                    color: "white",
                    border: "none",
                    padding: "14px 24px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  VIEW TICKETS
                </button>
              </div>

              <div
                id="event-tabs"
                style={{
                  display: "flex",
                  gap: 28,
                  marginBottom: 24,
                  borderBottom: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {lineupItems.length > 0 ? (
                  <button
                    onClick={() => setActiveTab("lineup")}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: activeTab === "lineup" ? "white" : "#9ca3af",
                      padding: "0 0 12px",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      borderBottom:
                        activeTab === "lineup"
                          ? "2px solid white"
                          : "2px solid transparent",
                    }}
                  >
                    LINE UP
                  </button>
                ) : null}

                {(["tickets", "about", "venue"] as ActiveTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: activeTab === tab ? "white" : "#9ca3af",
                      padding: "0 0 12px",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      borderBottom:
                        activeTab === tab
                          ? "2px solid white"
                          : "2px solid transparent",
                    }}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>

              {activeTab === "tickets" ? (
                <div>
                  <h2 style={{ margin: "0 0 20px", fontSize: 35, fontWeight: 800 }}>
                    Tickets
                  </h2>

                  <div style={{ display: "grid", gap: 16 }}>
                    {ticketTypes.map((ticket: any) =>
                      renderTicketCard(ticket, false)
                    )}

                    {resaleTickets.map((item: any) => (
                      <Link
                        key={item.resale.id}
                        href={`/resale/${item.resale.id}`}
                        style={{ textDecoration: "none", color: "white" }}
                      >
                        <div
                          style={{
                            border: "1px solid rgba(249,115,22,0.7)",
                            padding: "22px 24px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 20,
                            background: "rgba(249,115,22,0.06)",
                          }}
                        >
                          <div>
                            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>
                              {item.ticketType?.name} · Resale
                            </h3>
                            <p style={{ margin: 0, color: "#e5e7eb", fontSize: 12 }}>
                              Verified fan-to-fan resale ticket bought through Swift Tickets.
                            </p>
                          </div>
                          <strong style={{ color: "#fdba74" }}>
                            {formatMoney(Number(item.resale.resale_price || 0))} →
                          </strong>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : activeTab === "about" ? (
                <div>
                  <h2 style={{ margin: "0 0 20px", fontSize: 40, fontWeight: 800 }}>
                    About
                  </h2>
                  <div
                    style={{
                      border: "1px solid rgba(255,255,255,0.2)",
                      padding: 24,
                      lineHeight: 1.7,
                    }}
                  >
                    <p
                      style={{
                        color: "#e5e7eb",
                        fontSize: 14,
                        margin: 0,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {event.description || "More event details coming soon."}
                    </p>
                  </div>
                </div>
              ) : activeTab === "venue" ? (
                <div>
                  <h2 style={{ margin: "0 0 20px", fontSize: 40, fontWeight: 800 }}>
                    Venue
                  </h2>
                  <div
                    style={{
                      border: "1px solid rgba(255,255,255,0.2)",
                      padding: 24,
                      lineHeight: 1.7,
                    }}
                  >
                    <p style={{ marginTop: 0, marginBottom: 6, fontSize: 18 }}>
                      {primaryVenueName}
                    </p>
                    <p style={{ color: "#d1d5db", fontSize: 15, margin: 0 }}>
                      {primaryVenueAddress}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 style={{ margin: "0 0 20px", fontSize: 35, fontWeight: 800 }}>
                    Line Up
                  </h2>
                  <div style={{ display: "grid", gap: 14 }}>
                    {lineupItems.map((artist, index) => (
                      <div key={`${artist}-${index}`} style={{ fontSize: 18 }}>
                        {artist}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}