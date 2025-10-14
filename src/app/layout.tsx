import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SimpleThemeDetector } from "@/components/simple-theme-detector";
import { ConditionalBottomNav } from "@/components/conditional-bottom-nav";
import { ConditionalHeader } from "@/components/conditional-header";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "sonner";
import AddToHomePopup from "@/components/AddToHomePopup";

export const metadata: Metadata = {
  title: "WeEarn - Smart Investment Platform",
  description: "Join thousands of investors earning consistent daily returns through our secure, automated platform. Deposit USDT and watch your portfolio grow with guaranteed daily ROI.",
  keywords: "investment, daily returns, USDT, cryptocurrency, passive income, ROI, WeEarn",
  authors: [{ name: "WeEarn Team" }],
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/icons/icon-192x192.png",
  },
  openGraph: {
    title: "WeEarn - Smart Investment Platform",
    description: "Join thousands of investors earning consistent daily returns through our secure, automated platform.",
    url: "https://weearn.sbs",
    siteName: "WeEarn",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "WeEarn - Smart Investment Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WeEarn - Smart Investment Platform",
    description: "Join thousands of investors earning consistent daily returns through our secure, automated platform.",
    images: ["/og-image.jpg"],
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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WeEarn",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans min-h-screen antialiased flex flex-col">
        <ErrorBoundary>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <SimpleThemeDetector />
            <ConditionalHeader />
            <main className="flex-1">
              {children}
            </main>
            <ConditionalBottomNav />
            <Toaster />
            <AddToHomePopup />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
