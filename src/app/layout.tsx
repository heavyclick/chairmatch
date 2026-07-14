import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

// Was missing entirely -- without an explicit viewport export, Next.js
// doesn't guarantee `width=device-width, initial-scale=1` gets set, and
// mobile browsers fall back to rendering the page at a fixed desktop-ish
// width (typically ~980px) and scaling the whole thing down to fit the
// screen. That's indistinguishable from "everything is too zoomed in" --
// exactly the reported symptom, and exactly why manually pinching out to
// ~85% "fixed" it: that was the browser correcting for a viewport it was
// never told to treat as mobile-width in the first place.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  // Fraunces is a variable optical-size font; pin to a display-leaning
  // optical size so headlines read as a confident serif, not a body font.
  axes: ["opsz"],
});


export const metadata: Metadata = {
  title: "Hdenta — Hire for fit, not just credentials.",
  description:
    "Hiring software for independent dental practices -- built to surface real culture fit, schedule, and dealbreakers before the interview, not just a resume. For practice owners hiring hygienists, assistants, front desk, and office managers -- and for the dental staff who want a practice that actually fits them.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink">
        {children}
      </body>
    </html>
  );
}
