"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function CheckoutPage() {
  const params = useParams();
  const ticketTypeId = params.ticketTypeId as string;

  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [ticket, setTicket] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const { data: ticketData } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("id", ticketTypeId)
        .single();

      if (!ticketData) {
        setLoading(false);
        return;
      }

      setTicket(ticketData);

      const { data: eventRow } = await supabase
        .from("events")
        .select("*")
        .eq("id", ticketData.event_id)
        .single();

      setEventData(eventRow);
      setLoading(false);
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
    const fixedFee = 2 * quantity;
    const percentageFee = baseAmount * 0.03;

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

  const handlePay = async () => {
    if (!ticket || !eventData) {
      alert("Ticket or event not loaded");
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

      const reference = `swift_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            ticket_type_id: ticketTypeId,
            buyer_name: buyerName.trim(),
            buyer_email: buyerEmail.trim(),
            quantity,
            status: "pending",
            base_amount: amounts.baseAmount,
            fixed_fee: amounts.fixedFee,
            percentage_fee: amounts.percentageFee,
            buyer_total: amounts.buyerTotal,
            organizer_payout: amounts.organizerPayout,
            reference,
          },
        ])
        .select()
        .single();

      if (orderError) {
        alert(orderError.message);
        return;
      }

      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: buyerEmail.trim(),
          amount: amounts.buyerTotal,
          reference,
          metadata: {
            order_id: order.id,
            ticket_type_id: ticketTypeId,
            quantity,
            buyer_name: buyerName.trim(),
            buyer_email: buyerEmail.trim(),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.status || !data?.data?.authorization_url) {
        alert(data?.message || "Failed to initialize payment");
        return;
      }

      window.location.href = data.data.authorization_url;
    } catch (error) {
      console.error(error);
      alert("Something went wrong while starting payment");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <main style={{ padding: 40 }}>
        <h1>Checkout</h1>
        <p>Loading...</p>
      </main>
    );
  }

  if (!ticket) {
    return (
      <main style={{ padding: 40 }}>
        <h1>Checkout</h1>
        <p>Ticket not found.</p>
      </main>
    );
  }

  const soldOut = Number(ticket.quantity) <= 0;

  return (
    <main style={{ padding: 40, maxWidth: 700 }}>
      <h1>Checkout</h1>

      <p>
        <strong>Ticket:</strong> {ticket.name}
      </p>
      <p>
        <strong>Price per ticket:</strong> R{Number(ticket.price).toFixed(2)}
      </p>

      <br />

      {soldOut ? (
        <div>
          <p>
            <strong>Sold Out</strong>
          </p>
        </div>
      ) : (
        <>
          <input
            placeholder="Full Name"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
          />
          <br />
          <br />

          <input
            placeholder="Email Address"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
          />
          <br />
          <br />

          <input
            type="number"
            min={1}
            max={ticket.quantity}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
          <br />
          <br />

          <div style={{ marginBottom: 24 }}>
            <p>
              <strong>Ticket Subtotal:</strong> R{amounts.baseAmount.toFixed(2)}
            </p>

            {serviceFee > 0 && (
              <p>
                <strong>Service Fee:</strong> R{serviceFee.toFixed(2)}
              </p>
            )}

            <p>
              <strong>Total Due:</strong> R{amounts.buyerTotal.toFixed(2)}
            </p>
          </div>

          <button onClick={handlePay} disabled={paying}>
            {paying ? "Redirecting..." : `Pay R${amounts.buyerTotal.toFixed(2)}`}
          </button>
        </>
      )}
    </main>
  );
}
