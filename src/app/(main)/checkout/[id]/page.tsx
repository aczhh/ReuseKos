'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Users, Truck, Shield, QrCode, Building2, Wallet, Package } from 'lucide-react';
import { supabase, Product } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { calculateOngkir, haversineDistance, SPLIT_RATIO } from '@/lib/utils';
import styles from './checkout.module.css';

function formatPrice(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

const PAYMENT_METHODS = [
  { id: 'qris', label: 'QRIS', icon: QrCode },
  { id: 'transfer', label: 'Transfer Bank', icon: Building2 },
  { id: 'ewallet', label: 'E-Wallet', icon: Wallet },
  { id: 'cod', label: 'Bayar COD', icon: Package },
];

const PICKUP_METHODS = [
  {
    id: 'pickup',
    label: 'Ambil langsung',
    desc: 'Temui penjual di lokasi yang ditentukan.',
    icon: '🚶',
  },
  {
    id: 'campus',
    label: 'Bertemu di kampus',
    desc: 'Gedung Bersama Lt. 1, Universitas Brawijaya.',
    icon: '🎓',
  },
  {
    id: 'deliver',
    label: 'Titip pos satpam',
    desc: 'Barang dititipkan di pos satpam fakultas terdekat.',
    icon: '👮',
  },
];

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const [paymentMethod, setPaymentMethod] = useState('qris');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [distanceKm, setDistanceKm] = useState(1.5);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      const { data } = await supabase
        .from('products')
        .select('*, seller:profiles!products_seller_id_fkey(*)')
        .eq('id', id)
        .single();
      setProduct(data as Product);
      setLoading(false);
    };
    fetchProduct();

    navigator.geolocation?.getCurrentPosition(pos => {
      // Estimate 1.5km by default
      setDistanceKm(1.5);
    });
  }, [id]);

  if (loading || !product) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', paddingTop: 'var(--navbar-height)' }}>
        <span className="spinner" style={{ width: 32, height: 32, borderTopColor: 'var(--green-700)' }} />
      </div>
    );
  }

  const isDelivery = deliveryMethod === 'deliver';
  const ongkir = isDelivery ? calculateOngkir(distanceKm) : 0;
  const adminFee = 2000;
  const subtotal = product.price;
  const total = subtotal + adminFee + ongkir;

  const handleBayar = async () => {
    if (!user || !profile) { router.push('/login'); return; }
    if (!agreeTerms) { setError('Setujui syarat dan ketentuan terlebih dahulu'); return; }
    setSubmitting(true);
    setError('');

    const sellerCut = Math.floor(product.price * SPLIT_RATIO.seller);
    const driverCut = isDelivery ? Math.floor(ongkir * SPLIT_RATIO.driver) : 0;
    const adminCut = total - sellerCut - (isDelivery ? ongkir : 0);

    const { data, error: txErr } = await supabase.from('transactions').insert({
      buyer_id: user.id,
      product_id: product.id,
      delivery_method: isDelivery ? 'deliver' : 'pickup',
      distance_km: distanceKm,
      ongkir,
      total_amount: total,
      seller_cut: sellerCut,
      driver_cut: driverCut,
      admin_cut: adminCut,
      status: 'pending',
    }).select().single();

    if (txErr) { setError(txErr.message); setSubmitting(false); return; }
    router.push(`/pembayaran/${data.id}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className={styles.pageTitle}>Pembayaran</h1>
            <p className={styles.pageSubtitle}>Selesaikan transaksi dengan aman.</p>
          </div>
        </div>

        <div className={styles.layout}>
          {/* LEFT - Forms */}
          <div className={styles.formCol}>
            {error && <div className="alert alert-error">{error}</div>}

            {/* Buyer Info */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}><Users size={18} /> Informasi Pembeli</h2>
              <div className={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Nama Lengkap</label>
                  <input className="form-input" value={profile?.full_name || ''} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Kampus</label>
                  <div className={styles.emailInputWrapper}>
                    <input className="form-input" value={profile?.email || ''} readOnly />
                    <span className={styles.emailVerified}>✓</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Universitas</label>
                  <input className="form-input" value={profile?.jurusan || 'Universitas Brawijaya'} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">No Telepon</label>
                  <input
                    className="form-input"
                    placeholder="08xxxxxxxxxx"
                    defaultValue={profile?.whatsapp || ''}
                  />
                </div>
              </div>
            </div>

            {/* Pickup Method */}
            <div className={styles.card}>
              <div className={styles.cardTitleRow}>
                <h2 className={styles.cardTitle}><Truck size={18} /> Metode Pengambilan Barang</h2>
                <span className={styles.distanceBadge}>📍 {distanceKm} km</span>
              </div>

              <div className={styles.pickupOptions}>
                {PICKUP_METHODS.map(m => (
                  <div
                    key={m.id}
                    id={`method-${m.id}`}
                    className={`${styles.pickupOption} ${deliveryMethod === m.id ? styles.pickupOptionActive : ''}`}
                    onClick={() => setDeliveryMethod(m.id)}
                  >
                    <div className={`${styles.radio} ${deliveryMethod === m.id ? styles.radioActive : ''}`}>
                      {deliveryMethod === m.id && <div className={styles.radioDot} />}
                    </div>
                    <div className={styles.pickupContent}>
                      <p className={styles.pickupLabel}>{m.label}</p>
                      <p className={styles.pickupDesc}>{m.desc}</p>
                    </div>
                    <span className={styles.pickupIcon}>{m.icon}</span>
                  </div>
                ))}
              </div>

              {/* Seller location info */}
              <div className={styles.sellerLocInfo}>
                <span>ℹ️</span>
                <p>
                  <strong>Lokasi Penjual:</strong> 📍 {product.address || 'Universitas Brawijaya, Malang'}.
                  Hubungi penjual setelah pembayaran dikonfirmasi untuk koordinasi lebih lanjut.
                </p>
              </div>
            </div>

            {/* Payment Method */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}><Shield size={18} /> Metode Pembayaran</h2>
              <div className={styles.paymentGrid}>
                {PAYMENT_METHODS.map(m => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      id={`payment-${m.id}`}
                      className={`${styles.paymentCard} ${paymentMethod === m.id ? styles.paymentCardActive : ''}`}
                      onClick={() => setPaymentMethod(m.id)}
                    >
                      <Icon size={22} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT - Order Summary */}
          <div className={styles.summaryCol}>
            <div className={styles.summaryCard}>
              <h2 className={styles.summaryTitle}>Item Pesanan</h2>

              {/* Product */}
              <div className={styles.orderItem}>
                <div className={styles.orderItemImg}>
                  {product.photos?.[0]
                    ? <img src={product.photos[0]} alt={product.title} />
                    : <span>🛋️</span>}
                </div>
                <div className={styles.orderItemInfo}>
                  <p className={styles.orderItemName}>{product.title}</p>
                  <p className={styles.orderItemPrice}>{formatPrice(product.price)}</p>
                </div>
              </div>

              <div className={styles.summaryDivider} />

              <h2 className={styles.summaryTitle}>Ringkasan Pesanan</h2>

              <div className={styles.summaryRows}>
                <div className={styles.summaryRow}>
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Biaya admin</span>
                  <span>{formatPrice(adminFee)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Biaya Layanan</span>
                  <span className={styles.freeLabel}>GRATIS</span>
                </div>
              </div>

              <div className={styles.summaryDivider} />

              <div className={styles.totalRow}>
                <span>Total Pembayaran</span>
                <span className={styles.totalValue}>{formatPrice(total)}</span>
              </div>

              {/* Terms */}
              <label className={styles.termsLabel}>
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  style={{ width: 16, height: 16, flexShrink: 0 }}
                />
                <span className={styles.termsText}>
                  Saya setuju dengan <span className={styles.termsLink}>syarat dan ketentuan</span> serta kebijakan privasi ReuseKos.
                </span>
              </label>

              <button
                id="btn-bayar"
                className={`btn btn-full ${styles.payBtn} ${agreeTerms ? styles.payBtnActive : ''}`}
                onClick={handleBayar}
                disabled={submitting || !agreeTerms}
              >
                {submitting ? <span className="spinner" /> : 'Bayar Sekarang'}
              </button>

              <button className={`btn btn-secondary btn-full`} onClick={() => router.back()}>
                Kembali ke Keranjang
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
