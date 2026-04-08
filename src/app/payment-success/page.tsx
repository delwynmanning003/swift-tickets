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
        setMessage("Payment confirmed. Your tickets have been issued.");
      } catch (error) {
        console.error(error);
        setStatus("failed");
        setMessage("Something went wrong while verifying payment.");
      }
    };

    verifyPayment();
  }, [reference]);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl border border-white/10 bg-white/[0.03] p-8">
        <p className="mb-2 text-sm uppercase tracking-[0.18em] text-white/55">
          Swift Tickets
        </p>
        <h1 className="mb-4 text-4xl font-extrabold tracking-[-0.03em]">
          {status === "verifying" && "Verifying Payment..."}
          {status === "success" && "Payment Successful 🎉"}
          {status === "failed" && "Payment Verification Failed"}
          {status === "missing" && "Invalid Payment Link"}
        </h1>

        <p
          className={
            status === "success"
              ? "text-green-400"
              : status === "failed" || status === "missing"
              ? "text-red-400"
              : "text-white/75"
          }
        >
          {message}
        </p>

        {reference && (
          <p className="mt-4 text-sm text-white/50">Reference: {reference}</p>
        )}
      </div>
    </main>
  );
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={<main className="p-10 text-white">Loading...</main>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
