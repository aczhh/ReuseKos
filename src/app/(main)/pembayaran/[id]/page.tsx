'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Package, Truck } from 'lucide-react';
import { supabase, Transaction } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

function formatPrice(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:     { label: 'Menunggu Pembayaran', color: 'var(--amber-400)', icon: <Clock size={20} /> },
  paid:        { label: 'Sudah Dibayar', color: 'var(--indigo-400)', icon: <Package size={20} /> },
  in_delivery: { label: 'Dalam Pengiriman', color: 'var(--indigo-400)', icon: <Truck size={20} /> },
  completed:   { label: 'Selesai ✅', color: 'var(--emerald-400)', icon: <CheckCircle2 size={20} /> },
  cancelled:   { label: 'Dibatalkan', color: 'var(--terra-500)', icon: <Clock size={20} /> },
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
      const { data } = await supabase
        .from('transactions')
        .select('*, product:products(*), buyer:profiles!transactions_buyer_id_fkey(*)')
        .eq('id', id)
        .single();
      setTx(data as Transaction);
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handleSimulatePay = async () => {
    if (!tx) return;
    setConfirming(true);
    await supabase.from('transactions').update({ status: 'paid' }).eq('id', tx.id);
    await supabase.from('products').update({ is_sold: true }).eq('id', tx.product_id);
    setTx(prev => prev ? { ...prev, status: 'paid' } : prev);
    setConfirming(false);
  };

  const handleConfirmReceived = async () => {
    if (!tx) return;
    setConfirming(true);
    // Split saldo ke seller
    const { data: seller } = await supabase
      .from('profiles')
      .select('saldo')
      .eq('user_id', (tx.product as any).seller_id)
      .single();

    if (seller) {
      await supabase
        .from('profiles')
        .update({ saldo: (seller.saldo || 0) + tx.seller_cut })
        .eq('user_id', (tx.product as any).seller_id);
    }

    await supabase.from('transactions').update({ status: 'completed' }).eq('id', tx.id);
    setTx(prev => prev ? { ...prev, status: 'completed' } : prev);
    setConfirming(false);
  };

  if (loading || !tx) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    );
  }

  const status = STATUS_MAP[tx.status] || STATUS_MAP.pending;
  const product = tx.product as any;

  return (
    <div style={{ minHeight: '100dvh', padding: '24px 16px', paddingTop: 'calc(var(--navbar-height) + 16px)' }}>
      {/* Status card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '32px 24px',
        textAlign: 'center',
        marginBottom: 20,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: `rgba(${tx.status === 'completed' ? '16,185,129' : '99,102,241'}, 0.15)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          color: status.color,
        }}>
          {status.icon}
        </div>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 4 }}>
          {status.label}
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          ID Transaksi: #{tx.id.slice(0, 8).toUpperCase()}
        </p>
      </div>

      {/* Product info */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '14px', marginBottom: 16,
        display: 'flex', gap: 12, alignItems: 'center'
      }}>
        <div style={{ fontSize: '2rem' }}>🛋️</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{product?.title}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Metode: {tx.delivery_method === 'pickup' ? '🚶 Ambil Sendiri' : '🚛 Jasa Angkut'}
          </p>
        </div>
        <p style={{
          fontWeight: 800, fontSize: '1rem',
          background: 'var(--gradient-brand)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          {formatPrice(tx.total_amount)}
        </p>
      </div>

      {/* MOCK payment - Simulasi */}
      {tx.status === 'pending' && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(193,68,14,0.08))',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          marginBottom: 16,
          textAlign: 'center'
        }}>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>💳 Simulasi Pembayaran</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            (MVP) Tap tombol di bawah untuk mensimulasikan pembayaran sukses
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
            {['QRIS', 'BCA', 'Mandiri', 'OVO'].map(m => (
              <div key={m} style={{
                padding: '6px 12px', background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)', fontSize: '0.75rem',
                fontWeight: 600, border: '1px solid var(--border)'
              }}>{m}</div>
            ))}
          </div>
          <button
            id="btn-simulate-pay"
            className="btn btn-primary btn-full"
            onClick={handleSimulatePay}
            disabled={confirming}
          >
            {confirming ? <span className="spinner" /> : '✅ Simulasikan Pembayaran'}
          </button>
        </div>
      )}

      {/* Confirm received */}
      {tx.status === 'paid' && (
        <div style={{
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          marginBottom: 16,
          textAlign: 'center'
        }}>
          <p style={{ fontWeight: 700, marginBottom: 8, color: 'var(--emerald-400)' }}>
            📦 Barang Sudah Diterima?
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Tap tombol ini setelah barang tiba. Dana akan otomatis diteruskan ke penjual.
          </p>
          <button
            id="btn-confirm-received"
            className="btn btn-full"
            style={{ background: 'var(--emerald-500)', color: 'white' }}
            onClick={handleConfirmReceived}
            disabled={confirming}
          >
            {confirming ? <span className="spinner" /> : '✅ Pesanan Diterima — Cairkan Dana'}
          </button>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8 }}>
            Penjual mendapat {formatPrice(tx.seller_cut)} • Kas admin {formatPrice(tx.admin_cut)}
          </p>
        </div>
      )}

      {tx.status === 'completed' && (
        <div className="alert alert-success">
          <CheckCircle2 size={16} /> Dana sebesar {formatPrice(tx.seller_cut)} telah dikirim ke penjual. Transaksi selesai!
        </div>
      )}

      <button className="btn btn-ghost btn-full" onClick={() => router.push('/beranda')}>
        Kembali ke Beranda
      </button>
    </div>
  );
}
