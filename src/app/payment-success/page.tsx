"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PaymentSuccess() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  const [status, setStatus] = useState<
    "verifying" | "success" | "failed" | "missing"
  >("verifying");
  const [message, setMessage] = useState("Verifying your payment...");

  useEffect(() => {
    const verifyAndFinalize = async () => {
      if (!reference) {
        setStatus("missing");
        setMessage("Missing payment reference.");
        return;
      }

      try {
        const verifyRes = await fetch("/api/paystack/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reference }),
        });

        const verifyData = await verifyRes.json();

        if (!verifyRes.ok || !verifyData?.success) {
          setStatus("failed");
          setMessage(verifyData?.message || "Payment verification failed.");
          return;
        }

        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .eq("reference", reference)
          .single();

        if (orderError || !order) {
          setStatus("failed");
          setMessage("Order not found.");
          return;
        }

        if (order.status === "paid") {
          setStatus("success");
          setMessage("Payment confirmed. Your ticket purchase is complete.");
          return;
        }

        const { data: ticketType, error: ticketTypeError } = await supabase
          .from("ticket_types")
          .select("*")
          .eq("id", order.ticket_type_id)
          .single();

        if (ticketTypeError || !ticketType) {
          setStatus("failed");
          setMessage("Ticket type not found.");
          return;
        }

        if (Number(ticketType.quantity) < Number(order.quantity)) {
          setStatus("failed");
          setMessage("Not enough tickets available to complete this order.");
          return;
        }

        const ticketRows = Array.from({ length: order.quantity }).map(() => ({
          order_id: order.id,
          ticket_type_id: order.ticket_type_id,
          qr_code: crypto.randomUUID(),
          checked_in: false,
        }));

        const { error: insertTicketsError } = await supabase
          .from("tickets")
          .insert(ticketRows);

        if (insertTicketsError) {
          setStatus("failed");
          setMessage(insertTicketsError.message);
          return;
        }

        const newRemainingQuantity =
          Number(ticketType.quantity) - Number(order.quantity);

        const { error: updateQuantityError } = await supabase
          .from("ticket_types")
          .update({ quantity: newRemainingQuantity })
          .eq("id", order.ticket_type_id);

        if (updateQuantityError) {
          setStatus("failed");
          setMessage(updateQuantityError.message);
          return;
        }

        const { error: updateOrderError } = await supabase
          .from("orders")
          .update({ status: "paid" })
          .eq("id", order.id);

        if (updateOrderError) {
          setStatus("failed");
          setMessage(updateOrderError.message);
          return;
        }

        setStatus("success");
        setMessage("Payment confirmed. Your tickets have been created.");
      } catch (error) {
        console.error(error);
        setStatus("failed");
        setMessage("Something went wrong while verifying payment.");
      }
    };

    verifyAndFinalize();
  }, [reference]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "white",
        padding: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          'ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.03)",
          padding: 32,
        }}
      >
        <h1
          style={{
            margin: "0 0 16px",
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: "-1px",
          }}
        >
          {status === "verifying" && "Verifying Payment..."}
          {status === "success" && "Payment Successful 🎉"}
          {status === "failed" && "Payment Verification Failed"}
          {status === "missing" && "Invalid Payment Link"}
        </h1>

        <p
          style={{
            margin: "0 0 16px",
            fontSize: 16,
            color:
              status === "success"
                ? "#d1fae5"
                : status === "failed" || status === "missing"
                ? "#fecaca"
                : "#e5e7eb",
          }}
        >
          {message}
        </p>

        {reference && (
          <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
            Reference: {reference}
          </p>
        )}
      </div>
    </main>
  );
}
