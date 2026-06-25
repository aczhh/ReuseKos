'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, Video, Check, MapPin, ChevronLeft, ChevronRight,
  X, AlertTriangle, Image as ImageIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { PRODUCT_CATEGORIES, CONDITION_CHECKLIST } from '@/lib/utils';
import styles from './jual.module.css';

const STEPS = ['Info Barang', 'Foto & Video', 'Kondisi', 'Lokasi'];

interface FormData {
  title: string;
  description: string;
  price: string;
  category: string;
  photos: File[];
  photoUrls: string[];
  video: File | null;
  videoUrl: string | null;
  conditions: string[];
  lat: number | null;
  lng: number | null;
  address: string;
}

export default function JualPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>({
    title: '', description: '', price: '', category: '',
    photos: [], photoUrls: [], video: null, videoUrl: null,
    conditions: [], lat: null, lng: null, address: '',
  });

  const progressPercent = ((step + 1) / STEPS.length) * 100;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (form.photos.length + files.length > 5) {
      setError('Maksimal 5 foto');
      return;
    }
    const newFiles = [...form.photos, ...files].slice(0, 5);
    const newUrls = newFiles.map(f => URL.createObjectURL(f));
    setForm(prev => ({ ...prev, photos: newFiles, photoUrls: newUrls }));
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Cek durasi video (max 10 detik)
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      if (video.duration > 10) {
        setError('Video maksimal 10 detik!');
        return;
      }
      setForm(prev => ({
        ...prev,
        video: file,
        videoUrl: URL.createObjectURL(file)
      }));
    };
    video.src = URL.createObjectURL(file);
  };

  const removePhoto = (index: number) => {
    const newPhotos = form.photos.filter((_, i) => i !== index);
    const newUrls = form.photoUrls.filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, photos: newPhotos, photoUrls: newUrls }));
  };

  const toggleCondition = (condition: string) => {
    setForm(prev => ({
      ...prev,
      conditions: prev.conditions.includes(condition)
        ? prev.conditions.filter(c => c !== condition)
        : [...prev.conditions, condition]
    }));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Browser tidak support geolocation');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({
          ...prev,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`
        }));
        setLoading(false);
      },
      () => {
        setError('Tidak bisa mendapatkan lokasi. Pastikan izin lokasi diberikan.');
        setLoading(false);
      }
    );
  };

  const validateStep = (): boolean => {
    setError('');
    if (step === 0) {
      if (!form.title.trim()) { setError('Judul wajib diisi'); return false; }
      if (!form.category) { setError('Pilih kategori'); return false; }
      if (!form.price || Number(form.price) <= 0) { setError('Harga tidak valid'); return false; }
    }
    if (step === 1) {
      if (form.photos.length === 0) { setError('Upload minimal 1 foto'); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage.from('reusekos').upload(path, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('reusekos').getPublicUrl(path);
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!user || !profile) { router.push('/login'); return; }
    if (!form.lat) { setError('Tentukan lokasi kamu dulu'); return; }

    setLoading(true);
    setError('');

    try {
      // Upload photos
      const photoUrls: string[] = [];
      for (let i = 0; i < form.photos.length; i++) {
        const url = await uploadFile(
          form.photos[i],
          `photos/${user.id}/${Date.now()}_${i}.jpg`
        );
        photoUrls.push(url);
      }

      // Upload video
      let videoUrl: string | null = null;
      if (form.video) {
        videoUrl = await uploadFile(
          form.video,
          `videos/${user.id}/${Date.now()}.mp4`
        );
      }

      // Insert product
      const { error: insertError } = await supabase.from('products').insert({
        seller_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        category: form.category,
        photos: photoUrls,
        video_url: videoUrl,
        conditions: form.conditions,
        lat: form.lat,
        lng: form.lng,
        address: form.address,
        is_sold: false,
      });

      if (insertError) throw insertError;
      router.push('/beranda');
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (val: string) => val.replace(/[^0-9]/g, '');

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>🏷️ Buka Lapak</h1>
        <p className={styles.headerSub}>Langkah {step + 1} dari {STEPS.length}: <strong>{STEPS[step]}</strong></p>
      </div>

      {/* Progress */}
      <div className={styles.progress}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>
        <div className={styles.stepLabels}>
          {STEPS.map((s, i) => (
            <span key={s} className={`${styles.stepLabel} ${i === step ? styles.stepLabelActive : ''}`}>
              {s}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ margin: '0 16px 16px' }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Step 0: Info Barang */}
      {step === 0 && (
        <div className={styles.formBody}>
          <div className="form-group">
            <label className="form-label">Judul Barang</label>
            <input
              id="input-title"
              className="form-input"
              placeholder="Kasur single spring bed ukuran 90x200"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Kategori</label>
            <select
              id="select-category"
              className="form-input form-select"
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            >
              <option value="">Pilih kategori...</option>
              {PRODUCT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Harga (Rp)</label>
            <div className={styles.priceWrapper}>
              <span className={styles.priceCurrency}>Rp</span>
              <input
                id="input-price"
                className={`form-input ${styles.priceInput}`}
                inputMode="numeric"
                placeholder="150.000"
                value={form.price ? Number(form.price).toLocaleString('id-ID') : ''}
                onChange={e => setForm(p => ({ ...p, price: formatPrice(e.target.value) }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Deskripsi</label>
            <textarea
              id="input-description"
              className="form-input form-textarea"
              placeholder="Ceritakan kondisi barang, dimensi, tahun beli, alasan dijual..."
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={4}
            />
          </div>
        </div>
      )}

      {/* Step 1: Foto & Video */}
      {step === 1 && (
        <div className={styles.formBody}>
          {/* Photo upload */}
          <div className="form-group">
            <label className="form-label">Foto Barang (Maks. 5)</label>
            <div
              id="photo-upload-area"
              className={styles.uploadArea}
              onClick={() => photoInputRef.current?.click()}
            >
              <div className={styles.uploadIcon}><ImageIcon size={22} /></div>
              <p className={styles.uploadTitle}>Tap untuk upload foto</p>
              <p className={styles.uploadHint}>JPG, PNG • Maks 5 foto</p>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handlePhotoSelect}
            />

            {form.photoUrls.length > 0 && (
              <div className={styles.photoGrid}>
                {form.photoUrls.map((url, i) => (
                  <div key={i} className={styles.photoItem}>
                    <img src={url} alt={`foto-${i}`} className={styles.photoImg} />
                    <button
                      className={styles.photoRemove}
                      onClick={() => removePhoto(i)}
                      aria-label="Hapus foto"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Video upload */}
          <div className="form-group">
            <label className="form-label">Video (Maks. 10 detik)</label>
            {!form.videoUrl ? (
              <div
                id="video-upload-area"
                className={styles.uploadArea}
                onClick={() => videoInputRef.current?.click()}
              >
                <div className={styles.uploadIcon}><Video size={22} /></div>
                <p className={styles.uploadTitle}>Tap untuk upload video</p>
                <p className={styles.uploadHint}>MP4 • Maksimal 10 detik • Opsional</p>
              </div>
            ) : (
              <div className={styles.videoPreview}>
                <video src={form.videoUrl} controls />
                <span className={styles.videoLabel}><Video size={12} /> Preview</span>
                <button
                  className={styles.photoRemove}
                  style={{ top: 8, right: 8 }}
                  onClick={() => setForm(p => ({ ...p, video: null, videoUrl: null }))}
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={handleVideoSelect}
            />
          </div>
        </div>
      )}

      {/* Step 2: Kondisi Minus */}
      {step === 2 && (
        <div className={styles.formBody}>
          <div>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>Deklarasi Kondisi Minus</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Centang kondisi yang sesuai. Kejujuran membangun kepercayaan! ✅
            </p>
            <div className={styles.checkList}>
              {CONDITION_CHECKLIST.map(cond => {
                const checked = form.conditions.includes(cond);
                return (
                  <button
                    key={cond}
                    id={`cond-${cond.slice(0, 10).replace(/\s/g, '-')}`}
                    className={`${styles.checkItem} ${checked ? styles.checkItemChecked : ''}`}
                    onClick={() => toggleCondition(cond)}
                  >
                    <div className={`${styles.checkbox} ${checked ? styles.checkboxChecked : ''}`}>
                      {checked && <Check size={12} color="white" />}
                    </div>
                    <span className={styles.checkLabel}>{cond}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {form.conditions.length === 0 && (
            <div className="alert alert-success">
              <Check size={16} /> Mantap! Barang dalam kondisi baik sempurna.
            </div>
          )}
        </div>
      )}

      {/* Step 3: Lokasi */}
      {step === 3 && (
        <div className={styles.formBody}>
          <div>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>Lokasi Kos Kamu</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Digunakan untuk menghitung ongkos kirim ke pembeli
            </p>

            <div className={styles.mapContainer}>
              {form.lat && form.lng ? (
                <div style={{
                  height: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(193,68,14,0.08))'
                }}>
                  <MapPin size={32} style={{ color: 'var(--terra-500)' }} />
                  <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>Lokasi Terdeteksi ✅</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                  </p>
                </div>
              ) : (
                <div className={styles.mapFallback}>
                  <MapPin size={28} />
                  <p style={{ fontSize: '0.875rem' }}>Belum ada lokasi</p>
                </div>
              )}
            </div>

            <div className={styles.locationInfo}>
              <MapPin size={16} style={{ color: 'var(--terra-500)', flexShrink: 0 }} />
              <span>{form.lat ? form.address : 'Tap tombol di bawah untuk mendeteksi lokasi'}</span>
            </div>

            <button
              id="btn-detect-location"
              className="btn btn-secondary btn-full"
              onClick={detectLocation}
              disabled={loading}
              style={{ marginTop: 10 }}
            >
              {loading ? <span className="spinner" /> : (
                <><MapPin size={16} /> Deteksi Lokasi Saya</>
              )}
            </button>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Nama Alamat (opsional)</label>
              <input
                id="input-address"
                className="form-input"
                placeholder="Kos Melati, Jl. Mawar No. 5..."
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        {step > 0 && (
          <button className="btn btn-ghost" onClick={handleBack} style={{ flex: 1 }}>
            <ChevronLeft size={18} /> Kembali
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            id="btn-next-step"
            className="btn btn-primary"
            onClick={handleNext}
            style={{ flex: 2 }}
          >
            Lanjut <ChevronRight size={18} />
          </button>
        ) : (
          <button
            id="btn-submit-product"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{ flex: 2 }}
          >
            {loading ? <span className="spinner" /> : '🚀 Pasang Iklan!'}
          </button>
        )}
      </div>
    </div>
  );
}
