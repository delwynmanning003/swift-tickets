"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { QRCodeCanvas } from "qrcode.react";

export default function MyTicketsPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);

  const enrichTicket = async (ticket: any) => {
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", ticket.order_id)
      .single();

    const { data: ticketType } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("id", ticket.ticket_type_id)
      .single();

    const { data: eventRow } = await supabase
      .from("events")
      .select("*")
      .eq("id", ticketType?.event_id)
      .single();

    return { ...ticket, order, ticketType, eventRow };
  };

  const loadTickets = async () => {
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

    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const enriched = await Promise.all(
      (data || []).map((t) => enrichTicket(t))
    );

    setTickets(enriched);
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">My Tickets</h1>
        <p className="text-white/60 mb-10">Logged in as {userEmail}</p>

        {loading ? (
          <p>Loading...</p>
        ) : tickets.length === 0 ? (
          <div className="border border-white/10 p-6 rounded-xl bg-white/5">
            No tickets yet.
          </div>
        ) : (
          <div className="grid gap-6">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="border border-white/10 rounded-2xl p-6 bg-gradient-to-br from-[#0a0a0a] to-[#111827]"
              >
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start justify-between">
                  
                  {/* LEFT INFO */}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold mb-2">
                      {ticket.eventRow?.title}
                    </h2>

                    <p className="text-white/70 text-sm mb-1">
                      {ticket.ticketType?.name}
                    </p>

                    <p className="text-white/50 text-sm mb-1">
                      {ticket.eventRow?.location}
                    </p>

                    <p className="text-white/50 text-sm mb-3">
                      {ticket.eventRow?.event_date
                        ? new Date(
                            ticket.eventRow.event_date
                          ).toLocaleString()
                        : "Date TBA"}
                    </p>

                    <span
                      className={`text-xs px-3 py-1 rounded-full ${
                        ticket.checked_in
                          ? "bg-red-500/20 text-red-400"
                          : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {ticket.checked_in ? "Used" : "Valid"}
                    </span>
                  </div>

                  {/* QR CODE */}
                  <div className="bg-white p-4 rounded-xl">
                    <QRCodeCanvas
                      value={ticket.qr_code}
                      size={140}
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>
                </div>

                {/* FOOTER */}
                <div className="mt-4 text-xs text-white/40 break-all">
                  Ticket ID: {ticket.qr_code}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}