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
            event_date: eventDate,
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
      setOrganizerEmail("");
      setTickets([{ name: "", description: "", price: "", quantity: "" }]);
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("Unexpected error creating event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>Create Event</h1>

      <input
        placeholder="Event Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        placeholder="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />
      <input
        type="datetime-local"
        value={eventDate}
        onChange={(e) => setEventDate(e.target.value)}
      />
      <input
        placeholder="Organizer Email"
        value={organizerEmail}
        onChange={(e) => setOrganizerEmail(e.target.value)}
      />

      <h2 style={{ marginTop: 30 }}>Tickets</h2>

      {tickets.map((ticket, index) => (
        <div key={index} style={{ marginBottom: 20 }}>
          <input
            placeholder="Ticket Name (e.g VIP)"
            value={ticket.name}
            onChange={(e) => updateTicket(index, "name", e.target.value)}
          />
          <input
            placeholder="Description"
            value={ticket.description}
            onChange={(e) => updateTicket(index, "description", e.target.value)}
          />
          <input
            placeholder="Price"
            type="number"
            value={ticket.price}
            onChange={(e) => updateTicket(index, "price", e.target.value)}
          />
          <input
            placeholder="Quantity"
            type="number"
            value={ticket.quantity}
            onChange={(e) => updateTicket(index, "quantity", e.target.value)}
          />
        </div>
      ))}

      <button onClick={addTicket} disabled={loading}>
        + Add Another Ticket
      </button>

      <br />
      <br />

      <button onClick={handleCreateEvent} disabled={loading}>
        {loading ? "Creating..." : "Create Event"}
      </button>
    </main>
  );
}
