'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Users, Truck, Shield, QrCode, Package, MapPin, Navigation, GraduationCap, Building, AlertCircle, Info } from 'lucide-react';
import { databases, DATABASE_ID, PRODUCTS_ID, PROFILES_ID, TRANSACTIONS_ID, mapDoc, Product } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { useAuth } from '@/lib/AuthContext';
import { calculateOngkir, haversineDistance, SPLIT_RATIO } from '@/lib/utils';
import styles from './checkout.module.css';

function formatPrice(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

const PAYMENT_METHODS = [
  { id: 'qris', label: 'QRIS', icon: QrCode },
  { id: 'cod', label: 'Bayar COD', icon: Package },
];

const PICKUP_METHODS = [
  {
    id: 'pickup',
    label: 'Ambil langsung',
    desc: 'Temui penjual di lokasi yang ditentukan.',
    icon: Navigation,
  },
  {
    id: 'campus',
    label: 'Bertemu di kampus',
    desc: 'Gedung Bersama Lt. 1, Universitas Brawijaya.',
    icon: GraduationCap,
  },
  {
    id: 'security',
    label: 'Titip pos satpam',
    desc: 'Barang dititipkan di pos satpam fakultas terdekat.',
    icon: Building,
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
      try {
        const doc = await databases.getDocument(DATABASE_ID, PRODUCTS_ID, id);
        const fetchedProduct = mapDoc<Product>(doc);

        // Cek apakah produk masih tersedia
        if (fetchedProduct.is_sold) {
          setError('Produk ini sudah terjual. Silakan pilih barang lain.');
          setLoading(false);
          return;
        }
        
        // Fetch seller profile
        const sellerResponse = await databases.listDocuments(
          DATABASE_ID,
          PROFILES_ID,
          [Query.equal('user_id', fetchedProduct.seller_id)]
        );
        if (sellerResponse.documents.length > 0) {
          fetchedProduct.seller = mapDoc(sellerResponse.documents[0]);
        }
        
        setProduct(fetchedProduct);
      } catch (err: any) {
        // Produk tidak ditemukan (sudah dihapus penjual)
        if (err?.code === 404 || err?.message?.includes('not found')) {
          setError('Produk ini sudah tidak tersedia. Mungkin sudah dihapus oleh penjual.');
        } else {
          setError('Gagal memuat produk. Silakan coba lagi.');
        }
        console.error(err);
      }
      setLoading(false);
    };
    fetchProduct();

    navigator.geolocation?.getCurrentPosition(pos => {
      // Estimate 1.5km by default
      setDistanceKm(1.5);
    });
  }, [id]);

  // Jika produk tidak ditemukan, tampilkan error bukan loading spinner
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', paddingTop: 'var(--navbar-height)' }}>
        <span className="spinner" style={{ width: 32, height: 32, borderTopColor: 'var(--green-700)' }} />
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', paddingTop: 'var(--navbar-height)', gap: 16, padding: '24px', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: 'var(--red-500)' }} />
        <h2 style={{ fontWeight: 700, fontSize: '1.2rem' }}>Produk Tidak Tersedia</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 400 }}>
          {error || 'Produk ini sudah tidak tersedia atau telah dihapus oleh penjual.'}
        </p>
        <button
          className="btn btn-primary"
          onClick={() => router.push('/keranjang')}
        >
          Kembali ke Keranjang
        </button>
      </div>
    );
  }

  const isDelivery = false; // Semua metode saat ini adalah self-pickup, tidak ada ongkir
  const ongkir = isDelivery ? calculateOngkir(distanceKm) : 0;
  const adminFee = 2000;
  const subtotal = product.price;
  const total = subtotal + adminFee + ongkir;

  const handleBayar = async () => {
    if (!user || !profile) { router.push('/login'); return; }
    if (!agreeTerms) { setError('Setujui syarat dan ketentuan terlebih dahulu'); return; }
    setSubmitting(true);
    setError('');

    // Validasi ulang: pastikan produk masih tersedia sebelum membuat transaksi
    try {
      const doc = await databases.getDocument(DATABASE_ID, PRODUCTS_ID, product.id);
      const freshProduct = mapDoc<Product>(doc);
      if (freshProduct.is_sold) {
        setError('Maaf, produk ini baru saja terjual. Silakan pilih barang lain.');
        setSubmitting(false);
        return;
      }
    } catch {
      setError('Produk tidak ditemukan. Mungkin sudah dihapus oleh penjual.');
      setSubmitting(false);
      return;
    }

    const sellerCut = Math.floor(product.price * SPLIT_RATIO.seller);
    const driverCut = isDelivery ? Math.floor(ongkir * SPLIT_RATIO.driver) : 0;
    const adminCut = total - sellerCut - (isDelivery ? ongkir : 0);

    try {
      // Buat transaksi — delivery_method dikirim kalau ada di schema Appwrite
      const txData: Record<string, any> = {
        buyer_id: user.$id,
        product_id: product.id,
        seller_id: product.seller_id,
        status: 'pending',
        amount: total,
      };

      // Coba sertakan delivery_method; Appwrite akan tolak kalau atributnya belum ada
      let tx: any;
      try {
        tx = await databases.createDocument(DATABASE_ID, TRANSACTIONS_ID, ID.unique(), {
          ...txData,
          delivery_method: deliveryMethod,
        });
      } catch (e: any) {
        // Kalau Appwrite belum punya atribut delivery_method, simpan tanpa field itu
        if (e?.message?.includes('delivery_method')) {
          tx = await databases.createDocument(DATABASE_ID, TRANSACTIONS_ID, ID.unique(), txData);
        } else {
          throw e;
        }
      }

      // Langsung ubah status produk menjadi terjual (is_sold: true) agar tidak bisa dibeli orang lain
      // Jika pembeli batal bayar, admin bisa membatalkan transaksi nanti.
      await databases.updateDocument(DATABASE_ID, PRODUCTS_ID, product.id, { is_sold: true });

      router.push(`/pembayaran/${tx.$id}`);
    } catch (txErr: any) {
      setError(txErr.message);
      setSubmitting(false);
    }
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
                <span className={styles.distanceBadge}><MapPin size={14} /> {distanceKm} km</span>
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
                    <span className={styles.pickupIcon}><m.icon size={20} /></span>
                  </div>
                ))}
              </div>

              {/* Seller location info */}
              <div className={styles.sellerLocInfo}>
                <Info size={20} style={{ color: 'var(--blue-600)' }} />
                <p>
                  <strong>Lokasi Penjual:</strong> <MapPin size={14} style={{ display: 'inline', margin: '0 2px', verticalAlign: 'text-bottom' }} /> {product.address || 'Universitas Brawijaya, Malang'}.
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
                    : <Package size={24} style={{ color: 'var(--text-muted)' }} />}
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
