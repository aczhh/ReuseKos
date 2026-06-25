'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronRight, MapPin, Shield } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { databases, DATABASE_ID, PRODUCTS_ID, PROFILES_ID, mapDoc, Product } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useAuth } from '@/lib/AuthContext';
import { PRODUCT_CATEGORIES } from '@/lib/utils';
import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import styles from './beranda.module.css';

const QUICK_CATS = [
  { label: 'Meja', icon: '🪑', cat: 'Meja & Kursi' },
  { label: 'Kursi', icon: '🪑', cat: 'Meja & Kursi' },
  { label: 'Rice Cooker', icon: '🍚', cat: 'Peralatan Masak' },
  { label: 'Dispenser', icon: '💧', cat: 'Kipas & AC Portable' },
  { label: 'Lainnya', icon: '📦', cat: 'Lainnya' },
];

export default function BerandaPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
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
            <div className={styles.heroActions}>
              <Link href="/cari" className={`btn btn-secondary ${styles.heroBtnOutline}`}>
                Mulai Belanja
              </Link>
              <Link href="/jual" className={`btn btn-orange ${styles.heroBtnOrange}`}>
                Jual Barang
              </Link>
            </div>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.heroMockup}>
              <div className={styles.heroMockupInner}>
                <div className={styles.heroMockupHeader}>
                  <div className={styles.heroMockupDots}>
                    <span /><span /><span />
                  </div>
                  <span className={styles.heroMockupTitle}>ReuseKos</span>
                </div>
                <div className={styles.heroMockupBody}>
                  <div className={styles.heroProductPreview}>
                    <div className={styles.heroProductImg}>🪑</div>
                    <div className={styles.heroProductInfo}>
                      <div className={styles.heroProductName}>Meja Belajar Kayu Jati</div>
                      <div className={styles.heroProductPrice}>Rp 250.000</div>
                    </div>
                  </div>
                  <div className={styles.heroProductPreview}>
                    <div className={styles.heroProductImg}>🍚</div>
                    <div className={styles.heroProductInfo}>
                      <div className={styles.heroProductName}>Rice Cooker Philips 2L</div>
                      <div className={styles.heroProductPrice}>Rp 350.000</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.verifiedBadge}>
                <span className={styles.verifiedIcon}>✓</span>
                <div>
                  <div className={styles.verifiedTitle}>Verified Student</div>
                  <div className={styles.verifiedSub}>UB Malang</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== LOCATION + SEARCH BAR ===== */}
      <section className={styles.locationBar}>
        <div className={styles.locationBarInner}>
          <div className={styles.locationInfo}>
            <MapPin size={16} className={styles.locationIcon} />
            <span>Menampilkan barang di sekitar <strong>Universitas Brawijaya, Malang</strong></span>
          </div>
          <form className={styles.miniSearch} onSubmit={handleSearch}>
            <Search size={14} className={styles.miniSearchIcon} />
            <input
              type="search"
              className={styles.miniSearchInput}
              placeholder="Cari meja, kursi, atau alat masak..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </form>
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

      {/* ===== STATS BANNER ===== */}
      <section className={styles.statsBanner}>
        <div className={styles.sectionInner}>
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <div className={styles.statIconWrap} style={{ background: 'rgba(45,90,64,0.12)' }}>
                <span>♻️</span>
              </div>
              <div>
                <div className={styles.statValue}>120kg</div>
                <div className={styles.statLabel}>Sampah Terkurangi</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statIconWrap} style={{ background: 'rgba(249,115,22,0.12)' }}>
                <span>👥</span>
              </div>
              <div>
                <div className={styles.statValue}>450+</div>
                <div className={styles.statLabel}>Mahasiswa Aktif</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statIconWrap} style={{ background: 'rgba(16,185,129,0.12)' }}>
                <span>💰</span>
              </div>
              <div>
                <div className={styles.statValue}>Rp 12jt+</div>
                <div className={styles.statLabel}>Total Budget Dihemat</div>
              </div>
            </div>
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
                    <div className="empty-state-icon">🔍</div>
                    <p style={{ fontWeight: 600 }}>Belum ada barang</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Jadilah yang pertama berjualan!
                    </p>
                    <Link href="/jual" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
                      + Jual Sekarang
                    </Link>
                  </div>
                )
            }
          </div>
        </div>
      </section>

      {/* ===== VERIFICATION CTA ===== */}
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
    </div>
  );
}
