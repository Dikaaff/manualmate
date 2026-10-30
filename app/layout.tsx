import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const sans = localFont({
  src: './fonts/manrope-latin.woff2',
  weight: '200 800',
  style: 'normal',
  variable: '--font-sans',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
});

const display = localFont({
  src: './fonts/instrument-serif-latin.woff2',
  weight: '400',
  style: 'normal',
  variable: '--font-display',
  display: 'swap',
  fallback: ['Iowan Old Style', 'Georgia', 'serif'],
});

export const metadata: Metadata = {
  title: 'ManualMate — Visual repair guidance',
  description: 'Cautious visual inspection for low-risk furniture repairs, with a safety gate before every step.',
  applicationName: 'ManualMate',
};

export const viewport: Viewport = {
  themeColor: '#f7f3ec',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
