'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from '../auth.module.css';

function isValidAcadEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.ac\.id$/.test(email.toLowerCase());
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidAcadEmail(email)) {
      setError('Gunakan email kampus kamu (contoh: nama@mahasiswa.univ.ac.id)');
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }
    });

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const token = otp.join('');
    if (token.length < 6) {
      setError('Masukkan 6 digit kode OTP');
      return;
    }

    setLoading(true);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (verifyError) {
      setError('Kode salah atau sudah expired. Coba kirim ulang.');
      setLoading(false);
      return;
    }

    // Cek apakah sudah punya profil
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', data.user.id)
        .single();

      if (profile) {
        router.push('/beranda');
      } else {
        router.push('/register');
      }
    }
    setLoading(false);
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <div className={styles.authHeader}>
        <div className={styles.logoWrapper}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="white" opacity="0.9"/>
            <path d="M9 22V12h6v10" fill="rgba(0,0,0,0.4)"/>
          </svg>
        </div>
        <h1 className={styles.appName}>ReuseKos</h1>
        <p className={styles.appTagline}>Marketplace perabot kos khusus mahasiswa</p>
      </div>

      <div className={styles.authCard}>
        {!sent ? (
          <>
            <h2 className={styles.authCardTitle}>Masuk / Daftar</h2>
            <p className={styles.authCardSubtitle}>
              Gunakan email kampus .ac.id kamu
            </p>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                <ShieldCheck size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSendOtp} className={styles.formStack}>
              <div className="form-group">
                <label className="form-label">Email Kampus</label>
                <div className={styles.emailInputWrapper}>
                  <Mail size={18} className={styles.emailIcon} />
                  <input
                    id="email-input"
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: '44px' }}
                    placeholder="nama@mahasiswa.univ.ac.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
                <span className="form-hint">
                  Hanya email berakhiran <strong>.ac.id</strong> yang diterima
                </span>
              </div>

              <button
                id="btn-send-otp"
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : (
                  <>Kirim Kode OTP <ArrowRight size={18} /></>
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className={styles.authCardTitle}>Cek Email Kamu</h2>
            <p className={styles.authCardSubtitle}>
              Kode 6 digit terkirim ke <strong>{email}</strong>
            </p>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className={styles.formStack}>
              <div className={styles.otpWrapper}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className={`${styles.otpBox} ${digit ? styles.filled : ''}`}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button
                id="btn-verify-otp"
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : 'Verifikasi & Masuk'}
              </button>
            </form>

            <div className={styles.resendWrapper}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setSent(false); setOtp(['','','','','','']); }}
              >
                Ganti email / Kirim ulang
              </button>
            </div>
          </>
        )}
      </div>

      <p className={styles.authFooter}>
        Dengan masuk, kamu setuju dengan{' '}
        <span className={styles.authLink}>Syarat & Ketentuan</span> ReuseKos
      </p>
    </div>
  );
}
