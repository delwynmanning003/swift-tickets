"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function EventPage() {
  const params = useParams();
  const id = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [resaleTickets, setResaleTickets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"tickets" | "venue">("tickets");
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

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
      setResaleTickets(resaleEnriched.filter(Boolean) as any[]);
      setLoading(false);
    };

    if (id) loadEventPage();
  }, [id]);

  const lowestPrice = useMemo(() => {
    const normalPrices = ticketTypes.map((t) => Number(t.price || 0));
    const resalePrices = resaleTickets.map((r: any) =>
      Number(r.resale?.resale_price || 0)
    );
    const all = [...normalPrices, ...resalePrices].filter((n) => n >= 0);

    if (all.length === 0) return null;
    return Math.min(...all);
  }, [ticketTypes, resaleTickets]);

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
          padding: isMobile ? "14px 0 32px" : "18px 24px 48px",
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
                href="/"
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
          <div style={{ padding: "0 22px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 18,
              }}
            >
              <Link
                href="/"
                style={{
                  color: "white",
                  textDecoration: "none",
                  fontSize: 28,
                  lineHeight: 1,
                }}
              >
                ←
              </Link>

              <Image
                src="/logo.svg"
                alt="Swift Tickets"
                width={110}
                height={34}
                style={{ objectFit: "contain" }}
              />

              <div style={{ width: 28 }} />
            </div>

            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "1 / 1.02",
                overflow: "hidden",
                background: event.image_url
                  ? "#111"
                  : "linear-gradient(135deg,#334155,#0f172a,#1e293b)",
                marginBottom: 22,
              }}
            >
              {event.image_url ? (
                <Image
                  src={event.image_url}
                  alt={event.title}
                  fill
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(135deg, rgba(249,115,22,0.35), rgba(59,130,246,0.25), rgba(0,0,0,0.65))",
                  }}
                />
              )}
            </div>

            <p
              style={{
                margin: "0 0 8px",
                color: "#d1d5db",
                fontSize: 15,
                lineHeight: 1.5,
              }}
            >
              {formattedDate} · {formattedTime}
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 8,
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: 30,
                  lineHeight: 1.05,
                  fontWeight: 800,
                  letterSpacing: "-0.8px",
                  flex: 1,
                }}
              >
                {event.title}
              </h1>

              <button
                type="button"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "white",
                  fontSize: 20,
                  cursor: "pointer",
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ♡
              </button>
            </div>

            <p
              style={{
                margin: "0 0 2px",
                fontSize: 16,
                fontWeight: 500,
                color: "white",
              }}
            >
              {event.location}
            </p>

            <p
              style={{
                margin: "0 0 24px",
                color: "#d1d5db",
                fontSize: 13,
              }}
            >
              {event.city || "Johannesburg"}, ZA
            </p>

            <a
              href="#"
              style={{
                color: "#8b5cf6",
                textDecoration: "underline",
                fontWeight: 600,
                fontSize: 13,
                display: "inline-block",
                marginBottom: 28,
              }}
            >
              GOT A CODE?
            </a>

            <div
              style={{
                display: "flex",
                gap: 34,
                marginBottom: 28,
                borderBottom: "1px solid rgba(255,255,255,0.14)",
              }}
            >
              <button
                onClick={() => setActiveTab("tickets")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: activeTab === "tickets" ? "white" : "#9ca3af",
                  padding: "0 0 14px",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  borderBottom:
                    activeTab === "tickets"
                      ? "2px solid white"
                      : "2px solid transparent",
                }}
              >
                TICKETS
              </button>

              <button
                onClick={() => setActiveTab("venue")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: activeTab === "venue" ? "white" : "#9ca3af",
                  padding: "0 0 14px",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  borderBottom:
                    activeTab === "venue"
                      ? "2px solid white"
                      : "2px solid transparent",
                }}
              >
                VENUE
              </button>
            </div>

            {activeTab === "tickets" ? (
              <div>
                <h2
                  style={{
                    margin: "0 0 20px",
                    fontSize: 26,
                    fontWeight: 800,
                    letterSpacing: "-0.6px",
                  }}
                >
                  Tickets
                </h2>

                <div style={{ display: "grid", gap: 16 }}>
                  {ticketTypes.map((ticket: any) => (
                    <Link
                      key={ticket.id}
                      href={`/checkout/${ticket.id}`}
                      style={{
                        textDecoration: "none",
                        color: "white",
                      }}
                    >
                      <div
                        style={{
                          border: "1px solid rgba(255,255,255,0.6)",
                          padding: "22px 20px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 18,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 16,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <h3
                              style={{
                                margin: "0 0 10px",
                                fontSize: 18,
                                lineHeight: 1.2,
                                fontWeight: 700,
                              }}
                            >
                              {ticket.name}
                            </h3>

                            <p
                              style={{
                                margin: 0,
                                color: "#e5e7eb",
                                fontSize: 13,
                                lineHeight: 1.55,
                              }}
                            >
                              {ticket.description || "General event access."}
                            </p>
                          </div>

                          <div
                            style={{
                              fontSize: 22,
                              lineHeight: 1,
                              color: "white",
                            }}
                          >
                            ↗
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                          }}
                        >
                          {Number(ticket.price) === 0
                            ? "FREE"
                            : `R${Number(ticket.price).toFixed(2)}`}
                        </div>
                      </div>
                    </Link>
                  ))}

                  {resaleTickets.map((item: any) => (
                    <Link
                      key={item.resale.id}
                      href={`/resale/${item.resale.id}`}
                      style={{
                        textDecoration: "none",
                        color: "white",
                      }}
                    >
                      <div
                        style={{
                          border: "1px solid rgba(249,115,22,0.7)",
                          padding: "22px 20px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 18,
                          background: "rgba(249,115,22,0.06)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 16,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <h3
                              style={{
                                margin: "0 0 10px",
                                fontSize: 18,
                                lineHeight: 1.2,
                                fontWeight: 700,
                              }}
                            >
                              {item.ticketType?.name} · Resale
                            </h3>

                            <p
                              style={{
                                margin: 0,
                                color: "#e5e7eb",
                                fontSize: 13,
                                lineHeight: 1.55,
                              }}
                            >
                              Verified fan-to-fan resale ticket bought through
                              Swift Tickets.
                            </p>
                          </div>

                          <div
                            style={{
                              fontSize: 22,
                              lineHeight: 1,
                              color: "#fdba74",
                            }}
                          >
                            ↗
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                            color: "#fdba74",
                          }}
                        >
                          R{Number(item.resale.resale_price).toFixed(2)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h2
                  style={{
                    margin: "0 0 20px",
                    fontSize: 26,
                    fontWeight: 800,
                    letterSpacing: "-0.6px",
                  }}
                >
                  Venue
                </h2>

                <div
                  style={{
                    border: "1px solid rgba(255,255,255,0.18)",
                    padding: 20,
                    lineHeight: 1.7,
                  }}
                >
                  <p style={{ marginTop: 0, marginBottom: 8, fontSize: 17 }}>
                    <strong>{event.location}</strong>
                  </p>
                  <p
                    style={{
                      color: "#d1d5db",
                      fontSize: 14,
                      marginTop: 0,
                      marginBottom: 12,
                    }}
                  >
                    {event.city || "Johannesburg"}, South Africa
                  </p>
                  <p style={{ color: "#e5e7eb", fontSize: 14, margin: 0 }}>
                    {event.description || "Venue details coming soon."}
                  </p>
                </div>
              </div>
            )}
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
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "end",
                      justifyContent: "start",
                      padding: 22,
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.1))",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: "0 0 8px",
                          fontSize: 11,
                          letterSpacing: 1.5,
                          textTransform: "uppercase",
                          color: "#e5e7eb",
                        }}
                      >
                        Live event
                      </p>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: 36,
                          lineHeight: 0.95,
                          fontWeight: 800,
                          textTransform: "uppercase",
                        }}
                      >
                        {event.title}
                      </h2>
                    </div>
                  </div>
                )}
              </div>

              <h3
                style={{
                  margin: "0 0 4px",
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                {event.location}
              </h3>

              <p
                style={{
                  margin: "0 0 24px",
                  color: "#d1d5db",
                  fontSize: 12,
                }}
              >
                {event.city || "Johannesburg"}, ZA
              </p>

              <a
                href="#"
                style={{
                  color: "#8b5cf6",
                  textDecoration: "underline",
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                GOT A CODE?
              </a>
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
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(90deg, rgba(249,115,22,0.35), rgba(59,130,246,0.35))",
                    }}
                  />
                )}

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
                  <p
                    style={{
                      margin: "0 0 10px",
                      color: "#e5e7eb",
                      fontSize: 16,
                      fontWeight: 500,
                    }}
                  >
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

                  <p
                    style={{
                      margin: 0,
                      fontSize: 16,
                      color: "#f3f4f6",
                    }}
                  >
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
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: "-0.5px",
                  }}
                >
                  TICKETS FROM{" "}
                  {lowestPrice !== null
                    ? lowestPrice === 0
                      ? "FREE"
                      : `R${lowestPrice.toFixed(2)}`
                    : "N/A"}
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
                  GET TICKETS
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 28,
                  marginBottom: 24,
                  borderBottom: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <button
                  onClick={() => setActiveTab("tickets")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: activeTab === "tickets" ? "white" : "#9ca3af",
                    padding: "0 0 12px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    borderBottom:
                      activeTab === "tickets"
                        ? "2px solid white"
                        : "2px solid transparent",
                  }}
                >
                  TICKETS
                </button>

                <button
                  onClick={() => setActiveTab("venue")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: activeTab === "venue" ? "white" : "#9ca3af",
                    padding: "0 0 12px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    borderBottom:
                      activeTab === "venue"
                        ? "2px solid white"
                        : "2px solid transparent",
                  }}
                >
                  VENUE
                </button>
              </div>

              {activeTab === "tickets" ? (
                <div>
                  <h2
                    style={{
                      margin: "0 0 20px",
                      fontSize: 35,
                      fontWeight: 800,
                      letterSpacing: "-1px",
                    }}
                  >
                    Tickets
                  </h2>

                  <div style={{ display: "grid", gap: 16 }}>
                    {ticketTypes.map((ticket: any) => (
                      <Link
                        key={ticket.id}
                        href={`/checkout/${ticket.id}`}
                        style={{
                          textDecoration: "none",
                          color: "white",
                        }}
                      >
                        <div
                          style={{
                            border: "1px solid rgba(255,255,255,0.75)",
                            padding: "22px 24px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 20,
                          }}
                        >
                          <div>
                            <h3
                              style={{
                                margin: "0 0 8px",
                                fontSize: 18,
                                fontWeight: 700,
                              }}
                            >
                              {ticket.name}
                            </h3>
                            <p
                              style={{
                                margin: 0,
                                color: "#e5e7eb",
                                fontSize: 11,
                                lineHeight: 1.5,
                              }}
                            >
                              {ticket.description || "General event access."}
                            </p>
                          </div>

                          <div
                            style={{
                              whiteSpace: "nowrap",
                              fontSize: 16,
                              fontWeight: 700,
                            }}
                          >
                            {Number(ticket.price) === 0
                              ? "FREE →"
                              : `R${Number(ticket.price).toFixed(2)} →`}
                          </div>
                        </div>
                      </Link>
                    ))}

                    {resaleTickets.map((item: any) => (
                      <Link
                        key={item.resale.id}
                        href={`/resale/${item.resale.id}`}
                        style={{
                          textDecoration: "none",
                          color: "white",
                        }}
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
                            <h3
                              style={{
                                margin: "0 0 8px",
                                fontSize: 16,
                                fontWeight: 700,
                              }}
                            >
                              {item.ticketType?.name} · Resale
                            </h3>
                            <p
                              style={{
                                margin: 0,
                                color: "#e5e7eb",
                                fontSize: 12,
                                lineHeight: 1.5,
                              }}
                            >
                              Verified fan-to-fan resale ticket bought through
                              Swift Tickets.
                            </p>
                          </div>

                          <div
                            style={{
                              whiteSpace: "nowrap",
                              fontSize: 16,
                              fontWeight: 700,
                              color: "#fdba74",
                            }}
                          >
                            R{Number(item.resale.resale_price).toFixed(2)} →
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h2
                    style={{
                      margin: "0 0 20px",
                      fontSize: 40,
                      fontWeight: 800,
                      letterSpacing: "-1px",
                    }}
                  >
                    Venue
                  </h2>

                  <div
                    style={{
                      border: "1px solid rgba(255,255,255,0.2)",
                      padding: 24,
                      lineHeight: 1.7,
                    }}
                  >
                    <p style={{ marginTop: 0, fontSize: 16 }}>
                      <strong>{event.location}</strong>
                    </p>
                    <p style={{ color: "#d1d5db", fontSize: 15 }}>
                      {event.city || "Johannesburg"}, South Africa
                    </p>
                    <p style={{ color: "#e5e7eb", fontSize: 14 }}>
                      {event.description || "Venue details coming soon."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isMobile && (
          <div
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.96)",
              borderTop: "1px solid rgba(255,255,255,0.12)",
              padding: "14px 22px calc(14px + env(safe-area-inset-bottom))",
              zIndex: 50,
            }}
          >
            <button
              onClick={() => setActiveTab("tickets")}
              style={{
                width: "100%",
                background: "#f3f4f6",
                color: "#111",
                border: "none",
                borderRadius: 18,
                padding: "18px 20px",
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: "-0.3px",
                cursor: "pointer",
              }}
            >
              TICKETS FROM{" "}
              {lowestPrice !== null
                ? lowestPrice === 0
                  ? "FREE"
                  : `R${lowestPrice.toFixed(2)}`
                : "N/A"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}