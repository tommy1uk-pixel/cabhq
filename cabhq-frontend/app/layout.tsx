import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CabHQ | Taxi Dispatch & Fleet Management Platform',
  description:
    'CabHQ is a modern taxi dispatch and fleet management platform for operators, drivers and passengers.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  applicationName: 'CabHQ',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#05070c] text-white antialiased">
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}