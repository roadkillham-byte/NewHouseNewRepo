import type { Metadata, Viewport } from "next";
import { Karla, Source_Sans_3, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Karla for headings (humanist, slightly narrow), Source Sans 3 for body —
// a different skeleton, so the pairing reads as a pairing rather than as one
// family at two weights.
const display = Karla({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-family",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "House OS",
  description: "Chores, bills, and furnishing for the share house.",
  applicationName: "House OS",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "House OS" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

// Matches --background in each theme, so the phone's browser chrome blends
// into the page instead of framing it in white.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#151410" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning is required: next-themes writes the theme class
    // onto <html> before React hydrates, which is a mismatch by definition.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
