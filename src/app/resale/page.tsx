"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResaleCheckoutPage() {
  const params = useParams();
  const resaleId = params.resaleId as string;

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any>(null);

  const loadResale = async () => {
    setLoading(true);

    const { data: resale } = await supabase
      .from("resales")
      .select("*")
      .eq("id", resaleId)
      .eq("status", "listed")
      .single();

    if (!resale) {
      setItem(null);
      setLoading(false);
      return;
    }

    const { data: ticket } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", resale.ticket_id)
      .single();

    if (!ticket || ticket.checked_in) {
      setItem(null);
      setLoading(false);
      return;
    }

    const { data: ticketType } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("id", ticket.ticket_type_id)
      .single();

    if (!ticketType) {
      setItem(null);
      setLoading(false);
      return;
    }

    const { data: event } = await supabase
      .from("events")
      .select("*")
      .eq("id", ticketType.event_id)
      .single();

    setItem({
      resale,
      ticket,
      ticketType,
      event,
    });

    setLoading(false);
  };

  useEffect(() => {
    if (resaleId) {
      loadResale();
    }
  }, [resaleId]);

  
const handleBuy = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert("Please log in first");
    window.location.href = "/login";
    return;
  }

  if (!item) return;

  if (item.ticket.checked_in) {
    alert("This ticket has already been used");
    return;
  }

  if (item.resale.seller_id === user.id) {
    alert("You cannot buy your own ticket");
    return;
  }

  const resalePrice = Number(item.resale.resale_price || 0);

  // 🔥 YOUR CUT (5%)
  const platformFee = resalePrice * 0.05;

  // 💰 Seller receives less
  const sellerPayout = resalePrice - platformFee;

  // 1. Create order (buyer pays full price)
  const { error: orderError } = await supabase.from("orders").insert([
    {
      ticket_type_id: item.ticket.ticket_type_id,
      buyer_name: user.email || "Resale Buyer",
      buyer_email: user.email || "",
      quantity: 1,
      status: "resale_purchased",
      base_amount: resalePrice,
      fixed_fee: 0,
      percentage_fee: platformFee,
      buyer_total: resalePrice,
      organizer_payout: sellerPayout,
    },
  ]);

  if (orderError) {
    alert(orderError.message);
    return;
  }

  // 2. Transfer ownership
  const { error: ticketError } = await supabase
    .from("tickets")
    .update({
      current_owner_id: user.id,
      is_listed_for_resale: false,
      resale_price: null,
    })
    .eq("id", item.ticket.id);

  if (ticketError) {
    alert(ticketError.message);
    return;
  }

  // 3. Mark resale as sold
  const { error: resaleError } = await supabase
    .from("resales")
    .update({
      buyer_id: user.id,
      status: "sold",
    })
    .eq("id", item.resale.id);

  if (resaleError) {
    alert(resaleError.message);
    return;
  }

  alert("Ticket purchased successfully 🎉");
  window.location.href = "/my-tickets";
};

    const { error: orderError } = await supabase.from("orders").insert([
      {
        ticket_type_id: item.ticket.ticket_type_id,
        buyer_name: user.email || "Resale Buyer",
        buyer_email: user.email || "",
        quantity: 1,
        status: "resale_purchased",
        base_amount: Number(item.resale.resale_price || 0),
        fixed_fee: 0,
        percentage_fee: 0,
        buyer_total: Number(item.resale.resale_price || 0),
        organizer_payout: 0,
      },
    ]);

    if (orderError) {
      alert(orderError.message);
      return;
    }

    const { error: ticketError } = await supabase
      .from("tickets")
      .update({
        current_owner_id: user.id,
        is_listed_for_resale: false,
        resale_price: null,
      })
      .eq("id", item.ticket.id);

    if (ticketError) {
      alert(ticketError.message);
      return;
    }

    const { error: resaleError } = await supabase
      .from("resales")
      .update({
        buyer_id: user.id,
        status: "sold",
      })
      .eq("id", item.resale.id);

    if (resaleError) {
      alert(resaleError.message);
      return;
    }

    alert("Resale ticket purchased successfully!");
    window.location.href = "/my-tickets";
  };

  if (loading) {
    return (
      <main style={{ padding: 40 }}>
        <h1>Loading resale ticket...</h1>
      </main>
    );
  }

  if (!item) {
    return (
      <main style={{ padding: 40 }}>
        <h1>Resale ticket not available</h1>
        <p>This ticket may have been sold, removed, or already used.</p>
      </main>
    );
  }

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
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontSize: 42, marginBottom: 20 }}>Resale Ticket Checkout</h1>

        <div
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 24,
            padding: 24,
            background: "linear-gradient(135deg, #111827, #05070d)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>{item.event?.title}</h2>

          <p>
            <strong>Ticket Type:</strong> {item.ticketType?.name}
          </p>
          <p>
            <strong>Location:</strong> {item.event?.location}
          </p>
          <p>
            <strong>Date:</strong>{" "}
            {item.event?.event_date
              ? new Date(item.event.event_date).toLocaleString()
              : "-"}
          </p>
          <p>
            <strong>Resale Price:</strong> R
            {Number(item.resale.resale_price).toFixed(2)}
          </p>

          <button
            onClick={handleBuy}
            style={{
              marginTop: 18,
              padding: "12px 18px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              color: "white",
              background: "linear-gradient(135deg, #f97316, #3b82f6)",
            }}
          >
            Buy Resale Ticket
          </button>
        </div>
      </div>
    </main>
  );
}