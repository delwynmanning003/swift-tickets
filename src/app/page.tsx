"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type TicketTypeRow = {
  id: string;
  event_id: string;
  name?: string | null;
  price?: number | string | null;
  quantity?: number | null;
};

type EventRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  event_date?: string | null;
  location?: string | null;
  image_url?: string | null;
  fee_option?: string | null;
  ticket_types?: TicketTypeRow[] | null;
};

const categories = [
  { name: "Festival", image: "/categories/festival.jpg" },
  { name: "Music", image: "/categories/music.jpg" },
  { name: "Lifestyle", image: "/categories/lifestyle.jpg" },
  { name: "Business", image: "/categories/business.jpg" },
];

const fixedPrompt = "What Do You Want To Experience Live?";
const rotatingSuggestions = [
  "Hike Up Table Mountain",
  "Amapiano In Soweto",
  "Padel Class In Umhlanga",
  "Wine Tasting In Stellenbosch",
  "Jazz Night In Cape Town",
  "Food Market In Johannesburg",
  "Sunset Picnic In Durban",
  "Art Workshop In Pretoria",
];

function parseTicketPrice(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return null;

  const numericPrice =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/,/g, ""));

  return Number.isNaN(numericPrice) ? null : numericPrice;
}

function getBuyerTicketPrice(basePrice: number, feeOption?: string | null) {
  if (basePrice <= 0) return 0;

  if (feeOption === "buyer_pays_all") {
    return basePrice + 3 + basePrice * 0.04;
  }

  if (feeOption === "split") {
    return basePrice + basePrice * 0.04;
  }

  return basePrice;
}

function getLowestDisplayTicketPrice(
  ticketTypes?: TicketTypeRow[] | null,
  feeOption?: string | null
) {
  if (!ticketTypes || ticketTypes.length === 0) return null;

  const prices = ticketTypes
    .map((ticket) => parseTicketPrice(ticket.price))
    .filter((price): price is number => price !== null)
    .map((price) => getBuyerTicketPrice(price, feeOption));

  if (prices.length === 0) return null;

  return Math.min(...prices);
}

function formatPriceLabel(price: number | null) {
  if (price === null) return null;
  if (price === 0) return "FREE";
  return `FROM R${price.toFixed(2)}`;
}

