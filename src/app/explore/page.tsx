"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type EventType = {
  id: string;
  title: string;
  location?: string | null;
  event_date?: string | null;
  category?: string | null;
  image_url?: string | null;
  description?: string | null;
};

const quickSearches = ["Amapiano", "Festival", "Business", "Brunch", "Live Music"];

const categories = [
  { label: "All", value: "" },
  { label: "Festival", value: "festival" },
  { label: "Music", value: "music" },
  { label: "Lifestyle", value: "lifestyle" },
  { label: "Business", value: "business" },
];

function formatEventDate(value?: string | null) {
  if (!value) return "Date coming soon";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildExploreUrl(category: string, searchQuery: string) {
  const params = new URLSearchParams();

  if (category) params.set("category", category);
  if (searchQuery) params.set("q", searchQuery);

  const queryString = params.toString();
  return queryString ? `/explore?${queryString}` : "/explore";
}

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const category = searchParams.get("category")?.trim() || "";
  const searchQuery = searchParams.get("q")?.trim() || "";

  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState(searchQuery);

  useEffect(() => {
    setSearchValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    let isMounted = true;

    const loadEvents = async () => {
      try {
        setLoading(true);

        let query = supabase
          .from("events")
          .select("id, title, location, event_date, category, image_url, description")
          .order("event_date", { ascending: true });

        if (category) query = query.eq("category", category);

        if (searchQuery) {
          query = query.or(
            `title.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
          );
        }

        const { data, error } = await query;

        if (!isMounted) return;

        if (error) {
          console.error("Explore page error:", error);
          setEvents([]);
        } else {
          setEvents((data || []) as EventType[]);
        }
      } catch (error) {
        console.error("Explore page unexpected error:", error);
        if (isMounted) setEvents([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, [category, searchQuery]);

  const handleSearch = (value?: string) => {
    const cleaned = (value ?? searchValue).trim();
    router.push(buildExploreUrl(category, cleaned));
  };

  const clearSearch = () => {
    setSearchValue("");
    router.push(buildExploreUrl(category, ""));
  };

  const pageTitle = useMemo(() => {
    if (searchQuery && category) return `${category} results for "${searchQuery}"`;
    if (searchQuery) return `Results for "${searchQuery}"`;
    if (category) return `${category} events`;
    return "Explore events";
  }, [category, searchQuery]);

  const featuredEvent = events[0];
  const otherEvents = featuredEvent ? events.slice(1) : events;

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_35%),#000]">
        <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white/50">
            Swift Tickets
          </p>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-[44px] font-black capitalize leading-[0.95] tracking-[-0.05em] md:text-[72px]">
                {pageTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 md:text-lg">
                Find events across music, lifestyle, festivals, business, brunches,
                nightlife and more.
              </p>
            </div>

            <div className="border border-white/15 bg-white/[0.04] p-4 shadow-2xl">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex min-w-0 flex-1 items-center gap-3 border border-white/10 bg-black/40 px-4 py-4">
                  <span className="text-lg text-white/55">⌕</span>
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                    placeholder="Search event, city, category..."
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                  />

                  {searchValue ? (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="text-xs font-bold uppercase tracking-[0.08em] text-white/45 hover:text-white"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => handleSearch()}
                  className="bg-white px-6 py-4 text-[12px] font-black uppercase tracking-[0.1em] text-black transition hover:bg-white/90"
                >
                  Search
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {quickSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleSearch(item)}
                    className="border border-white/15 bg-white/[0.03] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white/65 transition hover:border-white/40 hover:text-white"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {categories.map((item) => {
            const active = item.value === category;

            return (
              <Link
                key={item.label}
                href={buildExploreUrl(item.value, searchQuery)}
                className={`whitespace-nowrap border px-5 py-3 text-[11px] font-black uppercase tracking-[0.12em] transition ${
                  active
                    ? "border-white bg-white text-black"
                    : "border-white/15 text-white/65 hover:border-white/40 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.03em]">
              {loading ? "Loading events" : `${events.length} event${events.length === 1 ? "" : "s"} found`}
            </h2>
            <p className="mt-1 text-sm text-white/45">
              {searchQuery || category
                ? "Filtered results based on your search."
                : "Upcoming events available on Swift Tickets."}
            </p>
          </div>

          {(searchQuery || category) && (
            <Link
              href="/explore"
              className="hidden border border-white/20 px-4 py-3 text-[11px] font-black uppercase tracking-[0.1em] text-white/65 transition hover:bg-white hover:text-black sm:inline-block"
            >
              Reset
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-[430px] animate-pulse border border-white/10 bg-white/[0.03]" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="border border-white/10 bg-white/[0.03] p-8 md:p-10">
            <p className="text-2xl font-black tracking-[-0.03em]">No events found</p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">
              Try another search term or browse all categories.
            </p>
            <Link
              href="/explore"
              className="mt-6 inline-block bg-white px-6 py-4 text-[12px] font-black uppercase tracking-[0.1em] text-black"
            >
              View All Events
            </Link>
          </div>
        ) : (
          <>
            {featuredEvent && (
              <Link
                href={`/events/${featuredEvent.id}`}
                className="mb-8 grid overflow-hidden border border-white/15 bg-white/[0.035] transition hover:border-white/35 lg:grid-cols-[0.95fr_1.05fr]"
              >
                <div className="relative min-h-[360px] bg-white/5">
                  {featuredEvent.image_url ? (
                    <Image
                      src={featuredEvent.image_url}
                      alt={featuredEvent.title}
                      fill
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/30">
                      No image
                    </div>
                  )}
                  <div className="absolute left-4 top-4 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-black">
                    Featured
                  </div>
                </div>

                <div className="flex flex-col justify-end p-6 md:p-8">
                  <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
                    {featuredEvent.category || "Event"}
                  </p>
                  <h2 className="max-w-3xl text-[38px] font-black leading-[0.95] tracking-[-0.05em] md:text-[58px]">
                    {featuredEvent.title}
                  </h2>
                  <p className="mt-5 text-base text-white/65">
                    {featuredEvent.location || "Location coming soon"}
                  </p>
                  <p className="mt-2 text-sm text-white/45">
                    {formatEventDate(featuredEvent.event_date)}
                  </p>

                  <span className="mt-8 inline-flex w-fit bg-white px-6 py-4 text-[12px] font-black uppercase tracking-[0.1em] text-black">
                    View Event
                  </span>
                </div>
              </Link>
            )}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {otherEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="group overflow-hidden border border-white/10 bg-white/[0.03] transition hover:-translate-y-1 hover:border-white/35"
                >
                  <div className="relative h-64 w-full bg-white/5">
                    {event.image_url ? (
                      <Image
                        src={event.image_url}
                        alt={event.title}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-white/30">
                        No image
                      </div>
                    )}

                    <div className="absolute left-3 top-3 border border-white/20 bg-black/70 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                      {event.category || "Event"}
                    </div>
                  </div>

                  <div className="p-5">
                    <h2 className="line-clamp-2 text-2xl font-black leading-tight tracking-[-0.03em]">
                      {event.title}
                    </h2>

                    <p className="mt-4 line-clamp-1 text-sm text-white/60">
                      {event.location || "Location coming soon"}
                    </p>

                    <p className="mt-2 text-sm text-white/40">
                      {formatEventDate(event.event_date)}
                    </p>

                    <div className="mt-5 border-t border-white/10 pt-4 text-[11px] font-black uppercase tracking-[0.12em] text-white/55">
                      View details →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black text-white">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <p className="text-white/60">Loading events...</p>
          </div>
        </main>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}