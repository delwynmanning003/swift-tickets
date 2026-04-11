"use client";

export default function PaymentCancelPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-2 text-sm uppercase tracking-[0.18em] text-white/45">
          Swift Tickets
        </p>
        <h1 className="text-4xl font-extrabold tracking-[-0.03em]">
          Payment Cancelled
        </h1>
        <p className="mt-4 text-white/70">
          Your payment was not completed. You can go back and try again.
        </p>
      </div>
    </main>
  );
}