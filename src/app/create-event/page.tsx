"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type TicketInput = {
  name: string;
  description: string;
  price: string;
  quantity: string;
};

export default function CreateEventPage() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [tickets, setTickets] = useState<TicketInput[]>([
    { name: "", description: "", price: "", quantity: "" },
  ]);

  const addTicket = () => {
    setTickets([
      ...tickets,
      { name: "", description: "", price: "", quantity: "" },
    ]);
  };

  const updateTicket = (
    index: number,
    field: keyof TicketInput,
    value: string
  ) => {
    const updated = [...tickets];
    updated[index][field] = value;
    setTickets(updated);
  };

  const handleCreateEvent = async () => {
    try {
      setLoading(true);

      if (!title || !location || !eventDate || !organizerEmail) {
        alert("Please fill all fields");
        return;
      }

      const { data: event } = await supabase
        .from("events")
        .insert([
          {
            title,
            location,
            event_date: eventDate,
            organizer_email: organizerEmail,
          },
        ])
        .select()
        .single();

      const ticketPayload = tickets.map((t) => ({
        event_id: event.id,
        name: t.name,
        description: t.description,
        price: Number(t.price),
        quantity: Number(t.quantity),
      }));

      await supabase.from("ticket_types").insert(ticketPayload);

      alert("Event created successfully");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-[1300px] mx-auto grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-12">
        
        {/* LEFT - PREVIEW */}
        <div>
          <div className="w-full aspect-[0.9] bg-gradient-to-br from-zinc-800 to-black relative overflow-hidden mb-4">
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-6 flex items-end">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-300 mb-2">
                  Live event
                </p>
                <h2 className="text-3xl font-extrabold leading-tight uppercase">
                  {title || "Your Event"}
                </h2>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold">{location || "Location"}</h3>
          <p className="text-sm text-gray-400">
            {eventDate
              ? new Date(eventDate).toLocaleString()
              : "Date & time"}
          </p>
        </div>

        {/* RIGHT - FORM */}
        <div>
          <h1 className="text-5xl font-extrabold mb-8">
            Create Event
          </h1>

          {/* EVENT DETAILS */}
          <div className="grid gap-4 mb-10">
            <input
              placeholder="Event Title"
              className="bg-transparent border border-white/30 px-4 py-3 outline-none focus:border-white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <input
              placeholder="Location"
              className="bg-transparent border border-white/30 px-4 py-3 outline-none focus:border-white"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            <input
              type="datetime-local"
              className="bg-transparent border border-white/30 px-4 py-3 outline-none focus:border-white"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />

            <input
              placeholder="Organizer Email"
              className="bg-transparent border border-white/30 px-4 py-3 outline-none focus:border-white"
              value={organizerEmail}
              onChange={(e) => setOrganizerEmail(e.target.value)}
            />
          </div>

          {/* TICKETS */}
          <h2 className="text-3xl font-extrabold mb-6">Tickets</h2>

          <div className="space-y-4 mb-6">
            {tickets.map((ticket, index) => (
              <div
                key={index}
                className="border border-white/40 p-5 flex flex-col gap-3"
              >
                <input
                  placeholder="Ticket Name"
                  className="bg-transparent border border-white/20 px-3 py-2 outline-none"
                  value={ticket.name}
                  onChange={(e) =>
                    updateTicket(index, "name", e.target.value)
                  }
                />

                <input
                  placeholder="Description"
                  className="bg-transparent border border-white/20 px-3 py-2 outline-none"
                  value={ticket.description}
                  onChange={(e) =>
                    updateTicket(index, "description", e.target.value)
                  }
                />

                <div className="flex gap-3">
                  <input
                    placeholder="Price"
                    type="number"
                    className="w-full bg-transparent border border-white/20 px-3 py-2 outline-none"
                    value={ticket.price}
                    onChange={(e) =>
                      updateTicket(index, "price", e.target.value)
                    }
                  />

                  <input
                    placeholder="Qty"
                    type="number"
                    className="w-full bg-transparent border border-white/20 px-3 py-2 outline-none"
                    value={ticket.quantity}
                    onChange={(e) =>
                      updateTicket(index, "quantity", e.target.value)
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addTicket}
            className="border border-white px-6 py-3 text-sm font-bold hover:bg-white hover:text-black transition mb-8"
          >
            + Add Ticket
          </button>

          <br />

          <button
            onClick={handleCreateEvent}
            disabled={loading}
            className="bg-white text-black px-8 py-4 font-bold text-sm hover:bg-white/90 transition"
          >
            {loading ? "Creating..." : "Create Event"}
          </button>
        </div>
      </div>
    </main>
  );
}
