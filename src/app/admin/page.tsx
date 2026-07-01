'use client';

import { useState, useEffect } from 'react';
import {
  Shield, CheckCircle, Clock, Package, Megaphone, X, Inbox, Calendar,
  Users, ShoppingBag, Search, GraduationCap, Store, User
} from 'lucide-react';
import {
  databases, DATABASE_ID, TRANSACTIONS_ID, PRODUCTS_ID, PROFILES_ID,
  mapDoc, Transaction, Product, Profile
} from '@/lib/appwrite';
import { Query } from 'appwrite';
import Link from 'next/link';

function formatPrice(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu Bayar',
  paid: 'Sudah Dibayar',
  in_delivery: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

type AdminTab = 'transaksi' | 'iklan' | 'pengguna' | 'produk';

export default function AdminPage() {
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [promotedProducts, setPromotedProducts] = useState<Product[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<AdminTab>('transaksi');
  const [userSearch, setUserSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    const storedAuth = sessionStorage.getItem('adminAuth');
    if (storedAuth === 'true') setIsAdminAuth(true);
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'adminKece.1') {
      setIsAdminAuth(true);
      sessionStorage.setItem('adminAuth', 'true');
    } else {
      alert('Password salah!');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuth(false);
    sessionStorage.removeItem('adminAuth');
  };

  // Fetch transactions
  useEffect(() => {
    const fetchAllTxs = async () => {
      setLoading(true);
      try {
        const response = await databases.listDocuments(DATABASE_ID, TRANSACTIONS_ID, [
          Query.orderDesc('$createdAt'),
          Query.limit(100),
        ]);
        const fetchedTxs = response.documents.map(doc => mapDoc<Transaction>(doc));

        const productIds = [...new Set(fetchedTxs.map(tx => tx.product_id))];
        const buyerIds = [...new Set(fetchedTxs.map(tx => tx.buyer_id))];
        const sellerIds = [...new Set(fetchedTxs.map(tx => tx.seller_id))];

        const [productsRes, profilesRes] = await Promise.all([
          productIds.length > 0
            ? databases.listDocuments(DATABASE_ID, PRODUCTS_ID, [Query.equal('$id', productIds)])
            : { documents: [] },
          (buyerIds.length > 0 || sellerIds.length > 0)
            ? databases.listDocuments(DATABASE_ID, PROFILES_ID, [Query.equal('user_id', [...buyerIds, ...sellerIds])])
            : { documents: [] },
        ]);

        const productsMap = new Map();
        productsRes.documents.forEach(doc => productsMap.set(doc.$id, mapDoc(doc)));
        const profilesMap = new Map();
        profilesRes.documents.forEach(doc => profilesMap.set(doc.user_id, mapDoc(doc)));

        fetchedTxs.forEach(tx => {
          tx.product = productsMap.get(tx.product_id);
          tx.buyer = profilesMap.get(tx.buyer_id);
          const seller = profilesMap.get(tx.seller_id);
          if (tx.product && seller) tx.product.seller = seller;
        });

        setTransactions(fetchedTxs);
      } catch (error) {
        console.error('Error fetching admin tx:', error);
      }
      setLoading(false);
    };

    if (isAdminAuth) {
      fetchAllTxs();
      fetchPromotedProducts();
    }
  }, [isAdminAuth]);

  const fetchPromotedProducts = async () => {
    try {
      const response = await databases.listDocuments(DATABASE_ID, PRODUCTS_ID, [
        Query.equal('is_promoted', true),
        Query.limit(50),
      ]);
      const promos = response.documents.map(doc => mapDoc<Product>(doc));
      const sellerIds = [...new Set(promos.map(p => p.seller_id))];
      if (sellerIds.length > 0) {
        const sellersRes = await databases.listDocuments(DATABASE_ID, PROFILES_ID, [Query.equal('user_id', sellerIds)]);
        const sellersMap = new Map();
        sellersRes.documents.forEach(doc => sellersMap.set(doc.user_id, mapDoc(doc)));
        promos.forEach(p => { p.seller = sellersMap.get(p.seller_id); });
      }
      setPromotedProducts(promos);
    } catch {
      setPromotedProducts([]);
    }
  };

  // Fetch all users (lazy — only when tab is active)
  const fetchAllUsers = async () => {
    if (allUsers.length > 0) return; // already loaded
    setUsersLoading(true);
    try {
      const response = await databases.listDocuments(DATABASE_ID, PROFILES_ID, [
        Query.orderDesc('$createdAt'),
        Query.limit(200),
      ]);
      setAllUsers(response.documents.map(doc => mapDoc<Profile>(doc)));
    } catch (e) {
      console.error(e);
    }
    setUsersLoading(false);
  };

  // Fetch all products (lazy — only when tab is active)
  const fetchAllProducts = async () => {
    if (allProducts.length > 0) return; // already loaded
    setProductsLoading(true);
    try {
      const response = await databases.listDocuments(DATABASE_ID, PRODUCTS_ID, [
        Query.orderDesc('$createdAt'),
        Query.limit(200),
      ]);
      const prods = response.documents.map(doc => mapDoc<Product>(doc));
      // Fetch seller info
      const sellerIds = [...new Set(prods.map(p => p.seller_id))];
      if (sellerIds.length > 0) {
        const sellersRes = await databases.listDocuments(DATABASE_ID, PROFILES_ID, [Query.equal('user_id', sellerIds)]);
        const sellersMap = new Map();
        sellersRes.documents.forEach(doc => sellersMap.set(doc.user_id, mapDoc(doc)));
        prods.forEach(p => { p.seller = sellersMap.get(p.seller_id); });
      }
      setAllProducts(prods);
    } catch (e) {
      console.error(e);
    }
    setProductsLoading(false);
  };

  const handleTabChange = (tab: AdminTab) => {
    setAdminTab(tab);
    if (tab === 'pengguna') fetchAllUsers();
    if (tab === 'produk') fetchAllProducts();
  };

  // Transaction actions
  const handleConfirmPayment = async (tx: Transaction) => {
    if (!confirm('Konfirmasi pembayaran untuk transaksi ini?')) return;
    setActionLoading(tx.id);
    try {
      await databases.updateDocument(DATABASE_ID, TRANSACTIONS_ID, tx.id, { status: 'paid' });
      await databases.updateDocument(DATABASE_ID, PRODUCTS_ID, tx.product_id, { is_sold: true });
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'paid' } : t));
    } catch (e: any) { alert('Gagal: ' + e.message); }
    setActionLoading(null);
  };

  const handleConfirmCompleted = async (tx: Transaction) => {
    if (!confirm('Konfirmasi transaksi selesai?')) return;
    setActionLoading(tx.id);
    try {
      await databases.updateDocument(DATABASE_ID, TRANSACTIONS_ID, tx.id, { status: 'completed' });
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'completed' } : t));
    } catch (e: any) { alert('Gagal: ' + e.message); }
    setActionLoading(null);
  };

  const handleCancelTransaction = async (tx: Transaction) => {
    if (!confirm('Yakin ingin membatalkan pesanan ini?')) return;
    setActionLoading(tx.id);
    try {
      await databases.updateDocument(DATABASE_ID, TRANSACTIONS_ID, tx.id, { status: 'cancelled' });
      await databases.updateDocument(DATABASE_ID, PRODUCTS_ID, tx.product_id, { is_sold: false });
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'cancelled' } : t));
    } catch (e: any) { alert('Gagal: ' + e.message); }
    setActionLoading(null);
  };

  const handleRevokePromo = async (product: Product) => {
    if (!confirm(`Cabut iklan untuk "${product.title}"?`)) return;
    setActionLoading(product.id);
    try {
      await databases.updateDocument(DATABASE_ID, PRODUCTS_ID, product.id, { is_promoted: false, promoted_until: null });
      setPromotedProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (e: any) { alert('Gagal: ' + e.message); }
    setActionLoading(null);
  };

  // ===================== LOGIN SCREEN =====================
  if (!isAdminAuth) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: 'var(--bg-base)' }}>
        <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', maxWidth: 400, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Shield size={48} style={{ color: 'var(--emerald-500)', margin: '0 auto 16px' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Admin Login</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Masukkan password admin untuk melanjutkan.</p>
          </div>
          <form onSubmit={handleAdminLogin}>
            <div className="form-group">
              <label className="form-label">Password Admin</label>
              <input type="password" className="form-input" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="********" />
            </div>
            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 16 }}>Masuk</button>
          </form>
        </div>
      </div>
    );
  }

  // ===================== STATS SUMMARY =====================
  const txCompleted = transactions.filter(t => t.status === 'completed').length;
  const txPending = transactions.filter(t => t.status === 'pending').length;
  const sellersCount = allUsers.filter(u => u.role === 'seller').length;
  const buyersCount = allUsers.filter(u => u.role === 'buyer').length;

  // Filtered users
  const filteredUsers = allUsers.filter(u =>
    !userSearch ||
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.jurusan?.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Filtered products
  const filteredProducts = allProducts.filter(p =>
    !productSearch ||
    p.title?.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.seller as Profile)?.full_name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category?.toLowerCase().includes(productSearch.toLowerCase())
  );

  // ===================== MAIN DASHBOARD =====================
  return (
    <div style={{ minHeight: '100dvh', padding: '24px 16px', background: 'var(--bg-base)', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(99,102,241,0.08))',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)',
        padding: '20px 24px', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-500)' }}>
            <Shield size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Admin Dashboard</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {transactions.length} transaksi · {allUsers.length > 0 ? `${allUsers.length} pengguna` : '…'}
            </p>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleAdminLogout}>Logout</button>
      </div>

      {/* Stat Cards (shown after users loaded) */}
      {allUsers.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total User', value: allUsers.length, color: 'var(--indigo-500)', icon: <Users size={18}/> },
            { label: 'Penjual', value: sellersCount, color: 'var(--orange-500)', icon: <Store size={18}/> },
            { label: 'Pembeli', value: buyersCount, color: 'var(--blue-500)', icon: <User size={18}/> },
            { label: 'Transaksi Selesai', value: txCompleted, color: 'var(--emerald-500)', icon: <CheckCircle size={18}/> },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: s.color, marginBottom: 6 }}>{s.icon}</div>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {([
          { key: 'transaksi', label: 'Transaksi', icon: <Package size={14} />, count: transactions.length },
          { key: 'iklan', label: 'Kelola Iklan', icon: <Megaphone size={14} />, count: promotedProducts.length },
          { key: 'pengguna', label: 'Pengguna', icon: <Users size={14} />, count: allUsers.length || null },
          { key: 'produk', label: 'Semua Produk', icon: <ShoppingBag size={14} />, count: allProducts.length || null },
        ] as const).map(tab => (
          <button
            key={tab.key}
            className={`btn btn-sm ${adminTab === tab.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => handleTabChange(tab.key as AdminTab)}
            style={adminTab === tab.key && tab.key === 'iklan' ? { background: 'var(--orange-500)' } : {}}
          >
            {tab.icon} {tab.label}{tab.count ? ` (${tab.count})` : ''}
          </button>
        ))}
      </div>

      {/* ===== TAB: TRANSAKSI ===== */}
      {adminTab === 'transaksi' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Inbox size={48} style={{ color: 'var(--border)' }} /></div>
              <p style={{ fontWeight: 600 }}>Belum ada transaksi</p>
            </div>
          ) : transactions.map(tx => {
            const product = tx.product as Product;
            const buyer = tx.buyer as Profile;
            const seller = product?.seller as Profile;
            return (
              <div key={tx.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '0.95rem', fontWeight: 700 }}>{product?.title || 'Produk Dihapus'}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>ID: #{tx.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <span className={`badge ${tx.status === 'completed' ? 'badge-emerald' : tx.status === 'paid' ? 'badge-indigo' : 'badge-amber'}`}>
                    {STATUS_LABEL[tx.status]}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: '0.85rem' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Pembeli:</span> <strong>{buyer?.full_name || 'Unknown'}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Penjual:</span> <strong>{seller?.full_name || 'Unknown'}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Total:</span> <strong>{formatPrice(tx.amount)}</strong></div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {tx.status === 'pending' && (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => handleConfirmPayment(tx)} disabled={actionLoading === tx.id} style={{ flex: 1 }}>
                        {actionLoading === tx.id ? <span className="spinner" /> : <><CheckCircle size={14} /> Konfirmasi Bayar</>}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleCancelTransaction(tx)} disabled={actionLoading === tx.id} style={{ flex: 1 }}>
                        {actionLoading === tx.id ? <span className="spinner" /> : <><X size={14} /> Batalkan</>}
                      </button>
                    </>
                  )}
                  {tx.status === 'paid' && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleConfirmCompleted(tx)} disabled={actionLoading === tx.id} style={{ flex: 1, background: 'var(--emerald-500)' }}>
                      {actionLoading === tx.id ? <span className="spinner" /> : <><Package size={14} /> Konfirmasi Selesai</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== TAB: IKLAN ===== */}
      {adminTab === 'iklan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {promotedProducts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Megaphone size={48} style={{ color: 'var(--border)' }} /></div>
              <p style={{ fontWeight: 600 }}>Belum ada produk iklan</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Penjual bisa mempromosikan produk dari halaman profil mereka.</p>
            </div>
          ) : promotedProducts.map(p => {
            const seller = p.seller as Profile;
            const isExpired = p.promoted_until && new Date(p.promoted_until) <= new Date();
            return (
              <div key={p.id} style={{ background: 'var(--bg-card)', border: `1px solid ${isExpired ? 'rgba(248,113,113,0.3)' : 'rgba(249,115,22,0.2)'}`, borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', alignItems: 'center', gap: 12, opacity: isExpired ? 0.6 : 1 }}>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.photos?.[0] ? <img src={p.photos[0]} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={24} style={{ color: 'var(--text-muted)' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{p.title}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Penjual: {seller?.full_name || 'Unknown'} · {formatPrice(p.price)}</p>
                  <p style={{ fontSize: '0.7rem', color: isExpired ? 'var(--red-500)' : 'var(--orange-500)', marginTop: 2 }}>
                    {isExpired
                      ? <><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Iklan Kadaluarsa</>
                      : p.promoted_until
                        ? <><Calendar size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Aktif sampai {new Date(p.promoted_until).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                        : <><Calendar size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Aktif (tanpa batas)</>
                    }
                  </p>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleRevokePromo(p)} disabled={actionLoading === p.id} style={{ flexShrink: 0 }}>
                  {actionLoading === p.id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <><X size={14} /> Cabut</>}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== TAB: PENGGUNA ===== */}
      {adminTab === 'pengguna' && (
        <div>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 38 }}
              placeholder="Cari nama, email, jurusan..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
          </div>

          {usersLoading ? (
            <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Users size={48} style={{ color: 'var(--border)' }} /></div>
              <p style={{ fontWeight: 600 }}>Belum ada pengguna</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px', gap: 12, padding: '8px 16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>Pengguna</span>
                <span>Jurusan / Email</span>
                <span>Role</span>
                <span>Bergabung</span>
              </div>
              {filteredUsers.map(u => (
                <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px', gap: 12, padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', alignItems: 'center' }}>
                  {/* Name + Avatar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.85rem', flexShrink: 0 }}>
                      {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name || '—'}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>WA: {u.whatsapp || '—'}</p>
                    </div>
                  </div>
                  {/* Jurusan + email */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <GraduationCap size={12} style={{ flexShrink: 0 }} /> {u.jurusan || '—'}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{u.email || '—'}</p>
                  </div>
                  {/* Role badge */}
                  <span className={`badge ${u.role === 'seller' ? 'badge-amber' : 'badge-indigo'}`} style={{ fontSize: '0.65rem', width: 'fit-content' }}>
                    {u.role === 'seller' ? 'Penjual' : 'Pembeli'}
                  </span>
                  {/* Join date */}
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(u.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: SEMUA PRODUK ===== */}
      {adminTab === 'produk' && (
        <div>
          {/* Search + filter */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 38 }}
              placeholder="Cari judul, penjual, kategori..."
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
            />
          </div>

          {productsLoading ? (
            <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><ShoppingBag size={48} style={{ color: 'var(--border)' }} /></div>
              <p style={{ fontWeight: 600 }}>Belum ada produk</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr 100px 80px 80px', gap: 12, padding: '8px 16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span></span>
                <span>Produk</span>
                <span>Penjual</span>
                <span>Harga</span>
                <span>Status</span>
              </div>
              {filteredProducts.map(p => {
                const seller = p.seller as Profile;
                return (
                  <Link key={p.id} href={`/produk/${p.id}`} target="_blank" style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr 100px 80px 80px', gap: 12, padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', alignItems: 'center', transition: 'border-color 0.15s', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--terra-400)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      {/* Photo */}
                      <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {p.photos?.[0]
                          ? <img src={p.photos[0]} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <Package size={20} style={{ color: 'var(--text-muted)' }} />}
                      </div>
                      {/* Title + category */}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                        <span className="badge badge-green" style={{ fontSize: '0.6rem', marginTop: 4 }}>{p.category}</span>
                      </div>
                      {/* Seller */}
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seller?.full_name || '—'}</p>
                      {/* Price */}
                      <p style={{ fontSize: '0.8rem', fontWeight: 700 }}>{formatPrice(p.price)}</p>
                      {/* Status */}
                      <span className={`badge ${p.is_sold ? 'badge-terra' : 'badge-emerald'}`} style={{ fontSize: '0.65rem', width: 'fit-content' }}>
                        {p.is_sold ? 'Terjual' : 'Tersedia'}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
