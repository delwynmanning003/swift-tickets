import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
    "Discover events, buy tickets, create experiences, and resell tickets seamlessly with Swift Tickets in South Africa.",
  applicationName: "Swift Tickets",
  keywords: [
    "Swift Tickets",
    "event tickets South Africa",
    "buy tickets",
    "sell tickets",
    "ticket resale",
    "events Johannesburg",
    "South Africa events",
  ],
  alternates: {
    canonical: "https://swifttickets.co.za",
  },
  openGraph: {
    title: "Swift Tickets | South Africa Event Ticketing",
    description:
      "Discover events, buy tickets, create experiences, and resell tickets seamlessly with Swift Tickets.",
    url: "https://swifttickets.co.za",
    siteName: "Swift Tickets",
    locale: "en_ZA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Swift Tickets | South Africa Event Ticketing",
    description:
      "Discover events, buy tickets, create experiences, and resell tickets seamlessly with Swift Tickets.",
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
  },
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
        {children}
      </body>
    </html>
  );
}