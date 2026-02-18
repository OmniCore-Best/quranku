import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from 'sonner';
import "./globals.css";
import BottomNav from "@/components/ui/BottomNav";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import InstallPrompt from "@/components/ui/InstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // optimalisasi performa font
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://quranku.devnova.icu";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "quranku - Aplikasi Al-Quran, Doa, Tajwid, dan Galeri Islami",
    template: "%s | quranku", // template untuk halaman lain
  },
  description:
    "Aplikasi lengkap untuk membaca Al-Quran, belajar tajwid, doa harian, dan galeri islami. Tersedia offline dan gratis.",
  keywords: [
    "Al-Quran",
    "tajwid",
    "doa",
    "hadist",
    "islami",
    "quranku",
    "baca quran",
    "jadwal sholat",
  ],
  authors: [{ name: "devnova-id", url: "https://github.com/devnovaa-id" }],
  creator: "devnova-id",
  publisher: "devnova-id",
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "quranku",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: siteUrl,
    siteName: "quranku",
    title: "quranku - Aplikasi Al-Quran, Doa, Tajwid, dan Galeri Islami",
    description:
      "Aplikasi lengkap untuk membaca Al-Quran, belajar tajwid, doa harian, dan galeri islami",
    images: [
      {
        url: `${siteUrl}/icons/icon-512x512.png`,
        width: 512,
        height: 512,
        alt: "quranku - Aplikasi Islami",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@quranku",
    creator: "@quranku",
    title: "quranku - Aplikasi Al-Quran, Doa, Tajwid, dan Galeri Islami",
    description:
      "Aplikasi lengkap untuk membaca Al-Quran, belajar tajwid, doa harian, dan galeri islami",
    images: `${siteUrl}/icons/icon-512x512.png`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "education",
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        {/* Preconnect untuk domain eksternal – meningkatkan performa loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://api.devnova.icu" />
        <link rel="dns-prefetch" href="https://api.devnova.icu" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <main className="min-h-screen pb-20">{children}</main>
        <BottomNav />
        <ServiceWorkerRegistration />
        <InstallPrompt />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}