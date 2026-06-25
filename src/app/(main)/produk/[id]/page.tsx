'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, Video, MapPin,
  MessageCircle, ShoppingCart, Heart, AlertTriangle, Check,
  Star, GraduationCap, X
} from 'lucide-react';
import Link from 'next/link';
import { databases, DATABASE_ID, PRODUCTS_ID, PROFILES_ID, mapDoc, Product } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/lib/CartContext';
import styles from './produk.module.css';

function formatPrice(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart, isInCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const prodDoc = await databases.getDocument(DATABASE_ID, PRODUCTS_ID, id);
        const fetchedProduct = mapDoc<Product>(prodDoc);

        // fetch seller
        const sellerResponse = await databases.listDocuments(
          DATABASE_ID, 
          PROFILES_ID, 
          [Query.equal('user_id', fetchedProduct.seller_id)]
        );
        if (sellerResponse.documents.length > 0) {
          fetchedProduct.seller = mapDoc(sellerResponse.documents[0]);
        }
        setProduct(fetchedProduct);

        // fetch other products by same seller
        const othersResponse = await databases.listDocuments(DATABASE_ID, PRODUCTS_ID, [
          Query.equal('seller_id', fetchedProduct.seller_id),
          Query.notEqual('$id', id),
          Query.equal('is_sold', false),
          Query.limit(4)
        ]);
        const otherProducts = othersResponse.documents.map(doc => mapDoc<Product>(doc));
        
        // attach same seller to others
        if (fetchedProduct.seller) {
          otherProducts.forEach(p => p.seller = fetchedProduct.seller);
        }
        
        setSellerProducts(otherProducts);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', paddingTop: 'var(--navbar-height)' }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, borderTopColor: 'var(--green-700)' }} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="empty-state" style={{ minHeight: '100dvh', paddingTop: 'var(--navbar-height)' }}>
        <div className="empty-state-icon">😕</div>
        <p style={{ fontWeight: 700 }}>Produk tidak ditemukan</p>
        <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>Kembali</button>
      </div>
    );
  }

  const photos = product.photos || [];
  const seller = product.seller;
  const isMine = user?.id === product.seller_id;
  const inCart = isInCart(product.id);

  const handleWa = () => {
    if (!seller?.whatsapp) return;
    const phone = seller.whatsapp.replace(/\D/g, '').replace(/^0/, '62');
    const msg = encodeURIComponent(
      `Halo kak ${seller.full_name}, aku tertarik dengan "${product.title}" di ReuseKos. Masih available?`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const handleAddToCart = () => {
    addToCart(product);
    setShowCartPopup(true);
    setTimeout(() => setShowCartPopup(false), 3000);
  };

  return (
    <div className={styles.page}>
      {/* Cart popup */}
      {showCartPopup && (
        <div className={styles.cartPopup}>
          <div className={styles.cartPopupContent}>
            <div className={styles.cartPopupHeader}>
              <span className={styles.cartPopupTitle}>Keranjang Belanja (1)</span>
              <button onClick={() => setShowCartPopup(false)} className={styles.cartPopupClose}>
                <X size={16} />
              </button>
            </div>
            <div className={styles.cartPopupItem}>
              {photos[0] && <img src={photos[0]} alt={product.title} className={styles.cartPopupImg} />}
              <div className={styles.cartPopupInfo}>
                <div className={styles.cartPopupName}>{product.title}</div>
                <div className={styles.cartPopupQty}>Jumlah: 1</div>
                <div className={styles.cartPopupPrice}>{formatPrice(product.price)}</div>
              </div>
            </div>
            <div className={styles.cartPopupDivider} />
            <div className={styles.cartPopupSubtotal}>
              <span>SUBTOTAL</span>
              <span className={styles.cartPopupTotal}>{formatPrice(product.price)}</span>
            </div>
            <div className={styles.cartPopupActions}>
              <Link href={`/checkout/${product.id}`} className={`btn btn-primary btn-full`} style={{ fontSize: '0.85rem', padding: '10px' }}>
                Beli Sekarang
              </Link>
              <Link href="/keranjang" className={`btn btn-secondary btn-full`} style={{ fontSize: '0.85rem', padding: '10px' }}>
                Lihat Keranjang
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className={styles.inner}>
        {/* Back */}
        <div className={styles.breadcrumb}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            <ChevronLeft size={18} /> Kembali
          </button>
          {product.is_sold && <span className="badge badge-terra">TERJUAL</span>}
        </div>

        {/* 2-col layout */}
        <div className={styles.layout}>
          {/* LEFT: Photos */}
          <div className={styles.leftCol}>
            {/* Main photo */}
            <div className={styles.mainPhoto}>
              {/* Badges on photo */}
              <div className={styles.photoBadges}>
                <span className={styles.verifiedBadge}>
                  <GraduationCap size={10} /> Verified Alumni
                </span>
                <span className={styles.distanceBadge}>
                  <MapPin size={10} /> 0.4 mi away
                </span>
              </div>

              {showVideo && product.video_url ? (
                <video src={product.video_url} controls autoPlay className={styles.mainImg} />
              ) : (
                photos.length > 0
                  ? <img src={photos[photoIndex]} alt={product.title} className={styles.mainImg} />
                  : <div className={styles.photoPlaceholder}>🛋️</div>
              )}

              {photos.length > 1 && !showVideo && (
                <>
                  <button
                    className={`${styles.navBtn} ${styles.navBtnLeft}`}
                    onClick={() => setPhotoIndex(i => Math.max(0, i - 1))}
                  ><ChevronLeft size={18} /></button>
                  <button
                    className={`${styles.navBtn} ${styles.navBtnRight}`}
                    onClick={() => setPhotoIndex(i => Math.min(photos.length - 1, i + 1))}
                  ><ChevronRight size={18} /></button>
                  <div className={styles.dots}>
                    {photos.map((_, i) => (
                      <button key={i} className={`${styles.dot} ${i === photoIndex ? styles.dotActive : ''}`} onClick={() => setPhotoIndex(i)} />
                    ))}
                  </div>
                </>
              )}

              {product.video_url && (
                <button className={styles.videoToggle} onClick={() => setShowVideo(!showVideo)}>
                  <Video size={12} /> {showVideo ? 'Lihat Foto' : 'Lihat Video'}
                </button>
              )}
            </div>

            {/* Thumbnail strip */}
            {photos.length > 1 && (
              <div className={styles.thumbStrip}>
                {photos.map((url, i) => (
                  <button
                    key={i}
                    className={`${styles.thumb} ${i === photoIndex ? styles.thumbActive : ''}`}
                    onClick={() => { setPhotoIndex(i); setShowVideo(false); }}
                  >
                    <img src={url} alt={`foto-${i}`} />
                  </button>
                ))}
              </div>
            )}

            {/* Condition & Listed */}
            <div className={styles.metaRow}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Condition</span>
                <span className={styles.metaValue}>
                  {product.conditions?.length === 0 ? 'Like New (9/10)' : `Bekas (${Math.max(5, 9 - product.conditions.length)}/10)`}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Listed</span>
                <span className={styles.metaValue}>
                  {new Date(product.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className={styles.descSection}>
              <h3 className={styles.descTitle}>DESCRIPTION</h3>
              <p className={styles.descText}>{product.description || 'Tidak ada deskripsi.'}</p>
            </div>

            {/* Conditions */}
            {product.conditions?.length > 0 && (
              <div className={styles.condSection}>
                <h3 className={styles.descTitle}>⚠️ KONDISI MINUS</h3>
                <div className={styles.condList}>
                  {product.conditions.map(c => (
                    <div key={c} className={styles.condItem}>
                      <span className={styles.condDot} />
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {product.conditions?.length === 0 && (
              <div className="alert alert-success" style={{ marginBottom: 0 }}>
                <Check size={16} /> Kondisi barang baik — tidak ada catatan minus
              </div>
            )}
          </div>

          {/* RIGHT: Info + Actions */}
          <div className={styles.rightCol}>
            {/* Seller */}
            {seller && (
              <div className={styles.sellerCard}>
                <div className="avatar" style={{ width: 44, height: 44, fontSize: '1rem' }}>
                  {seller.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className={styles.sellerInfo}>
                  <p className={styles.sellerName}>{seller.full_name}</p>
                  <div className={styles.sellerMeta}>
                    <Star size={12} fill="currentColor" />
                    <span>4.8 (42 reviews)</span>
                  </div>
                </div>
                {!isMine && (
                  <button className={styles.waBtn} onClick={handleWa}>
                    <MessageCircle size={14} /> Chat WA
                  </button>
                )}
              </div>
            )}

            {/* Title & Price */}
            <h1 className={styles.productTitle}>{product.title}</h1>
            <div className={styles.priceRow}>
              <span className={styles.price}>{formatPrice(product.price)}</span>
              <span className={styles.priceOriginal}>{formatPrice(Math.round(product.price * 1.4))}</span>
            </div>

            {/* Category & Conditions */}
            <div className={styles.badgeRow}>
              <span className="badge badge-green">{product.category}</span>
              {product.conditions?.length > 0 && (
                <span className="badge badge-amber">
                  <AlertTriangle size={10} /> {product.conditions.length} kondisi minus
                </span>
              )}
            </div>

            {/* CTA Buttons */}
            {!isMine && !product.is_sold && (
              <>
                <div className={styles.ctaButtons}>
                  <Link href={`/checkout/${product.id}`} className={`btn btn-primary ${styles.ctaBtn}`}>
                    Beli Sekarang
                  </Link>
                  <button
                    className={`btn btn-secondary ${styles.ctaBtn}`}
                    onClick={handleAddToCart}
                    disabled={inCart}
                  >
                    <ShoppingCart size={16} />
                    {inCart ? 'Di Keranjang' : 'Tambah ke Keranjang'}
                  </button>
                </div>
                <button className={styles.wishlistBtn}>
                  <Heart size={14} /> Tambahkan ke Wishlist
                </button>
              </>
            )}

            {isMine && (
              <div className="alert alert-info">Ini iklanmu sendiri</div>
            )}

            {product.is_sold && (
              <div className="alert alert-error">Barang ini sudah terjual</div>
            )}

            {/* Pickup Location */}
            <div className={styles.pickupSection}>
              <h3 className={styles.pickupTitle}>PICKUP LOCATION</h3>
              <div className={styles.pickupCard}>
                <MapPin size={16} className={styles.pickupIcon} />
                <div>
                  <p className={styles.pickupName}>{product.address || 'Lokasi kampus'}</p>
                  <p className={styles.pickupDesc}>
                    Available for pickup between 4 PM - 8 PM on weekdays. Please coordinate via chat.
                  </p>
                </div>
              </div>

              {/* Map placeholder */}
              <div className={styles.mapPlaceholder}>
                <div className={styles.mapInner}>
                  <MapPin size={28} style={{ color: 'var(--orange-500)' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {product.lat && product.lng
                      ? `${product.lat.toFixed(4)}, ${product.lng.toFixed(4)}`
                      : 'Lokasi tidak tersedia'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Other products by seller */}
        {sellerProducts.length > 0 && (
          <div className={styles.otherSection}>
            <div className={styles.otherHeader}>
              <h2 className={styles.otherTitle}>Other items from {seller?.full_name?.split(' ')[0]}</h2>
              <button className={styles.seeAll}>See All</button>
            </div>
            <div className={styles.otherGrid}>
              {sellerProducts.map(p => (
                <Link key={p.id} href={`/produk/${p.id}`} className={styles.otherCard}>
                  <div className={styles.otherImg}>
                    {p.photos?.[0]
                      ? <img src={p.photos[0]} alt={p.title} />
                      : <span>🛋️</span>}
                  </div>
                  <div className={styles.otherInfo}>
                    <span className={styles.otherCat}>{p.category.toUpperCase()}</span>
                    <p className={styles.otherName}>{p.title}</p>
                    <p className={styles.otherPrice}>{formatPrice(p.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
