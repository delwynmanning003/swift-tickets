"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type EventForm = {
  title: string;
  location: string;
  event_date: string;
  category: string;
  image_url: string;
  description: string;
};

type TicketTypeForm = {
  id?: string;
  name: string;
  price: string;
  quantity: string;
};

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [eventForm, setEventForm] = useState<EventForm>({
    title: "",
    location: "",
    event_date: "",
    category: "",
    image_url: "",
    description: "",
  });

  const [ticketTypes, setTicketTypes] = useState<TicketTypeForm[]>([
    { name: "", price: "", quantity: "" },
  ]);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);
      setCheckingAuth(false);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadEvent = async () => {
      if (!eventId || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("id", eventId)
          .single();

        if (eventError) {
          throw new Error(eventError.message);
        }

        if (!eventData) {
          throw new Error("Event not found.");
        }

        const canAccess =
          eventData.user_id === user.id ||
          eventData.organizer_email === user.email;

        if (!canAccess) {
          throw new Error("You do not have permission to edit this event.");
        }

        setEventForm({
          title: eventData.title || "",
          location: eventData.location || "",
          event_date: eventData.event_date
            ? formatForDatetimeLocal(eventData.event_date)
            : "",
          category: eventData.category || "",
          image_url: eventData.image_url || "",
          description: eventData.description || "",
        });

        const { data: ticketTypeRows, error: ticketTypesError } = await supabase
          .from("ticket_types")
          .select("id, name, price, quantity")
          .eq("event_id", eventId)
          .order("created_at", { ascending: true });

        if (ticketTypesError) {
          throw new Error(ticketTypesError.message);
        }

        if (ticketTypeRows && ticketTypeRows.length > 0) {
          setTicketTypes(
            ticketTypeRows.map((ticket) => ({
              id: ticket.id,
              name: ticket.name || "",
              price: String(ticket.price ?? ""),
              quantity: String(ticket.quantity ?? ""),
            }))
          );
        } else {
          setTicketTypes([{ name: "", price: "", quantity: "" }]);
        }
      } catch (error) {
        console.error("Load event error:", error);
        alert(error instanceof Error ? error.message : "Failed to load event");
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    if (!checkingAuth) {
      loadEvent();
    }
  }, [eventId, user, checkingAuth, router]);

  const totalCapacity = useMemo(() => {
    return ticketTypes.reduce(
      (sum, ticket) => sum + Number(ticket.quantity || 0),
      0
    );
  }, [ticketTypes]);

  const handleEventChange = (
    field: keyof EventForm,
    value: string
  ) => {
    setEventForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTicketChange = (
    index: number,
    field: keyof TicketTypeForm,
    value: string
  ) => {
    setTicketTypes((prev) =>
      prev.map((ticket, i) =>
        i === index ? { ...ticket, [field]: value } : ticket
      )
    );
  };

  const addTicketType = () => {
    setTicketTypes((prev) => [
      ...prev,
      { name: "", price: "", quantity: "" },
    ]);
  };

  const removeTicketType = (index: number) => {
    setTicketTypes((prev) => {
      if (prev.length === 1) {
        return [{ name: "", price: "", quantity: "" }];
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventId) {
      alert("Missing event ID.");
      return;
    }

    if (!eventForm.title.trim()) {
      alert("Please enter the event title.");
      return;
    }

    if (!eventForm.event_date) {
      alert("Please enter the event date.");
      return;
    }

    const cleanedTicketTypes = ticketTypes
      .map((ticket) => ({
        ...ticket,
        name: ticket.name.trim(),
        price: ticket.price.trim(),
        quantity: ticket.quantity.trim(),
      }))
      .filter(
        (ticket) =>
          ticket.name !== "" ||
          ticket.price !== "" ||
          ticket.quantity !== ""
      );

    if (cleanedTicketTypes.length === 0) {
      alert("Please add at least one ticket type.");
      return;
    }

    for (const ticket of cleanedTicketTypes) {
      if (!ticket.name) {
        alert("Every ticket type must have a name.");
        return;
      }

      if (ticket.price === "" || Number(ticket.price) < 0) {
        alert("Every ticket type must have a valid price.");
        return;
      }

      if (ticket.quantity === "" || Number(ticket.quantity) < 0) {
        alert("Every ticket type must have a valid quantity.");
        return;
      }
    }

    try {
      setSaving(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const currentUser = session?.user;

      if (!currentUser) {
        throw new Error("You must be logged in.");
      }

      const { data: existingEvent, error: existingEventError } = await supabase
        .from("events")
        .select("id, user_id, organizer_email")
        .eq("id", eventId)
        .single();

      if (existingEventError) {
        throw new Error(existingEventError.message);
      }

      const canAccess =
        existingEvent.user_id === currentUser.id ||
        existingEvent.organizer_email === currentUser.email;

      if (!canAccess) {
        throw new Error("You do not have permission to edit this event.");
      }

      const { error: updateEventError } = await supabase
        .from("events")
        .update({
          title: eventForm.title.trim(),
          location: eventForm.location.trim(),
          event_date: eventForm.event_date,
          category: eventForm.category.trim(),
          image_url: eventForm.image_url.trim(),
          description: eventForm.description.trim(),
        })
        .eq("id", eventId);

      if (updateEventError) {
        throw new Error(updateEventError.message);
      }

      const { data: existingTicketTypes, error: existingTicketTypesError } =
        await supabase
          .from("ticket_types")
          .select("id")
          .eq("event_id", eventId);

      if (existingTicketTypesError) {
        throw new Error(existingTicketTypesError.message);
      }

      const existingIds = (existingTicketTypes || []).map((row) => row.id);
      const submittedIds = cleanedTicketTypes
        .map((ticket) => ticket.id)
        .filter(Boolean) as string[];

      const idsToDelete = existingIds.filter((id) => !submittedIds.includes(id));

      if (idsToDelete.length > 0) {
        const { data: soldTickets, error: soldTicketsError } = await supabase
          .from("tickets")
          .select("id, ticket_type_id, status")
          .in("ticket_type_id", idsToDelete);

        if (soldTicketsError) {
          throw new Error(soldTicketsError.message);
        }

        const hasIssuedTickets = (soldTickets || []).some((ticket) =>
          ["paid", "completed", "confirmed", "success", "checked_in", "checked-in"].includes(
            String(ticket.status || "").toLowerCase()
          )
        );

        if (hasIssuedTickets) {
          throw new Error(
            "You cannot remove a ticket type that already has sold tickets."
          );
        }

        const { error: deleteUnsoldTicketsError } = await supabase
          .from("tickets")
          .delete()
          .in("ticket_type_id", idsToDelete);

        if (deleteUnsoldTicketsError) {
          throw new Error(deleteUnsoldTicketsError.message);
        }

        const { error: deleteTicketTypesError } = await supabase
          .from("ticket_types")
          .delete()
          .in("id", idsToDelete);

        if (deleteTicketTypesError) {
          throw new Error(deleteTicketTypesError.message);
        }
      }

      for (const ticket of cleanedTicketTypes) {
        const payload = {
          event_id: eventId,
          name: ticket.name,
          price: Number(ticket.price),
          quantity: Number(ticket.quantity),
        };

        if (ticket.id) {
          const { error: updateTicketTypeError } = await supabase
            .from("ticket_types")
            .update(payload)
            .eq("id", ticket.id)
            .eq("event_id", eventId);

          if (updateTicketTypeError) {
            throw new Error(updateTicketTypeError.message);
          }
        } else {
          const { error: insertTicketTypeError } = await supabase
            .from("ticket_types")
            .insert(payload);

          if (insertTicketTypeError) {
            throw new Error(insertTicketTypeError.message);
          }
        }
      }

      alert("Event updated successfully.");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Save event error:", error);
      alert(error instanceof Error ? error.message : "Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  if (checkingAuth || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-white/60">
          {checkingAuth ? "Checking your account..." : "Loading event..."}
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="w-full max-w-md border border-white/15 bg-[#0b0b0b] p-8 text-center">
          <p className="text-[12px] uppercase tracking-[0.16em] text-white/50">
            Swift Tickets
          </p>
          <h1 className="mt-3 text-[32px] font-extrabold">Log in required</h1>
          <p className="mt-3 text-sm text-white/70">
            Please log in to edit your event.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/login"
              className="bg-white px-6 py-3 text-sm font-bold text-black"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="border border-white/30 px-6 py-3 text-sm text-white"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-8 md:px-8 md:py-10">
        <div className="mb-8 overflow-hidden border border-white/10 bg-white/[0.03]">
          <div className="bg-[linear-gradient(90deg,rgba(249,115,22,0.14),rgba(59,130,246,0.14))] px-6 py-6 md:px-8">
            <p className="mb-2 text-[15px] text-gray-200">By Swift Tickets</p>
            <h1 className="text-[36px] font-extrabold leading-[0.95] tracking-[-0.03em] md:text-[48px]">
              Edit Event
            </h1>
            <p className="mt-2 text-[14px] text-white/75">
              Update your event details and manage ticket quantities.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          <section className="border border-white/15 bg-white/[0.03] p-5 md:p-6">
            <h2 className="text-[24px] font-extrabold tracking-[-0.03em]">
              Event Details
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[12px] font-bold uppercase tracking-[0.1em] text-white/60">
                  Event Title
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => handleEventChange("title", e.target.value)}
                  className="w-full border border-white/15 bg-black px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-white/40"
                  placeholder="All White Sunday"
                />
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-bold uppercase tracking-[0.1em] text-white/60">
                  Category
                </label>
                <input
                  type="text"
                  value={eventForm.category}
                  onChange={(e) => handleEventChange("category", e.target.value)}
                  className="w-full border border-white/15 bg-black px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-white/40"
                  placeholder="Nightlife"
                />
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-bold uppercase tracking-[0.1em] text-white/60">
                  Location
                </label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => handleEventChange("location", e.target.value)}
                  className="w-full border border-white/15 bg-black px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-white/40"
                  placeholder="14 Staib Street, New Doornfontein"
                />
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-bold uppercase tracking-[0.1em] text-white/60">
                  Event Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={eventForm.event_date}
                  onChange={(e) => handleEventChange("event_date", e.target.value)}
                  className="w-full border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-white/40"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-[12px] font-bold uppercase tracking-[0.1em] text-white/60">
                  Image URL
                </label>
                <input
                  type="text"
                  value={eventForm.image_url}
                  onChange={(e) => handleEventChange("image_url", e.target.value)}
                  className="w-full border border-white/15 bg-black px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-white/40"
                  placeholder="https://..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-[12px] font-bold uppercase tracking-[0.1em] text-white/60">
                  Description
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => handleEventChange("description", e.target.value)}
                  rows={6}
                  className="w-full border border-white/15 bg-black px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-white/40"
                  placeholder="Describe your event..."
                />
              </div>
            </div>
          </section>

          <section className="border border-white/15 bg-white/[0.03] p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[24px] font-extrabold tracking-[-0.03em]">
                  Ticket Types
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Add, change, or increase quantities for your ticket types.
                </p>
              </div>

              <button
                type="button"
                onClick={addTicketType}
                className="border border-white/25 px-5 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-white hover:text-black"
              >
                Add Ticket Type
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {ticketTypes.map((ticket, index) => (
                <div
                  key={ticket.id || `new-${index}`}
                  className="grid gap-4 border border-white/10 bg-black/30 p-4 md:grid-cols-[1.4fr_1fr_1fr_auto]"
                >
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-white/50">
                      Ticket Name
                    </label>
                    <input
                      type="text"
                      value={ticket.name}
                      onChange={(e) =>
                        handleTicketChange(index, "name", e.target.value)
                      }
                      className="w-full border border-white/15 bg-black px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-white/40"
                      placeholder="General Access"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-white/50">
                      Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ticket.price}
                      onChange={(e) =>
                        handleTicketChange(index, "price", e.target.value)
                      }
                      className="w-full border border-white/15 bg-black px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-white/40"
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-white/50">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={ticket.quantity}
                      onChange={(e) =>
                        handleTicketChange(index, "quantity", e.target.value)
                      }
                      className="w-full border border-white/15 bg-black px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-white/40"
                      placeholder="200"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeTicketType(index)}
                      className="w-full border border-red-500/50 px-4 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-red-300 transition hover:bg-red-500 hover:text-white"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 border border-white/10 bg-black/30 p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">
                Total Capacity
              </p>
              <p className="mt-2 text-[28px] font-extrabold">{totalCapacity}</p>
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-white px-6 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <Link
              href="/dashboard"
              className="border border-white/25 px-6 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-white hover:text-black"
            >
              Back to Dashboard
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

function formatForDatetimeLocal(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  const pad = (num: number) => String(num).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}