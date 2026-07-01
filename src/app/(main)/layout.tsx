'use client';

import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { CartProvider } from '@/lib/CartContext';
import { WishlistProvider } from '@/lib/WishlistContext';
import { Navbar } from '@/components/Navigation';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const authenticatedRoutes = [
    '/jual',
    '/checkout',
    '/keranjang',
    '/profil',
    '/notifikasi',
    '/edit-produk',
    '/pembayaran'
  ];

  const isAuthRequired = authenticatedRoutes.some(route => pathname.startsWith(route));

  useEffect(() => {
    if (!loading && !user && isAuthRequired) {
      router.push('/login');
    }
  }, [user, loading, isAuthRequired, router]);

  if (loading && isAuthRequired) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, borderTopColor: 'var(--green-700)' }} />
      </div>
    );
  }

  if (!user && isAuthRequired) {
    return null;
  }

  return <>{children}</>;
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <AuthGuard>
            <Navbar />
            <main>
              {children}
            </main>
          </AuthGuard>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
