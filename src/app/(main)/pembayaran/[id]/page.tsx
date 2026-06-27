'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Package, Truck } from 'lucide-react';
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

  const handleSimulatePay = async () => {
    if (!tx) return;
    setConfirming(true);
    await databases.updateDocument(DATABASE_ID, TRANSACTIONS_ID, tx.id, { status: 'paid' });
    await databases.updateDocument(DATABASE_ID, PRODUCTS_ID, tx.product_id, { is_sold: true });
    setTx(prev => prev ? { ...prev, status: 'paid' } : prev);
    setConfirming(false);
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

  if (loading || !tx) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
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
              : <span>🛋️</span>}
          </div>
          <div className={styles.productInfo}>
            <p className={styles.productTitle}>{product?.title}</p>
            <p className={styles.productMeta}>
              {tx.delivery_method === 'pickup' ? '🚶 Ambil Sendiri' : '🚛 Jasa Angkut'}
            </p>
          </div>
          <p className={styles.productPrice}>{formatPrice(tx.amount)}</p>
        </div>

        {/* ===== SIMULASI PEMBAYARAN (status: pending) ===== */}
        {tx.status === 'pending' && (
          <div className={`${styles.actionCard} ${styles.pending}`}>
            <p className={styles.actionCardTitle}>💳 Simulasi Pembayaran</p>
            <p className={styles.actionCardDesc}>
              (MVP) Pilih metode dan tap tombol di bawah untuk mensimulasikan pembayaran sukses.
            </p>
            <div className={styles.paymentChips}>
              {['QRIS', 'BCA', 'Mandiri', 'OVO'].map(m => (
                <div key={m} className={styles.paymentChip}>{m}</div>
              ))}
            </div>
            <button
              id="btn-simulate-pay"
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              onClick={handleSimulatePay}
              disabled={confirming}
            >
              {confirming ? <span className="spinner" /> : '✅ Simulasikan Pembayaran'}
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
