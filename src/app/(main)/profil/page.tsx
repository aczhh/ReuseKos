'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Edit2, Package, Wallet, ChevronRight } from 'lucide-react';
import { supabase, Transaction } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';

function formatPrice(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

const STATUS_LABEL: Record<string, string> = {
  pending: '🕐 Menunggu Bayar',
  paid: '📦 Sudah Dibayar',
  in_delivery: '🚛 Dikirim',
  completed: '✅ Selesai',
  cancelled: '❌ Dibatalkan',
};

export default function ProfilPage() {
  const { user, profile, signOut, loading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'beli' | 'jual'>('beli');

  useEffect(() => {
    if (!user) return;

    const fetchTx = async () => {
      const field = activeTab === 'beli' ? 'buyer_id' : 'seller_id';

      let query = supabase
        .from('transactions')
        .select('*, product:products(title, photos)')
        .order('created_at', { ascending: false })
        .limit(20);

      if (activeTab === 'beli') {
        query = query.eq('buyer_id', user.id);
      } else {
        // Get transactions for products owned by this seller
        const { data: myProducts } = await supabase
          .from('products')
          .select('id')
          .eq('seller_id', user.id);

        if (myProducts?.length) {
          query = query.in('product_id', myProducts.map(p => p.id));
        }
      }

      const { data } = await query;
      setTransactions((data as Transaction[]) || []);
      setTxLoading(false);
    };

    fetchTx();
  }, [user, activeTab]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>Kamu belum login</p>
        <Link href="/login" className="btn btn-primary btn-full">Login Sekarang</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', paddingTop: 'var(--navbar-height)', paddingBottom: 'var(--bottom-nav-height)' }}>

      {/* Profile Hero */}
      <div style={{
        padding: '24px 16px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(193,68,14,0.08))',
        borderBottom: '1px solid var(--border)',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="avatar" style={{ width: 56, height: 56, fontSize: '1.3rem' }}>
            {profile.full_name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{profile.full_name}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {profile.jurusan}
            </p>
            <span className="badge badge-indigo" style={{ marginTop: 4 }}>
              {profile.role === 'seller' ? '🏠 Penjual' : profile.role === 'buyer' ? '🎒 Pembeli' : '🚛 Driver'}
            </span>
          </div>
          <button id="btn-edit-profile" className="btn btn-ghost btn-sm">
            <Edit2 size={14} /> Edit
          </button>
        </div>

        {/* Saldo */}
        <div style={{
          marginTop: 16, padding: '14px 16px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: 12
        }}>
          <Wallet size={20} style={{ color: 'var(--indigo-400)' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Saldo ReuseKos</p>
            <p style={{ fontWeight: 800, fontSize: '1.1rem',
              background: 'var(--gradient-brand)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {formatPrice(profile.saldo || 0)}
            </p>
          </div>
          <button className="btn btn-secondary btn-sm">Tarik</button>
        </div>
      </div>

      {/* Tab riwayat */}
      <div style={{ padding: '0 16px', marginBottom: 12 }}>
        <p style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Package size={16} /> Riwayat Transaksi
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['beli', 'jual'] as const).map(tab => (
            <button
              key={tab}
              id={`tab-${tab}`}
              className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab(tab)}
              style={{ flex: 1 }}
            >
              {tab === 'beli' ? '🛍️ Pembelian' : '🏷️ Penjualan'}
            </button>
          ))}
        </div>

        {txLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: 64, borderRadius: 'var(--radius-md)' }} />
            ))}
          </div>
        ) : transactions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {transactions.map(tx => {
              const product = tx.product as any;
              return (
                <Link
                  href={`/pembayaran/${tx.id}`}
                  key={tx.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ fontSize: '1.5rem' }}>🛋️</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {product?.title || 'Produk'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {STATUS_LABEL[tx.status]}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                      {formatPrice(tx.total_amount)}
                    </p>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <p style={{ fontWeight: 600 }}>Belum ada transaksi</p>
            <p style={{ fontSize: '0.8rem' }}>
              {activeTab === 'beli' ? 'Yuk cari perabot kos!' : 'Buka lapak sekarang!'}
            </p>
          </div>
        )}
      </div>

      {/* Sign out */}
      <div style={{ padding: '16px' }}>
        <button
          id="btn-signout"
          className="btn btn-danger btn-full"
          onClick={handleSignOut}
        >
          <LogOut size={16} /> Keluar
        </button>
      </div>
    </div>
  );
}
