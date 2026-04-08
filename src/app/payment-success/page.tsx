"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setStatus("error");
        return;
      }

      // ✅ FREE TICKETS → skip Paystack
      if (reference.startsWith("free_")) {
        setStatus("success");
        return;
      }

      try {
        const res = await fetch(`/api/paystack/verify?reference=${reference}`);
        const data = await res.json();

        if (data.success) {
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    };

    verifyPayment();
  }, [reference]);

  return (
    <main className="min-h-screen bg-black flex items-center justify-center text-white">
      <div className="text-center">
        {status === "loading" && (
          <h1 className="text-2xl">Verifying payment...</h1>
        )}

        {status === "success" && (
          <>
            <h1 className="text-3xl font-bold mb-2">🎉 Success</h1>
            <p className="text-white/70">
              Your ticket has been issued successfully.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-3xl font-bold mb-2 text-red-400">Payment Failed</h1>
            <p className="text-white/70">
              Something went wrong. Please contact support.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
