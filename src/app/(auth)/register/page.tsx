'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Hand, Rocket } from 'lucide-react';
import { databases, DATABASE_ID, PROFILES_ID } from '@/lib/appwrite';
import { ID } from 'appwrite';
import { useAuth } from '@/lib/AuthContext';
import styles from '../auth.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    jurusan: '',
    whatsapp: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleNext = () => {
    if (step === 0) {
      if (!form.full_name.trim() || !form.jurusan.trim()) {
        setError('Nama dan jurusan wajib diisi');
        return;
      }
    }
    setError('');
    setStep(prev => prev + 1);
  };

  const handleSubmit = async () => {
    if (!form.whatsapp.trim()) {
      setError('Nomor WhatsApp wajib diisi');
      return;
    }
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      await databases.createDocument(
        DATABASE_ID,
        PROFILES_ID,
        ID.unique(),
        {
          user_id: user.$id,
          email: user.email,
          full_name: form.full_name.trim(),
          jurusan: form.jurusan.trim(),
          whatsapp: form.whatsapp.trim(),
          role: 'buyer', // Default role, can be upgraded to seller from profile
        }
      );

      await refreshProfile();
      router.push('/beranda');
    } catch (insertError: any) {
      setError(insertError.message);
      setLoading(false);
    }
  };

  const steps = ['Info Diri', 'Kontak'];

  return (
    <div className={styles.authPage}>
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      {/* Header */}
      <div style={{ marginTop: 32, marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          Lengkapi Profil <Hand size={24} />
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Satu langkah lagi untuk mulai transaksi
        </p>
      </div>

      {/* Step indicator */}
      <div className={styles.stepIndicator}>
        {steps.map((s, i) => (
          <div
            key={s}
            className={`${styles.step} ${i <= step ? styles.stepActive : styles.stepInactive}`}
          />
        ))}
      </div>

      <div className={styles.authCard}>
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Step 0: Info Diri */}
        {step === 0 && (
          <div className={styles.formStack}>
            <p className={styles.authCardTitle}>Info Dirimu</p>
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input
                id="input-fullname"
                type="text"
                className="form-input"
                placeholder="Muhammad Arief..."
                value={form.full_name}
                onChange={e => handleChange('full_name', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Jurusan / Prodi</label>
              <input
                id="input-jurusan"
                type="text"
                className="form-input"
                placeholder="Teknik Informatika"
                value={form.jurusan}
                onChange={e => handleChange('jurusan', e.target.value)}
              />
            </div>
            <button id="btn-next-0" className="btn btn-primary btn-full" onClick={handleNext}>
              Lanjut <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Step 1: Kontak + Submit */}
        {step === 1 && (
          <div className={styles.formStack}>
            <p className={styles.authCardTitle}>Nomor WhatsApp</p>
            <p className={styles.authCardSubtitle}>
              Untuk koordinasi transaksi dengan pembeli/penjual
            </p>
            <div className="form-group">
              <label className="form-label">Nomor WA</label>
              <input
                id="input-whatsapp"
                type="tel"
                className="form-input"
                placeholder="0812 3456 7890"
                value={form.whatsapp}
                onChange={e => handleChange('whatsapp', e.target.value)}
                inputMode="tel"
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setStep(0)} style={{ flex: 1 }}>
                Kembali
              </button>
              <button
                id="btn-submit-register"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={loading}
                style={{ flex: 2 }}
              >
                {loading ? <span className="spinner" /> : <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Mulai Sekarang <Rocket size={16} /></span>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
