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
  sales_start_at: string;
  sales_end_at: string;
};

const emptyTicket: TicketInput = {
  name: "",
  description: "",
  price: "",
  quantity: "",
  sales_start_at: "",
  sales_end_at: "",
};

const categories = ["festival", "music", "lifestyle", "business"];
const creatorTypes = ["organiser", "venue"] as const;
type CreatorType = (typeof creatorTypes)[number] | "";

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CreateEventPage() {
  const [title, setTitle] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
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

  const [tickets, setTickets] = useState<TicketInput[]>([{ ...emptyTicket }]);

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
    setTickets((prev) => [...prev, { ...emptyTicket }]);
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

  const cleanedSlug = useMemo(() => {
    return createSlug(customSlug || title);
  }, [customSlug, title]);

  const previewUrl = useMemo(() => {
    if (!cleanedSlug) return "swifttickets.co.za/events/your-event-url";
    return `swifttickets.co.za/events/${cleanedSlug}`;
  }, [cleanedSlug]);

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

      if (!cleanedSlug) {
        alert("Please enter a valid custom event URL");
        return;
      }

      if (!venueName.trim()) {
        alert("Please enter a venue name");
        return;
      }

      if (!venueAddress.trim()) {
        alert("Please enter a venue address");
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

        if (
          ticket.sales_start_at &&
          ticket.sales_end_at &&
          new Date(ticket.sales_start_at).getTime() >
            new Date(ticket.sales_end_at).getTime()
        ) {
          alert(
            `Sales start date cannot be after sales end date for ${ticket.name}`
          );
          return;
        }
      }

      const { data: existingSlug, error: slugCheckError } = await supabase
        .from("events")
        .select("id")
        .eq("slug", cleanedSlug)
        .maybeSingle();

      if (slugCheckError) {
        console.error("Slug check error:", slugCheckError);
        alert(`Error checking custom URL: ${slugCheckError.message}`);
        return;
      }

      if (existingSlug) {
        alert("This custom event URL is already taken. Please choose another.");
        return;
      }

      const imageUrl = await uploadPoster();

      const safeLocation = venueAddress.trim();

      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert([
          {
            title: title.trim(),
            slug: cleanedSlug,
            venue_name: venueName.trim(),
            venue_address: venueAddress.trim(),
            location: safeLocation,
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

        if (eventError.message.toLowerCase().includes("duplicate")) {
          alert("This custom event URL is already taken. Please choose another.");
          return;
        }

        alert(`Error creating event: ${eventError.message}`);
        return;
      }

      const ticketPayload = tickets.map((t) => ({
        event_id: event.id,
        name: t.name.trim(),
        description: t.description.trim(),
        price: Number(t.price),
        quantity: Number(t.quantity),
        remaining_quantity: Number(t.quantity),
        sold_count: 0,
        sold_out: Number(t.quantity) <= 0,
        sales_start_at: t.sales_start_at
          ? new Date(t.sales_start_at).toISOString()
          : null,
        sales_end_at: t.sales_end_at
          ? new Date(t.sales_end_at).toISOString()
          : null,
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
      setCustomSlug("");
      setVenueName("");
      setVenueAddress("");
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
      setTickets([{ ...emptyTicket }]);
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
  }  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.svg"
              alt="Swift Tickets"
              width={340}
              height={120}
              className="h-16 w-auto object-contain md:h-20"
              priority
            />
          </Link>

          <Link
            href="/dashboard"
            className="border border-white/15 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-white hover:text-black"
          >
            Dashboard
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <section className="space-y-8">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.22em] text-white/40">
                Swift Tickets
              </p>

              <h1 className="mt-2 text-[42px] font-black leading-none tracking-[-0.05em] md:text-[62px]">
                Create Event
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-white/60">
                Create events, launch ticket sales and manage presales with
                timed ticket releases.
              </p>
            </div>

            <div className="border border-white/10 bg-white/[0.03] p-5 md:p-7">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                    Event Title
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder=""
                    className="h-14 w-full border border-white/15 bg-black/40 px-5 text-[15px] outline-none transition focus:border-white/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                    Organizer Email
                  </label>
                  <input
                    type="email"
                    value={organizerEmail}
                    onChange={(e) => setOrganizerEmail(e.target.value)}
                    placeholder=""
                    className="h-14 w-full border border-white/15 bg-black/40 px-5 text-[15px] outline-none transition focus:border-white/60"
                  />
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                  Custom Event URL
                </label>
                <input
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  placeholder=""
                  className="h-14 w-full border border-white/15 bg-black/40 px-5 text-[15px] outline-none transition focus:border-white/60"
                />
                <p className="mt-3 text-sm text-white/45">{previewUrl}</p>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                    Venue Name
                  </label>
                  <input
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder=""
                    className="h-14 w-full border border-white/15 bg-black/40 px-5 text-[15px] outline-none transition focus:border-white/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                    Venue Address
                  </label>
                  <input
                    value={venueAddress}
                    onChange={(e) => {
                      setVenueAddress(e.target.value);
                      setLocation(e.target.value);
                    }}
                    placeholder=""
                    className="h-14 w-full border border-white/15 bg-black/40 px-5 text-[15px] outline-none transition focus:border-white/60"
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="h-14 w-full border border-white/15 bg-black/40 px-5 text-[15px] outline-none transition focus:border-white/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                    Event Time
                  </label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="h-14 w-full border border-white/15 bg-black/40 px-5 text-[15px] outline-none transition focus:border-white/60"
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-14 w-full border border-white/15 bg-black/40 px-5 text-[15px] outline-none transition focus:border-white/60"
                  >
                    <option value="">Select category</option>
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                    Creator Type
                  </label>
                  <select
                    value={creatorType}
                    onChange={(e) =>
                      setCreatorType(e.target.value as CreatorType)
                    }
                    className="h-14 w-full border border-white/15 bg-black/40 px-5 text-[15px] outline-none transition focus:border-white/60"
                  >
                    <option value="">Select type</option>
                    {creatorTypes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder=""
                  rows={6}
                  className="w-full border border-white/15 bg-black/40 px-5 py-4 text-[15px] outline-none transition focus:border-white/60"
                />
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                  Fee Split
                </label>

                <div className="grid gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setFeeOption("buyer_pays_all")}
                    className={`border px-5 py-4 text-left transition ${
                      feeOption === "buyer_pays_all"
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-black/40 text-white"
                    }`}
                  >
                    <p className="text-[12px] font-black uppercase tracking-[0.08em]">
                      Buyer Pays All
                    </p>
                    <p className="mt-2 text-sm">
                      Buyer pays ticket price + R3 + 4% service fee.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeeOption("organizer_pays_all")}
                    className={`border px-5 py-4 text-left transition ${
                      feeOption === "organizer_pays_all"
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-black/40 text-white"
                    }`}
                  >
                    <p className="text-[12px] font-black uppercase tracking-[0.08em]">
                      Organiser Pays All
                    </p>
                    <p className="mt-2 text-sm">
                      Buyer pays ticket price only. Organiser pays R3 + 4% from
                      payout.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeeOption("split")}
                    className={`border px-5 py-4 text-left transition ${
                      feeOption === "split"
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-black/40 text-white"
                    }`}
                  >
                    <p className="text-[12px] font-black uppercase tracking-[0.08em]">
                      Split Fees
                    </p>
                    <p className="mt-2 text-sm">
                      Buyer pays ticket price + 4%. Organiser pays R3 from
                      payout.
                    </p>
                  </button>
                </div>

                <div className="mt-4 border border-white/10 bg-black/30 p-4 text-[13px] leading-6 text-white/60">
                  <p>
                    <span className="font-bold text-white">Platform fee:</span>{" "}
                    R3 + 4% per paid ticket.
                  </p>
                  <p>
                    Free tickets remain free and do not attract platform fees.
                  </p>
                </div>

                {hasFreeTickets && (
                  <div className="mt-4 border border-emerald-500/25 bg-emerald-500/10 p-4 text-[13px] text-emerald-200">
                    One or more ticket types are free. Free tickets will not be
                    charged any platform fee regardless of the fee option
                    selected.
                  </div>
                )}
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                  Event Poster
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handlePosterChange(e.target.files?.[0] || null)
                  }
                  className="block w-full text-sm text-white"
                />

                {posterPreview && (
                  <div className="relative mt-4 h-[320px] overflow-hidden border border-white/10">
                    <Image
                      src={posterPreview}
                      alt="Poster preview"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="border border-white/10 bg-white/[0.03] p-5 md:p-7">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-black uppercase tracking-[0.18em] text-white/40">
                    Ticketing
                  </p>
                  <h2 className="mt-1 text-[34px] font-black tracking-[-0.05em]">
                    Ticket Types
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={addTicket}
                  className="bg-white px-5 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-black transition hover:bg-white/90"
                >
                  Add Ticket
                </button>
              </div>

              <div className="space-y-5">
                {tickets.map((ticket, index) => (
                  <div
                    key={index}
                    className="border border-white/10 bg-black/30 p-5"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="text-[22px] font-black tracking-[-0.04em]">
                        Ticket {index + 1}
                      </h3>

                      {tickets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTicket(index)}
                          className="text-sm font-bold text-red-300 transition hover:text-red-200"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                          Ticket Name
                        </label>
                        <input
                          value={ticket.name}
                          onChange={(e) =>
                            updateTicket(index, "name", e.target.value)
                          }
                          placeholder=""
                          className="h-14 w-full border border-white/15 bg-black/40 px-5 text-[15px] outline-none transition focus:border-white/60"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={ticket.quantity}
                          onChange={(e) =>
                            updateTicket(index, "quantity", e.target.value)
                          }
                          placeholder=""
                          className="h-14 w-full border border-white/15 bg-black/40 px-5 text-[15px] outline-none transition focus:border-white/60"
                        />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                          Price
                        </label>
                        <input
                          type="number"
                          value={ticket.price}
                          onChange={(e) =>
                            updateTicket(index, "price", e.target.value)
                          }
                          placeholder=""
                          className="h-14 w-full border border-white/15 bg-black/40 px-5 text-[15px] outline-none transition focus:border-white/60"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                          Description
                        </label>
                        <input
                          value={ticket.description}
                          onChange={(e) =>
                            updateTicket(index, "description", e.target.value)
                          }
                          placeholder=""
                          className="h-14 w-full border border-white/15 bg-black/40 px-5 text-[15px] outline-none transition focus:border-white/60"
                        />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                          Sales Start
                        </label>
                        <input
                          type="datetime-local"
                          value={ticket.sales_start_at}
                          onChange={(e) =>
                            updateTicket(
                              index,
                              "sales_start_at",
                              e.target.value
                            )
                          }
                          className="h-14 w-full border border-white/15 bg-black/40 px-5 text-[15px] outline-none transition focus:border-white/60"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                          Sales End
                        </label>
                        <input
                          type="datetime-local"
                          value={ticket.sales_end_at}
                          onChange={(e) =>
                            updateTicket(
                              index,
                              "sales_end_at",
                              e.target.value
                            )
                          }
                          className="h-14 w-full border border-white/15 bg-black/40 px-5 text-[15px] outline-none transition focus:border-white/60"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateEvent}
              disabled={loading}
              className="w-full bg-white px-6 py-5 text-[13px] font-black uppercase tracking-[0.12em] text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating Event..." : "Create Event"}
            </button>
          </section>

          <aside className="space-y-5">
            <div className="overflow-hidden border border-white/10 bg-white/[0.03]">
              <div className="relative aspect-[0.8] bg-white/5">
                {posterPreview ? (
                  <Image
                    src={posterPreview}
                    alt="Poster preview"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.3),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.25),transparent_35%),#111]" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/50">
                    {category || "Category"}
                  </p>

                  <h2 className="text-[34px] font-black leading-none tracking-[-0.05em]">
                    {title || "Your Event"}
                  </h2>

                  <p className="mt-4 text-sm text-white/65">{previewDate}</p>

                  <p className="mt-1 text-sm text-white/55">
                    {venueName || "Venue Name"}
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-white/10 bg-white/[0.03] p-6">
              <h3 className="text-[26px] font-black tracking-[-0.05em]">
                Event Summary
              </h3>

              <div className="mt-5 grid gap-4">
                <div className="border border-white/10 bg-black/30 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                    Custom URL
                  </p>
                  <p className="mt-2 break-all text-[14px] font-bold text-white/70">
                    {previewUrl}
                  </p>
                </div>

                <div className="border border-white/10 bg-black/30 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                    Ticket Types
                  </p>
                  <p className="mt-2 text-[28px] font-black">
                    {tickets.length}
                  </p>
                </div>

                <div className="border border-white/10 bg-black/30 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                    Lowest Price
                  </p>
                  <p className="mt-2 text-[28px] font-black">
                    {lowestTicketPrice !== null
                      ? `R${lowestTicketPrice}`
                      : "N/A"}
                  </p>
                </div>

                <div className="border border-white/10 bg-black/30 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                    Free Tickets
                  </p>
                  <p className="mt-2 text-[28px] font-black">
                    {hasFreeTickets ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>
          </aside>
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