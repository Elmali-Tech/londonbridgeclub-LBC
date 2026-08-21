import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { AuthProvider } from "../context/AuthContext";
import { Toaster } from "react-hot-toast";
import RealtimeInitializer from "../components/RealtimeInitializer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://londonbridge.club";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "London Bridge Club",
  description: "Join our exclusive community of professionals",
  keywords: ["club", "professional network", "business", "London", "membership"],
  authors: [{ name: "London Bridge Club" }],
  creator: "London Bridge Club",
  icons: {
    icon: "/lbllogo.png",
    shortcut: "/lbllogo.png",
    apple: "/lbllogo.png",
  },
  openGraph: {
    title: "London Bridge Club",
    description: "Join our exclusive community of professionals",
    url: baseUrl,
    siteName: "London Bridge Club",
    locale: "en_GB",
    type: "website",
    images: [
      {
        url: "/lbllogo.png",
        width: 512,
        height: 512,
        alt: "London Bridge Club Logo",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/lbllogo.png" type="image/png" />
        <link rel="shortcut icon" href="/lbllogo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/lbllogo.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-white text-black`}
        style={{ backgroundColor: '#fff', color: '#111' }}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          <RealtimeInitializer />
          <main className="flex-grow">
            {children}
          </main>
          <Toaster 
            position="bottom-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1e1e30',
                color: '#fff',
                border: '1px solid #2d2d44',
              },
              success: {
                iconTheme: {
                  primary: '#4CAF50',
                  secondary: '#fff',
                }
              },
              error: {
                iconTheme: {
                  primary: '#ff4b4b',
                  secondary: '#fff',
                }
              }
            }}
          />
        </AuthProvider>
        <Script
          src="https://ali-chatbot-api.vercel.app/chatbot-widget.js?v=17.1"
          strategy="afterInteractive"
          data-tenant="lbc"
          data-tenant-name="London Bridge Club"
          data-brand-color="#0F172A"
          data-greeting="Merhaba, ben London Bridge Club asistanı Ali. Size nasıl yardımcı olabilirim?"
        />
      </body>
    </html>
  );
}
