"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { QRCodeCanvas } from "qrcode.react";

const RESALE_FEE_PERCENT = 5;

export default function MyTicketsPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [listing, setListing] = useState(false);

  const enrichTicket = async (ticket: any) => {
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", ticket.order_id)
      .maybeSingle();

    const { data: ticketType } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("id", ticket.ticket_type_id)
      .maybeSingle();

    const { data: eventRow } = await supabase
      .from("events")
      .select("*")
      .eq("id", ticketType?.event_id)
      .maybeSingle();

    const { data: resale } = await supabase
      .from("resales")
      .select("*")
      .eq("ticket_id", ticket.id)
      .in("status", ["active", "sold", "listed"])
      .maybeSingle();

    return { ...ticket, order, ticketType, eventRow, resale };
  };

  const loadTickets = async () => {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserEmail(user.email || "");
    setUserId(user.id);

    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const enriched = await Promise.all((data || []).map((t) => enrichTicket(t)));

    setTickets(enriched);
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const getOriginalPrice = (ticket: any) => {
    return Number(ticket.ticketType?.price || 0);
  };

  const getBuyerTotal = (price: number) => {
    return price + price * (RESALE_FEE_PERCENT / 100);
  };

  const canListTicket = (ticket: any) => {
    if (ticket.checked_in) return false;
    if (ticket.resale?.status === "active") return false;
    if (ticket.resale?.status === "listed") return false;
    if (ticket.resale?.status === "sold") return false;
    return true;
  };

  const handleConfirmResale = async () => {
    if (!selectedTicket || !userId) return;

    try {
      setListing(true);

      const originalPrice = getOriginalPrice(selectedTicket);
      const buyerTotal = getBuyerTotal(originalPrice);

      if (originalPrice <= 0) {
        alert("Free tickets cannot be resold.");
        return;
      }

      if (!selectedTicket.id) {
        alert("Ticket ID missing.");
        return;
      }

      if (!selectedTicket.ticketType?.id) {
        alert("Ticket type missing.");
        return;
      }

      if (!selectedTicket.eventRow?.id) {
        alert("Event ID missing.");
        return;
      }

      const payload = {
        ticket_id: selectedTicket.id,

        // old table compatibility
        seller_id: userId,
        buyer_id: null,

        // new table fields
        seller_user_id: userId,
        buyer_user_id: null,

        event_id: selectedTicket.eventRow.id,
        ticket_type_id: selectedTicket.ticketType.id,

        resale_price: originalPrice,
        resale_fee_percent: RESALE_FEE_PERCENT,
        seller_amount: originalPrice,
        buyer_total: buyerTotal,

        status: "active",
      };

      const { data: createdResale, error } = await supabase
        .from("resales")
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("FULL RESALE ERROR:", error);
        alert(`Failed to list ticket: ${error.message}`);
        return;
      }

      console.log("Created resale:", createdResale);

      alert("Ticket listed for resale successfully.");
      setSelectedTicket(null);
      await loadTickets();
    } catch (error) {
      console.error("Resale insert catch error:", error);
      alert(
        error instanceof Error
          ? `Failed to list ticket: ${error.message}`
          : "Failed to list ticket."
      );
    } finally {
      setListing(false);
    }
  };

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-4xl font-bold">My Tickets</h1>
        <p className="mb-10 text-white/60">Logged in as {userEmail}</p>

        {loading ? (
          <p>Loading...</p>
        ) : tickets.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            No tickets yet.
          </div>
        ) : (
          <div className="grid gap-6">
            {tickets.map((ticket) => {
              const originalPrice = getOriginalPrice(ticket);
              const buyerTotal = getBuyerTotal(originalPrice);
              const alreadyListed =
                ticket.resale?.status === "active" ||
                ticket.resale?.status === "listed";
              const soldResale = ticket.resale?.status === "sold";

              return (
                <div
                  key={ticket.id}
                  className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a0a0a] to-[#111827] p-6"
                >
                  <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-start">
                    <div className="flex-1">
                      <h2 className="mb-2 text-xl font-bold">
                        {ticket.eventRow?.title || "Untitled Event"}
                      </h2>

                      <p className="mb-1 text-sm text-white/70">
                        {ticket.ticketType?.name || "Ticket"}
                      </p>

                      <p className="mb-1 text-sm text-white/50">
                        {ticket.eventRow?.location || "Location TBA"}
                      </p>

                      <p className="mb-3 text-sm text-white/50">
                        {ticket.eventRow?.event_date
                          ? new Date(ticket.eventRow.event_date).toLocaleString()
                          : "Date TBA"}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs ${
                            ticket.checked_in
                              ? "bg-red-500/20 text-red-400"
                              : "bg-green-500/20 text-green-400"
                          }`}
                        >
                          {ticket.checked_in ? "Used" : "Valid"}
                        </span>

                        {alreadyListed && (
                          <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs text-orange-300">
                            Listed for resale
                          </span>
                        )}

                        {soldResale && (
                          <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-300">
                            Resold
                          </span>
                        )}
                      </div>

                      <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
                        <p>
                          Original ticket value:{" "}
                          <span className="font-bold text-white">
                            {originalPrice === 0
                              ? "FREE"
                              : `R${originalPrice.toFixed(2)}`}
                          </span>
                        </p>

                        {originalPrice > 0 && (
                          <>
                            <p className="mt-1">
                              Swift resale fee: {RESALE_FEE_PERCENT}%
                            </p>
                            <p className="mt-1">
                              Buyer pays:{" "}
                              <span className="font-bold text-white">
                                R{buyerTotal.toFixed(2)}
                              </span>
                            </p>
                            <p className="mt-1">
                              Seller receives:{" "}
                              <span className="font-bold text-white">
                                R{originalPrice.toFixed(2)}
                              </span>
                            </p>
                          </>
                        )}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        {canListTicket(ticket) && originalPrice > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedTicket(ticket)}
                            className="bg-white px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-black transition hover:bg-white/90"
                          >
                            List for Resale
                          </button>
                        )}

                        {ticket.checked_in && (
                          <p className="text-xs text-white/40">
                            Used tickets cannot be resold.
                          </p>
                        )}

                        {originalPrice <= 0 && !ticket.checked_in && (
                          <p className="text-xs text-white/40">
                            Free tickets cannot be resold.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white p-4">
                      <QRCodeCanvas
                        value={ticket.qr_code}
                        size={140}
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>
                  </div>

                  <div className="mt-4 break-all text-xs text-white/40">
                    Ticket ID: {ticket.qr_code}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6">
          <div className="w-full max-w-md border border-white/15 bg-[#0b0b0b] p-6">
            <p className="mb-2 text-sm uppercase tracking-[0.14em] text-white/45">
              Swift Resale
            </p>

            <h2 className="text-2xl font-extrabold">
              Confirm Resale Listing
            </h2>

            <p className="mt-4 text-sm leading-6 text-white/70">
              Are you sure you want to list this ticket for resale? Once listed,
              another buyer can purchase it through Swift Tickets.
            </p>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
              <p>
                Event:{" "}
                <span className="font-bold text-white">
                  {selectedTicket.eventRow?.title || "Untitled Event"}
                </span>
              </p>

              <p className="mt-2">
                Ticket:{" "}
                <span className="font-bold text-white">
                  {selectedTicket.ticketType?.name || "Ticket"}
                </span>
              </p>

              <p className="mt-2">
                Seller receives:{" "}
                <span className="font-bold text-white">
                  R{getOriginalPrice(selectedTicket).toFixed(2)}
                </span>
              </p>

              <p className="mt-2">
                Buyer pays:{" "}
                <span className="font-bold text-white">
                  R
                  {getBuyerTotal(getOriginalPrice(selectedTicket)).toFixed(2)}
                </span>
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="flex-1 border border-white/20 px-4 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={listing}
                onClick={handleConfirmResale}
                className="flex-1 bg-white px-4 py-3 text-sm font-bold text-black transition hover:bg-white/90 disabled:opacity-60"
              >
                {listing ? "Listing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}