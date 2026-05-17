"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResaleCheckoutPage() {
  const params = useParams();
  const resaleId = params.id as string;
  const redirectToCheckout = `/resale-checkout/${resaleId}`;

  const [resale, setResale] = useState<any>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [user, setUser] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [paying, setPaying] = useState(false);

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
      setLoading(true);

      const { data: resaleRow } = await supabase
        .from("resales")
        .select("*")
        .eq("id", resaleId)
        .eq("status", "active")
        .single();

      if (!resaleRow) {
        setResale(null);
        setLoading(false);
        return;
      }

      const { data: eventRow } = await supabase
        .from("events")
        .select("*")
        .eq("id", resaleRow.event_id)
        .single();

      const { data: ticketType } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("id", resaleRow.ticket_type_id)
        .single();

      const { data: ticket } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", resaleRow.ticket_id)
        .single();

      setResale({
        ...resaleRow,
        eventRow,
        ticketType,
        ticket,
      });

      setLoading(false);
    };

    if (resaleId) loadResale();
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

    if (resale.seller_user_id === user.id) {
      alert("You cannot buy your own resale ticket.");
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to initialize payment.");
        return;
      }

      if (data.reference) {
        await supabase
          .from("orders")
          .update({ reference: data.reference })
          .eq("id", order.id);
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
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        Resale ticket not found or already sold.
      </main>
    );
  }

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
          </div>

          <div className="border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-5 text-2xl font-bold">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <p className="font-bold">{resale.eventRow?.title}</p>
              <p className="text-white/60">{resale.ticketType?.name}</p>

              <div className="flex justify-between border-t border-white/10 pt-4">
                <span>Original ticket price</span>
                <span>R{Number(resale.resale_price).toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span>Swift resale fee</span>
                <span>{Number(resale.resale_fee_percent || 0)}%</span>
              </div>

              <div className="flex justify-between border-t border-white/10 pt-4 text-base font-bold">
                <span>Total Due</span>
                <span>R{Number(resale.buyer_total).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handlePay}
              disabled={paying}
              className="mt-6 w-full bg-white px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:bg-white/90 disabled:opacity-60"
            >
              {paying
                ? "Redirecting..."
                : `Pay R${Number(resale.buyer_total).toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}