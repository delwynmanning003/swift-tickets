"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type TicketType = {
  id: string;
  event_id: string;
  name: string;
  price: number;
  quantity: number;
};

type EventType = {
  id: string;
  title?: string;
  location?: string;
  event_date?: string;
  fee_option?: "split" | "organizer_pays_all" | "buyer_pays_all" | null;
};

export default function CheckoutPage() {
  const params = useParams();
  const ticketTypeId = params.ticketTypeId as string;
  const redirectToCheckout = `/checkout/${ticketTypeId}`;

  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [ticket, setTicket] = useState<TicketType | null>(null);
  const [eventData, setEventData] = useState<EventType | null>(null);

  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        setBuyerEmail(session.user.email || "");
      } else {
        setUser(null);
      }

      setCheckingAuth(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setBuyerEmail((current) => current || session.user.email || "");
      } else {
        setUser(null);
      }

      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const { data: ticketData, error: ticketError } = await supabase
          .from("ticket_types")
          .select("*")
          .eq("id", ticketTypeId)
          .single();

        if (ticketError || !ticketData) {
          console.error("Ticket load error:", ticketError);
          setTicket(null);
          setEventData(null);
          return;
        }

        setTicket(ticketData);

        const { data: eventRow, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("id", ticketData.event_id)
          .single();

        if (eventError) {
          console.error("Event load error:", eventError);
        }

        setEventData(eventRow ?? null);
      } catch (error) {
        console.error("Unexpected load error:", error);
        setTicket(null);
        setEventData(null);
      } finally {
        setLoading(false);
      }
    };

    if (ticketTypeId) loadData();
  }, [ticketTypeId]);

  const amounts = useMemo(() => {
    if (!ticket || !eventData) {
      return {
        baseAmount: 0,
        fixedFee: 0,
        percentageFee: 0,
        buyerTotal: 0,
        organizerPayout: 0,
      };
    }

    const baseAmount = Number(ticket.price) * quantity;
    const isFree = baseAmount === 0;

    if (isFree) {
      return {
        baseAmount: 0,
        fixedFee: 0,
        percentageFee: 0,
        buyerTotal: 0,
        organizerPayout: 0,
      };
    }

    const fixedFee = 3 * quantity;
    const percentageFee = baseAmount * 0.04;

    let buyerTotal = baseAmount;
    let organizerPayout = baseAmount;

    if (eventData.fee_option === "split") {
      buyerTotal = baseAmount + percentageFee;
      organizerPayout = baseAmount - fixedFee;
    }

    if (eventData.fee_option === "organizer_pays_all") {
      buyerTotal = baseAmount;
      organizerPayout = baseAmount - fixedFee - percentageFee;
    }

    if (eventData.fee_option === "buyer_pays_all") {
      buyerTotal = baseAmount + fixedFee + percentageFee;
      organizerPayout = baseAmount;
    }

    return {
      baseAmount,
      fixedFee,
      percentageFee,
      buyerTotal,
      organizerPayout,
    };
  }, [ticket, eventData, quantity]);

  const serviceFee = Math.max(amounts.buyerTotal - amounts.baseAmount, 0);
  const isFreeTicket = amounts.buyerTotal === 0;

  const handlePay = async () => {
    if (!ticket || !eventData) {
      alert("Ticket or event not loaded");
      return;
    }

    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(
        redirectToCheckout
      )}`;
      return;
    }

    if (!buyerName.trim()) {
      alert("Please enter your full name");
      return;
    }

    if (!buyerEmail.trim()) {
      alert("Please enter your email address");
      return;
    }

    if (quantity < 1) {
      alert("Quantity must be at least 1");
      return;
    }

    if (Number(ticket.quantity) < quantity) {
      alert("Not enough tickets available");
      return;
    }

    try {
      setPaying(true);

      const reference = `${
        isFreeTicket ? "free" : "swift"
      }_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            user_id: user.id,
            ticket_type_id: ticketTypeId,
            buyer_name: buyerName.trim(),
            buyer_email: buyerEmail.trim(),
            quantity,
            status: "pending",
            base_amount: amounts.baseAmount,
            fixed_fee: isFreeTicket ? 0 : amounts.fixedFee,
            percentage_fee: isFreeTicket ? 0 : amounts.percentageFee,
            buyer_total: amounts.buyerTotal,
            organizer_payout: amounts.organizerPayout,
            reference,
          },
        ])
        .select()
        .single();

      if (orderError || !order) {
        console.error("Order creation error:", orderError);
        alert(orderError?.message || "Failed to create order");
        return;
      }

      if (isFreeTicket) {
        window.location.href = `/payment-success?reference=${encodeURIComponent(
          reference
        )}`;
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
          amount: amounts.buyerTotal,
          orderId: order.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Initialize payment error:", data);
        alert(data.error || "Failed to initialize payment");
        return;
      }

      if (!data.url) {
        console.error("No payment URL returned:", data);
        alert("No payment URL returned");
        return;
      }

      if (data.reference) {
        const { error: updateError } = await supabase
          .from("orders")
          .update({ reference: data.reference })
          .eq("id", order.id);

        if (updateError) {
          console.error("Failed to save payment reference:", updateError);
        }
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Checkout error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong while starting checkout"
      );
    } finally {
      setPaying(false);
    }
  };

  if (loading || checkingAuth) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-4 text-3xl font-bold">Checkout</h1>
          <p className="text-white/70">Loading...</p>
        </div>
      </main>
    );
  }

  if (!ticket) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-4 text-3xl font-bold">Checkout</h1>
          <p className="text-white/70">Ticket not found.</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="border border-white/10 bg-white/[0.03] p-6">
            <p className="mb-2 text-sm uppercase tracking-[0.18em] text-white/55">
              Swift Tickets
            </p>
            <h1 className="text-4xl font-extrabold tracking-[-0.03em]">
              Log in required
            </h1>
            <p className="mt-3 text-white/70">
              You need to log in or sign up before buying tickets.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`/login?redirect=${encodeURIComponent(redirectToCheckout)}`}
                className="bg-white px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:bg-white/90"
              >
                Log In
              </a>

              <a
                href={`/signup?redirect=${encodeURIComponent(redirectToCheckout)}`}
                className="border border-white/15 px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:border-white/40"
              >
                Sign Up
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const soldOut = Number(ticket.quantity) <= 0;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 border border-white/10 bg-white/[0.03] p-6">
          <p className="mb-2 text-sm uppercase tracking-[0.18em] text-white/55">
            Swift Tickets
          </p>
          <h1 className="text-4xl font-extrabold tracking-[-0.03em]">
            Checkout
          </h1>
          {eventData?.title && (
            <p className="mt-3 text-lg text-white/75">{eventData.title}</p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-5 text-2xl font-bold">Buyer Details</h2>

            {soldOut ? (
              <div className="rounded-none border border-red-500/40 bg-red-500/10 p-4">
                <p className="font-semibold text-red-300">Sold Out</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="h-12 w-full border border-white/15 bg-transparent px-4 text-white outline-none placeholder:text-white/30 focus:border-white/60"
                  />
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    className="h-12 w-full border border-white/15 bg-transparent px-4 text-white outline-none placeholder:text-white/30 focus:border-white/60"
                  />
                </div>

                <div className="mb-2">
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={ticket.quantity}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="h-12 w-full border border-white/15 bg-transparent px-4 text-white outline-none focus:border-white/60"
                  />
                </div>
              </>
            )}
          </div>

          <div className="border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-5 text-2xl font-bold">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/65">Ticket</span>
                <span className="text-right font-medium">{ticket.name}</span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-white/65">Price per ticket</span>
                <span className="font-medium">
                  {Number(ticket.price) === 0
                    ? "FREE"
                    : `R${Number(ticket.price).toFixed(2)}`}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-white/65">Subtotal</span>
                <span className="font-medium">
                  R{amounts.baseAmount.toFixed(2)}
                </span>
              </div>

              {serviceFee > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/65">Service Fee</span>
                  <span className="font-medium">
                    R{serviceFee.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="border-t border-white/10 pt-3">
                <div className="flex items-center justify-between gap-4 text-base font-bold">
                  <span>Total Due</span>
                  <span>
                    {isFreeTicket ? "FREE" : `R${amounts.buyerTotal.toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>

            {!soldOut && (
              <button
                onClick={handlePay}
                disabled={paying}
                className="mt-6 w-full bg-white px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {paying
                  ? "Redirecting..."
                  : isFreeTicket
                  ? "Get Free Ticket"
                  : `Pay R${amounts.buyerTotal.toFixed(2)}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}