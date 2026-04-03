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

  const handleOrder = async () => {
    if (!ticket || !eventData) {
      alert("Ticket or event not loaded");
      return;
    }

    if (quantity < 1) {
      alert("Quantity must be at least 1");
      return;
    }

    if (ticket.quantity < quantity) {
      alert("Not enough tickets available");
      return;
    }

    const newRemainingQuantity = Number(ticket.quantity) - quantity;

    const { data: order, error } = await supabase
      .from("orders")
      .insert([
        {
          ticket_type_id: ticketTypeId,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          quantity,
          status: "pending",
          base_amount: amounts.baseAmount,
          fixed_fee: amounts.fixedFee,
          percentage_fee: amounts.percentageFee,
          buyer_total: amounts.buyerTotal,
          organizer_payout: amounts.organizerPayout,
        },
      ])
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    const ticketRows = Array.from({ length: quantity }).map(() => ({
      order_id: order.id,
      ticket_type_id: ticketTypeId,
      qr_code: crypto.randomUUID(),
      checked_in: false,
    }));

    const { error: ticketInsertError } = await supabase
      .from("tickets")
      .insert(ticketRows);

    if (ticketInsertError) {
      alert(ticketInsertError.message);
      return;
    }

    const { error: quantityUpdateError } = await supabase
      .from("ticket_types")
      .update({ quantity: newRemainingQuantity })
      .eq("id", ticketTypeId);

    if (quantityUpdateError) {
      alert(quantityUpdateError.message);
      return;
    }

    alert("Order created and tickets generated successfully!");

    setTicket({
      ...ticket,
      quantity: newRemainingQuantity,
    });
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
          <p><strong>Sold Out</strong></p>
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

          <button onClick={handleOrder}>Confirm Order</button>
        </>
      )}
    </main>
  );
}