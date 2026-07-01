'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import { account, databases, DATABASE_ID, PROFILES_ID } from '@/lib/appwrite';
import { ID, Query, OAuthProvider } from 'appwrite';
import styles from '../auth.module.css';

function isValidAcadEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.ac\.id$/.test(email.toLowerCase());
}

function ErrorHandler({ setError }: { setError: (msg: string) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'non_academic') {
      setError('Akses ditolak: Gunakan email Google kampus yang berakhiran .ac.id');
    } else if (errorParam === 'failed') {
      setError('Login Google gagal atau dibatalkan.');
    }
  }, [searchParams, setError]);

  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [userId, setUserId] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      // Hapus sesi lama jika ada
      try { await account.deleteSession('current'); } catch (_) { }

      account.createOAuth2Session(
        OAuthProvider.Google,
        `${window.location.origin}/callback`, // Success URL
        `${window.location.origin}/login?error=failed` // Failure URL
      );
    } catch (err: any) {
      setError('Gagal memulai login Google.');
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidAcadEmail(email)) {
      setError('Gunakan email kampus kamu (contoh: nama@mahasiswa.univ.ac.id)');
      return;
    }

    setLoading(true);
    try {
      // Use ID.unique() for new users. If the email exists, Appwrite handles it.
      const sessionToken = await account.createEmailToken({
        userId: ID.unique(),
        email: email,
      });
      setUserId(sessionToken.userId);
      setSent(true);
    } catch (authError: any) {
      setError(authError.message || 'Gagal mengirim kode OTP.');
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
    try {
      // Delete any active session first so returning users can always log back in
      try {
        await account.deleteSession('current');
      } catch (_) {
        // Ignore – no session existed, that's fine
      }

      await account.createSession({
        userId: userId,
        secret: token,
      });

      // Get the actual userId from the newly created session
      const currentUser = await account.get();

      // Check if profile already exists (returning user vs new user)
      const response = await databases.listDocuments(
        DATABASE_ID,
        PROFILES_ID,
        [Query.equal('user_id', currentUser.$id), Query.limit(1)]
      );

      // Pakai window.location untuk force full reload supaya AuthContext baca sesi baru
      if (response.documents.length > 0) {
        window.location.href = '/beranda';
      } else {
        window.location.href = '/register';
      }
    } catch (verifyError: any) {
      console.error('OTP Verify Error:', verifyError);
      const msg = verifyError?.message || 'Kode salah atau sudah expired.';
      setError(`${msg} Coba kirim ulang OTP.`);
    }
    setLoading(false);
  };

  return (
    <div className={styles.authPage}>
      <Suspense fallback={null}>
        <ErrorHandler setError={setError} />
      </Suspense>

      <div className={styles.blob1} />
      <div className={styles.blob2} />

      {/* Back to Beranda button */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Link
          href="/beranda"
          className="btn btn-ghost btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}
        >
          <ArrowLeft size={16} /> Kembali ke Beranda
        </Link>
      </div>

      <div className={styles.authHeader} style={{ marginTop: 16 }}>
        <Image
          src="/logo.png"
          alt="ReuseKos Logo"
          width={286}
          height={70}
          className={styles.mainLogo}
          priority
        />
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

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '16px 0', position: 'relative' }}>
                <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--bg-card)', padding: '0 8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>ATAU</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className={`btn btn-full ${styles.btnGoogle}`}
                disabled={loading}
                style={{ marginBottom: '12px' }}
              >
                <Image src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width={20} height={20} />
                Lanjutkan dengan Google
              </button>

            </div>
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
                onClick={() => { setSent(false); setOtp(['', '', '', '', '', '']); }}
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
