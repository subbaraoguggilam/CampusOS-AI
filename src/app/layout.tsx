import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Swarnandhra College — CampusOS AI",
  description:
    "Swarnandhra College student workspace with offline AI-guided campus workflows.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
