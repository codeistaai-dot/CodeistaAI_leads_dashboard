import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: '#141817',
};

export const metadata: Metadata = {
  title: 'CodeistaAI — Lead Management Dashboard',
  description:
    'Real-time lead enquiries and attribution intelligence dashboard for CodeistaAI.',
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: '/favicon.svg',
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
