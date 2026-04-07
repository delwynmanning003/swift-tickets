"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
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
  const [eventTime, setEventTime] = useState("");
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [tickets, setTickets] = useState<TicketInput[]>([
    { name: "", description: "", price: "", quantity: "" },
  ]);

  const addTicket = () => {
    setTickets((prev) => [
      ...prev,
      { name: "", description: "", price: "", quantity: "" },
    ]);
  };

  const removeTicket = (index: number) => {
    setTickets((prev) => prev.filter((_, i) => i !== index));
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

  const combinedDateTime = useMemo(() => {
    if (!eventDate || !eventTime) return "";
    return `${eventDate}T${eventTime}`;
  }, [eventDate, eventTime]);

  const previewDate = useMemo(() => {
    if (!combinedDateTime) return "Select date and time";
    const parsed = new Date(combinedDateTime);
    if (Number.isNaN(parsed.getTime())) return "Select date and time";

    return parsed.toLocaleString("en-ZA", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [combinedDateTime]);

  const lowestTicketPrice = useMemo(() => {
    const validPrices = tickets
      .map((ticket) => Number(ticket.price))
      .filter((price) => !Number.isNaN(price) && price >= 0);

    if (validPrices.length === 0) return null;
    return Math.min(...validPrices);
  }, [tickets]);

  const handleCreateEvent = async () => {
    try {
      setLoading(true);

      if (!title.trim()) {
        alert("Please enter an event title");
        return;
      }

      if (!location.trim()) {
        alert("Please enter a location");
        return;
      }

      if (!eventDate) {
        alert("Please select an event date");
        return;
      }

      if (!eventTime) {
        alert("Please select an event time");
        return;
      }

      if (!organizerEmail.trim()) {
        alert("Please enter organizer email");
        return;
      }

      if (tickets.length === 0) {
        alert("Please add at least one ticket type");
        return;
      }

      for (const ticket of tickets) {
        if (!ticket.name.trim()) {
          alert("Each ticket must have a name");
          return;
        }

        if (ticket.price === "" || Number(ticket.price) < 0) {
          alert("Each ticket must have a valid price");
          return;
        }

        if (ticket.quantity === "" || Number(ticket.quantity) < 0) {
          alert("Each ticket must have a valid quantity");
          return;
        }
      }

      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert([
          {
            title: title.trim(),
            location: location.trim(),
            event_date: combinedDateTime,
            organizer_email: organizerEmail.trim(),
          },
        ])
        .select()
        .single();

      if (eventError) {
        console.error("Event creation error:", eventError);
        alert(`Error creating event: ${eventError.message}`);
        return;
      }

      const ticketPayload = tickets.map((t) => ({
        event_id: event.id,
        name: t.name.trim(),
        description: t.description.trim(),
        price: Number(t.price),
        quantity: Number(t.quantity),
      }));

      const { error: ticketError } = await supabase
        .from("ticket_types")
        .insert(ticketPayload);

      if (ticketError) {
        console.error("Ticket creation error:", ticketError);
        alert(`Error creating tickets: ${ticketError.message}`);
        return;
      }

      alert("Event + Tickets created successfully!");

      setTitle("");
      setLocation("");
      setEventDate("");
      setEventTime("");
      setOrganizerEmail("");
      setTickets([{ name: "", description: "", price: "", quantity: "" }]);
    } catch (error) {
      console.error("Unexpected error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Unexpected error creating event"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-[1440px] px-6 py-8 md:px-8 md:py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[360px_1fr] lg:gap-12">
          <div>
            <div className="relative mb-4 aspect-[0.9] w-full overflow-hidden bg-[linear-gradient(135deg,#334155,#0f172a,#1e293b)]">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(249,115,22,0.35),rgba(59,130,246,0.25),rgba(0,0,0,0.65))]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-gray-300">
                  Live event
                </p>
                <h2 className="text-[34px] font-extrabold uppercase leading-[0.95]">
                  {title || "Your Event"}
                </h2>
              </div>
            </div>

            <h3 className="mb-1 text-[16px] font-semibold">
              {location || "Your location"}
            </h3>

            <p className="mb-6 text-[12px] text-gray-300">{previewDate}</p>

            <div className="border border-white/15 bg-white/[0.03] p-4">
              <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/60">
                Tickets from
              </p>
              <p className="text-[24px] font-extrabold">
                {lowestTicketPrice !== null
                  ? `R${lowestTicketPrice.toFixed(2)}`
                  : "R0.00"}
              </p>
            </div>
          </div>

          <div>
            <div className="relative mb-6 overflow-hidden border border-white/10 bg-white/[0.03]">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(249,115,22,0.14),rgba(59,130,246,0.14))]" />
              <div className="relative px-6 py-6 md:px-8 md:py-7">
                <p className="mb-2 text-[15px] text-gray-200">
                  By Swift Tickets
                </p>
                <h1 className="mb-2 text-[42px] font-extrabold leading-[0.95] tracking-[-0.03em] md:text-[56px]">
                  Create Event
                </h1>
                <p className="text-[14px] text-white/75">
                  Build your event listing and add ticket types in one place.
                </p>
              </div>
            </div>

            <div className="mb-8 border border-white/15">
              <div className="border-b border-white/15 px-6 py-4">
                <h2 className="text-[28px] font-extrabold tracking-[-0.03em]">
                  Event Details
                </h2>
              </div>

              <div className="grid gap-5 p-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-white/65">
                    Event Title
                  </label>
                  <input
                    placeholder="Enter your event title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-12 w-full border border-white/20 bg-transparent px-4 text-[15px] outline-none transition placeholder:text-white/30 focus:border-white/70"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-white/65">
                    Location
                  </label>
                  <input
                    placeholder="Venue or address"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="h-12 w-full border border-white/20 bg-transparent px-4 text-[15px] outline-none transition placeholder:text-white/30 focus:border-white/70"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-white/65">
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="h-12 w-full border border-white/20 bg-transparent px-4 text-[15px] outline-none transition focus:border-white/70"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-white/65">
                    Event Time
                  </label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="h-12 w-full border border-white/20 bg-transparent px-4 text-[15px] outline-none transition focus:border-white/70"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-white/65">
                    Organizer Email
                  </label>
                  <input
                    placeholder="name@example.com"
                    value={organizerEmail}
                    onChange={(e) => setOrganizerEmail(e.target.value)}
                    className="h-12 w-full border border-white/20 bg-transparent px-4 text-[15px] outline-none transition placeholder:text-white/30 focus:border-white/70"
                  />
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[35px] font-extrabold tracking-[-0.04em]">
                  Tickets
                </h2>

                <button
                  onClick={addTicket}
                  disabled={loading}
                  className="border border-white/70 px-5 py-3 text-[12px] font-bold uppercase tracking-[0.08em] transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + Add Ticket
                </button>
              </div>

              <div className="grid gap-4">
                {tickets.map((ticket, index) => (
                  <div
                    key={index}
                    className="border border-white/65 bg-transparent p-5"
                  >
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <p className="text-[16px] font-bold">
                        Ticket {index + 1}
                      </p>

                      {tickets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTicket(index)}
                          className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/60 transition hover:text-white"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                          Ticket Name
                        </label>
                        <input
                          placeholder="e.g. General, VIP, Early Bird"
                          value={ticket.name}
                          onChange={(e) =>
                            updateTicket(index, "name", e.target.value)
                          }
                          className="h-12 w-full border border-white/20 bg-transparent px-4 text-[15px] outline-none transition placeholder:text-white/30 focus:border-white/70"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                          Description
                        </label>
                        <input
                          placeholder="What does this ticket include?"
                          value={ticket.description}
                          onChange={(e) =>
                            updateTicket(index, "description", e.target.value)
                          }
                          className="h-12 w-full border border-white/20 bg-transparent px-4 text-[15px] outline-none transition placeholder:text-white/30 focus:border-white/70"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                          Price
                        </label>
                        <input
                          placeholder="0.00"
                          type="number"
                          min="0"
                          value={ticket.price}
                          onChange={(e) =>
                            updateTicket(index, "price", e.target.value)
                          }
                          className="h-12 w-full border border-white/20 bg-transparent px-4 text-[15px] outline-none transition placeholder:text-white/30 focus:border-white/70"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                          Quantity
                        </label>
                        <input
                          placeholder="0"
                          type="number"
                          min="0"
                          value={ticket.quantity}
                          onChange={(e) =>
                            updateTicket(index, "quantity", e.target.value)
                          }
                          className="h-12 w-full border border-white/20 bg-transparent px-4 text-[15px] outline-none transition placeholder:text-white/30 focus:border-white/70"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={handleCreateEvent}
                disabled={loading}
                className="bg-white px-8 py-4 text-[12px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating..." : "Create Event"}
              </button>

              <p className="text-[12px] uppercase tracking-[0.08em] text-white/45">
                Your event and ticket types will be created together
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
