'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Edit2, Package, ChevronRight, Store, X, CheckCircle, CreditCard, QrCode, Trash2, Eye, Megaphone } from 'lucide-react';
import { databases, DATABASE_ID, TRANSACTIONS_ID, PRODUCTS_ID, PROFILES_ID, mapDoc, Transaction, Product } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useAuth } from '@/lib/AuthContext';
import { PROMO_PRICE, PROMO_DAYS } from '@/lib/utils';
import Link from 'next/link';

function formatPrice(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu Bayar',
  paid: 'Sudah Dibayar',
  in_delivery: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export default function ProfilPage() {
  const { user, profile, signOut, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'beli' | 'jual'>('beli');
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [sellerSuccess, setSellerSuccess] = useState(false);
  const [sellerStep, setSellerStep] = useState<'info' | 'payment'>('info');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'qris'>('bank');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [qrisUrl, setQrisUrl] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [promoteLoading, setPromoteLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    if (activeTab === 'beli') {
      // Fetch transaksi pembelian
      const fetchTx = async () => {
        setTxLoading(true);
        try {
          const queries = [
            Query.orderDesc('$createdAt'),
            Query.limit(20),
            Query.equal('buyer_id', user.$id),
          ];
          const response = await databases.listDocuments(DATABASE_ID, TRANSACTIONS_ID, queries);
          const fetchedTxs = response.documents.map(doc => mapDoc<Transaction>(doc));

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
    } else {
      // Fetch produk milik user (listing yang dijual)
      const fetchMyProducts = async () => {
        setProductsLoading(true);
        try {
          const response = await databases.listDocuments(
            DATABASE_ID,
            PRODUCTS_ID,
            [
              Query.equal('seller_id', user.$id),
              Query.orderDesc('$createdAt'),
              Query.limit(20),
            ]
          );
          setMyProducts(response.documents.map(doc => mapDoc<Product>(doc)));
        } catch (error) {
          console.error('Error fetching my products', error);
        }
        setProductsLoading(false);
      };
      fetchMyProducts();
    }
  }, [user, activeTab]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handlePromote = async (product: Product) => {
    if (!profile || !user) return;
    
    const isCurrentlyPromoted = product.is_promoted && (!product.promoted_until || new Date(product.promoted_until) > new Date());
    
    if (isCurrentlyPromoted) {
      // Hentikan iklan
      if (!window.confirm('Hentikan iklan untuk produk ini?')) return;
      setPromoteLoading(product.id);
      try {
        await databases.updateDocument(DATABASE_ID, PRODUCTS_ID, product.id, {
          is_promoted: false,
          promoted_until: null,
        });
        setMyProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_promoted: false, promoted_until: null } : p));
      } catch (e: any) {
        alert('Gagal menghentikan iklan: ' + e.message);
      }
      setPromoteLoading(null);
      return;
    }

    // Promosikan
    if ((profile.saldo || 0) < PROMO_PRICE) {
      alert(`Saldo tidak cukup! Dibutuhkan ${formatPrice(PROMO_PRICE)}, saldo kamu ${formatPrice(profile.saldo || 0)}.`);
      return;
    }

    if (!window.confirm(`Promosikan "${product.title}" selama ${PROMO_DAYS} hari?\nBiaya: ${formatPrice(PROMO_PRICE)} (dipotong dari saldo)\n\nSaldo kamu: ${formatPrice(profile.saldo || 0)}`)) return;
    
    setPromoteLoading(product.id);
    try {
      const untilDate = new Date();
      untilDate.setDate(untilDate.getDate() + PROMO_DAYS);

      // Update produk
      await databases.updateDocument(DATABASE_ID, PRODUCTS_ID, product.id, {
        is_promoted: true,
        promoted_until: untilDate.toISOString(),
      });

      // Potong saldo penjual
      const profileResponse = await databases.listDocuments(DATABASE_ID, PROFILES_ID, [
        Query.equal('user_id', user.$id), Query.limit(1)
      ]);
      if (profileResponse.documents.length > 0) {
        const profileDoc = profileResponse.documents[0];
        await databases.updateDocument(DATABASE_ID, PROFILES_ID, profileDoc.$id, {
          saldo: (profileDoc.saldo || 0) - PROMO_PRICE,
        });
        await refreshProfile();
      }

      setMyProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_promoted: true, promoted_until: untilDate.toISOString() } : p));
      alert('✅ Produk berhasil dipromosikan!');
    } catch (e: any) {
      alert('Gagal mempromosikan produk: ' + e.message);
    }
    setPromoteLoading(null);
  };

  const handleBecomeSeller = async () => {
    if (!profile || !user) return;

    // Validasi payment info
    if (paymentMethod === 'bank') {
      if (!bankName.trim() || !bankAccount.trim()) {
        setPaymentError('Nama bank dan nomor rekening wajib diisi.');
        return;
      }
    } else {
      if (!qrisUrl.trim()) {
        setPaymentError('Link/kode QRIS wajib diisi.');
        return;
      }
    }
    setPaymentError('');
    setSellerLoading(true);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        PROFILES_ID,
        [Query.equal('user_id', user.$id), Query.limit(1)]
      );
      if (response.documents.length > 0) {
        const docId = response.documents[0].$id;

        // Coba simpan dengan field payment info dulu
        try {
          await databases.updateDocument(DATABASE_ID, PROFILES_ID, docId, {
            role: 'seller',
            bank_name: paymentMethod === 'bank' ? bankName.trim() : null,
            bank_account: paymentMethod === 'bank' ? bankAccount.trim() : null,
            qris_url: paymentMethod === 'qris' ? qrisUrl.trim() : null,
          });
        } catch (fieldErr: any) {
          // Kalau field payment belum ada di Appwrite, fallback: simpan role saja
          console.warn('Payment fields not found in schema, saving role only:', fieldErr.message);
          await databases.updateDocument(DATABASE_ID, PROFILES_ID, docId, {
            role: 'seller',
          });
        }

        await refreshProfile();
        setSellerSuccess(true);
        setTimeout(() => {
          setShowSellerModal(false);
          setSellerSuccess(false);
          setSellerStep('info');
        }, 1800);
      } else {
        setPaymentError('Profil tidak ditemukan. Coba logout dan login ulang.');
      }
    } catch (e: any) {
      console.error('Failed to update role', e);
      setPaymentError('Gagal: ' + (e?.message || 'Terjadi kesalahan. Coba lagi.'));
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
          </div>
          <button id="btn-edit-profile" className="btn btn-ghost btn-sm">
            <Edit2 size={14} /> Edit
          </button>
        </div>


        {/* Quick Menu */}
        <div style={{
          marginTop: 12,
          display: 'grid',
          gridTemplateColumns: profile.role === 'seller' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
          gap: 8,
        }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setActiveTab('beli')}
            style={{
              flexDirection: 'column', gap: 4, padding: '10px 8px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>🛍️</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Pembelian</span>
          </button>
          {profile.role === 'seller' && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setActiveTab('jual')}
              style={{
                flexDirection: 'column', gap: 4, padding: '10px 8px',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>🏷️</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Jualanku</span>
            </button>
          )}
          <Link
            href="/jual"
            className="btn btn-ghost btn-sm"
            style={{
              flexDirection: 'column', gap: 4, padding: '10px 8px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>➕</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Jual Barang</span>
          </Link>
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
          <Package size={16} /> {activeTab === 'beli' ? 'Riwayat Pembelian' : 'Barang Jualanku'}
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
              {tab === 'beli' ? '🛍️ Pembelian' : '🏷️ Jualanku'}
            </button>
          ))}
        </div>

        {activeTab === 'beli' ? (
          // --- TAB BELI: riwayat transaksi ---
          txLoading ? (
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
                    <div style={{ fontSize: 0 }}><Package size={24} style={{ color: 'var(--text-muted)' }} /></div>
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
              <div className="empty-state-icon" style={{ fontSize: 0, padding: 8 }}><Package size={48} style={{ color: 'var(--gray-300)' }} /></div>
              <p style={{ fontWeight: 600 }}>Belum ada pembelian</p>
              <p style={{ fontSize: '0.8rem' }}>Yuk cari perabot kos!</p>
            </div>
          )
        ) : (
          // --- TAB JUAL: listing produk milik user ---
          productsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: 64, borderRadius: 'var(--radius-md)' }} />
              ))}
            </div>
          ) : myProducts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myProducts.map(p => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    opacity: p.is_sold ? 0.6 : 1,
                  }}
                >
                  <div style={{ fontSize: 0 }}>
                    {p.photos?.[0]
                      ? <img src={p.photos[0]} alt={p.title} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                      : <Package size={24} style={{ color: 'var(--text-muted)' }} />
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{p.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {p.is_sold ? 'Terjual' : 'Aktif dijual'} • {formatPrice(p.price)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {!p.is_sold && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.7rem',
                          color: p.is_promoted && (!p.promoted_until || new Date(p.promoted_until) > new Date()) ? 'var(--orange-600)' : 'var(--green-700)',
                          background: p.is_promoted && (!p.promoted_until || new Date(p.promoted_until) > new Date()) ? 'rgba(249,115,22,0.08)' : 'rgba(45,90,64,0.06)',
                          border: `1px solid ${p.is_promoted && (!p.promoted_until || new Date(p.promoted_until) > new Date()) ? 'rgba(249,115,22,0.2)' : 'rgba(45,90,64,0.15)'}`,
                        }}
                        onClick={() => handlePromote(p)}
                        disabled={promoteLoading === p.id}
                      >
                        {promoteLoading === p.id ? (
                          <span className="spinner" style={{ width: 12, height: 12 }} />
                        ) : p.is_promoted && (!p.promoted_until || new Date(p.promoted_until) > new Date()) ? (
                          <><Megaphone size={12} /> Iklan Aktif</>
                        ) : (
                          <><Megaphone size={12} /> Promosikan</>
                        )}
                      </button>
                    )}
                    <Link href={`/produk/${p.id}`} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
                      <Eye size={16} />
                    </Link>
                    <Link href={`/edit-produk/${p.id}`} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
                      <Edit2 size={16} />
                    </Link>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: 6, color: 'var(--red-500)' }}
                      onClick={async () => {
                        if (window.confirm('Yakin ingin menghapus barang ini?')) {
                          try {
                            await databases.deleteDocument(DATABASE_ID, PRODUCTS_ID, p.id);
                            setMyProducts(prev => prev.filter(x => x.id !== p.id));
                          } catch (e: any) {
                            alert('Gagal menghapus: ' + e.message);
                          }
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🏷️</div>
              <p style={{ fontWeight: 600 }}>Belum ada barang dijual</p>
              <Link href="/jual" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
                + Jual Sekarang
              </Link>
            </div>
          )
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
            ) : sellerStep === 'info' ? (
              <>
                {/* Step 1: Info manfaat */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: '1.2rem' }}>Mulai Berjualan 🏷️</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
                      Ubah statusmu jadi Penjual
                    </p>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setShowSellerModal(false); setSellerStep('info'); }}
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
                  className="btn btn-primary btn-full"
                  onClick={() => setSellerStep('payment')}
                >
                  Lanjut &rarr;
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 10 }}>
                  Kamu masih bisa beli barang sebagai penjual
                </p>
              </>
            ) : (
              <>
                {/* Step 2: Info pembayaran */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: '1.2rem' }}>Info Pembayaran 💳</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
                      Pembeli akan transfer ke rekening ini
                    </p>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSellerStep('info')}
                    style={{ padding: 6 }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Toggle Bank / QRIS */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  <button
                    className={`btn btn-sm ${paymentMethod === 'bank' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setPaymentMethod('bank')}
                    style={{ flex: 1, gap: 6 }}
                  >
                    <CreditCard size={14} /> Rekening Bank
                  </button>
                  <button
                    className={`btn btn-sm ${paymentMethod === 'qris' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setPaymentMethod('qris')}
                    style={{ flex: 1, gap: 6 }}
                  >
                    <QrCode size={14} /> QRIS
                  </button>
                </div>

                {paymentError && (
                  <div className="alert alert-error" style={{ marginBottom: 12 }}>{paymentError}</div>
                )}

                {paymentMethod === 'bank' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    <div className="form-group">
                      <label className="form-label">Nama Bank</label>
                      <input
                        className="form-input"
                        placeholder="Contoh: BCA, BNI, Mandiri, BSI..."
                        value={bankName}
                        onChange={e => { setBankName(e.target.value); setPaymentError(''); }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nomor Rekening</label>
                      <input
                        className="form-input"
                        placeholder="Contoh: 1234567890"
                        inputMode="numeric"
                        value={bankAccount}
                        onChange={e => { setBankAccount(e.target.value); setPaymentError(''); }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    <div className="form-group">
                      <label className="form-label">Nama / ID QRIS</label>
                      <input
                        className="form-input"
                        placeholder="Contoh: nama-qris atau link gambar QRIS kamu"
                        value={qrisUrl}
                        onChange={e => { setQrisUrl(e.target.value); setPaymentError(''); }}
                      />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      💡 Masukkan nama QRIS atau link gambar QRIS milikmu (GoPay, OVO, Dana, dll)
                    </p>
                  </div>
                )}

                <button
                  id="btn-confirm-seller"
                  className="btn btn-primary btn-full"
                  onClick={handleBecomeSeller}
                  disabled={sellerLoading}
                >
                  {sellerLoading ? <span className="spinner" /> : 'Jadikan Saya Penjual 🚀'}
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 10 }}>
                  Info rekening bisa diubah nanti di pengaturan profil
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
