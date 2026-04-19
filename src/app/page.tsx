import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  metadataBase: new URL("https://swifttickets.co.za"),
  title: {
    default: "Swift Tickets | South Africa Event Ticketing",
    template: "%s | Swift Tickets",
  },
  description:
    "Discover events, buy tickets, create events, and resell tickets seamlessly with Swift Tickets in South Africa.",
  applicationName: "Swift Tickets",
  referrer: "origin-when-cross-origin",
  keywords: [
    "Swift Tickets",
    "South Africa event ticketing",
    "buy event tickets South Africa",
    "sell tickets South Africa",
    "ticket resale South Africa",
    "events Johannesburg",
    "events Cape Town",
    "events Durban",
    "Amapiano events",
    "festival tickets South Africa",
  ],
  authors: [{ name: "Swift Tickets" }],
  creator: "Swift Tickets",
  publisher: "Swift Tickets",
  category: "Events",
  alternates: {
    canonical: "https://swifttickets.co.za",
  },
  openGraph: {
    title: "Swift Tickets | South Africa Event Ticketing",
    description:
      "Discover events, buy tickets, create events, and resell tickets seamlessly with Swift Tickets.",
    url: "https://swifttickets.co.za",
    siteName: "Swift Tickets",
    locale: "en_ZA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Swift Tickets | South Africa Event Ticketing",
    description:
      "Discover events, buy tickets, create events, and resell tickets seamlessly with Swift Tickets.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {googleMapsApiKey ? (
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`}
            strategy="beforeInteractive"
          />
        ) : null}

        {children}
      </body>
    </html>
  );
}