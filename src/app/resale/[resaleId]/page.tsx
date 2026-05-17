"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";

export default function ResaleTicketPage() {
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [resale, setResale] = useState<any>(null);

  useEffect(() => {
    loadResale();
  }, []);

  const loadResale = async () => {
    const { data: resaleRow } = await supabase
      .from("resales")
      .select("*")
      .eq("id", params.id)
      .single();

    if (!resaleRow) {
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

    setResale({
      ...resaleRow,
      eventRow,
      ticketType,
    });

    setLoading(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading resale ticket...
      </main>
    );
  }

  if (!resale) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center text-white">
        Resale ticket not found.
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
          {resale.eventRow?.title}
        </h1>

        <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b0b]">
          {resale.eventRow?.image_url && (
            <img
              src={resale.eventRow.image_url}
              alt={resale.eventRow.title}
              className="h-[300px] w-full object-cover"
            />
          )}

          <div className="p-6">
            <div className="rounded-full bg-orange-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-orange-300 w-fit">
              Verified Resale Ticket
            </div>

            <div className="mt-6 space-y-3 text-sm text-white/70">
              <p>
                Ticket Type:{" "}
                <span className="font-bold text-white">
                  {resale.ticketType?.name}
                </span>
              </p>

              <p>
                Location:{" "}
                <span className="font-bold text-white">
                  {resale.eventRow?.location}
                </span>
              </p>

              <p>
                Event Date:{" "}
                <span className="font-bold text-white">
                  {resale.eventRow?.event_date
                    ? new Date(
                        resale.eventRow.event_date
                      ).toLocaleString()
                    : "TBA"}
                </span>
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5">
              <h2 className="text-lg font-bold">
                Pricing Transparency
              </h2>

              <div className="mt-4 space-y-2 text-sm text-white/70">
                <div className="flex items-center justify-between">
                  <span>Original Ticket Price</span>
                  <span className="font-bold text-white">
                    R{Number(resale.resale_price).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Swift Protection Fee</span>
                  <span className="font-bold text-white">
                    {resale.resale_fee_percent}%
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-4 text-base">
                  <span className="font-bold text-white">
                    Total
                  </span>

                  <span className="font-extrabold text-white">
                    R{Number(resale.buyer_total).toFixed(2)}
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