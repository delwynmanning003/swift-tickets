"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ActiveTab = "lineup" | "tickets" | "about" | "venue";

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
    ticket.quantity ??
      ticket.total_quantity ??
      ticket.max_quantity ??
      0
  );

  const soldQty = Number(
    ticket.sold_count ??
      ticket.quantity_sold ??
      ticket.sold ??
      0
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

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [resaleTickets, setResaleTickets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("tickets");
  const [loading, setLoading] = useState(true);
  const [shareMessage, setShareMessage] = useState("");
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const loadEventPage = async () => {
      setLoading(true);

      const { data: eventRow } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      const { data: ticketRows } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", id)
        .order("price", { ascending: true });

      const { data: resaleRows } = await supabase
        .from("resales")
        .select("*")
        .eq("status", "listed");

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

          if (!ticketType || ticketType.event_id !== id) return null;

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

  const availableTicketTypes = useMemo(() => {
    return ticketTypes.filter((ticket) => !isTicketSoldOut(ticket));
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
    return ticketTypes.length > 0 && availableTicketTypes.length === 0;
  }, [ticketTypes, availableTicketTypes]);

  const eventDateText = useMemo(() => {
    return formatEventDateRange(event?.event_date, event?.end_date || event?.event_end_date);
  }, [event]);

  const primaryVenueName = event?.venue_name || event?.location || "Venue TBA";
  const primaryVenueAddress = event?.venue_address || event?.location || "Address TBA";
  const cityLine = getCityLine(primaryVenueAddress);

  useEffect(() => {
    if (lineupItems.length === 0 && activeTab === "lineup") {
      setActiveTab("tickets");
    }
  }, [lineupItems, activeTab]);

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

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display", Arial, sans-serif',
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
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display", Arial, sans-serif',
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
        color: "#fff",
        fontFamily:
          'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display", Arial, sans-serif',
        paddingBottom: "110px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          margin: "0 auto",
          background: "#000",
        }}
      >
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
            style={{
              marginTop: 20,
              display: "flex",
              alignItems: "center",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            <a
              href="#"
              style={{
                color: "#8b5cf6",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
            >
              GOT A CODE?
            </a>

            {shareMessage ? (
              <span
                style={{
                  color: "#cfcfcf",
                  fontSize: 12,
                }}
              >
                {shareMessage}
              </span>
            ) : null}
          </div>
        </div>

        <div
          id="event-tabs"
          style={{
            marginTop: 22,
            padding: "0 16px",
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
                  color: activeTab === "lineup" ? "#fff" : "rgba(255,255,255,0.78)",
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

            <button
              onClick={() => setActiveTab("tickets")}
              style={{
                background: "transparent",
                border: "none",
                color: activeTab === "tickets" ? "#fff" : "rgba(255,255,255,0.78)",
                fontSize: 14,
                fontWeight: 700,
                padding: "0 0 14px",
                cursor: "pointer",
                borderBottom:
                  activeTab === "tickets"
                    ? "2px solid #fff"
                    : "2px solid transparent",
              }}
            >
              TICKETS
            </button>

            <button
              onClick={() => setActiveTab("about")}
              style={{
                background: "transparent",
                border: "none",
                color: activeTab === "about" ? "#fff" : "rgba(255,255,255,0.78)",
                fontSize: 14,
                fontWeight: 700,
                padding: "0 0 14px",
                cursor: "pointer",
                borderBottom:
                  activeTab === "about"
                    ? "2px solid #fff"
                    : "2px solid transparent",
              }}
            >
              ABOUT
            </button>

            <button
              onClick={() => setActiveTab("venue")}
              style={{
                background: "transparent",
                border: "none",
                color: activeTab === "venue" ? "#fff" : "rgba(255,255,255,0.78)",
                fontSize: 14,
                fontWeight: 700,
                padding: "0 0 14px",
                cursor: "pointer",
                borderBottom:
                  activeTab === "venue"
                    ? "2px solid #fff"
                    : "2px solid transparent",
              }}
            >
              VENUE
            </button>
          </div>
        </div>

        <div style={{ padding: "18px 16px 36px" }}>
          {activeTab === "lineup" && lineupItems.length > 0 ? (
            <div>
              <div style={{ display: "grid", gap: 10 }}>
                {lineupItems.map((artist, index) => (
                  <div
                    key={`${artist}-${index}`}
                    style={{
                      fontSize: 17,
                      lineHeight: 1.3,
                      fontWeight: 600,
                      color: "#fff",
                    }}
                  >
                    {artist}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "tickets" ? (
            <div style={{ display: "grid", gap: 14 }}>
              {ticketTypes.map((ticket: any) => {
                const buyerPrice = getBuyerTicketPrice(
                  Number(ticket.price || 0),
                  event?.fee_option
                );

                const soldOut = isTicketSoldOut(ticket);

                const ticketCard = (
                  <div
                    style={{
                      border: "1px solid rgba(255,255,255,0.22)",
                      padding: "18px 16px",
                      background: "#000",
                      minHeight: 132,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      opacity: soldOut ? 0.55 : 1,
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
                            color: soldOut ? "rgba(255,255,255,0.55)" : "#fff",
                            textTransform: "uppercase",
                          }}
                        >
                          {ticket.name}
                        </div>

                        {!soldOut && ticket.description ? (
                          <div
                            style={{
                              fontSize: 12,
                              lineHeight: 1.5,
                              color: "rgba(255,255,255,0.88)",
                              marginBottom: 16,
                              textTransform: "uppercase",
                            }}
                          >
                            {ticket.description}
                          </div>
                        ) : null}

                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: soldOut ? "rgba(255,255,255,0.55)" : "#fff",
                            marginBottom: soldOut ? 12 : 0,
                          }}
                        >
                          {buyerPrice === 0 ? "FREE" : formatMoney(buyerPrice)}
                        </div>

                        {soldOut ? (
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "1px solid #ff4d57",
                              color: "#ff4d57",
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "6px 10px",
                              letterSpacing: 0.4,
                              textTransform: "uppercase",
                            }}
                          >
                            Sold Out
                          </div>
                        ) : null}
                      </div>

                      {!soldOut ? (
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

                if (soldOut) {
                  return <div key={ticket.id}>{ticketCard}</div>;
                }

                return (
                  <Link
                    key={ticket.id}
                    href={`/checkout/${ticket.id}`}
                    style={{
                      textDecoration: "none",
                      color: "#fff",
                    }}
                  >
                    {ticketCard}
                  </Link>
                );
              })}

              {resaleTickets.map((item: any) => (
                <Link
                  key={item.resale.id}
                  href={`/resale/${item.resale.id}`}
                  style={{
                    textDecoration: "none",
                    color: "#fff",
                  }}
                >
                  <div
                    style={{
                      border: "1px solid rgba(249,115,22,0.55)",
                      padding: "16px 14px",
                      background: "rgba(249,115,22,0.06)",
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
                            fontSize: 17,
                            fontWeight: 700,
                            lineHeight: 1.2,
                            marginBottom: 6,
                          }}
                        >
                          {item.ticketType?.name} · Resale
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            lineHeight: 1.55,
                            color: "rgba(255,255,255,0.78)",
                            marginBottom: 8,
                          }}
                        >
                          Verified fan-to-fan resale ticket bought through Swift Tickets.
                        </div>

                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: 0.8,
                            textTransform: "uppercase",
                            color: "#fdba74",
                          }}
                        >
                          Resale listing
                        </div>
                      </div>

                      <div
                        style={{
                          whiteSpace: "nowrap",
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#fdba74",
                          paddingTop: 2,
                        }}
                      >
                        {formatMoney(Number(item.resale.resale_price || 0))} →
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {ticketTypes.length === 0 && resaleTickets.length === 0 ? (
                <div
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  No tickets available yet.
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === "about" ? (
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
          ) : null}

          {activeTab === "venue" ? (
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  lineHeight: 1.25,
                  marginBottom: 8,
                }}
              >
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
          ) : null}
        </div>
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
              : "TICKETS"}
          </button>
        </div>
      </div>
    </main>
  );
}