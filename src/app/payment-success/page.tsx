"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Finalizing your order...");

  useEffect(() => {
    const finalize = async () => {
      if (!reference) {
        setStatus("error");
        setMessage("Missing payment reference.");
        return;
      }

      try {
        const res = await fetch(
          `/api/paystack/verify?reference=${encodeURIComponent(reference)}`
        );

        const data = await res.json();

        if (!res.ok || !data.success) {
          setStatus("error");
          setMessage(data.error || "Failed to finalize order.");
          return;
        }

        setStatus("success");
        setMessage("Your ticket has been issued successfully.");
      } catch (error) {
        console.error(error);
        setStatus("error");
        setMessage("Something went wrong while finalizing your order.");
      }
    };

    finalize();
  }, [reference]);

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6 text-white">
      <div className="w-full max-w-xl border border-white/10 bg-white/[0.03] p-8 text-center">
        {status === "loading" && (
          <>
            <h1 className="mb-3 text-3xl font-bold">Processing...</h1>
            <p className="text-white/70">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="mb-3 text-3xl font-bold">Payment Successful 🎉</h1>
            <p className="text-white/70">{message}</p>
            {reference && (
              <p className="mt-4 text-sm text-white/40">Reference: {reference}</p>
            )}
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="mb-3 text-3xl font-bold text-red-400">
              Something went wrong
            </h1>
            <p className="text-white/70">{message}</p>
            {reference && (
              <p className="mt-4 text-sm text-white/40">Reference: {reference}</p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<main className="p-10 text-white">Loading...</main>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
