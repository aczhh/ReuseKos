/**
 * Menghitung jarak antara dua koordinat menggunakan formula Haversine
 * @returns jarak dalam kilometer
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // radius bumi dalam km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Hitung ongkos kirim berdasarkan jarak
 * Base: Rp 15.000 (≤ 2km), +Rp 5.000 per km setelahnya
 */
export function calculateOngkir(distanceKm: number): number {
  if (distanceKm <= 2) return 15000;
  return 15000 + Math.ceil(distanceKm - 2) * 5000;
}

export const PRODUCT_CATEGORIES = [
  'Kasur & Bantal',
  'Lemari & Rak',
  'Meja & Kursi',
  'Elektronik',
  'Peralatan Masak',
  'Kipas & AC Portable',
  'Lampu & Dekorasi',
  'Lainnya',
];

export const CONDITION_CHECKLIST = [
  'Tidak ada minus / Mulus',
  'Ada lecet/goresan ringan',
  'Ada penyok/tekukan',
  'Warna memudar',
  'Ada noda yang tidak bisa hilang',
  'Komponen tidak lengkap',
  'Ada retakan kecil',
  'Bau yang belum hilang',
  'Fungsi berkurang (tapi masih bisa dipakai)',
];

export const SPLIT_RATIO = {
  seller: 0.85,  // 85% ke penjual
  driver: 0.10,  // 10% ke sopir
  admin:  0.05,  // 5%  ke admin/kas ReuseKos
};

/** Harga promosi produk (dipotong dari saldo penjual) */
export const PROMO_PRICE = 5000;

/** Durasi iklan aktif (hari) */
export const PROMO_DAYS = 7;
