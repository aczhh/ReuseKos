'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search as SearchIcon, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { supabase, Product } from '@/lib/supabase';
import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import { PRODUCT_CATEGORIES } from '@/lib/utils';
import styles from './cari.module.css';

const PRICE_FILTERS = [
  { label: '< Rp100rb', max: 100000 },
  { label: '< Rp300rb', max: 300000 },
  { label: '< Rp500rb', max: 500000 },
  { label: '< Rp1jt', max: 1000000 },
];

function CariContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialCat = searchParams.get('cat') || '';

  const [query, setQuery] = useState(initialQ);
  const [activeCategory, setActiveCategory] = useState(initialCat);
  const [activePriceFilter, setActivePriceFilter] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const buildQuery = useCallback(() => {
    let q = supabase
      .from('products')
      .select('*, seller:profiles!products_seller_id_fkey(*)')
      .eq('is_sold', false)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (query.trim()) q = q.ilike('title', `%${query.trim()}%`);
    if (activeCategory) q = q.eq('category', activeCategory);
    const pf = PRICE_FILTERS.find(p => p.label === activePriceFilter);
    if (pf) q = q.lte('price', pf.max);

    return q;
  }, [query, activeCategory, activePriceFilter, page]);

  const doSearch = useCallback(async () => {
    setLoading(true);
    const { data } = await buildQuery();
    if (page === 0) {
      setResults((data as Product[]) || []);
    } else {
      setResults(prev => [...prev, ...((data as Product[]) || [])]);
    }
    setLoading(false);
  }, [buildQuery, page]);

  useEffect(() => {
    const t = setTimeout(doSearch, 300);
    return () => clearTimeout(t);
  }, [doSearch]);

  const clearFilter = (type: 'cat' | 'price') => {
    if (type === 'cat') setActiveCategory('');
    if (type === 'price') setActivePriceFilter('');
    setPage(0);
  };

  const handleLoadMore = () => setPage(p => p + 1);

  // Active filters chips
  const activeFilters = [
    ...(activeCategory ? [{ label: `Kategori: ${activeCategory}`, onRemove: () => clearFilter('cat') }] : []),
    ...(activePriceFilter ? [{ label: `Harga: ${activePriceFilter}`, onRemove: () => clearFilter('price') }] : []),
  ];

  return (
    <div className={styles.page}>
      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterBarInner}>
          <button
            className={`${styles.filterMainBtn} ${showFilterPanel ? styles.filterMainBtnActive : ''}`}
            onClick={() => setShowFilterPanel(!showFilterPanel)}
          >
            <SlidersHorizontal size={15} />
            Semua Filter
          </button>

          {/* Active filter chips */}
          {activeFilters.map(f => (
            <div key={f.label} className={styles.filterChip}>
              {f.label}
              <button onClick={f.onRemove} className={styles.filterChipRemove}>
                <X size={12} />
              </button>
            </div>
          ))}

          {/* Quick category chips */}
          {!activeCategory && PRODUCT_CATEGORIES.slice(0, 4).map(cat => (
            <button
              key={cat}
              className={styles.filterChip}
              onClick={() => { setActiveCategory(cat); setPage(0); }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className={styles.filterPanel}>
          <div className={styles.filterPanelInner}>
            {/* Category */}
            <div className={styles.filterGroup}>
              <h3 className={styles.filterGroupTitle}>Kategori</h3>
              <div className={styles.filterOptions}>
                <button
                  className={`${styles.filterOption} ${!activeCategory ? styles.filterOptionActive : ''}`}
                  onClick={() => { setActiveCategory(''); setPage(0); }}
                >Semua</button>
                {PRODUCT_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className={`${styles.filterOption} ${activeCategory === cat ? styles.filterOptionActive : ''}`}
                    onClick={() => { setActiveCategory(cat); setPage(0); }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className={styles.filterGroup}>
              <h3 className={styles.filterGroupTitle}>Harga</h3>
              <div className={styles.filterOptions}>
                <button
                  className={`${styles.filterOption} ${!activePriceFilter ? styles.filterOptionActive : ''}`}
                  onClick={() => { setActivePriceFilter(''); setPage(0); }}
                >Semua</button>
                {PRICE_FILTERS.map(p => (
                  <button
                    key={p.label}
                    className={`${styles.filterOption} ${activePriceFilter === p.label ? styles.filterOptionActive : ''}`}
                    onClick={() => { setActivePriceFilter(p.label); setPage(0); }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className={styles.results}>
        <div className={styles.resultsInner}>
          {/* Search box (inline for cari page) */}
          <div className={styles.searchBarWrapper}>
            <div className={styles.searchBar}>
              <SearchIcon size={16} className={styles.searchIcon} />
              <input
                id="cari-input"
                type="search"
                className={styles.searchInput}
                placeholder="Kasur, lemari, meja belajar, rice cooker..."
                value={query}
                onChange={e => { setQuery(e.target.value); setPage(0); }}
              />
              {query && (
                <button className={styles.searchClear} onClick={() => { setQuery(''); setPage(0); }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <p className={styles.resultCount}>
              {loading ? 'Mencari...' : `${results.length} barang${query ? ` untuk "${query}"` : ''}`}
            </p>
          </div>

          <div className={styles.productGrid}>
            {loading && page === 0
              ? Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : results.length > 0
                ? results.map(p => <ProductCard key={p.id} product={p} />)
                : (
                  <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                    <div className="empty-state-icon">🔍</div>
                    <p style={{ fontWeight: 600 }}>Tidak ada barang</p>
                    <p style={{ fontSize: '0.85rem' }}>Coba ubah filter atau kata kunci</p>
                  </div>
                )
            }
          </div>

          {results.length >= PAGE_SIZE && (
            <div className={styles.loadMoreWrapper}>
              <button
                className={`btn btn-ghost ${styles.loadMoreBtn}`}
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : 'Lihat Lebih Banyak'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CariPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50dvh' }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    }>
      <CariContent />
    </Suspense>
  );
}
