"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type EventType = {
  id: string;
  title: string;
  location?: string;
  event_date?: string;
  category?: string;
  image_url?: string;
};

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category");

  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);

      let query = supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Explore page error:", error);
        setEvents([]);
      } else {
        setEvents(data || []);
      }

      setLoading(false);
    };

    loadEvents();
  }, [category]);

  const pageTitle = category
    ? `${category.charAt(0).toUpperCase()}${category.slice(1)} Events`
    : "Explore Events";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-sm uppercase tracking-[0.18em] text-white/55">
            Swift Tickets
          </p>
          <h1 className="text-4xl font-extrabold tracking-[-0.03em]">
            {pageTitle}
          </h1>
          <p className="mt-3 text-white/65">
            Discover events across music, lifestyle, business, festivals and
            more.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          <Link
            href="/explore"
            className="border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
          >
            All
          </Link>
          <Link
            href="/explore?category=festival"
            className="border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
          >
            Festival
          </Link>
          <Link
            href="/explore?category=music"
            className="border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
          >
            Music
          </Link>
          <Link
            href="/explore?category=lifestyle"
            className="border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
          >
            Lifestyle
          </Link>
          <Link
            href="/explore?category=business"
            className="border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
          >
            Business
          </Link>
        </div>

        {loading ? (
          <p className="text-white/60">Loading events...</p>
        ) : events.length === 0 ? (
          <div className="border border-white/10 bg-white/[0.03] p-6">
            <p className="text-lg font-semibold">No events found</p>
            <p className="mt-2 text-white/60">
              There are no events in this category yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="overflow-hidden border border-white/10 bg-white/[0.03] transition hover:border-white/30"
              >
                <div className="h-56 w-full bg-white/5">
                  {event.image_url ? (
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/30">
                      No image
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                    {event.category || "Event"}
                  </p>
                  <h2 className="text-2xl font-bold tracking-[-0.02em]">
                    {event.title}
                  </h2>
                  {event.location && (
                    <p className="mt-2 text-white/65">{event.location}</p>
                  )}
                  {event.event_date && (
                    <p className="mt-1 text-white/45">{event.event_date}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}