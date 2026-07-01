import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AuthSessionProvider from "@/components/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  style: ["normal", "italic"],
  weight: "400",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "Nura | Your Company Memory Layer",
  description: "Capture, structure, and surface your company's institutional knowledge.",
  metadataBase: new URL("https://asknura.io"),

  
    icons: {
    icon: "/Nura-fav-Icon.svg",
  },
  
  openGraph: {
    title: "Nura | Your Company Memory Layer",
    description: "Capture, structure, and surface your company's institutional knowledge.",
    url: "https://asknura.io",
    siteName: "Nura",
    images: [
      {
        url: "/Nura-Thumbnail.jpeg",
        width: 1200,
        height: 630,
        alt: "Nura | Your Company Memory Layer",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Nura | Your Company Memory Layer",
    description: "Capture, structure, and surface your company's institutional knowledge.",
    images: ["/Nura-Thumbnail.jpeg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
