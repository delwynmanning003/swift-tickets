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

const categoryCards = [
  { label: "Festival", value: "festival", image: "/categories/festival.jpg" },
  { label: "Music", value: "music", image: "/categories/music.jpg" },
  { label: "Lifestyle", value: "lifestyle", image: "/categories/lifestyle.jpg" },
  { label: "Business", value: "business", image: "/categories/business.jpg" },
];

function formatEventDate(value?: string | null) {
  if (!value) return "Date coming soon";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
  });
}

function buildExploreUrl(category: string, searchQuery: string) {
  const params = new URLSearchParams();

  if (category) params.set("category", category);
  if (searchQuery) params.set("q", searchQuery);

  const queryString = params.toString();
  return queryString ? `/explore?${queryString}` : "/explore";
}

function EventCard({ event }: { event: EventType }) {
  return (
    <Link href={`/events/${event.id}`} className="group w-[230px] shrink-0 sm:w-auto">
      <div className="relative h-[230px] w-full overflow-hidden rounded-[24px] bg-white/10">
        {event.image_url ? (
          <Image
            src={event.image_url}
            alt={event.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/35">
            No image
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        <button
          type="button"
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-xl text-white backdrop-blur"
        >
          ♡
        </button>
      </div>

      <div className="mt-3 px-1">
        <h2 className="line-clamp-2 text-[20px] font-black leading-tight tracking-[-0.03em]">
          {event.title}
        </h2>

        <p className="mt-2 line-clamp-1 text-[15px] text-white/60">
          {formatEventDate(event.event_date)} ·{" "}
          {event.location || "Location coming soon"}
        </p>

        <p className="mt-1 text-[15px] text-white/45">
          {event.category || "Event"}
        </p>
      </div>
    </Link>
  );
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

  const pageTitle = useMemo(() => {
    if (searchQuery) return `Results for ${searchQuery}`;
    if (category) return `${category} events`;
    return "Explore";
  }, [category, searchQuery]);

  const popularEvents = events.slice(0, 8);
  const moreEvents = events.slice(8);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.svg"
              alt="Swift Tickets"
              width={420}
              height={140}
              className="h-24 w-auto object-contain md:h-28"
              priority
            />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full border border-white/15 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-white hover:text-black md:px-5 md:py-2.5 md:text-[12px]"
            >
              Login
            </Link>

            <Link
              href="/signup"
              className="rounded-full bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-white/90 md:px-5 md:py-2.5 md:text-[12px]"
            >
              Sign Up
            </Link>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-[42px] font-black capitalize leading-none tracking-[-0.05em] md:text-[72px]">
            {pageTitle}
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-white/60">
            Discover festivals, nightlife, brunches, business events and live
            experiences across South Africa.
          </p>
        </div>

        <div className="mb-8 flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.06] px-4 py-3">
          <span className="text-white/45">⌕</span>

          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Search events"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          />

          {searchValue ? (
            <button
              type="button"
              onClick={() => {
                setSearchValue("");
                router.push(buildExploreUrl(category, ""));
              }}
              className="text-xs font-bold uppercase text-white/45"
            >
              Clear
            </button>
          ) : null}
        </div>

        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[28px] font-black tracking-[-0.04em]">
              Browse Categories
            </h2>

            <Link
              href="/explore"
              className="text-sm text-white/50 transition hover:text-white"
            >
              View All
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-3">
            {categoryCards.map((item) => (
              <Link
                key={item.value}
                href={buildExploreUrl(item.value, searchQuery)}
                className={`relative flex h-[140px] w-[250px] shrink-0 items-end overflow-hidden rounded-[26px] border p-5 transition ${
                  category === item.value ? "border-white" : "border-white/10"
                }`}
              >
                <Image
                  src={item.image}
                  alt={item.label}
                  fill
                  className="object-cover transition duration-500 hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

                <span className="relative z-10 text-[28px] font-black tracking-[-0.05em] text-white">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[28px] font-black tracking-[-0.04em]">
              Popular Events
            </h2>

            {(category || searchQuery) && (
              <Link
                href="/explore"
                className="text-sm text-white/50 transition hover:text-white"
              >
                Reset
              </Link>
            )}
          </div>

          {loading ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[310px] w-[230px] shrink-0 animate-pulse rounded-[24px] bg-white/[0.06]"
                />
              ))}
            </div>
          ) : popularEvents.length === 0 ? (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
              <p className="text-xl font-black">No events found</p>

              <p className="mt-2 text-sm text-white/55">
                Try searching another event or category.
              </p>
            </div>
          ) : (
            <div className="flex gap-5 overflow-x-auto pb-5 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
              {popularEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>

        {moreEvents.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[28px] font-black tracking-[-0.04em]">
                More Events
              </h2>
            </div>

            <div className="flex gap-5 overflow-x-auto pb-5 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
              {moreEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-[22px] font-black tracking-[-0.04em]">
            Quick Search
          </h2>

          <div className="flex flex-wrap gap-2">
            {quickSearches.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleSearch(item)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.08em] text-white/65 transition hover:border-white/30 hover:text-white"
              >
                {item}
              </button>
            ))}
          </div>
        </section>
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