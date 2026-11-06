import type { Metadata, Viewport } from "next";
import { SITE } from "@/lib/constants";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ChromeGate } from "@/components/mockup-chrome";
import { getViewer } from "@/lib/rbac";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const TITLE = `${SITE.name}: ${SITE.tagline}`;
const OG_IMAGE = "/social/og-image-1200x630.png";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: {
    default: TITLE,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ["komunitas", "forum", "diskusi", "postingan", "community"],
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#2B2A7F" }],
  },
  other: {
    "msapplication-config": "/browserconfig.xml",
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: TITLE,
    description: SITE.description,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: SITE.description,
    images: [OG_IMAGE],
  },
};

export const viewport: Viewport = {
  themeColor: "#2B2A7F",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-svh bg-background antialiased">
        <Providers>
          <div className="flex min-h-svh flex-col">
            <ChromeGate guest={!viewer} variant="top">
              <Navbar />
            </ChromeGate>
            <main className="flex-1">{children}</main>
            <ChromeGate guest={!viewer} variant="bottom">
              <Footer />
            </ChromeGate>
          </div>
        <Toaster />
        </Providers>
      </body>
    </html>
  );
}
