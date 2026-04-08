"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AuthUser = {
  email?: string;
} | null;

export default function Navbar() {
  const [user, setUser] = useState<AuthUser>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        
        {/* Logo */}
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="text-lg font-extrabold tracking-[-0.03em] text-white"
          >
            Swift Tickets
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/"
              className="text-sm font-medium text-white/75 hover:text-white transition"
            >
              Home
            </Link>

            <Link
              href="/my-tickets"
              className="text-sm font-medium text-white/75 hover:text-white transition"
            >
              My Tickets
            </Link>

            {user && (
              <Link
                href="/dashboard"
                className="text-sm font-medium text-white/75 hover:text-white transition"
              >
                Dashboard
              </Link>
            )}
          </nav>
        </div>

        {/* Desktop Right */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.08] transition"
              >
                Dashboard
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/[0.06] hover:text-white transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/[0.06] hover:text-white transition"
              >
                Login
              </Link>

              <Link
                href="/signup"
                className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 transition"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="md:hidden rounded-2xl border border-white/10 p-2 text-white"
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/95 px-6 py-4">
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-3 text-sm text-white/80 hover:text-white hover:bg-white/[0.06] rounded-xl"
            >
              Home
            </Link>

            <Link
              href="/my-tickets"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-3 text-sm text-white/80 hover:text-white hover:bg-white/[0.06] rounded-xl"
            >
              My Tickets
            </Link>

            {user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-3 text-sm text-white/80 hover:text-white hover:bg-white/[0.06] rounded-xl"
                >
                  Dashboard
                </Link>

                <div className="px-3 py-3 text-sm text-white/60 border border-white/10 rounded-xl">
                  Signed in as: {user.email || "User"}
                </div>

                <button
                  onClick={handleLogout}
                  className="px-3 py-3 text-left text-sm text-white/80 hover:text-white hover:bg-white/[0.06] rounded-xl border border-white/10"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-3 text-sm text-white/80 hover:text-white hover:bg-white/[0.06] rounded-xl"
                >
                  Login
                </Link>

                <Link
                  href="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-3 text-sm bg-white text-black rounded-xl font-semibold hover:bg-white/90"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
