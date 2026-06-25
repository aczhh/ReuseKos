'use client';

import { AuthProvider } from '@/lib/AuthContext';
import { CartProvider } from '@/lib/CartContext';
import { Navbar } from '@/components/Navigation';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <Navbar />
        <main>
          {children}
        </main>
      </CartProvider>
    </AuthProvider>
  );
}
