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
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "quranku - Aplikasi Al-Quran, Doa, Tajwid, dan Galeri Islami",
  description: "Aplikasi lengkap untuk membaca Al-Quran, belajar tajwid, doa harian, dan galeri islami",
  manifest: "/manifest.json",
  applicationName: "quranku",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "quranku",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    title: "quranku",
    description: "Aplikasi Al-Quran, Doa, Tajwid, dan Galeri Islami",
  },
  twitter: {
    card: "summary",
    title: "quranku",
    description: "Aplikasi Al-Quran, Doa, Tajwid, dan Galeri Islami",
  },
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="quranku" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="quranku" />
        <meta name="description" content="Aplikasi Al-Quran, Doa, Tajwid, dan Galeri Islami" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#10b981" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#10b981" />
        
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-152x152.png" />
        
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="mask-icon" href="/icons/apple-touch-icon.png" color="#10b981" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://quranku.devnova.icu" />
        <meta name="twitter:title" content="quranku" />
        <meta name="twitter:description" content="Aplikasi Al-Quran, Doa, Tajwid, dan Galeri Islami" />
        <meta name="twitter:image" content="https://quranku.devnova.icu/icons/icon-192x192.png" />
        <meta name="twitter:creator" content="@quranku" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="quranku" />
        <meta property="og:description" content="Aplikasi Al-Quran, Doa, Tajwid, dan Galeri Islami" />
        <meta property="og:site_name" content="quranku" />
        <meta property="og:url" content="https://quranku.devnova.icu" />
        <meta property="og:image" content="https://quranku.devnova.icu/icons/icon-512x512.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}>
        <main className="min-h-screen pb-20">
          {children}
        </main>
        <BottomNav />
        <ServiceWorkerRegistration />
        <InstallPrompt />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}