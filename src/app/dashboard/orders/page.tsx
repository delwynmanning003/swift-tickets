"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function DashboardPage() {
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setAccountType(profile.account_type);
      }
    };

    loadUser();
  }, []);

  return (
    <main style={{ padding: 40 }}>
      <h1>Dashboard</h1>
      <p>Welcome back {email}</p>
      <p>Account type: {accountType || "Unknown"}</p>

      <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
        <Link href="/create-event">Create Event</Link>
        <Link href="/dashboard/orders">View Orders</Link>
        <Link href="/my-tickets">My Tickets</Link>
      </div>
    </main>
  );
}