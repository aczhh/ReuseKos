'use client';

import { useState, useEffect } from 'react';
import { Shield, CheckCircle, Clock, Package } from 'lucide-react';
import { databases, DATABASE_ID, TRANSACTIONS_ID, PRODUCTS_ID, PROFILES_ID, mapDoc, Transaction, Product, Profile } from '@/lib/appwrite';
import { Query } from 'appwrite';


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

export default function AdminPage() {
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    // Check if admin is authenticated from sessionStorage
    const storedAuth = sessionStorage.getItem('adminAuth');
    if (storedAuth === 'true') {
      setIsAdminAuth(true);
    }
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple hardcoded password for the owner
    if (passwordInput === 'admin123') {
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

  useEffect(() => {
    const fetchAllTxs = async () => {
      setLoading(true);
      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          TRANSACTIONS_ID,
          [
            Query.orderDesc('$createdAt'),
            Query.limit(50)
          ]
        );
        const fetchedTxs = response.documents.map(doc => mapDoc<Transaction>(doc));

        // Fetch products & buyers
        const productIds = [...new Set(fetchedTxs.map(tx => tx.product_id))];
        const buyerIds = [...new Set(fetchedTxs.map(tx => tx.buyer_id))];
        const sellerIds = [...new Set(fetchedTxs.map(tx => tx.seller_id))];

        const [productsRes, profilesRes] = await Promise.all([
          productIds.length > 0 
            ? databases.listDocuments(DATABASE_ID, PRODUCTS_ID, [Query.equal('$id', productIds)]) 
            : { documents: [] },
          (buyerIds.length > 0 || sellerIds.length > 0)
            ? databases.listDocuments(DATABASE_ID, PROFILES_ID, [Query.equal('user_id', [...buyerIds, ...sellerIds])])
            : { documents: [] }
        ]);

        const productsMap = new Map();
        productsRes.documents.forEach(doc => productsMap.set(doc.$id, mapDoc(doc)));

        const profilesMap = new Map();
        profilesRes.documents.forEach(doc => profilesMap.set(doc.user_id, mapDoc(doc)));

        fetchedTxs.forEach(tx => {
          tx.product = productsMap.get(tx.product_id);
          tx.buyer = profilesMap.get(tx.buyer_id);
          // Attach seller info if needed
          const seller = profilesMap.get(tx.seller_id);
          if (tx.product && seller) {
            tx.product.seller = seller;
          }
        });

        setTransactions(fetchedTxs);
      } catch (error) {
        console.error('Error fetching admin tx:', error);
      }
      setLoading(false);
    };

    if (isAdminAuth) {
      fetchAllTxs();
    }
  }, [isAdminAuth]);

  const handleConfirmPayment = async (tx: Transaction) => {
    if (!confirm('Konfirmasi pembayaran untuk transaksi ini?')) return;
    setActionLoading(tx.id);
    try {
      await databases.updateDocument(DATABASE_ID, TRANSACTIONS_ID, tx.id, { status: 'paid' });
      await databases.updateDocument(DATABASE_ID, PRODUCTS_ID, tx.product_id, { is_sold: true });
      
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'paid' } : t));
    } catch (e: any) {
      alert('Gagal mengkonfirmasi pembayaran: ' + e.message);
    }
    setActionLoading(null);
  };

  const handleConfirmCompleted = async (tx: Transaction) => {
    if (!confirm('Konfirmasi transaksi selesai?')) return;
    setActionLoading(tx.id);
    try {
      await databases.updateDocument(DATABASE_ID, TRANSACTIONS_ID, tx.id, { status: 'completed' });
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'completed' } : t));
    } catch (e: any) {
      alert('Gagal mengkonfirmasi selesai: ' + e.message);
    }
    setActionLoading(null);
  };

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
              <input 
                type="password" 
                className="form-input" 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
                placeholder="********"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 16 }}>Masuk</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', padding: '24px 16px', background: 'var(--bg-base)' }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(99,102,241,0.08))',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--bg-card)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--emerald-500)'
          }}>
            <Shield size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Admin Dashboard</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Konfirmasi manual pembayaran dan penyelesaian transaksi.
            </p>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleAdminLogout}>Logout</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <p style={{ fontWeight: 600 }}>Belum ada transaksi</p>
          </div>
        ) : (
          transactions.map(tx => {
            const product = tx.product as Product;
            const buyer = tx.buyer as Profile;
            const seller = product?.seller as Profile;
            
            return (
              <div key={tx.id} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '0.95rem', fontWeight: 700 }}>{product?.title || 'Produk Dihapus'}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      ID Transaksi: #{tx.id.slice(0,8).toUpperCase()}
                    </p>
                  </div>
                  <span className={`badge ${
                    tx.status === 'completed' ? 'badge-emerald' : 
                    tx.status === 'paid' ? 'badge-indigo' : 'badge-amber'
                  }`}>
                    {STATUS_LABEL[tx.status]}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Pembeli:</span> <strong>{buyer?.full_name || 'Unknown'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Penjual:</span> <strong>{seller?.full_name || 'Unknown'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Total:</span> <strong>{formatPrice(tx.amount)}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {tx.status === 'pending' && (
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={() => handleConfirmPayment(tx)}
                      disabled={actionLoading === tx.id}
                      style={{ flex: 1 }}
                    >
                      {actionLoading === tx.id ? <span className="spinner" /> : <><CheckCircle size={14}/> Konfirmasi Pembayaran</>}
                    </button>
                  )}
                  {tx.status === 'paid' && (
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={() => handleConfirmCompleted(tx)}
                      disabled={actionLoading === tx.id}
                      style={{ flex: 1, background: 'var(--emerald-500)' }}
                    >
                      {actionLoading === tx.id ? <span className="spinner" /> : <><Package size={14}/> Konfirmasi Selesai</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
