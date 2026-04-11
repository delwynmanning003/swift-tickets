"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type TicketInput = {
  name: string;
  description: string;
  price: string;
  quantity: string;
};

const categories = ["festival", "music", "lifestyle", "business"];
const creatorTypes = ["organiser", "venue"] as const;
type CreatorType = (typeof creatorTypes)[number] | "";

export default function CreateEventPage() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [creatorType, setCreatorType] = useState<CreatorType>("");
  const [feeOption, setFeeOption] = useState("");

  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState("");
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [tickets, setTickets] = useState<TicketInput[]>([
    { name: "", description: "", price: "", quantity: "" },
  ]);

  useEffect(() => {
    return () => {
      if (posterPreview) {
        URL.revokeObjectURL(posterPreview);
      }
    };
  }, [posterPreview]);

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

  const hasFreeTickets = useMemo(() => {
    return tickets.some((ticket) => Number(ticket.price) === 0);
  }, [tickets]);

  const handlePosterChange = (file: File | null) => {
    if (posterPreview) {
      URL.revokeObjectURL(posterPreview);
    }

    setPosterFile(file);

    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPosterPreview(objectUrl);
    } else {
      setPosterPreview("");
    }
  };

  const uploadPoster = async () => {
    if (!posterFile) return null;

    const fileExt = posterFile.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("event-posters")
      .upload(fileName, posterFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from("event-posters")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleCreateEvent = async () => {
    try {
      setLoading(true);

      if (!user) {
        alert("Please log in or sign up first");
        return;
      }

      if (!creatorType) {
        alert("Please choose whether you are an organiser or a venue");
        return;
      }

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

      if (!description.trim()) {
        alert("Please enter an event description");
        return;
      }

      if (!category.trim()) {
        alert("Please select a category");
        return;
      }

      if (!feeOption) {
        alert("Please select a fee option");
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

      const imageUrl = await uploadPoster();

      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert([
          {
            title: title.trim(),
            location: location.trim(),
            event_date: combinedDateTime,
            organizer_email: organizerEmail.trim(),
            description: description.trim(),
            category: category.trim(),
            creator_type: creatorType,
            fee_option: feeOption,
            image_url: imageUrl,
            user_id: user.id,
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
      setDescription("");
      setCategory("");
      setCreatorType("");
      setFeeOption("");
      setPosterFile(null);

      if (posterPreview) {
        URL.revokeObjectURL(posterPreview);
      }

      setPosterPreview("");
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

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-white/60">Checking your account...</p>
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

          <h1 className="mt-3 text-[32px] font-extrabold">
            You need an account
          </h1>

          <p className="mt-3 text-sm text-white/70">
            Log in or sign up to create an event.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/signup"
              className="bg-white px-6 py-3 text-sm font-bold text-black"
            >
              Sign Up
            </Link>

            <Link
              href="/login"
              className="border border-white/30 px-6 py-3 text-sm text-white"
            >
              Log In
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-[1440px] px-6 py-8 md:px-8 md:py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[360px_1fr] lg:gap-12">
          <div>
            <div className="relative mb-4 aspect-[0.9] w-full overflow-hidden bg-[linear-gradient(135deg,#334155,#0f172a,#1e293b)]">
              {posterPreview ? (
                <Image
                  src={posterPreview}
                  alt="Poster preview"
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(249,115,22,0.35),rgba(59,130,246,0.25),rgba(0,0,0,0.65))]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </>
              )}

              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-gray-300">
                  {category || "Live event"}
                </p>
                <h2 className="text-[34px] font-extrabold uppercase leading-[0.95]">
                  {title || "Your Event"}
                </h2>
              </div>
            </div>

            <h3 className="mb-1 text-[16px] font-semibold">
              {location || "Your location"}
            </h3>

            <p className="mb-3 text-[12px] text-gray-300">{previewDate}</p>

            <p className="mb-6 text-[13px] leading-6 text-white/70">
              {description || "Your event description will appear here."}
            </p>

            <div className="border border-white/15 bg-white/[0.03] p-4">
              <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/60">
                Tickets from
              </p>
              <p className="text-[24px] font-extrabold">
                {lowestTicketPrice !== null
                  ? lowestTicketPrice === 0
                    ? "FREE"
                    : `R${lowestTicketPrice.toFixed(2)}`
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
                  Build your event listing, upload your poster, and add ticket
                  types in one place.
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

                <div>
                  <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-white/65">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-12 w-full border border-white/20 bg-black px-4 text-[15px] outline-none transition focus:border-white/70"
                  >
                    <option value="">Select category</option>
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {item.charAt(0).toUpperCase() + item.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-white/65">
                    Event Poster
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handlePosterChange(e.target.files?.[0] || null)
                    }
                    className="block h-12 w-full border border-white/20 bg-transparent px-4 py-3 text-[14px] text-white file:mr-4 file:border-0 file:bg-white file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-black"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-white/65">
                    Event Description
                  </label>
                  <textarea
                    placeholder="Tell people what your event is about"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className="w-full border border-white/20 bg-transparent px-4 py-3 text-[15px] outline-none transition placeholder:text-white/30 focus:border-white/70"
                  />
                </div>

                <div className="md:col-span-2 border border-white/15 p-5">
                  <h3 className="mb-4 text-[18px] font-bold">Fees</h3>

                  <p className="mb-2 text-[13px] text-white/60">
                    Platform fee: <span className="font-bold">R3 + 4%</span> per
                    paid ticket
                  </p>

                  <p className="mb-4 text-[12px] text-white/45">
                    Free tickets remain free. No platform fee is charged on
                    tickets priced at R0.00.
                  </p>

                  <div className="grid gap-3">
                    <button
                      type="button"
                      onClick={() => setFeeOption("buyer_pays_all")}
                      className={`border p-4 text-left transition ${
                        feeOption === "buyer_pays_all"
                          ? "border-white bg-white text-black"
                          : "border-white/20 hover:border-white"
                      }`}
                    >
                      <p className="font-bold">Buyer pays all</p>
                      <p className="text-sm opacity-80">
                        Buyer pays R3 + 4% on top of the ticket price
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFeeOption("organizer_pays_all")}
                      className={`border p-4 text-left transition ${
                        feeOption === "organizer_pays_all"
                          ? "border-white bg-white text-black"
                          : "border-white/20 hover:border-white"
                      }`}
                    >
                      <p className="font-bold">Organiser pays all</p>
                      <p className="text-sm opacity-80">
                        No extra fee is shown to the buyer. R3 + 4% is deducted
                        from your payout.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFeeOption("split")}
                      className={`border p-4 text-left transition ${
                        feeOption === "split"
                          ? "border-white bg-white text-black"
                          : "border-white/20 hover:border-white"
                      }`}
                    >
                      <p className="font-bold">Split fees</p>
                      <p className="text-sm opacity-80">
                        Buyer pays 4% and organiser pays R3 per paid ticket.
                      </p>
                    </button>
                  </div>

                  {hasFreeTickets && (
                    <div className="mt-4 border border-emerald-500/25 bg-emerald-500/10 p-4 text-[13px] text-emerald-200">
                      One or more of your ticket types are free. Free tickets
                      will not be charged any platform fee regardless of the fee
                      option selected.
                    </div>
                  )}
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
                Your event, poster and ticket types will be created together
              </p>
            </div>
          </div>
        </div>
      </div>

      {!creatorType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6">
          <div className="w-full max-w-md border border-white/15 bg-[#0b0b0b] p-6 shadow-2xl">
            <p className="mb-2 text-[12px] uppercase tracking-[0.16em] text-white/50">
              Before you continue
            </p>

            <h2 className="mb-3 text-[30px] font-extrabold leading-tight tracking-[-0.03em]">
              Are you an organiser or a venue?
            </h2>

            <p className="mb-6 text-[14px] leading-6 text-white/70">
              Choose the option that best describes you before creating your
              event listing.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setCreatorType("organiser")}
                className="border border-white/25 bg-white px-4 py-4 text-[13px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-white/90"
              >
                Organiser
              </button>

              <button
                type="button"
                onClick={() => setCreatorType("venue")}
                className="border border-white/25 bg-transparent px-4 py-4 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-white hover:text-black"
              >
                Venue
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}