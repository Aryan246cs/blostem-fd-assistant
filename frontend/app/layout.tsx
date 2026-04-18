import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FD Saathi — Vernacular Financial Assistant",
  description: "Understand Fixed Deposits in your language. Hindi, Tamil, English.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
