'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, ShoppingCart, User, Menu, X, Wallet, Package, LogOut, Store, ChevronDown, Settings, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect, Suspense } from 'react';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import styles from './Navigation.module.css';

const NAV_CATEGORIES = [
  { label: 'Barang Terbaru', href: '/beranda' },
  { label: 'Perabot Kos', href: '/cari?cat=Kasur+%26+Bantal' },
  { label: 'Elektronik', href: '/cari?cat=Elektronik' },
  { label: 'Peralatan Dapur', href: '/cari?cat=Peralatan+Masak' },
  { label: 'Buku & Alat Kuliah', href: '/cari?cat=Lainnya' },
  { label: 'Fashion', href: '/cari?cat=Lainnya' },
];

function formatPrice(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

function CartDropdown() {
  const { items, totalItems, totalPrice, removeFromCart } = useCart();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className={styles.accountWrapper} ref={ref}>
      <button
        className={styles.actionBtn}
        onClick={() => setOpen(!open)}
        aria-label="Keranjang"
        style={{ position: 'relative' }}
      >
        <ShoppingCart size={20} />
        {totalItems > 0 && (
          <span className={styles.cartBadge}>{totalItems}</span>
        )}
      </button>

      {open && (
        <div className={styles.cartDropdown}>
          <div className={styles.cartDropdownHeader}>
            <span className={styles.cartDropdownTitle}>
              Keranjang Belanja {totalItems > 0 && `(${totalItems})`}
            </span>
            <button className={styles.cartDropdownClose} onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </div>

          {items.length === 0 ? (
            <div className={styles.cartEmpty}>
              <div className={styles.cartEmptyIcon}>🛒</div>
              <p className={styles.cartEmptyText}>Keranjang belanja saat ini kosong</p>
              <Link href="/beranda" className={styles.cartEmptyLink} onClick={() => setOpen(false)}>
                Mulai Belanja
              </Link>
            </div>
          ) : (
            <>
              <div className={styles.cartItems}>
                {items.map((item) => (
                  <div key={item.product.id} className={styles.cartItem}>
                    <div className={styles.cartItemImg}>
                      {item.product.photos?.[0]
                        ? <img src={item.product.photos[0]} alt={item.product.title} />
                        : <span>🛋️</span>}
                    </div>
                    <div className={styles.cartItemInfo}>
                      <p className={styles.cartItemName}>{item.product.title}</p>
                      <p className={styles.cartItemQty}>Jumlah: {item.quantity}</p>
                      <p className={styles.cartItemPrice}>{formatPrice(item.product.price)}</p>
                    </div>
                    <button
                      className={styles.cartItemRemove}
                      onClick={() => removeFromCart(item.product.id)}
                      aria-label="Hapus"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className={styles.cartDropdownDivider} />

              <div className={styles.cartSubtotalRow}>
                <span className={styles.cartSubtotalLabel}>SUBTOTAL</span>
                <span className={styles.cartSubtotalValue}>{formatPrice(totalPrice)}</span>
              </div>

              <div className={styles.cartDropdownActions}>
                {items.length === 1 && (
                  <Link
                    href={`/checkout/${items[0].product.id}`}
                    className={styles.cartBuyNowBtn}
                    onClick={() => setOpen(false)}
                  >
                    Beli Sekarang
                  </Link>
                )}
                <Link
                  href="/keranjang"
                  className={styles.cartViewAllBtn}
                  onClick={() => setOpen(false)}
                >
                  Lihat Keranjang
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AccountDropdown() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.push('/login');
  };

  if (!user) {
    return (
      <Link href="/login" className={styles.actionBtn} aria-label="Login">
        <User size={20} />
      </Link>
    );
  }

  const initials = profile?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?';

  return (
    <div className={styles.accountWrapper} ref={ref}>
      <button
        className={styles.avatarBtn}
        onClick={() => setOpen(!open)}
        aria-label="Akun"
      >
        <div className={styles.avatarCircle}>{initials}</div>
        <ChevronDown size={14} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
      </button>

      {open && (
        <div className={styles.accountDropdown}>
          {/* Profile header */}
          <div className={styles.dropdownProfile}>
            <div className={styles.dropdownAvatar}>{initials}</div>
            <div className={styles.dropdownProfileInfo}>
              <p className={styles.dropdownName}>{profile?.full_name || 'Pengguna'}</p>
              <p className={styles.dropdownEmail}>{user.email}</p>
            </div>
          </div>

          <div className={styles.dropdownDivider} />

          {/* Menu items */}
          <Link
            href="/profil"
            className={styles.dropdownItem}
            onClick={() => setOpen(false)}
          >
            <Package size={16} />
            <span>Pesanan Saya</span>
          </Link>

          <div className={styles.dropdownItem} style={{ cursor: 'default' }}>
            <Wallet size={16} />
            <span>Wallet</span>
            <span className={styles.dropdownBadge}>{formatPrice(profile?.saldo || 0)}</span>
          </div>

          <div className={styles.dropdownDivider} />

          {/* Mulai Berjualan */}
          <Link
            href="/jual"
            className={`${styles.dropdownItem} ${styles.dropdownItemSell}`}
            onClick={() => setOpen(false)}
          >
            <div className={styles.dropdownSellContent}>
              <div>
                <p className={styles.dropdownSellTitle}>Mulai Berjualan</p>
                <p className={styles.dropdownSellSub}>Jual perabot kosmu, dapat uang!</p>
              </div>
              <span className={styles.dropdownSellEmoji}>🛋️</span>
            </div>
          </Link>

          <div className={styles.dropdownDivider} />

          <Link
            href="/profil"
            className={styles.dropdownItem}
            onClick={() => setOpen(false)}
          >
            <Settings size={16} />
            <span>Pengaturan Profil</span>
          </Link>

          <button className={`${styles.dropdownItem} ${styles.dropdownItemLogout}`} onClick={handleSignOut}>
            <LogOut size={16} />
            <span>Keluar</span>
          </button>
        </div>
      )}
    </div>
  );
}

function CategoryLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCat = searchParams.get('cat');

  let activeCategory = NAV_CATEGORIES[0];
  if (pathname === '/beranda') {
    activeCategory = NAV_CATEGORIES[0];
  } else if (currentCat) {
    const encoded = encodeURIComponent(currentCat);
    const match = NAV_CATEGORIES.find(c => c.href.includes(encoded) || c.href.includes(currentCat.replace(' ', '+')));
    if (match) activeCategory = match;
  }

  return (
    <>
      {NAV_CATEGORIES.map(cat => (
        <Link
          key={cat.href + cat.label}
          href={cat.href}
          className={`${styles.catLink} ${activeCategory.label === cat.label ? styles.catLinkActive : ''}`}
        >
          {cat.label}
        </Link>
      ))}
    </>
  );
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { totalItems } = useCart();
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/cari?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className={styles.navbar}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          {/* Logo */}
          <Link href="/beranda" className={styles.logo}>
            <Image 
              src="/logo.png" 
              alt="ReuseKos Logo" 
              width={286} 
              height={70} 
              className={styles.logoImage}
              priority
            />
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
            <CartDropdown />
            <AccountDropdown />
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
          <Suspense fallback={
            NAV_CATEGORIES.map(cat => (
              <span key={cat.label} className={styles.catLink}>{cat.label}</span>
            ))
          }>
            <CategoryLinks />
          </Suspense>
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

            {user && profile && (
              <div className={styles.mobileProfileCard}>
                <div className={styles.mobileAvatar}>{profile.full_name?.charAt(0).toUpperCase()}</div>
                <div>
                  <p style={{ fontWeight: 700, color: 'white' }}>{profile.full_name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>{user.email}</p>
                </div>
              </div>
            )}

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
            <Link href="/keranjang" className={styles.mobileCatLink} onClick={() => setMobileOpen(false)}>
              🛒 Keranjang {totalItems > 0 && `(${totalItems})`}
            </Link>
            <Link href="/jual" className={`${styles.mobileCatLink} ${styles.mobileCatLinkSell}`} onClick={() => setMobileOpen(false)}>
              🏷️ Mulai Berjualan
            </Link>
            {user ? (
              <>
                <Link href="/profil" className={styles.mobileCatLink} onClick={() => setMobileOpen(false)}>
                  👤 Profil & Pesanan
                </Link>
                <button
                  className={`${styles.mobileCatLink} ${styles.mobileCatLinkLogout}`}
                  onClick={async () => { setMobileOpen(false); await signOut(); router.push('/login'); }}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  🚪 Keluar
                </button>
              </>
            ) : (
              <Link href="/login" className={styles.mobileCatLink} onClick={() => setMobileOpen(false)}>
                🔐 Login
              </Link>
            )}
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
