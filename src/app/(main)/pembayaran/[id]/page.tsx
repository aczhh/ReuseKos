'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Package, Truck, QrCode, Navigation, GraduationCap, Building, CameraOff, XCircle } from 'lucide-react';
import { databases, DATABASE_ID, TRANSACTIONS_ID, PRODUCTS_ID, PROFILES_ID, mapDoc, Transaction, Product } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { SPLIT_RATIO } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import styles from './pembayaran.module.css';

function formatPrice(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:     { label: 'Menunggu Pembayaran', color: '#818cf8', bg: 'rgba(99,102,241,0.12)', icon: <Clock size={28} /> },
  paid:        { label: 'Sudah Dibayar',       color: '#818cf8', bg: 'rgba(99,102,241,0.12)', icon: <Package size={28} /> },
  in_delivery: { label: 'Dalam Pengiriman',    color: '#818cf8', bg: 'rgba(99,102,241,0.12)', icon: <Truck size={28} /> },
  completed:   { label: 'Selesai ✅',           color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: <CheckCircle2 size={28} /> },
  cancelled:   { label: 'Dibatalkan',           color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: <Clock size={28} /> },
};

export default function PembayaranPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const txDoc = await databases.getDocument(DATABASE_ID, TRANSACTIONS_ID, id);
        const fetchedTx = mapDoc<Transaction>(txDoc);

        const prodDoc = await databases.getDocument(DATABASE_ID, PRODUCTS_ID, fetchedTx.product_id);
        fetchedTx.product = mapDoc<Product>(prodDoc);

        setTx(fetchedTx);
      } catch (error) {
        console.error(error);
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handlePayMidtrans = async () => {
    // This function is no longer used, kept empty or removed.
    // Payment is now manual via QRIS.
  };

  const handleConfirmReceived = async () => {
    if (!tx || !tx.product) return;
    setConfirming(true);

    const sellerCut = Math.floor(tx.product.price * SPLIT_RATIO.seller);

    const sellerResponse = await databases.listDocuments(
      DATABASE_ID,
      PROFILES_ID,
      [Query.equal('user_id', tx.seller_id)]
    );

    if (sellerResponse.documents.length > 0) {
      const sellerProfile = sellerResponse.documents[0];
      await databases.updateDocument(DATABASE_ID, PROFILES_ID, sellerProfile.$id, {
        saldo: (sellerProfile.saldo || 0) + sellerCut
      });
    }

    await databases.updateDocument(DATABASE_ID, TRANSACTIONS_ID, tx.id, { status: 'completed' });
    setTx(prev => prev ? { ...prev, status: 'completed' } : prev);
    setConfirming(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
      </div>
    );
  }

  if (!tx) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', gap: 16, padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <h2 style={{ fontWeight: 700, fontSize: '1.2rem' }}>Transaksi Tidak Ditemukan</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 400 }}>
          Transaksi ini tidak ditemukan atau sudah tidak valid.
        </p>
        <button className="btn btn-primary" onClick={() => router.push('/beranda')}>
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  const status = STATUS_MAP[tx.status] || STATUS_MAP.pending;
  const product = tx.product as any;
  const sellerCut = Math.floor((product?.price || 0) * SPLIT_RATIO.seller);
  const adminCut = tx.amount - sellerCut;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        {/* ===== STATUS CARD ===== */}
        <div className={styles.statusCard}>
          <div
            className={styles.statusIconWrap}
            style={{ background: status.bg, color: status.color }}
          >
            {status.icon}
          </div>
          <h1 className={styles.statusTitle} style={{ color: status.color }}>
            {status.label}
          </h1>
          <span className={styles.statusTxId}>
            ID Transaksi: #{tx.id.slice(0, 8).toUpperCase()}
          </span>
        </div>

        {/* ===== PRODUCT CARD ===== */}
        <div className={styles.productCard}>
          <div className={styles.productImgWrap}>
            {product?.photos?.[0]
              ? <img src={product.photos[0]} alt={product.title} />
              : <Package size={24} style={{ color: 'var(--text-muted)' }} />}
          </div>
          <div className={styles.productInfo}>
            <p className={styles.productTitle}>{product?.title}</p>
            <p className={styles.productMeta}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {tx.delivery_method === 'pickup' ? <><Navigation size={12}/> Ambil Langsung</> : 
                 tx.delivery_method === 'campus' ? <><GraduationCap size={12}/> Bertemu di Kampus</> : 
                 <><Building size={12}/> Titip Pos Satpam</>}
              </span>
            </p>
          </div>
          <p className={styles.productPrice}>{formatPrice(tx.amount)}</p>
        </div>

        {/* ===== PEMBAYARAN MANUAL QRIS (status: pending) ===== */}
        {tx.status === 'pending' && (
          <div className={`${styles.actionCard} ${styles.pending}`}>
            <p className={styles.actionCardTitle}>Pembayaran</p>
            <p className={styles.actionCardDesc}>
              Silakan lakukan pembayaran sebesar <strong>{formatPrice(tx.amount)}</strong>
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '20px 0', gap: 12 }}>
              <div style={{ width: 200, height: 200, background: 'white', borderRadius: 12, padding: 12, border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img 
                  src="/qris-admin.png" 
                  alt="QRIS Admin" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={(e) => {
                    // Fallback jika gambar qris-admin.png belum ada
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      target.parentElement.innerHTML = '<div style="text-align:center; color: var(--text-muted);"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><line x1="2" y1="2" x2="22" y2="22"/></svg><br/>Gambar QRIS (qris-admin.png) belum diupload ke folder public.</div>';
                    }
                  }}
                />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Atas Nama: Admin ReuseKos<br/>
                *(Ganti file <code>public/qris-admin.png</code> dengan QRIS aslimu)*
              </p>
            </div>

            <div style={{ padding: '12px', background: 'var(--blue-50)', border: '1px solid var(--blue-200)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--blue-800)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Clock size={16} /> Menunggu Konfirmasi...
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--blue-600)', marginTop: 4 }}>
                Mohon tunggu sebentar. Jangan lupa simpan bukti transfer!
              </p>
            </div>
            
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', marginTop: 12, color: 'var(--text-muted)' }}
              onClick={() => window.location.reload()}
            >
              Refresh Halaman
            </button>
          </div>
        )}

        {/* ===== KONFIRMASI TERIMA BARANG (status: paid) ===== */}
        {tx.status === 'paid' && (
          <div className={`${styles.actionCard} ${styles.paid}`}>
            <p className={styles.actionCardTitle} style={{ color: '#059669' }}>
              📦 Barang Sudah Diterima?
            </p>
            <p className={styles.actionCardDesc}>
              Tap tombol ini setelah barang tiba di tanganmu. Dana akan otomatis diteruskan ke penjual.
            </p>
            <button
              id="btn-confirm-received"
              className={`${styles.actionBtn} ${styles.actionBtnSuccess}`}
              onClick={handleConfirmReceived}
              disabled={confirming}
            >
              {confirming ? <span className="spinner" /> : '✅ Pesanan Diterima — Cairkan Dana'}
            </button>
            <p className={styles.splitInfo}>
              Penjual mendapat {formatPrice(sellerCut)} &bull; Kas admin {formatPrice(adminCut)}
            </p>
          </div>
        )}

        {/* ===== TRANSAKSI SELESAI (status: completed) ===== */}
        {tx.status === 'completed' && (
          <div className={styles.successAlert}>
            <CheckCircle2 size={20} className={styles.successAlertIcon} />
            <p>
              Dana sebesar <strong>{formatPrice(sellerCut)}</strong> telah dikirim ke penjual. Transaksi selesai!
            </p>
          </div>
        )}

        {/* ===== TOMBOL KEMBALI ===== */}
        <button className={styles.backBtn} onClick={() => router.push('/beranda')}>
          ← Kembali ke Beranda
        </button>
      </div>
    </div>
  );
}
