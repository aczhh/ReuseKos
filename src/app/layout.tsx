import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import { CartProvider } from '@/lib/CartContext';
import { WishlistProvider } from '@/lib/WishlistContext';

export const metadata: Metadata = {
  title: 'ReuseKos — Marketplace Perabot Mahasiswa',
  description: 'Jual beli perabot kos antar mahasiswa dengan aman, mudah, dan transparan. Khusus mahasiswa ber-email .ac.id.',
  keywords: ['perabot kos', 'jual beli mahasiswa', 'marketplace kampus', 'reusekos'],
  openGraph: {
    title: 'ReuseKos',
    description: 'Marketplace perabot kos khusus mahasiswa',
    type: 'website',
  },
  icons: {
    icon: '/favicon.ico?v=2',
  },
};

const GA_ID = 'G-Y0HVBYPDED';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>

        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <div className="app-container">
                {children}
              </div>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
