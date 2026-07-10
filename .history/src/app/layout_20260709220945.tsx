import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

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
  title: "ChairMatch — Hire for fit, not just credentials.",
  description:
    "The dental staffing marketplace built around fit, not just resumes. For practice owners hiring hygienists, assistants, front desk, and office managers -- and for the dental staff who want a practice that actually fits them.",
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
