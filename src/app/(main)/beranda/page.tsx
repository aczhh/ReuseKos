'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, MapPin, Shield, Sofa, Package, Coffee, Droplet, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { databases, DATABASE_ID, PRODUCTS_ID, PROFILES_ID, mapDoc, Product } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useAuth } from '@/lib/AuthContext';
import { PRODUCT_CATEGORIES } from '@/lib/utils';
import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import styles from './beranda.module.css';
import { isAdminViewMode } from '@/lib/adminView';

function formatPrice(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

const QUICK_CATS = [
  { label: 'Meja', icon: <Sofa size={18} />, cat: 'Meja & Kursi' },
  { label: 'Kursi', icon: <Sofa size={18} />, cat: 'Meja & Kursi' },
  { label: 'Rice Cooker', icon: <Coffee size={18} />, cat: 'Peralatan Masak' },
  { label: 'Dispenser', icon: <Droplet size={18} />, cat: 'Kipas & AC Portable' },
  { label: 'Lainnya', icon: <Package size={18} />, cat: 'Lainnya' },
];

// Peta domain email kampus → nama universitas
const KAMPUS_MAP: Record<string, string> = {
  'ub.ac.id': 'Universitas Brawijaya, Malang',
  'student.ub.ac.id': 'Universitas Brawijaya, Malang',
  'ui.ac.id': 'Universitas Indonesia, Depok',
  'student.ui.ac.id': 'Universitas Indonesia, Depok',
  'ugm.ac.id': 'Universitas Gadjah Mada, Yogyakarta',
  'mail.ugm.ac.id': 'Universitas Gadjah Mada, Yogyakarta',
  'its.ac.id': 'Institut Teknologi Sepuluh Nopember, Surabaya',
  'student.its.ac.id': 'Institut Teknologi Sepuluh Nopember, Surabaya',
  'itb.ac.id': 'Institut Teknologi Bandung, Bandung',
  'student.itb.ac.id': 'Institut Teknologi Bandung, Bandung',
  'unair.ac.id': 'Universitas Airlangga, Surabaya',
  'student.unair.ac.id': 'Universitas Airlangga, Surabaya',
  'undip.ac.id': 'Universitas Diponegoro, Semarang',
  'live.undip.ac.id': 'Universitas Diponegoro, Semarang',
  'unej.ac.id': 'Universitas Jember, Jember',
  'student.unej.ac.id': 'Universitas Jember, Jember',
  'uin-malang.ac.id': 'UIN Maulana Malik Ibrahim, Malang',
  'student.uin-malang.ac.id': 'UIN Maulana Malik Ibrahim, Malang',
  'umm.ac.id': 'Universitas Muhammadiyah Malang',
  'webmail.umm.ac.id': 'Universitas Muhammadiyah Malang',
};

function getUniversitasFromEmail(email?: string | null): string | null {
  if (!email) return null;
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;
  // Cek exact match dulu
  if (KAMPUS_MAP[domain]) return KAMPUS_MAP[domain];
  // Cek apakah subdomain dari domain yang dikenal
  for (const key of Object.keys(KAMPUS_MAP)) {
    if (domain.endsWith('.' + key) || domain === key) return KAMPUS_MAP[key];
  }
  return null;
}

export default function BerandaPage() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const adminMode = typeof window !== 'undefined' ? isAdminViewMode() : false;

  const handleJualClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      router.push('/login');
    }
  };
  const [products, setProducts] = useState<Product[]>([]);
  const [promotedProducts, setPromotedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch regular products
      const response = await databases.listDocuments(
        DATABASE_ID,
        PRODUCTS_ID,
        [
          Query.equal('is_sold', false),
          Query.orderDesc('$createdAt'),
          Query.limit(8)
        ]
      );

      const fetchedProducts = response.documents.map(doc => mapDoc<Product>(doc));
      
      // Fetch promoted products
      try {
        const promoResponse = await databases.listDocuments(
          DATABASE_ID,
          PRODUCTS_ID,
          [
            Query.equal('is_sold', false),
            Query.equal('is_promoted', true),
            Query.limit(5)
          ]
        );
        const promos = promoResponse.documents
          .map(doc => mapDoc<Product>(doc))
          .filter(p => {
            // Filter expired promos
            if (!p.promoted_until) return true;
            return new Date(p.promoted_until) > new Date();
          });
        setPromotedProducts(promos);
      } catch {
        // is_promoted attribute might not exist yet, silently ignore
        setPromotedProducts([]);
      }

      // Fetch sellers
      const sellerIds = [...new Set(fetchedProducts.map(p => p.seller_id))];
      if (sellerIds.length > 0) {
        const sellersResponse = await databases.listDocuments(
          DATABASE_ID,
          PROFILES_ID,
          [Query.equal('user_id', sellerIds)]
        );
        
        const sellersMap = new Map();
        sellersResponse.documents.forEach(doc => {
          sellersMap.set(doc.user_id, mapDoc(doc));
        });

        fetchedProducts.forEach(p => {
          p.seller = sellersMap.get(p.seller_id);
        });
      }

      setProducts(fetchedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) router.push(`/cari?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className={styles.page}>
      {/* ===== HERO SECTION ===== */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroLeft}>
            <span className={styles.heroBadge}>
              <Shield size={12} /> Marketplace Ramah Lingkungan
            </span>
            <h1 className={styles.heroTitle}>
              Temukan Barang Bekas<br />
              Berkualitas untuk Anak Kos
            </h1>
            <p className={styles.heroDesc}>
              Hemat budget, kurangi limbah. Marketplace khusus
              mahasiswa untuk jual-beli perabotan kos terpercaya.
            </p>
            {/* Sembunyikan tombol Jual Barang kalau admin mode */}
            <div className={styles.heroActions}>
              <Link href="/cari" className={`btn btn-secondary ${styles.heroBtnOutline}`}>
                Mulai Belanja
              </Link>
              {!adminMode && (
                <Link
                  href="/jual"
                  className={`btn btn-orange ${styles.heroBtnOrange}`}
                  onClick={handleJualClick}
                >
                  Jual Barang
                </Link>
              )}
            </div>
          </div>

          {promotedProducts.length > 0 && (
            <div className={styles.heroRight}>
              <div className={styles.heroMockup}>
                <div className={styles.heroMockupInner}>
                  <div className={styles.heroMockupHeader}>
                    <div className={styles.heroMockupDots}>
                      <span /><span /><span />
                    </div>
                    <span className={styles.heroMockupTitle}>⭐ Produk Iklan</span>
                  </div>
                  <div className={styles.heroMockupBody}>
                    {promotedProducts.slice(0, 3).map(p => (
                      <Link
                        key={p.id}
                        href={`/produk/${p.id}`}
                        className={styles.heroProductPreview}
                        style={{ textDecoration: 'none', cursor: 'pointer' }}
                      >
                        <div className={styles.heroProductImg}>
                          {p.photos?.[0]
                            ? <img src={p.photos[0]} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                            : <Package size={24} style={{ color: 'var(--text-muted)' }} />
                          }
                        </div>
                        <div className={styles.heroProductInfo}>
                          <div className={styles.heroProductName}>{p.title}</div>
                          <div className={styles.heroProductPrice}>{formatPrice(p.price)}</div>
                        </div>
                        <span className={styles.heroAdBadge}>Iklan</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== LOCATION BAR ===== */}
      <section className={styles.locationBar}>
        <div className={styles.locationBarInner}>
          <div className={styles.locationInfo}>
            <MapPin size={16} className={styles.locationIcon} />
            {(() => {
              if (adminMode) {
                return <span>Menampilkan barang di <strong>semua kampus (Mode Admin)</strong></span>;
              }
              const univ = getUniversitasFromEmail(profile?.email);
              return univ ? (
                <span>Menampilkan barang di sekitar <strong>{univ}</strong></span>
              ) : (
                <span>Menampilkan barang di sekitar <strong>sekitar kamu</strong></span>
              );
            })()}
          </div>
        </div>
      </section>

      {/* ===== QUICK CATEGORIES ===== */}
      <section className={styles.quickCats}>
        <div className={styles.sectionInner}>
          <div className={styles.catChips}>
            {QUICK_CATS.map(q => (
              <Link
                key={q.label}
                href={`/cari?cat=${encodeURIComponent(q.cat)}`}
                className={styles.catChip}
              >
                <span className={styles.catChipIcon}>{q.icon}</span>
                {q.label}
              </Link>
            ))}
          </div>
        </div>
      </section>



      {/* ===== PRODUCT RECOMMENDATIONS ===== */}
      <section className={styles.productsSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Rekomendasi Untukmu</h2>
            <Link href="/cari" className={styles.seeAll}>
              Lihat Semua <ChevronRight size={16} />
            </Link>
          </div>

          <div className={styles.productGrid}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : products.length > 0
                ? products.map(p => <ProductCard key={p.id} product={p} />)
                : (
                  <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                    <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                      <Search size={48} style={{ color: 'var(--border)' }} />
                    </div>
                    <p style={{ fontWeight: 600 }}>Belum ada barang</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Jadilah yang pertama berjualan!
                    </p>
                    {!adminMode && (
                      <Link
                        href="/jual"
                        className="btn btn-primary btn-sm"
                        style={{ marginTop: 8 }}
                        onClick={handleJualClick}
                      >
                        + Jual Sekarang
                      </Link>
                    )}
                  </div>
                )
            }
          </div>
        </div>
      </section>

      {/* ===== VERIFICATION CTA — hanya tampil saat belum login ===== */}
      {!user && (
        <section className={styles.verifSection}>
          <div className={styles.sectionInner}>
            <div className={styles.verifCard}>
              <div className={styles.verifIcon}>
                <Shield size={28} />
              </div>
              <div className={styles.verifContent}>
                <h3 className={styles.verifTitle}>Verifikasi Email Kampusmu!</h3>
                <p className={styles.verifDesc}>
                  Dapatkan akses eksklusif ke harga khusus mahasiswa dan fitur &quot;Bayar di Tempat&quot; dengan memverifikasi email <strong>.edu</strong> atau <strong>.ac.id</strong> milikmu.
                </p>
                <div className={styles.verifActions}>
                  <Link href="/login" className="btn btn-primary">
                    Verifikasi Sekarang
                  </Link>
                  <button className="btn btn-ghost">
                    Pelajari Lebih Lanjut
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
