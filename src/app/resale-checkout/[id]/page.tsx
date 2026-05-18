"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResaleCheckoutPage() {
  const params = useParams();

  const resaleId =
    typeof params?.id === "string"
      ? params.id
      : typeof window !== "undefined"
      ? window.location.pathname.split("/").filter(Boolean).pop() || ""
      : "";

  const redirectToCheckout = `/resale-checkout/${resaleId}`;

  const [resale, setResale] = useState<any>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [user, setUser] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [paying, setPaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        setBuyerEmail(session.user.email || "");
      }

      setCheckingAuth(false);
    };

    getUser();
  }, []);

  useEffect(() => {
    const loadResale = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        if (!resaleId) {
          setErrorMessage("Missing resale ticket ID.");
          return;
        }

        const { data: resaleRow, error: resaleError } = await supabase
          .from("resales")
          .select("*")
          .eq("id", resaleId)
          .in("status", ["active", "listed"])
          .maybeSingle();

        if (resaleError) {
          setErrorMessage(resaleError.message);
          return;
        }

        if (!resaleRow) {
          setErrorMessage("This resale ticket is no longer available.");
          return;
        }

        const { data: eventRow } = await supabase
          .from("events")
          .select("*")
          .eq("id", resaleRow.event_id)
          .maybeSingle();

        const { data: ticketType } = await supabase
          .from("ticket_types")
          .select("*")
          .eq("id", resaleRow.ticket_type_id)
          .maybeSingle();

        const { data: ticket } = await supabase
          .from("tickets")
          .select("*")
          .eq("id", resaleRow.ticket_id)
          .maybeSingle();

        setResale({
          ...resaleRow,
          eventRow,
          ticketType,
          ticket,
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load resale checkout."
        );
      } finally {
        setLoading(false);
      }
    };

    loadResale();
  }, [resaleId]);

  const handlePay = async () => {
    if (!resale) {
      alert("Resale ticket not loaded.");
      return;
    }

    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(
        redirectToCheckout
      )}`;
      return;
    }

    if (resale.seller_user_id === user.id || resale.seller_id === user.id) {
      alert("You cannot buy your own resale ticket.");
      return;
    }

    if (resale.status !== "active" && resale.status !== "listed") {
      alert("This resale ticket is no longer available.");
      return;
    }

    if (resale.ticket?.checked_in) {
      alert("This ticket has already been used.");
      return;
    }

    if (
      resale.eventRow?.event_date &&
      new Date(resale.eventRow.event_date) <= new Date()
    ) {
      alert("This event has already started.");
      return;
    }

    if (!buyerName.trim()) {
      alert("Please enter your full name.");
      return;
    }

    if (!buyerEmail.trim()) {
      alert("Please enter your email address.");
      return;
    }

    try {
      setPaying(true);

      const reference = `resale_${Date.now()}_${crypto
        .randomUUID()
        .slice(0, 8)}`;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            user_id: user.id,
            event_id: resale.event_id,
            ticket_type_id: resale.ticket_type_id,
            buyer_name: buyerName.trim(),
            buyer_email: buyerEmail.trim(),
            quantity: 1,
            status: "pending",
            payment_status: "pending",
            base_amount: Number(resale.resale_price || 0),
            fixed_fee: 0,
            percentage_fee:
              Number(resale.buyer_total || 0) -
              Number(resale.resale_price || 0),
            buyer_total: Number(resale.buyer_total || 0),
            organizer_payout: Number(resale.seller_amount || 0),
            reference,
            resale_id: resale.id,
          },
        ])
        .select()
        .single();

      if (orderError || !order) {
        alert(orderError?.message || "Failed to create resale order.");
        return;
      }

      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: buyerEmail.trim(),
          fullName: buyerName.trim(),
          amount: Number(resale.buyer_total || 0),
          orderId: order.id,
          reference,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to initialize payment.");
        return;
      }

      if (!data.url) {
        alert("No payment URL returned.");
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong while starting resale checkout."
      );
    } finally {
      setPaying(false);
    }
  };

  if (loading || checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        Loading resale checkout...
      </main>
    );
  }

  if (!resale) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-white">
        <div>
          <p>Resale ticket not found or already sold.</p>
          {errorMessage && (
            <p className="mt-4 max-w-xl text-xs text-red-300">
              {errorMessage}
            </p>
          )}
        </div>
      </main>
    );
  }

  const eventHasStarted =
    resale.eventRow?.event_date &&
    new Date(resale.eventRow.event_date) <= new Date();

  const unavailable =
    resale.status !== "active" ||
    resale.ticket?.checked_in ||
    eventHasStarted;

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-sm uppercase tracking-[0.14em] text-white/45">
          Swift Tickets Resale
        </p>

        <h1 className="text-4xl font-extrabold">Resale Checkout</h1>

        <div className="mt-8 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-5 text-2xl font-bold">Buyer Details</h2>

            <div className="mb-4">
              <label className="mb-2 block text-sm text-white/70">
                Full Name
              </label>
              <input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="h-12 w-full border border-white/15 bg-transparent px-4 outline-none focus:border-white/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">
                Email Address
              </label>
              <input
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                className="h-12 w-full border border-white/15 bg-transparent px-4 outline-none focus:border-white/60"
              />
            </div>

            {unavailable && (
              <div className="mt-5 border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                This resale ticket is no longer available.
              </div>
            )}
          </div>

          <div className="border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-5 text-2xl font-bold">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <p className="font-bold">
                {resale.eventRow?.title || "Resale Ticket"}
              </p>
              <p className="text-white/60">
                {resale.ticketType?.name || "Ticket"}
              </p>

              <div className="flex justify-between border-t border-white/10 pt-4">
                <span>Original ticket price</span>
                <span>R{Number(resale.resale_price || 0).toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span>Swift resale fee</span>
                <span>{Number(resale.resale_fee_percent || 0)}%</span>
              </div>

              <div className="flex justify-between border-t border-white/10 pt-4 text-base font-bold">
                <span>Total Due</span>
                <span>R{Number(resale.buyer_total || 0).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handlePay}
              disabled={paying || unavailable}
              className="mt-6 w-full bg-white px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paying
                ? "Redirecting..."
                : unavailable
                ? "Unavailable"
                : `Pay R${Number(resale.buyer_total || 0).toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}