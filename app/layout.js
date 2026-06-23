import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CookieBanner from "./components/CookieBanner";
import FirebaseAnalytics from "./components/FirebaseAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Baia Beach Cup",
  description: "Gestione tornei e iscrizioni Baia Beach Cup",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo_v2.png",
    shortcut: "/logo_v2.png",
    apple: "/webapp-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Baia Beach Cup",
  },
};

export const viewport = {
  themeColor: "#295dab",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html
        lang="it"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <FirebaseAnalytics />
          {children}
          <CookieBanner />
        </body>
      </html>
    </ClerkProvider>
  );
}
