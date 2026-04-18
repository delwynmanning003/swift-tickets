"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Finalizing your order...");

  useEffect(() => {
    const finalize = async () => {
      if (!reference) {
        setStatus("error");
        setMessage("Missing payment reference.");
        return;
      }

      try {
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .eq("reference", reference)
          .single();

        if (orderError || !order) {
          console.error("Order lookup error:", orderError);
          setStatus("error");
          setMessage("Order not found.");
          return;
        }

        if (order.status === "paid") {
          setStatus("success");
          setMessage("Your ticket has already been issued.");
          return;
        }

        if (!reference.startsWith("free_")) {
          const res = await fetch(
            `/api/paystack/verify?reference=${encodeURIComponent(reference)}`
          );

          const data = await res.json();

          if (!res.ok || !data.success) {
            console.error("Payment verification failed:", data);
            setStatus("error");
            setMessage(data.error || "Payment verification failed.");
            return;
          }
        }

        const { data: ticketType, error: ticketTypeError } = await supabase
          .from("ticket_types")
          .select("*")
          .eq("id", order.ticket_type_id)
          .single();

        if (ticketTypeError || !ticketType) {
          console.error("Ticket type lookup error:", ticketTypeError);
          setStatus("error");
          setMessage("Ticket type not found.");
          return;
        }

        const currentQuantity = Number(ticketType.quantity) || 0;
        const orderQuantity = Number(order.quantity) || 0;

        if (currentQuantity < orderQuantity) {
          setStatus("error");
          setMessage("Not enough ticket stock available to finalize this order.");
          return;
        }

        const ticketsToInsert = [];

        for (let i = 0; i < orderQuantity; i++) {
          ticketsToInsert.push({
            user_id: order.user_id,
            order_id: order.id,
            ticket_type_id: order.ticket_type_id,
            qr_code: crypto.randomUUID(),
            checked_in: false,
          });
        }

        const { error: ticketInsertError } = await supabase
          .from("tickets")
          .insert(ticketsToInsert);

        if (ticketInsertError) {
          console.error("Ticket insert error:", ticketInsertError);
          setStatus("error");
          setMessage("Failed to generate tickets.");
          return;
        }

        const { error: stockUpdateError } = await supabase
          .from("ticket_types")
          .update({
            quantity: currentQuantity - orderQuantity,
          })
          .eq("id", order.ticket_type_id);

        if (stockUpdateError) {
          console.error("Stock update error:", stockUpdateError);
          setStatus("error");
          setMessage("Tickets were created, but stock update failed.");
          return;
        }

        const { error: orderUpdateError } = await supabase
          .from("orders")
          .update({ status: "paid" })
          .eq("id", order.id);

        if (orderUpdateError) {
          console.error("Order update error:", orderUpdateError);
          setStatus("error");
          setMessage("Tickets were created, but order update failed.");
          return;
        }

        setStatus("success");
        setMessage("Your ticket has been issued successfully.");
      } catch (error) {
        console.error(error);
        setStatus("error");
        setMessage("Something went wrong while finalizing your order.");
      }
    };

    finalize();
  }, [reference]);

  return (
    <main className="min-h-screen bg-black px-6 text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center py-10">
        <div className="w-full border border-white/10 bg-white/[0.03] p-8 text-center md:p-10">
          {status === "loading" && (
            <>
              <p className="mb-2 text-sm uppercase tracking-[0.18em] text-white/45">
                Swift Tickets
              </p>
              <h1 className="mb-4 text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">
                Processing Payment...
              </h1>
              <p className="mx-auto max-w-lg text-white/70">{message}</p>

              <div className="mt-8 flex justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <p className="mb-2 text-sm uppercase tracking-[0.18em] text-white/45">
                Swift Tickets
              </p>
              <h1 className="mb-4 text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">
                Payment Successful 🎉
              </h1>
              <p className="mx-auto max-w-lg text-white/70">{message}</p>

              {reference && (
                <p className="mt-5 text-sm text-white/40">
                  Reference: {reference}
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/my-tickets"
                  className="bg-white px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:bg-white/90"
                >
                  My Tickets
                </Link>

                <Link
                  href="/dashboard"
                  className="border border-white/15 px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:border-white/40"
                >
                  Dashboard
                </Link>

                <Link
                  href="/"
                  className="border border-white/15 px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:border-white/40"
                >
                  Back Home
                </Link>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <p className="mb-2 text-sm uppercase tracking-[0.18em] text-white/45">
                Swift Tickets
              </p>
              <h1 className="mb-4 text-3xl font-extrabold tracking-[-0.03em] text-red-400 md:text-4xl">
                Something went wrong
              </h1>
              <p className="mx-auto max-w-lg text-white/70">{message}</p>

              {reference && (
                <p className="mt-5 text-sm text-white/40">
                  Reference: {reference}
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/"
                  className="bg-white px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:bg-white/90"
                >
                  Back Home
                </Link>

                <Link
                  href="/my-tickets"
                  className="border border-white/15 px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:border-white/40"
                >
                  My Tickets
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black p-10 text-white">
          Loading...
        </main>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}