function formatEventDate(date?: string | null) {
  if (!date) return "Date TBA";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Date TBA";

  return parsed.toLocaleDateString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function HomePage() {
  const router = useRouter();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchValue, setSearchValue] = useState("");
  const [isUserTyping, setIsUserTyping] = useState(false);

  const [typedPrompt, setTypedPrompt] = useState("");
  const [typingComplete, setTypingComplete] = useState(false);

  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [isSuggestionVisible, setIsSuggestionVisible] = useState(false);

  const [videoLoaded, setVideoLoaded] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });

      if (eventsError) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const { data: ticketTypesData, error: ticketTypesError } = await supabase
        .from("ticket_types")
        .select("*");

      const mergedEvents = (eventsData || []).map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        event_date: event.event_date,
        location: event.location,
        image_url: event.image_url,
        fee_option: event.fee_option,
        ticket_types: ticketTypesError
          ? []
          : (ticketTypesData || []).filter(
              (ticket: any) => ticket.event_id === event.id
            ),
      }));

      setEvents(mergedEvents as EventRow[]);
      setLoading(false);
    };

    loadEvents();
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);
      setCheckingAuth(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isUserTyping) return;

    let currentIndex = 0;
    setTypedPrompt("");
    setTypingComplete(false);
    setIsSuggestionVisible(false);

    const typingTimer = setInterval(() => {
      currentIndex += 1;
      setTypedPrompt(fixedPrompt.slice(0, currentIndex));

      if (currentIndex >= fixedPrompt.length) {
        clearInterval(typingTimer);
        setTypingComplete(true);

        setTimeout(() => {
          setIsSuggestionVisible(true);
        }, 500);
      }
    }, 55);

    return () => clearInterval(typingTimer);
  }, [isUserTyping]);

  useEffect(() => {
    if (!typingComplete || !isSuggestionVisible || isUserTyping) return;

    const interval = setInterval(() => {
      setIsSuggestionVisible(false);

      setTimeout(() => {
        setSuggestionIndex((prev) => (prev + 1) % rotatingSuggestions.length);
        setIsSuggestionVisible(true);
      }, 350);
    }, 4200);

    return () => clearInterval(interval);
  }, [typingComplete, isSuggestionVisible, isUserTyping]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("autoplay", "");

    const tryPlay = async () => {
      try {
        await video.play();
      } catch {}
    };

    const handleCanPlay = () => {
      tryPlay();
    };

    const handleLoadedData = () => {
      setVideoLoaded(true);
      tryPlay();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        tryPlay();
      }
    };

    tryPlay();
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadeddata", handleLoadedData);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadeddata", handleLoadedData);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const trendingEvents = useMemo(
    () => events.filter((event) => event.id).slice(0, 4),
    [events]
  );

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  };

  const handleSearch = () => {
    const cleaned = searchValue.trim();

    if (!cleaned) {
      router.push("/events");
      return;
    }

    router.push(`/events?q=${encodeURIComponent(cleaned)}`);
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <header
        className={`fixed left-0 right-0 top-0 z-50 border-b border-white/5 px-4 py-3 transition-all duration-300 md:px-10 ${
          scrolled
            ? "bg-black/55 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.18)]"
            : "bg-black/30 backdrop-blur-md"
        }`}
      >
        <div className="hidden items-center justify-between gap-4 md:flex">
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/logo.svg"
              alt="Swift Tickets"
              width={420}
              height={140}
              className="h-10 w-auto object-contain sm:h-12 md:h-24"
              priority
            />
          </Link>

          <div className="hidden items-center gap-2 md:flex md:gap-4">
            <div className="group relative">
              <button className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold uppercase tracking-tight text-white transition hover:bg-white/10 md:text-[14px]">
                <span>Explore</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4 transition-transform duration-300 ease-out group-hover:rotate-180"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m6 9 6 6 6-6"
                  />
                </svg>
              </button>

              <div className="invisible absolute right-0 top-full mt-3 w-[280px] translate-y-2 opacity-0 transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <div className="rounded-sm border border-white/10 bg-black/95 p-3 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      South Africa
                    </h3>

                    <Link
                      href="/categories"
                      className="text-[11px] text-white/70 transition hover:text-white hover:underline underline-offset-4"
                    >
                      View all
                    </Link>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {categories.map((cat) => (
                      <Link
                        key={cat.name}
                        href="/categories"
                        className="group/item flex items-center justify-between rounded-sm border border-white/10 bg-white/[0.03] px-2.5 py-1.5 transition hover:border-white/20 hover:bg-white/[0.06]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative h-[40px] w-[40px] overflow-hidden rounded-sm">
                            <Image
                              src={cat.image}
                              alt={cat.name}
                              fill
                              className="object-cover transition duration-300 group-hover/item:scale-110"
                            />
                          </div>

                          <span className="text-[16px] font-medium text-white">
                            {cat.name}
                          </span>
                        </div>

                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="h-4 w-4 text-white/60 transition group-hover/item:translate-x-0.5 group-hover/item:text-white"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 12h14m-6-6 6 6-6 6"
                          />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/create-event"
              className="rounded-[16px] bg-white px-5 py-2.5 text-[14px] font-bold uppercase tracking-tight text-black transition hover:bg-white/90 md:px-6 md:py-3 md:text-[15px]"
            >
              Create Event
            </Link>

            <Link
              href="/sell"
              className="rounded-full px-3 py-1.5 text-[13px] font-semibold uppercase tracking-tight text-white transition hover:bg-white/10 md:text-[14px]"
            >
              Sell My Ticket
            </Link>

            <div className="group relative">
              <button className="flex items-center gap-2 rounded-full px-2 py-2 text-white transition hover:bg-white/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-7 w-7 md:h-8 md:w-8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20 21a8 8 0 0 0-16 0"
                  />
                  <circle cx="12" cy="7" r="4" />
                </svg>

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4 transition-transform duration-300 ease-out group-hover:rotate-180"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m6 9 6 6 6-6"
                  />
                </svg>
              </button>

              <div className="invisible absolute right-0 top-full mt-3 w-[200px] translate-y-2 opacity-0 transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <div className="rounded-sm border border-white/10 bg-black/95 p-2 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                  <div className="flex flex-col gap-1">
                    {!checkingAuth && user ? (
                      <>
                        <Link
                          href="/dashboard"
                          className="rounded-sm px-3 py-2 text-[14px] font-medium text-white transition hover:bg-white/10 hover:underline underline-offset-4"
                        >
                          Dashboard
                        </Link>

                        <Link
                          href="/my-tickets"
                          className="rounded-sm px-3 py-2 text-[14px] font-medium text-white transition hover:bg-white/10 hover:underline underline-offset-4"
                        >
                          My Tickets
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="rounded-sm px-3 py-2 text-left text-[14px] font-medium text-white transition hover:bg-white/10 hover:underline underline-offset-4"
                        >
                          Log out
                        </button>
                      </>
                    ) : !checkingAuth ? (
                      <>
                        <Link
                          href="/login"
                          className="rounded-sm px-3 py-2 text-[14px] font-medium text-white transition hover:bg-white/10 hover:underline underline-offset-4"
                        >
                          Log in
                        </Link>
                        <Link
                          href="/signup"
                          className="rounded-sm px-3 py-2 text-[14px] font-medium text-white transition hover:bg-white/10 hover:underline underline-offset-4"
                        >
                          Sign up
                        </Link>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between md:hidden">
          <div className="relative">
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
              aria-label="Open menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 7h16M4 12h16M4 17h16"
                />
              </svg>
            </button>

            {mobileMenuOpen && (
              <div className="absolute left-0 top-full z-50 mt-3 w-56 rounded-2xl border border-white/10 bg-black/95 p-2 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                <div className="flex flex-col gap-1">
                  <Link
                    href="/create-event"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-xl px-3 py-2 text-[13px] font-medium text-white transition hover:bg-white/10"
                  >
                    Create Event
                  </Link>

                  <Link
                    href="/sell"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-xl px-3 py-2 text-[13px] font-medium text-white transition hover:bg-white/10"
                  >
                    Sell My Ticket
                  </Link>

                  {!checkingAuth && user ? (
                    <>
                      <Link
                        href="/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="rounded-xl px-3 py-2 text-[13px] font-medium text-white transition hover:bg-white/10"
                      >
                        Dashboard
                      </Link>

                      <Link
                        href="/my-tickets"
                        onClick={() => setMobileMenuOpen(false)}
                        className="rounded-xl px-3 py-2 text-[13px] font-medium text-white transition hover:bg-white/10"
                      >
                        My Tickets
                      </Link>

                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          handleLogout();
                        }}
                        className="rounded-xl px-3 py-2 text-left text-[13px] font-medium text-white transition hover:bg-white/10"
                      >
                        Log out
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <Image
              src="/logo.svg"
              alt="Swift Tickets"
              width={240}
              height={76}
              className="h-16 w-auto object-contain"
              priority
            />
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/categories"
              className="flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-tight text-white transition hover:bg-white/10"
            >
              Explore
            </Link>

            {!checkingAuth && user ? (
              <div className="group relative">
                <button className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20 21a8 8 0 0 0-16 0"
                    />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </button>

                <div className="invisible absolute right-0 top-full mt-3 w-44 translate-y-2 opacity-0 transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="rounded-2xl border border-white/10 bg-black/95 p-2 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                    <Link
                      href="/dashboard"
                      className="block rounded-xl px-3 py-2 text-[13px] text-white transition hover:bg-white/10"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/my-tickets"
                      className="block rounded-xl px-3 py-2 text-[13px] text-white transition hover:bg-white/10"
                    >
                      My Tickets
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full rounded-xl px-3 py-2 text-left text-[13px] text-white transition hover:bg-white/10"
                    >
                      Log out
                    </button>
                  </div>
                </div>
              </div>
            ) : !checkingAuth ? (
              <Link
                href="/login"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                aria-label="Login"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20 21a8 8 0 0 0-16 0"
                  />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <section className="relative min-h-screen w-full overflow-hidden bg-black">
        <div className="absolute inset-0 bg-black" />

        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            controls={false}
            disablePictureInPicture
            controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
            aria-hidden="true"
            tabIndex={-1}
            poster="/hero-fallback.jpg"
            className={`pointer-events-none absolute inset-0 h-full w-full select-none object-cover scale-105 brightness-95 contrast-115 saturate-150 hue-rotate-[320deg] transition-opacity duration-700 ${
              videoLoaded ? "opacity-100" : "opacity-0"
            }`}
          >
            <source src="/hero.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="absolute inset-0 z-10 bg-black/45" />
        <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(14,165,233,0.35)_0%,rgba(0,0,0,0.08)_38%,rgba(249,115,22,0.30)_100%)]" />
        <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_45%)]" />
        <div className="absolute left-[-18%] top-[8%] z-10 h-[320px] w-[320px] rounded-full bg-sky-500/25 blur-3xl md:left-[-10%] md:h-[500px] md:w-[500px]" />
        <div className="absolute right-[-18%] bottom-[2%] z-10 h-[340px] w-[340px] rounded-full bg-orange-500/25 blur-3xl md:right-[-10%] md:h-[520px] md:w-[520px]" />
        <div className="absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(2,132,199,0.08)_0%,rgba(0,0,0,0)_30%,rgba(234,88,12,0.10)_100%)]" />

        <div className="relative z-20 flex min-h-[46vh] flex-col items-center justify-start px-4 pt-[108px] text-center sm:px-6 sm:pt-[118px] md:min-h-[64vh] md:px-6 md:pt-[150px]">
          <h1 className="max-w-[300px] text-[42px] font-extrabold leading-[0.92] tracking-tight sm:max-w-[540px] sm:text-[64px] md:max-w-5xl md:text-[72px] lg:text-[86px]">
            Where the world meets
          </h1>

          <p className="mt-3 max-w-[320px] text-[10px] uppercase tracking-[0.28em] text-white/80 sm:max-w-none sm:text-[11px] md:mt-2 md:text-[13px]">
            For the people, by the people
          </p>

          <div className="mt-5 w-full max-w-[780px] rounded-2xl bg-white p-3 text-black shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition hover:shadow-[0_18px_60px_rgba(0,0,0,0.45)] sm:rounded-xl sm:p-4 md:rounded-sm md:px-5 md:py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="shrink-0 text-[20px]">⌕</span>

                <div className="relative min-w-0 flex-1 text-left">
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => {
                      setIsUserTyping(true);
                      setSearchValue(e.target.value);
                    }}
                    onFocus={() => setIsUserTyping(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                      }
                    }}
                    className="w-full bg-transparent text-[15px] font-medium text-black outline-none sm:text-[16px]"
                  />

                  {!searchValue && (
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex max-w-full items-center overflow-hidden whitespace-nowrap">
                      <span className="truncate text-[15px] font-bold tracking-[-0.02em] text-black sm:text-[16px]">
                        {typedPrompt}
                        {!typingComplete && (
                          <span className="ml-1 inline-block h-5 w-[1.5px] animate-pulse bg-black/60 align-middle" />
                        )}
                      </span>

                      {typingComplete && (
                        <span
                          className={`ml-2 hidden truncate text-[15px] italic font-medium tracking-[-0.01em] text-black/55 transition-all duration-500 sm:block sm:text-[16px] ${
                            isSuggestionVisible
                              ? "translate-y-0 opacity-100"
                              : "translate-y-1 opacity-0"
                          }`}
                        >
                          {rotatingSuggestions[suggestionIndex]}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleSearch}
                className="w-full rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-black/80 sm:w-auto sm:min-w-[120px] md:rounded-sm md:px-6 md:py-2.5"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 z-10 h-24 w-full bg-gradient-to-b from-transparent via-black/70 to-black" />
      </section>

      <div className="relative z-20 mx-auto max-w-[1300px] -mt-3 px-4 pb-12 pt-2 sm:-mt-10 sm:px-6 md:-mt-16">
        <section className="mb-20">
          <div className="mb-7 flex items-center justify-between gap-4">
            <h2 className="text-[28px] font-bold tracking-tight md:text-[30px]">
              Trending events
            </h2>

            <Link
              href="/events"
              className="shrink-0 text-sm text-white/70 transition hover:text-white hover:underline underline-offset-4"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : trendingEvents.length === 0 ? (
            <p className="text-gray-400">No events available yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:gap-x-5">
              {trendingEvents.map((event, index) => {
                const lowestPrice = getLowestDisplayTicketPrice(
                  event.ticket_types,
                  event.fee_option
                );
                const priceLabel = formatPriceLabel(lowestPrice);
                const hasPaidTickets = lowestPrice !== null && lowestPrice > 0;
                const isOrange = index % 2 === 0;

                const accentText = isOrange
                  ? "group-hover:text-orange-500 group-active:text-orange-500"
                  : "group-hover:text-sky-400 group-active:text-sky-400";

                const accentBorder = isOrange
                  ? "group-hover:border-orange-500 group-active:border-orange-500"
                  : "group-hover:border-sky-400 group-active:border-sky-400";

                const accentButton = isOrange
                  ? "group-hover:bg-orange-500 group-hover:text-black group-hover:border-orange-500 group-active:bg-orange-500 group-active:text-black group-active:border-orange-500"
                  : "group-hover:bg-sky-400 group-hover:text-black group-hover:border-sky-400 group-active:bg-sky-400 group-active:text-black group-active:border-sky-400";

                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="block"
                  >
                    <div className="group mx-auto w-full max-w-[215px] text-white transition-transform duration-200 active:scale-[0.985]">
                      <div className="relative aspect-[0.82] w-full overflow-hidden rounded-[10px] bg-zinc-900">
                        {event.image_url ? (
                          <Image
                            src={event.image_url}
                            alt={event.title || "Event image"}
                            fill
                            unoptimized
                            className="object-cover transition duration-500 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,#1e293b_0%,#020617_100%)]" />
                        )}
                      </div>

                      <div className="pt-3">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <p
                            className={`pr-2 text-[11px] font-medium leading-tight text-white transition-colors duration-200 sm:text-[12px] ${accentText}`}
                          >
                            {formatEventDate(event.event_date)}
                          </p>

                          <button
                            type="button"
                            className={`shrink-0 text-white transition-all duration-200 hover:scale-110 ${accentText}`}
                            onClick={(e) => e.preventDefault()}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.1"
                              className="h-5 w-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m12 21-.9-.82C5 14.6 2 11.86 2 8.5 2 5.76 4.24 3.5 7 3.5c1.74 0 3.41.81 4.5 2.09A6 6 0 0 1 16 3.5c2.76 0 5 2.26 5 5 0 3.36-3 6.1-9.1 11.68L12 21Z"
                              />
                            </svg>
                          </button>
                        </div>

                        <h3
                          className={`line-clamp-2 text-[15px] font-extrabold uppercase leading-[1.06] tracking-[-0.03em] text-white transition-colors duration-200 sm:text-[16px] ${accentText}`}
                        >
                          {event.title || "Untitled Event"}
                        </h3>

                        {event.location && (
                          <p
                            className={`mt-2 line-clamp-1 text-[12px] text-white/85 transition-colors duration-200 sm:text-[13px] ${accentText}`}
                          >
                            {event.location}
                          </p>
                        )}

                        {priceLabel && (
                          <div className="mt-4">
                            <div className="flex flex-col items-start gap-1">
                              <div
                                className={`inline-flex min-h-[42px] items-center rounded-[4px] border border-white bg-white px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-[-0.02em] text-black transition-all duration-200 sm:min-h-[44px] sm:px-6 sm:text-[12px] ${accentBorder} ${accentButton}`}
                              >
                                {priceLabel}
                              </div>

                              {hasPaidTickets ? (
                                <p className="text-[11px] uppercase tracking-[0.08em] text-white/55">
                                  Includes all fees
                                </p>
                              ) : (
                                <p className="text-[11px] uppercase tracking-[0.08em] text-white/55">
                                  No extra fees
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-[28px] font-bold tracking-tight md:text-[30px]">
              Browse categories
            </h2>

            <Link
              href="/categories"
              className="shrink-0 text-sm text-white/70 transition hover:text-white hover:underline underline-offset-4"
            >
              Explore all →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat) => (
              <div
                key={cat.name}
                className="group relative h-[190px] overflow-hidden rounded-2xl bg-zinc-900"
              >
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  className="object-cover opacity-80 transition duration-500 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent transition group-hover:from-black/65" />

                <div className="absolute bottom-0 left-0 w-full p-4">
                  <p className="text-[22px] font-bold tracking-tight">
                    {cat.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="mt-16 animate-fade-in border-t border-white/10 bg-black">
        <div className="mx-auto flex max-w-[1300px] flex-col gap-10 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-[260px]">
            <Image
              src="/logo.svg"
              alt="Swift Tickets"
              width={240}
              height={80}
              className="h-12 w-auto object-contain opacity-90"
            />
            <p className="mt-4 text-sm leading-6 text-white/45">
              Discover events, create experiences, and resell tickets
              seamlessly.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:gap-x-12 md:pt-2">
            <Link
              href="/about"
              className="text-white/70 transition hover:text-white hover:underline underline-offset-4"
            >
              About Swift Tickets
            </Link>
            <Link
              href="/terms"
              className="text-white/70 transition hover:text-white hover:underline underline-offset-4"
            >
              Terms & Conditions
            </Link>
            <Link
              href="/create-event"
              className="text-white/70 transition hover:text-white hover:underline underline-offset-4"
            >
              Create Event
            </Link>
            <Link
              href="/privacy"
              className="text-white/70 transition hover:text-white hover:underline underline-offset-4"
            >
              Privacy Policy
            </Link>
            <Link
              href="/sell"
              className="text-white/70 transition hover:text-white hover:underline underline-offset-4"
            >
              Sell My Ticket
            </Link>
            <Link
              href="/refund-policy"
              className="text-white/70 transition hover:text-white hover:underline underline-offset-4"
            >
              Refund Policy
            </Link>
            <Link
              href="/help"
              className="text-white/70 transition hover:text-white hover:underline underline-offset-4"
            >
              Help Centre
            </Link>
            <Link
              href="/legal"
              className="text-white/70 transition hover:text-white hover:underline underline-offset-4"
            >
              Legal
            </Link>
          </div>

          <div className="flex flex-col gap-5 md:items-end">
            <div className="flex items-center gap-4 text-white/65">
              <Link
                href="https://x.com"
                aria-label="X"
                className="transition hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M18.9 2H22l-6.77 7.74L23 22h-6.17l-4.83-6.32L6.47 22H3.36l7.24-8.28L1 2h6.33l4.37 5.77L18.9 2Z" />
                </svg>
              </Link>

              <Link
                href="https://www.instagram.com/swiftticketstech/?utm_source=ig_web_button_share_sheet"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Swift Tickets Instagram"
                className="transition hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle
                    cx="17.2"
                    cy="6.8"
                    r="1"
                    fill="currentColor"
                    stroke="none"
                  />
                </svg>
              </Link>

              <Link
                href="https://facebook.com"
                aria-label="Facebook"
                className="transition hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.6 1.7-1.6H17V4.8c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.2V11H8v3h2.5v8h3Z" />
                </svg>
              </Link>
            </div>

            <button className="flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white">
              <span>English</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m6 9 6 6 6-6"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1300px] flex-col gap-3 px-4 py-4 text-xs text-white/35 sm:px-6 md:flex-row md:items-center md:justify-between">
            <p>© 2026 Swift Tickets. All rights reserved.</p>
            <p>Built for the people, by the people.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}