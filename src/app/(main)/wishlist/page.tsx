'use client';

import Link from 'next/link';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useWishlist } from '@/lib/WishlistContext';
import { useCart } from '@/lib/CartContext';
import styles from './wishlist.module.css';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(price);
}

export default function WishlistPage() {
  const { items, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <Heart size={64} className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>Wishlist Kosong</h2>
          <p className={styles.emptyDesc}>
            Kamu belum menyukai barang apapun. Mulai jelajahi dan tandai barang favoritmu!
          </p>
          <Link href="/beranda" className={styles.browseBtn}>
            Jelajahi Barang
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <Heart size={22} fill="currentColor" /> Wishlist Saya
          </h1>
          <span className={styles.count}>{items.length} barang</span>
          <button className={styles.clearBtn} onClick={clearWishlist}>
            <Trash2 size={14} /> Hapus Semua
          </button>
        </div>

        <div className={styles.grid}>
          {items.map(product => (
            <div key={product.id} className={styles.card}>
              <Link href={`/produk/${product.id}`} className={styles.cardImageLink}>
                {product.photos?.[0] ? (
                  <img src={product.photos[0]} alt={product.title} className={styles.cardImage} />
                ) : (
                  <div className={styles.cardImagePlaceholder}>🛋️</div>
                )}
              </Link>
              <div className={styles.cardBody}>
                <span className={styles.cardCategory}>{product.category}</span>
                <Link href={`/produk/${product.id}`} className={styles.cardTitle}>
                  {product.title}
                </Link>
                <p className={styles.cardPrice}>{formatPrice(product.price)}</p>
                <div className={styles.cardActions}>
                  <button
                    className={styles.addToCartBtn}
                    onClick={() => addToCart(product)}
                    disabled={product.is_sold}
                  >
                    <ShoppingCart size={14} />
                    {product.is_sold ? 'Terjual' : 'Tambah Keranjang'}
                  </button>
                  <button
                    className={styles.removeBtn}
                    onClick={() => removeFromWishlist(product.id)}
                    aria-label="Hapus dari wishlist"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
