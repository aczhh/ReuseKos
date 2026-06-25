'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ShoppingCart, Heart, User, Menu, X, MapPin, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/lib/CartContext';
import styles from './Navigation.module.css';

const NAV_CATEGORIES = [
  { label: 'Barang Terbaru', href: '/beranda' },
  { label: 'Perabot Kos', href: '/cari?cat=Kasur+%26+Bantal' },
  { label: 'Elektronik', href: '/cari?cat=Elektronik' },
  { label: 'Peralatan Dapur', href: '/cari?cat=Peralatan+Masak' },
  { label: 'Buku & Alat Kuliah', href: '/cari?cat=Lainnya' },
  { label: 'Fashion', href: '/cari?cat=Lainnya' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { totalItems } = useCart();
  const router = useRouter();
  const pathname = usePathname();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/cari?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const activeCategory = NAV_CATEGORIES.find(c => pathname === c.href || pathname.startsWith(c.href + '?'));

  return (
    <header className={styles.navbar}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          {/* Logo */}
          <Link href="/beranda" className={styles.logo}>
            <div className={styles.logoIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="white" opacity="0.95"/>
                <path d="M9 22V12h6v10" fill="rgba(0,0,0,0.35)"/>
              </svg>
            </div>
            <div className={styles.logoText}>
              <span className={styles.logoMain}>Reuse<span className={styles.logoAccent}>Kos</span></span>
              <span className={styles.logoTagline}>Barang Kos, Hemat Budget</span>
            </div>
          </Link>

          {/* Search Bar (desktop) */}
          <form className={styles.searchForm} onSubmit={handleSearch}>
            <input
              id="navbar-search"
              type="search"
              className={styles.searchInput}
              placeholder="Cari perabotan..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button type="submit" className={styles.searchBtn} aria-label="Cari">
              <Search size={16} />
            </button>
          </form>

          {/* Right Actions */}
          <div className={styles.navActions}>
            <Link href="/profil" className={styles.actionBtn} aria-label="Profil">
              <User size={20} />
            </Link>
            <button className={styles.actionBtn} aria-label="Wishlist">
              <Heart size={20} />
            </button>
            <Link href="/keranjang" className={styles.actionBtn} aria-label="Keranjang" style={{ position: 'relative' }}>
              <ShoppingCart size={20} />
              {totalItems > 0 && (
                <span className={styles.cartBadge}>{totalItems}</span>
              )}
            </Link>
            {/* Mobile hamburger */}
            <button
              className={`${styles.actionBtn} ${styles.hamburger}`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Category Nav Bar */}
      <nav className={styles.categoryBar}>
        <div className={styles.categoryBarInner}>
          {NAV_CATEGORIES.map(cat => (
            <Link
              key={cat.href + cat.label}
              href={cat.href}
              className={`${styles.catLink} ${activeCategory?.label === cat.label ? styles.catLinkActive : ''}`}
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className={styles.mobileMenu} onClick={() => setMobileOpen(false)}>
          <div className={styles.mobileMenuContent} onClick={e => e.stopPropagation()}>
            {/* Mobile Search */}
            <form className={styles.mobileSearch} onSubmit={handleSearch}>
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Cari perabotan..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <button type="submit" className={styles.searchBtn}>
                <Search size={16} />
              </button>
            </form>

            {NAV_CATEGORIES.map(cat => (
              <Link
                key={cat.label}
                href={cat.href}
                className={styles.mobileCatLink}
                onClick={() => setMobileOpen(false)}
              >
                {cat.label}
              </Link>
            ))}

            <div className={styles.mobileDivider} />
            <Link href="/profil" className={styles.mobileCatLink} onClick={() => setMobileOpen(false)}>
              👤 Profil
            </Link>
            <Link href="/keranjang" className={styles.mobileCatLink} onClick={() => setMobileOpen(false)}>
              🛒 Keranjang {totalItems > 0 && `(${totalItems})`}
            </Link>
            <Link href="/jual" className={`${styles.mobileCatLink} ${styles.mobileCatLinkSell}`} onClick={() => setMobileOpen(false)}>
              + Jual Barang
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

// Keep BottomNav as empty component for compatibility, but rendered as nothing
export function BottomNav() {
  return null;
}
