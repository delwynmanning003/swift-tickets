"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function MyTicketsPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);
  const [soldTickets, setSoldTickets] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  const enrichTicket = async (ticket: any) => {
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", ticket.order_id)
      .single();

    const { data: ticketType } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("id", ticket.ticket_type_id)
      .single();

    let eventRow = null;

    if (ticketType?.event_id) {
      const { data: fetchedEvent } = await supabase
        .from("events")
        .select("*")
        .eq("id", ticketType.event_id)
        .single();

      eventRow = fetchedEvent;
    }

    return {
      ...ticket,
      order,
      ticketType,
      eventRow,
    };
  };

  const loadTickets = async () => {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserEmail(user.email || "");
    setUserId(user.id);

    const { data: allTickets, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Error loading tickets");
      setLoading(false);
      return;
    }

    const enrichedTickets = await Promise.all(
      (allTickets || []).map((ticket: any) => enrichTicket(ticket))
    );

    const myTickets = enrichedTickets.filter((ticket: any) => {
      if (ticket.current_owner_id) {
        return ticket.current_owner_id === user.id;
      }

      return ticket.order?.buyer_email === user.email;
    });

    const { data: resaleRows } = await supabase
      .from("resales")
      .select("*")
      .eq("seller_id", user.id)
      .eq("status", "sold")
      .order("created_at", { ascending: false });

    const soldEnriched = await Promise.all(
      (resaleRows || []).map(async (resale: any) => {
        const { data: ticket } = await supabase
          .from("tickets")
          .select("*")
          .eq("id", resale.ticket_id)
          .single();

        if (!ticket) return null;

        const enriched = await enrichTicket(ticket);

        return {
          ...enriched,
          resale,
        };
      })
    );

    setTickets(myTickets);
    setSoldTickets(soldEnriched.filter(Boolean) as any[]);
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleResell = async (ticket: any) => {
    if (ticket.checked_in) {
      alert("Used tickets cannot be resold");
      return;
    }

    const originalPrice = Number(ticket.ticketType?.price || 0);
    const maxResalePrice = Number((originalPrice * 1.2).toFixed(2));

    const input = window.prompt(
      `Enter resale price.\nOriginal price: R${originalPrice.toFixed(
        2
      )}\nMax allowed: R${maxResalePrice.toFixed(2)}`
    );

    if (input === null) return;

    const resalePrice = Number(input);

    if (Number.isNaN(resalePrice) || resalePrice < 0) {
      alert("Please enter a valid price");
      return;
    }

    if (resalePrice > maxResalePrice) {
      alert(`Max resale price is R${maxResalePrice.toFixed(2)}`);
      return;
    }

    const { error: ticketUpdateError } = await supabase
      .from("tickets")
      .update({
        is_listed_for_resale: true,
        resale_price: resalePrice,
        current_owner_id: userId,
      })
      .eq("id", ticket.id);

    if (ticketUpdateError) {
      alert(ticketUpdateError.message);
      return;
    }

    const { data: existingResale } = await supabase
      .from("resales")
      .select("*")
      .eq("ticket_id", ticket.id)
      .eq("status", "listed")
      .maybeSingle();

    if (existingResale) {
      const { error: resaleUpdateError } = await supabase
        .from("resales")
        .update({
          resale_price: resalePrice,
        })
        .eq("id", existingResale.id);

      if (resaleUpdateError) {
        alert(resaleUpdateError.message);
        return;
      }
    } else {
      const { error: resaleInsertError } = await supabase.from("resales").insert([
        {
          ticket_id: ticket.id,
          seller_id: userId,
          resale_price: resalePrice,
          status: "listed",
        },
      ]);

      if (resaleInsertError) {
        alert(resaleInsertError.message);
        return;
      }
    }

    alert("Ticket listed for resale!");
    loadTickets();
  };

  const handleRemoveFromResale = async (ticket: any) => {
    const { error: ticketUpdateError } = await supabase
      .from("tickets")
      .update({
        is_listed_for_resale: false,
        resale_price: null,
      })
      .eq("id", ticket.id);

    if (ticketUpdateError) {
      alert(ticketUpdateError.message);
      return;
    }

    const { error: resaleUpdateError } = await supabase
      .from("resales")
      .update({ status: "cancelled" })
      .eq("ticket_id", ticket.id)
      .eq("status", "listed");

    if (resaleUpdateError) {
      alert(resaleUpdateError.message);
      return;
    }

    alert("Ticket removed from resale");
    loadTickets();
  };

  const TicketCard = ({
    ticket,
    sold = false,
  }: {
    ticket: any;
    sold?: boolean;
  }) => {
    const originalPrice = Number(ticket.ticketType?.price || 0);
    const maxResalePrice = Number((originalPrice * 1.2).toFixed(2));
    const currentOwner = ticket.current_owner_id === userId || !ticket.current_owner_id;

    return (
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          background: "linear-gradient(135deg, #111827, #05070d)",
          padding: 24,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>
          {ticket.eventRow?.title || "Untitled Event"}
        </h2>

        <p style={{ margin: "0 0 8px", color: "#cbd5e1" }}>
          <strong>Ticket Type:</strong> {ticket.ticketType?.name || "-"}
        </p>

        <p style={{ margin: "0 0 8px", color: "#cbd5e1" }}>
          <strong>Buyer:</strong> {ticket.order?.buyer_name || "-"}
        </p>

        <p style={{ margin: "0 0 8px", color: "#cbd5e1" }}>
          <strong>Email:</strong> {ticket.order?.buyer_email || "-"}
        </p>

        <p style={{ margin: "0 0 8px", color: "#cbd5e1" }}>
          <strong>Location:</strong> {ticket.eventRow?.location || "-"}
        </p>

        <p style={{ margin: "0 0 8px", color: "#cbd5e1" }}>
          <strong>Date:</strong>{" "}
          {ticket.eventRow?.event_date
            ? new Date(ticket.eventRow.event_date).toLocaleString()
            : "-"}
        </p>

        <p style={{ margin: "0 0 8px", color: "#cbd5e1" }}>
          <strong>Status:</strong> {ticket.checked_in ? "Used / Checked In" : "Valid"}
        </p>

        <p style={{ margin: "0 0 8px", color: "#cbd5e1" }}>
          <strong>Original Price:</strong> R{originalPrice.toFixed(2)}
        </p>

        <p style={{ margin: "0 0 8px", color: "#cbd5e1" }}>
          <strong>QR Code Value:</strong> {ticket.qr_code}
        </p>

        {sold && (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 14,
              background: "rgba(16,185,129,0.10)",
              border: "1px solid rgba(16,185,129,0.25)",
            }}
          >
            <p style={{ margin: "0 0 8px", color: "#6ee7b7", fontWeight: 600 }}>
              Sold on resale
            </p>
            <p style={{ margin: 0, color: "#d1fae5" }}>
              Resale Price: R{Number(ticket.resale?.resale_price || 0).toFixed(2)}
            </p>
          </div>
        )}

        {!sold && ticket.is_listed_for_resale ? (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 14,
              background: "rgba(249,115,22,0.10)",
              border: "1px solid rgba(249,115,22,0.25)",
            }}
          >
            <p style={{ margin: "0 0 12px", color: "#fdba74", fontWeight: 600 }}>
              Listed for resale at R{Number(ticket.resale_price || 0).toFixed(2)}
            </p>

            {!ticket.checked_in && currentOwner && (
              <button
                onClick={() => handleRemoveFromResale(ticket)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  cursor: "pointer",
                  fontWeight: 700,
                  color: "white",
                  background: "#1f2937",
                }}
              >
                Remove from Resale
              </button>
            )}
          </div>
        ) : !sold && !ticket.checked_in && currentOwner ? (
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => handleResell(ticket)}
              style={{
                padding: "12px 18px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                color: "white",
                background: "linear-gradient(135deg, #f97316, #3b82f6)",
              }}
            >
              Resell Ticket
            </button>

            <p style={{ marginTop: 10, color: "#9ca3af", fontSize: 14 }}>
              Max resale price: R{maxResalePrice.toFixed(2)}
            </p>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "white",
        padding: "48px 24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 42, marginBottom: 10 }}>My Tickets</h1>
        <p style={{ color: "#9ca3af", marginTop: 0, marginBottom: 30 }}>
          Logged in as {userEmail || "Loading..."}
        </p>

        {message && <p style={{ color: "#f97316", marginBottom: 20 }}>{message}</p>}

        <h2 style={{ marginBottom: 16 }}>Current Tickets</h2>

        {loading ? (
          <p>Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: 24,
              background: "rgba(255,255,255,0.03)",
              color: "#cbd5e1",
              marginBottom: 32,
            }}
          >
            No current tickets.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 20, marginBottom: 40 }}>
            {tickets.map((ticket: any) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}

        <h2 style={{ marginBottom: 16 }}>Sold Tickets</h2>

        {loading ? null : soldTickets.length === 0 ? (
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: 24,
              background: "rgba(255,255,255,0.03)",
              color: "#cbd5e1",
            }}
          >
            No sold resale tickets yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 20 }}>
            {soldTickets.map((ticket: any) => (
              <TicketCard key={`sold-${ticket.id}`} ticket={ticket} sold />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}