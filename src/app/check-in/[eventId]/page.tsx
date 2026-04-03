"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ScannedTicket = {
  id: string;
  qr_code: string;
  checked_in: boolean;
  order_id: string;
  ticket_type_id: string;
  buyer_name?: string;
  buyer_email?: string;
  ticket_name?: string;
  event_title?: string;
};

export default function CheckInPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [message, setMessage] = useState("");
  const [scannerRunning, setScannerRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [scannedTicket, setScannedTicket] = useState<ScannedTicket | null>(null);

  const scannerRef = useRef<any>(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    const verifyAccess = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      const { data: eventRow } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (!eventRow) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setEventTitle(eventRow.title || "");

      if (user.email !== eventRow.organizer_email) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);
      setLoading(false);
    };

    if (eventId) verifyAccess();
  }, [eventId]);

  const fetchTicketDetails = async (qrCode: string) => {
    setMessage("");
    setScannedTicket(null);

    const { data: ticket } = await supabase
      .from("tickets")
      .select("*")
      .eq("qr_code", qrCode)
      .single();

    if (!ticket) {
      setMessage("❌ Ticket not found");
      return;
    }

    const { data: ticketType } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("id", ticket.ticket_type_id)
      .single();

    if (!ticketType) {
      setMessage("❌ Ticket type not found");
      return;
    }

    if (ticketType.event_id !== eventId) {
      setMessage("❌ Wrong event ticket");
      return;
    }

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", ticket.order_id)
      .single();

    setScannedTicket({
      id: ticket.id,
      qr_code: ticket.qr_code,
      checked_in: ticket.checked_in,
      order_id: ticket.order_id,
      ticket_type_id: ticket.ticket_type_id,
      buyer_name: order?.buyer_name || "",
      buyer_email: order?.buyer_email || "",
      ticket_name: ticketType.name || "",
      event_title: eventTitle || "",
    });

    if (ticket.checked_in) {
      setMessage("⚠️ Ticket already used");
    }
  };

  const confirmCheckIn = async () => {
    if (!scannedTicket) return;

    if (scannedTicket.checked_in) {
      setMessage("⚠️ Ticket already used");
      return;
    }

    const { error } = await supabase
      .from("tickets")
      .update({ checked_in: true })
      .eq("id", scannedTicket.id);

    if (error) {
      setMessage("❌ Could not check in ticket");
      return;
    }

    setScannedTicket({
      ...scannedTicket,
      checked_in: true,
    });

    setMessage("✅ Entry granted");
  };

  const startScanner = async () => {
    try {
      hasScannedRef.current = false;
      setScannedTicket(null);
      setMessage("");

      const { Html5Qrcode } = await import("html5-qrcode");

      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (decodedText: string) => {
          if (hasScannedRef.current) return;

          hasScannedRef.current = true;

          await scanner.stop();
          await scanner.clear();
          setScannerRunning(false);

          await fetchTicketDetails(decodedText);
        },
        () => {}
      );

      setScannerRunning(true);
    } catch (err) {
      console.error(err);
      setMessage("❌ Unable to access camera");
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      }
    } catch {}

    setScannerRunning(false);
    hasScannedRef.current = false;
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop?.().catch(() => {});
        scannerRef.current.clear?.().catch(() => {});
      }
    };
  }, []);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#050505",
          color: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1>Checking access...</h1>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#050505",
          color: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            padding: 30,
            borderRadius: 20,
            background: "linear-gradient(135deg, #111827, #05070d)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h1>Access Denied</h1>
          <p style={{ color: "#cbd5e1" }}>
            You are not authorized to check in tickets for this event.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          padding: 30,
          borderRadius: 20,
          background: "linear-gradient(135deg, #111827, #05070d)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h1 style={{ marginBottom: 8 }}>Event Check-In</h1>
        <p style={{ color: "#cbd5e1", marginTop: 0, marginBottom: 20 }}>
          {eventTitle || "Organizer scanner"}
        </p>

        <div
          id="reader"
          style={{
            width: "100%",
            minHeight: 220,
            marginBottom: 20,
            borderRadius: 16,
            overflow: "hidden",
            background: "#000",
          }}
        />

        {!scannerRunning ? (
          <button
            onClick={startScanner}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              background: "linear-gradient(135deg, #f97316, #3b82f6)",
              border: "none",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 20,
            }}
          >
            Start Scanner
          </button>
        ) : (
          <button
            onClick={stopScanner}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              background: "#1f2937",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 20,
            }}
          >
            Stop Scanner
          </button>
        )}

        {scannedTicket && (
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Ticket Details</h2>

            <p style={{ margin: "0 0 8px", color: "#cbd5e1" }}>
              <strong>Event:</strong> {scannedTicket.event_title || "-"}
            </p>

            <p style={{ margin: "0 0 8px", color: "#cbd5e1" }}>
              <strong>Ticket Type:</strong> {scannedTicket.ticket_name || "-"}
            </p>

            <p style={{ margin: "0 0 8px", color: "#cbd5e1" }}>
              <strong>Buyer:</strong> {scannedTicket.buyer_name || "-"}
            </p>

            <p style={{ margin: "0 0 8px", color: "#cbd5e1" }}>
              <strong>Email:</strong> {scannedTicket.buyer_email || "-"}
            </p>

            <p style={{ margin: "0 0 16px", color: "#cbd5e1" }}>
              <strong>Status:</strong>{" "}
              {scannedTicket.checked_in ? "Already Used" : "Valid"}
            </p>

            {!scannedTicket.checked_in && (
              <button
                onClick={confirmCheckIn}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  border: "none",
                  color: "white",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Confirm Entry
              </button>
            )}
          </div>
        )}

        {message && <p style={{ marginTop: 10, fontWeight: 600 }}>{message}</p>}
      </div>
    </main>
  );
}