"use client";

import Link from "next/link";
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
    <main className="min-h-screen bg-black px-6 text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center py-10">
        <div className="w-full border border-white/10 bg-white/[0.03] p-8 text-center md:p-10">
          {status === "loading" && (
            <>
              <h1 className="mb-4 text-3xl font-extrabold">
                Processing Payment...
              </h1>
              <p className="text-white/70">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <h1 className="mb-4 text-3xl font-extrabold">
                Payment Successful 🎉
              </h1>
              <p className="text-white/70">{message}</p>

              <div className="mt-8 flex gap-3 justify-center">
                <Link href="/my-tickets" className="bg-white px-6 py-3 text-black font-bold">
                  My Tickets
                </Link>
                <Link href="/" className="border border-white px-6 py-3">
                  Home
                </Link>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <h1 className="mb-4 text-3xl font-extrabold text-red-400">
                Error
              </h1>
              <p className="text-white/70">{message}</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}