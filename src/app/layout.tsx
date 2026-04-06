import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script"; // ✅ ADD THIS
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Swift Tickets",
  description: "Discover and create events",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* ✅ GOOGLE MAPS SCRIPT */}
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places`}
          strategy="beforeInteractive"
        />

        {children}
      </body>
    </html>
  );
}
