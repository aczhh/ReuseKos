import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReuseKos — Marketplace Perabot Mahasiswa',
  description: 'Jual beli perabot kos antar mahasiswa dengan aman, mudah, dan transparan. Khusus mahasiswa ber-email .ac.id.',
  keywords: ['perabot kos', 'jual beli mahasiswa', 'marketplace kampus', 'reusekos'],
  openGraph: {
    title: 'ReuseKos',
    description: 'Marketplace perabot kos khusus mahasiswa',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
