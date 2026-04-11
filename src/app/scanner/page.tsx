"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { supabase } from "@/lib/supabase";

type ScanResult =
  | {
      success: true;
      status: "checked_in";
      message: string;
      ticket: any;
    }
  | {
      success: false;
      status?: "already_used";
      message?: string;
      error?: string;
      ticket?: any;
    }
  | null;

export default function ScannerPage() {
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [result, setResult] = useState<ScanResult>(null);

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: myEvents, error } = await supabase
        .from("events")
        .select("id, creator_type, organizer_email")
        .eq("user_id", user.id)
        .limit(1);

      if (error) {
        console.error("Access check error:", error);
        setHasAccess(false);
        setCheckingAccess(false);
        return;
      }

      const isOrganiser =
        (myEvents || []).some(
          (event: any) =>
            event.creator_type === "organiser" ||
            event.organizer_email === user.email
        );

      setHasAccess(isOrganiser);
      setCheckingAccess(false);
    };

    checkAccess();
  }, []);

  const handleCheckIn = async (qrCode: string) => {
    if (!qrCode || loading || scanLocked) return;

    setLoading(true);
    setScanLocked(true);

    try {
      const response = await fetch("/api/tickets/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          qr_code: qrCode,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Scan failed",
      });
    } finally {
      setLoading(false);
      setTimeout(() => setScanLocked(false), 2000);
    }
  };

  const resultCard = () => {
    if (!result) return null;

    const ticket = result.ticket;
    const eventTitle = ticket?.eventRow?.title || "Unknown Event";
    const location = ticket?.eventRow?.location || "-";
    const date = ticket?.eventRow?.event_date
      ? new Date(ticket.eventRow.event_date).toLocaleString("en-ZA")
      : "-";
    const ticketType = ticket?.ticketType?.name || "-";

    if (result.success) {
      return (
        <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-5">
          <h2 className="text-2xl font-bold text-green-400">
            Check-in successful
          </h2>
          <p className="mt-2 text-white/80">{result.message}</p>

          <div className="mt-4 space-y-2 text-sm text-white/80">
            <p><strong>Event:</strong> {eventTitle}</p>
            <p><strong>Ticket Type:</strong> {ticketType}</p>
            <p><strong>Location:</strong> {location}</p>
            <p><strong>Date:</strong> {date}</p>
            <p><strong>QR Code:</strong> {ticket?.qr_code}</p>
          </div>
        </div>
      );
    }

    if (result.status === "already_used") {
      return (
        <div className="mt-6 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5">
          <h2 className="text-2xl font-bold text-orange-400">Already used</h2>
          <p className="mt-2 text-white/80">
            {result.message || "This ticket was already checked in."}
          </p>

          <div className="mt-4 space-y-2 text-sm text-white/80">
            <p><strong>Event:</strong> {eventTitle}</p>
            <p><strong>Ticket Type:</strong> {ticketType}</p>
            <p><strong>Location:</strong> {location}</p>
            <p><strong>Date:</strong> {date}</p>
            <p><strong>QR Code:</strong> {ticket?.qr_code}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
        <h2 className="text-2xl font-bold text-red-400">Invalid ticket</h2>
        <p className="mt-2 text-white/80">
          {result.error || result.message || "Ticket could not be checked in."}
        </p>
      </div>
    );
  };

  if (checkingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        Checking access...
      </main>
    );
  }

  if (!hasAccess) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="mb-2 text-sm uppercase tracking-[0.18em] text-white/55">
            Swift Tickets
          </p>
          <h1 className="text-4xl font-extrabold tracking-[-0.03em]">
            Access restricted
          </h1>
          <p className="mt-4 text-white/70">
            Only organisers can access the scanner.
          </p>

          <div className="mt-6">
            <Link
              href="/dashboard"
              className="bg-white px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:bg-white/90"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 border border-white/10 bg-white/[0.03] p-6">
          <p className="mb-2 text-sm uppercase tracking-[0.18em] text-white/55">
            Swift Tickets
          </p>
          <h1 className="text-4xl font-extrabold tracking-[-0.03em]">
            Ticket Scanner
          </h1>
          <p className="mt-3 text-white/70">
            Scan a ticket QR code to validate entry and prevent duplicate use.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="border border-white/10 bg-white/[0.03] p-5">
            <h2 className="mb-4 text-2xl font-bold">Camera Scanner</h2>

            <div className="overflow-hidden rounded-2xl">
              <Scanner
                onScan={(detectedCodes) => {
                  const rawValue = detectedCodes?.[0]?.rawValue;
                  if (rawValue) {
                    handleCheckIn(rawValue);
                  }
                }}
                onError={(error) => {
                  console.error("Scanner error:", error);
                }}
                styles={{
                  container: {
                    width: "100%",
                    background: "black",
                  },
                }}
              />
            </div>

            <p className="mt-3 text-sm text-white/50">
              Point the camera at the QR code on the customer’s ticket.
            </p>
          </div>

          <div className="border border-white/10 bg-white/[0.03] p-5">
            <h2 className="mb-4 text-2xl font-bold">Manual Entry</h2>

            <label className="mb-2 block text-sm font-medium text-white/70">
              QR Code Value
            </label>
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Paste QR code value"
              className="h-12 w-full border border-white/15 bg-transparent px-4 text-white outline-none placeholder:text-white/30 focus:border-white/60"
            />

            <button
              onClick={() => handleCheckIn(manualCode)}
              disabled={loading || !manualCode.trim()}
              className="mt-4 w-full bg-white px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Checking..." : "Check In Ticket"}
            </button>

            <button
              onClick={() => {
                setResult(null);
                setManualCode("");
              }}
              className="mt-3 w-full border border-white/15 px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:border-white/40"
            >
              Clear Result
            </button>
          </div>
        </div>

        {resultCard()}
      </div>
    </main>
  );
}