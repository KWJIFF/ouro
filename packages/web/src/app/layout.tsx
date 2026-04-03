import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ouro — The Self-Evolving Signal System',
  description: 'Your ideas feed the machine. The machine feeds itself.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
