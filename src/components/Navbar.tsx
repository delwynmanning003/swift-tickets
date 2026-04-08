"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X, User, LogOut, LayoutDashboard, Ticket } from "lucide-react";
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
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="text-lg font-extrabold tracking-[-0.03em] text-white"
          >
            Swift Tickets
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/"
              className="text-sm font-medium text-white/75 transition hover:text-white"
            >
              Home
            </Link>
            <Link
              href="/my-tickets"
              className="text-sm font-medium text-white/75 transition hover:text-white"
            >
              My Tickets
            </Link>
            {user && (
              <Link
                href="/dashboard"
                className="text-sm font-medium text-white/75 transition hover:text-white"
              >
                Dashboard
              </Link>
            )}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08]"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/[0.06] hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/[0.06] hover:text-white"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 p-2 text-white md:hidden"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-white/10 bg-black/95 px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-3 py-3 text-sm font-medium text-white/80 transition hover:bg-white/[0.06] hover:text-white"
            >
              Home
            </Link>

            <Link
              href="/my-tickets"
              onClick={() => setMenuOpen(false)}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-white/80 transition hover:bg-white/[0.06] hover:text-white"
            >
              <Ticket className="h-4 w-4" />
              My Tickets
            </Link>

            {user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-white/80 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/60">
                  <div className="mb-1 inline-flex items-center gap-2 text-white/80">
                    <User className="h-4 w-4" />
                    Signed in
                  </div>
                  <div className="truncate">{user.email || "User account"}</div>
                </div>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-3 text-left text-sm font-medium text-white/80 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-medium text-white/80 transition hover:bg-white/[0.06] hover:text-white"
                >
                  Login
                </Link>

                <Link
                  href="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl bg-white px-3 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
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
