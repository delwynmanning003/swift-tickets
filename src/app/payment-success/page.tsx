"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  const [status, setStatus] = useState<
    "verifying" | "success" | "failed" | "missing"
  >("verifying");
  const [message, setMessage] = useState("Verifying your payment...");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setStatus("missing");
        setMessage("Missing payment reference.");
        return;
      }

      try {
        const verifyRes = await fetch(
          `/api/paystack/verify?reference=${encodeURIComponent(reference)}`
        );

        const verifyData = await verifyRes.json();

        if (!verifyRes.ok || !verifyData?.success) {
          setStatus("failed");
          setMessage(verifyData?.error || "Payment verification failed.");
          return;
        }

        setStatus("success");
        setMessage("Payment confirmed. Your order has been marked as paid.");
      } catch (error) {
        console.error(error);
        setStatus("failed");
        setMessage("Something went wrong while verifying payment.");
      }
    };

    verifyPayment();
  }, [reference]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "white",
        padding: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          'ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.03)",
          padding: 32,
        }}
      >
        <h1
          style={{
            margin: "0 0 16px",
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: "-1px",
          }}
        >
          {status === "verifying" && "Verifying Payment..."}
          {status === "success" && "Payment Successful 🎉"}
          {status === "failed" && "Payment Verification Failed"}
          {status === "missing" && "Invalid Payment Link"}
        </h1>

        <p
          style={{
            margin: "0 0 16px",
            fontSize: 16,
            color:
              status === "success"
                ? "#d1fae5"
                : status === "failed" || status === "missing"
                ? "#fecaca"
                : "#e5e7eb",
          }}
        >
          {message}
        </p>

        {reference && (
          <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
            Reference: {reference}
          </p>
        )}
      </div>
    </main>
  );
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={<main style={{ padding: 40 }}>Loading...</main>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
