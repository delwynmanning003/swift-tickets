"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Html5Qrcode } from "html5-qrcode";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CheckInPage() {
  const [qrCode, setQrCode] = useState("");
  const [message, setMessage] = useState("");
  const [scannerRunning, setScannerRunning] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);

  const handleCheckIn = async (codeValue?: string) => {
    const finalCode = codeValue || qrCode;

    if (!finalCode) {
      setMessage("Please enter or scan a QR code");
      return;
    }

    const { data: ticket, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("qr_code", finalCode)
      .single();

    if (error || !ticket) {
      setMessage("❌ Ticket not found");
      return;
    }

    if (ticket.checked_in) {
      setMessage("⚠️ Ticket already used");
      return;
    }

    const { error: updateError } = await supabase
      .from("tickets")
      .update({ checked_in: true })
      .eq("id", ticket.id);

    if (updateError) {
      setMessage("Error checking in ticket");
      return;
    }

    setMessage("✅ Ticket checked in successfully!");
    setQrCode("");
  };

  const startScanner = async () => {
    try {
      setMessage("");
      hasScannedRef.current = false;

      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;

          setQrCode(decodedText);
          setScannerRunning(false);

          try {
            await html5QrCode.stop();
            await html5QrCode.clear();
          } catch {}

          await handleCheckIn(decodedText);
        },
        () => {}
      );

      setScannerRunning(true);
    } catch (err) {
      setMessage("Unable to access camera");
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      }
    } catch {}

    scannerRef.current = null;
    setScannerRunning(false);
    hasScannedRef.current = false;
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear(); // ✅ FIXED HERE
      }
    };
  }, []);

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
        <h1 style={{ marginBottom: 12 }}>Check-In</h1>
        <p style={{ color: "#cbd5e1", marginTop: 0, marginBottom: 20 }}>
          Scan a ticket QR code or enter it manually.
        </p>

        <div
          id="reader"
          style={{
            width: "100%",
            marginBottom: 20,
            borderRadius: 16,
            overflow: "hidden",
            background: "#000",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {!scannerRunning ? (
            <button
              onClick={startScanner}
              style={{
                flex: 1,
                minWidth: 180,
                padding: 12,
                borderRadius: 10,
                background: "linear-gradient(135deg, #f97316, #3b82f6)",
                border: "none",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Start QR Scanner
            </button>
          ) : (
            <button
              onClick={stopScanner}
              style={{
                flex: 1,
                minWidth: 180,
                padding: 12,
                borderRadius: 10,
                background: "#1f2937",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Stop Scanner
            </button>
          )}
        </div>

        <input
          placeholder="Enter QR Code manually"
          value={qrCode}
          onChange={(e) => setQrCode(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: "none",
            marginBottom: 16,
          }}
        />

        <button
          onClick={() => handleCheckIn()}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            background: "linear-gradient(135deg, #f97316, #3b82f6)",
            border: "none",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Check In Ticket
        </button>

        {message && (
          <p style={{ marginTop: 20, fontWeight: 600 }}>{message}</p>
        )}
      </div>
    </main>
  );
}
