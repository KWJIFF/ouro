import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ouro — The Self-Evolving Signal System',
  description: 'Your ideas feed the machine. The machine feeds itself.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ouro',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0c0c0f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="min-h-screen">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

function ServiceWorkerRegistration() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('[Ouro] SW registered:', reg.scope))
                .catch(err => console.warn('[Ouro] SW registration failed:', err));
            });

            // Listen for sync messages
            navigator.serviceWorker.addEventListener('message', (event) => {
              if (event.data.type === 'signal-synced') {
                console.log('[Ouro] Offline signal synced:', event.data.signalId);
              }
            });

            // Flush queue when coming back online
            window.addEventListener('online', () => {
              navigator.serviceWorker.controller?.postMessage('flush-queue');
            });
          }
        `,
      }}
    />
  );
}
