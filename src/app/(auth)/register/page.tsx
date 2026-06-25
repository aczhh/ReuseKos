'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, BookOpen, Phone, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import styles from '../auth.module.css';

const roles = [
  { value: 'buyer', emoji: '🎒', title: 'Maba / Pembeli', desc: 'Cari perabot kos murah' },
  { value: 'seller', emoji: '🏠', title: 'Kating / Penjual', desc: 'Jual perabot kos lamamu' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    jurusan: '',
    whatsapp: '',
    role: '',
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
    if (step === 1) {
      if (!form.whatsapp.trim()) {
        setError('Nomor WhatsApp wajib diisi');
        return;
      }
    }
    setError('');
    setStep(prev => prev + 1);
  };

  const handleSubmit = async () => {
    if (!form.role) {
      setError('Pilih peranmu dulu');
      return;
    }
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    const { error: insertError } = await supabase.from('profiles').insert({
      user_id: user.id,
      email: user.email,
      full_name: form.full_name.trim(),
      jurusan: form.jurusan.trim(),
      whatsapp: form.whatsapp.trim(),
      role: form.role,
      saldo: 0,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push('/beranda');
  };

  const steps = ['Info Diri', 'Kontak', 'Peranmu'];

  return (
    <div className={styles.authPage}>
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      {/* Header */}
      <div style={{ marginTop: 32, marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>
          Lengkapi Profil 👋
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

        {/* Step 1: Kontak */}
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
              <button id="btn-next-1" className="btn btn-primary" onClick={handleNext} style={{ flex: 2 }}>
                Lanjut <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Role */}
        {step === 2 && (
          <div className={styles.formStack}>
            <p className={styles.authCardTitle}>Kamu siapa?</p>
            <p className={styles.authCardSubtitle}>
              Pilih peranmu di ReuseKos
            </p>
            <div className={styles.roleGrid}>
              {roles.map(r => (
                <button
                  key={r.value}
                  id={`role-${r.value}`}
                  className={`${styles.roleCard} ${form.role === r.value ? styles.selected : ''}`}
                  onClick={() => handleChange('role', r.value)}
                >
                  <span className={styles.roleEmoji}>{r.emoji}</span>
                  <span className={styles.roleTitle}>{r.title}</span>
                  <span className={styles.roleDesc}>{r.desc}</span>
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Kamu bisa ubah peran kapan saja di Profil
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>
                Kembali
              </button>
              <button
                id="btn-submit-register"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={loading}
                style={{ flex: 2 }}
              >
                {loading ? <span className="spinner" /> : 'Mulai Sekarang 🚀'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
