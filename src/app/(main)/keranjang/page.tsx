'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, Minus, Plus, Shield, MapPin, ShoppingBag, AlertTriangle, X, Package } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { databases, DATABASE_ID, PRODUCTS_ID, mapDoc, Product } from '@/lib/appwrite';
import styles from './keranjang.module.css';

function formatPrice(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

const ADMIN_FEE = 2500;

export default function KeranjangPage() {
  const { items, initialized, removeFromCart, clearCart, totalPrice, totalItems } = useCart();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(items.map(i => i.product.id)));

  // State untuk validasi produk
  const [checking, setChecking] = useState(true);
  const [removedProducts, setRemovedProducts] = useState<string[]>([]);
  const [showRemovedAlert, setShowRemovedAlert] = useState(false);

  // Validasi ulang produk di keranjang saat halaman dibuka
  // Tunggu cart selesai load dari localStorage (initialized === true)
  useEffect(() => {
    if (!initialized) return;

    if (items.length === 0) {
      setChecking(false);
      return;
    }

    const validateCartItems = async () => {
      setChecking(true);
      const removedTitles: string[] = [];

      for (const item of items) {
        try {
          const doc = await databases.getDocument(DATABASE_ID, PRODUCTS_ID, item.product.id);
          const product = mapDoc<Product>(doc);

          // Jika produk sudah terjual (is_sold: true), hapus dari keranjang
          if (product.is_sold) {
            removeFromCart(item.product.id);
            removedTitles.push(item.product.title);
          }
        } catch {
          // Produk tidak ditemukan di database (sudah dihapus penjual)
          removeFromCart(item.product.id);
          removedTitles.push(item.product.title);
        }
      }

      if (removedTitles.length > 0) {
        setRemovedProducts(removedTitles);
        setShowRemovedAlert(true);
      }

      setChecking(false);
    };

    validateCartItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  // Update selected set saat items berubah (misal setelah validasi)
  useEffect(() => {
    setSelected(prev => {
      const currentIds = new Set(items.map(i => i.product.id));
      const next = new Set<string>();
      for (const id of prev) {
        if (currentIds.has(id)) next.add(id);
      }
      return next;
    });
  }, [items]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(i => i.product.id)));
    }
  };

  const deleteSelected = () => {
    selected.forEach(id => removeFromCart(id));
    setSelected(new Set());
  };

  const selectedItems = items.filter(i => selected.has(i.product.id));
  const selectedTotal = selectedItems.reduce((sum, i) => sum + i.product.price, 0);
  const grandTotal = selectedItems.length > 0 ? selectedTotal + ADMIN_FEE : 0;

  const handleCheckout = () => {
    if (selectedItems.length === 0) return;
    router.push(`/checkout/${selectedItems[0].product.id}`);
  };

  // Tampilkan loading saat sedang validasi
  if (checking) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16 }}>
            <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Memeriksa ketersediaan barang...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Alert produk dihapus */}
        {showRemovedAlert && removedProducts.length > 0 && (
          <div className={styles.removedAlert}>
            <AlertTriangle size={18} className={styles.removedAlertIcon} />
            <div className={styles.removedAlertContent}>
              <strong>Beberapa barang tidak tersedia lagi</strong>
              <p>
                Barang berikut sudah dihapus atau terjual oleh penjual dan telah dikeluarkan dari keranjangmu:{' '}
                <em>{removedProducts.join(', ')}</em>
              </p>
            </div>
            <button
              className={styles.removedAlertClose}
              onClick={() => setShowRemovedAlert(false)}
              aria-label="Tutup notifikasi"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Alert banner */}
        <div className={styles.safetyBanner}>
          <Shield size={16} className={styles.safetyIcon} />
          <span>🔒 <strong>Transaksi Aman</strong> dengan Verifikasi Email Kampus</span>
        </div>

        {/* Location */}
        <div className={styles.locationBar}>
          <MapPin size={14} className={styles.locationIcon} />
          <span>Menampilkan transaksi di sekitar <strong>Universitas Brawijaya, Malang.</strong></span>
        </div>

        <h1 className={styles.pageTitle}>Keranjang Belanja</h1>
        <p className={styles.pageSubtitle}>Periksa kembali barang yang ingin kamu beli.</p>

        {items.length === 0 ? (
          <div className={styles.emptyCart}>
            <ShoppingBag size={64} className={styles.emptyIcon} />
            <h2 className={styles.emptyTitle}>Keranjang Kosong</h2>
            <p className={styles.emptyDesc}>
              {removedProducts.length > 0
                ? 'Semua barang di keranjangmu sudah tidak tersedia lagi.'
                : 'Belum ada barang di keranjangmu.'}
            </p>
            <Link href="/cari" className="btn btn-primary">
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <div className={styles.layout}>
            {/* LEFT - Items */}
            <div className={styles.itemsCol}>
              {/* Select all */}
              <div className={styles.selectAllRow}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={selected.size === items.length && items.length > 0}
                    onChange={toggleSelectAll}
                  />
                  <span className={styles.checkboxCustom} />
                  <span className={styles.checkboxText}>Pilih semua barang</span>
                </label>
                {selected.size > 0 && (
                  <button className={styles.deleteBtn} onClick={deleteSelected}>
                    Hapus Terpilih
                  </button>
                )}
              </div>

              {/* Items */}
              {items.map(item => (
                <div key={item.product.id} className={styles.itemCard}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={selected.has(item.product.id)}
                      onChange={() => toggleSelect(item.product.id)}
                    />
                    <span className={styles.checkboxCustom} />
                  </label>

                  {/* Product image */}
                  <div className={styles.itemImg}>
                    {item.product.photos?.[0]
                      ? <img src={item.product.photos[0]} alt={item.product.title} />
                      : <Package size={24} style={{ color: 'var(--text-muted)' }} />}
                    <span className={styles.itemUniv}>UB</span>
                  </div>

                  {/* Product info */}
                  <div className={styles.itemInfo}>
                    <span className={styles.itemCat}>{item.product.category.toUpperCase()}</span>
                    <p className={styles.itemName}>{item.product.title}</p>
                    <div className={styles.itemMeta}>
                      <span>⏱ {item.product.conditions?.length === 0 ? 'Like New' : 'Good'}</span>
                      <span>👤 {item.product.seller?.full_name?.split(' ')[0]} - UB</span>
                    </div>
                    {item.product.address && (
                      <div className={styles.itemLocation}>
                        <MapPin size={11} /> {item.product.address} (0.4 mi)
                      </div>
                    )}
                    <div className={styles.itemBottom}>
                      <div className={styles.qtyControl}>
                        <button className={styles.qtyBtn} disabled>
                          <Minus size={14} />
                        </button>
                        <span className={styles.qtyValue}>1</span>
                        <button className={styles.qtyBtn} disabled>
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Price & Delete */}
                  <div className={styles.itemRight}>
                    <button className={styles.trashBtn} onClick={() => removeFromCart(item.product.id)}>
                      <Trash2 size={16} />
                    </button>
                    <p className={styles.itemPrice}>{formatPrice(item.product.price)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT - Summary */}
            <div className={styles.summaryCol}>
              <div className={styles.summaryCard}>
                <h2 className={styles.summaryTitle}>Ringkasan Belanja</h2>

                <div className={styles.summaryRows}>
                  <div className={styles.summaryRow}>
                    <span>Total barang ({selectedItems.length})</span>
                    <span>{formatPrice(selectedTotal)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Estimasi biaya admin</span>
                    <span className={styles.summaryAdminFee}>{formatPrice(ADMIN_FEE)}</span>
                  </div>
                </div>

                <div className={styles.summaryDivider} />

                <div className={styles.summaryTotal}>
                  <span>Total Pembayaran</span>
                  <span className={styles.summaryTotalValue}>{formatPrice(grandTotal)}</span>
                </div>

                <button
                  className={`btn btn-primary btn-full ${styles.checkoutBtn}`}
                  onClick={handleCheckout}
                  disabled={selectedItems.length === 0}
                >
                  Lanjut ke Pembayaran
                </button>

                <Link href="/cari" className={`btn btn-secondary btn-full ${styles.continueBtn}`}>
                  Kembali Belanja
                </Link>

                <div className={styles.guaranteeRow}>
                  <Shield size={14} className={styles.guaranteeIcon} />
                  <span>Jaminan perlindungan pembeli untuk komunitas kampus.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
