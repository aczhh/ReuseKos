'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Edit2, Package, Wallet, ChevronRight, Store, X, CheckCircle } from 'lucide-react';
import { databases, DATABASE_ID, TRANSACTIONS_ID, PRODUCTS_ID, PROFILES_ID, mapDoc, Transaction } from '@/lib/appwrite';
import { Query } from 'appwrite';
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
  const { user, profile, signOut, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'beli' | 'jual'>('beli');
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [sellerSuccess, setSellerSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchTx = async () => {
      try {
        let queries = [Query.orderDesc('$createdAt'), Query.limit(20)];

        if (activeTab === 'beli') {
          queries.push(Query.equal('buyer_id', user.$id));
        } else {
          queries.push(Query.equal('seller_id', user.$id));
        }

        const response = await databases.listDocuments(DATABASE_ID, TRANSACTIONS_ID, queries);
        const fetchedTxs = response.documents.map(doc => mapDoc<Transaction>(doc));

        // Fetch related products manually
        const productIds = [...new Set(fetchedTxs.map(tx => tx.product_id))];
        if (productIds.length > 0) {
          const productsResponse = await databases.listDocuments(
            DATABASE_ID,
            PRODUCTS_ID,
            [Query.equal('$id', productIds)]
          );

          const productsMap = new Map();
          productsResponse.documents.forEach(doc => {
            productsMap.set(doc.$id, mapDoc(doc));
          });

          fetchedTxs.forEach(tx => {
            tx.product = productsMap.get(tx.product_id);
          });
        }

        setTransactions(fetchedTxs);
      } catch (error) {
        console.error('Error fetching transactions', error);
      }
      setTxLoading(false);
    };

    fetchTx();
  }, [user, activeTab]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleBecomeSeller = async () => {
    if (!profile || !user) return;
    setSellerLoading(true);
    try {
      // Find the profile document ID
      const response = await databases.listDocuments(
        DATABASE_ID,
        PROFILES_ID,
        [Query.equal('user_id', user.$id), Query.limit(1)]
      );
      if (response.documents.length > 0) {
        const docId = response.documents[0].$id;
        await databases.updateDocument(DATABASE_ID, PROFILES_ID, docId, { role: 'seller' });
        await refreshProfile();
        setSellerSuccess(true);
        setTimeout(() => {
          setShowSellerModal(false);
          setSellerSuccess(false);
        }, 1800);
      }
    } catch (e) {
      console.error('Failed to update role', e);
    }
    setSellerLoading(false);
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
            <p style={{
              fontWeight: 800, fontSize: '1.1rem',
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

      {/* Mulai Berjualan Card (only for buyers) */}
      {profile.role === 'buyer' && (
        <div style={{ padding: '0 16px', marginBottom: 16 }}>
          <button
            id="btn-mulai-berjualan"
            onClick={() => setShowSellerModal(true)}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px',
              background: 'linear-gradient(135deg, rgba(193,68,14,0.12), rgba(99,102,241,0.1))',
              border: '1.5px solid rgba(193,68,14,0.3)',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              textAlign: 'left',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg, #c1440e, #e8571a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Store size={20} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>Mulai Berjualan 🏷️</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Jual perabot kos lamamu & dapatkan uang
              </p>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      )}

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
            {[1, 2, 3].map(i => (
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
                      {formatPrice(tx.amount)}
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

      {/* Seller Modal */}
      {showSellerModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '16px',
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl) var(--radius-xl) var(--radius-lg) var(--radius-lg)',
            padding: '28px 24px',
            width: '100%', maxWidth: 480,
            animation: 'slideUp 0.25s ease',
          }}>
            {sellerSuccess ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <CheckCircle size={56} style={{ color: '#22c55e', margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 800, fontSize: '1.2rem' }}>Selamat, kamu jadi Penjual! 🎉</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 6 }}>
                  Mulai jual perabot kos lamamu sekarang.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: '1.2rem' }}>Mulai Berjualan 🏷️</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
                      Ubah statusmu jadi Penjual
                    </p>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowSellerModal(false)}
                    style={{ padding: 6 }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: 20,
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  {[
                    { icon: '✅', text: 'Upload dan jual perabot kos lamamu' },
                    { icon: '💸', text: 'Terima pembayaran langsung ke saldo' },
                    { icon: '🚛', text: 'Pilih metode pengiriman (antar / ambil sendiri)' },
                  ].map(item => (
                    <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                      <p style={{ fontSize: '0.875rem' }}>{item.text}</p>
                    </div>
                  ))}
                </div>

                <button
                  id="btn-confirm-seller"
                  className="btn btn-primary btn-full"
                  onClick={handleBecomeSeller}
                  disabled={sellerLoading}
                >
                  {sellerLoading ? <span className="spinner" /> : 'Jadikan Saya Penjual 🚀'}
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 10 }}>
                  Kamu masih bisa beli barang sebagai penjual
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
