'use client';

import Link from 'next/link';
import { MapPin, Video, Heart, GraduationCap, Package } from 'lucide-react';
import { Product } from '@/lib/appwrite';
import { useWishlist } from '@/lib/WishlistContext';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
  distanceKm?: number;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(price);
}

// Extract university abbreviation from email or jurusan
function getUnivBadge(seller?: Product['seller']): string | null {
  if (!seller) return null;
  const email = seller.email || '';
  // Extract domain part
  const match = email.match(/@(?:[^.]+\.)*([^.]+)\.ac\.id/i);
  if (match) return match[1].toUpperCase().slice(0, 3);
  return 'UNI';
}

// Get condition label
function getConditionLabel(conditions: string[]): { label: string; variant: string } | null {
  if (!conditions || conditions.length === 0) return { label: 'Like New', variant: 'likeNew' };
  if (conditions.length === 1) return { label: 'Sangat Bagus', variant: 'veryGood' };
  if (conditions.length <= 2) return { label: 'Bagus', variant: 'good' };
  return { label: 'Bekas', variant: 'used' };
}

export default function ProductCard({ product, distanceKm }: ProductCardProps) {
  const firstPhoto = product.photos?.[0];
  const univBadge = getUnivBadge(product.seller);
  const conditionInfo = getConditionLabel(product.conditions);
  const { toggleWishlist, isInWishlist } = useWishlist();

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  const wished = isInWishlist(product.id);

  return (
    <Link href={`/produk/${product.id}`} className={styles.card}>
      {/* Image */}
      <div className={styles.imageWrapper}>
        {firstPhoto ? (
          <img
            src={firstPhoto}
            alt={product.title}
            className={styles.image}
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <Package size={32} style={{ color: 'var(--text-muted)' }} />
          </div>
        )}

        {/* Top badges row */}
        <div className={styles.topBadges}>
          {univBadge && (
            <span className={styles.univBadge}>
              <GraduationCap size={9} />
              {univBadge}
            </span>
          )}
        </div>

        {/* Wishlist button */}
        <button
          className={`${styles.wishlistBtn} ${wished ? styles.wishlistActive : ''}`}
          aria-label={wished ? 'Hapus dari wishlist' : 'Tambah ke wishlist'}
          onClick={handleWishlistToggle}
        >
          <Heart size={14} fill={wished ? 'currentColor' : 'none'} />
        </button>

        {/* Distance badge */}
        {distanceKm !== undefined && (
          <span className={styles.distanceBadge}>
            <MapPin size={9} />
            {distanceKm < 1
              ? `${Math.round(distanceKm * 1000)}m away`
              : `${distanceKm.toFixed(1)} mi away`}
          </span>
        )}

        {/* Video tag */}
        {product.video_url && (
          <span className={styles.videoTag}>
            <Video size={10} /> Video
          </span>
        )}

        {/* Sold overlay */}
        {product.is_sold && (
          <div className={styles.soldOverlay}>
            <span className={styles.soldLabel}>TERJUAL</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className={styles.body}>
        {/* Category */}
        <span className={styles.category}>{product.category.toUpperCase()}</span>

        {/* Title */}
        <p className={styles.title}>{product.title}</p>

        {/* Condition */}
        {conditionInfo && (
          <span className={`${styles.condition} ${styles[`condition_${conditionInfo.variant}`]}`}>
            {conditionInfo.label}
          </span>
        )}

        {/* Price */}
        <p className={styles.price}>{formatPrice(product.price)}</p>
      </div>
    </Link>
  );
}

/* Skeleton loader */
export function ProductCardSkeleton() {
  return (
    <div className={styles.card} style={{ pointerEvents: 'none' }}>
      <div className={styles.imageWrapper}>
        <div className="skeleton" style={{ position: 'absolute', inset: 0 }} />
      </div>
      <div className={styles.body} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ height: 10, width: '40%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 14, width: '90%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 10, width: '30%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 18, width: '55%', borderRadius: 4 }} />
      </div>
    </div>
  );
}
