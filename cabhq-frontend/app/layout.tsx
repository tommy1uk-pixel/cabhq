import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CabHQ | Taxi Dispatch & Fleet Management Platform",
  description:
    "CabHQ is a modern taxi dispatch and fleet management platform for operators, drivers and passengers.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}