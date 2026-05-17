"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";

export default function ResaleTicketPage() {
  const params = useParams();

  const resaleId =
    typeof params?.id === "string"
      ? params.id
      : typeof window !== "undefined"
      ? window.location.pathname.split("/").filter(Boolean).pop() || ""
      : "";

  const [loading, setLoading] = useState(true);
  const [resale, setResale] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadResale = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        if (!resaleId) {
          setErrorMessage("Missing resale ID.");
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
          setErrorMessage(`No active resale found for ID: ${resaleId}`);
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

        setResale({
          ...resaleRow,
          eventRow,
          ticketType,
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load resale ticket."
        );
      } finally {
        setLoading(false);
      }
    };

    loadResale();
  }, [resaleId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        Loading resale ticket...
      </main>
    );
  }

  if (!resale) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-white">
        <div>
          <p>Resale ticket not found.</p>
          {errorMessage && (
            <p className="mt-4 max-w-xl text-xs text-red-300">{errorMessage}</p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-sm uppercase tracking-[0.14em] text-white/45">
          Swift Tickets Resale
        </p>

        <h1 className="text-4xl font-extrabold">
          {resale.eventRow?.title || "Resale Ticket"}
        </h1>

        <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b0b]">
          {resale.eventRow?.image_url && (
            <img
              src={resale.eventRow.image_url}
              alt={resale.eventRow.title || "Event image"}
              className="h-[300px] w-full object-cover"
            />
          )}

          <div className="p-6">
            <div className="w-fit rounded-full bg-orange-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-orange-300">
              Verified Resale Ticket
            </div>

            <div className="mt-6 space-y-3 text-sm text-white/70">
              <p>
                Ticket Type:{" "}
                <span className="font-bold text-white">
                  {resale.ticketType?.name || "Ticket"}
                </span>
              </p>

              <p>
                Location:{" "}
                <span className="font-bold text-white">
                  {resale.eventRow?.location || "Location TBA"}
                </span>
              </p>

              <p>
                Event Date:{" "}
                <span className="font-bold text-white">
                  {resale.eventRow?.event_date
                    ? new Date(resale.eventRow.event_date).toLocaleString()
                    : "TBA"}
                </span>
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5">
              <h2 className="text-lg font-bold">Pricing Transparency</h2>

              <div className="mt-4 space-y-2 text-sm text-white/70">
                <div className="flex justify-between">
                  <span>Original Ticket Price</span>
                  <span className="font-bold text-white">
                    R{Number(resale.resale_price || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Swift Protection Fee</span>
                  <span className="font-bold text-white">
                    {Number(resale.resale_fee_percent || 0)}%
                  </span>
                </div>

                <div className="flex justify-between border-t border-white/10 pt-4 text-base">
                  <span className="font-bold text-white">Total</span>
                  <span className="font-extrabold text-white">
                    R{Number(resale.buyer_total || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <a
              href={`/resale-checkout/${resale.id}`}
              className="mt-8 block w-full bg-white px-6 py-4 text-center text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:bg-white/90"
            >
              Buy Resale Ticket
            </a>

            <p className="mt-4 text-center text-xs text-white/40">
              QR ownership will automatically transfer after purchase.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}