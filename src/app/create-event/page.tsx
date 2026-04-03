"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CreateEventPage() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [organizerEmail, setOrganizerEmail] = useState("");

  const [tickets, setTickets] = useState([
    { name: "", description: "", price: "", quantity: "" },
  ]);

  const addTicket = () => {
    setTickets([
      ...tickets,
      { name: "", description: "", price: "", quantity: "" },
    ]);
  };

  const updateTicket = (index: number, field: string, value: string) => {
    const updated = [...tickets];
    updated[index][field as keyof typeof updated[number]] = value;
    setTickets(updated);
  };

  const handleCreateEvent = async () => {
    // 1. Create event
    const { data: event, error: eventError } = await supabase
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

    if (eventError) {
      alert("Error creating event");
      return;
    }

    // 2. Create tickets
    const ticketPayload = tickets.map((t) => ({
      event_id: event.id,
      name: t.name,
      description: t.description,
      price: Number(t.price),
      quantity: Number(t.quantity),
    }));

    const { error: ticketError } = await supabase
      .from("ticket_types")
      .insert(ticketPayload);

    if (ticketError) {
      alert("Error creating tickets");
      return;
    }

    alert("Event + Tickets created successfully!");
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>Create Event</h1>

      <input placeholder="Event Title" onChange={(e) => setTitle(e.target.value)} />
      <input placeholder="Location" onChange={(e) => setLocation(e.target.value)} />
      <input type="datetime-local" onChange={(e) => setEventDate(e.target.value)} />
      <input placeholder="Organizer Email" onChange={(e) => setOrganizerEmail(e.target.value)} />

      <h2 style={{ marginTop: 30 }}>Tickets</h2>

      {tickets.map((ticket, index) => (
        <div key={index} style={{ marginBottom: 20 }}>
          <input
            placeholder="Ticket Name (e.g VIP)"
            onChange={(e) => updateTicket(index, "name", e.target.value)}
          />
          <input
            placeholder="Description"
            onChange={(e) => updateTicket(index, "description", e.target.value)}
          />
          <input
            placeholder="Price"
            type="number"
            onChange={(e) => updateTicket(index, "price", e.target.value)}
          />
          <input
            placeholder="Quantity"
            type="number"
            onChange={(e) => updateTicket(index, "quantity", e.target.value)}
          />
        </div>
      ))}

      <button onClick={addTicket}>+ Add Another Ticket</button>

      <br /><br />

      <button onClick={handleCreateEvent}>Create Event</button>
    </main>
  );
}