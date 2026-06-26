'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { account, databases, DATABASE_ID, PROFILES_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import styles from '../auth.module.css';

export default function CallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Memverifikasi akun Google kamu...');

  useEffect(() => {
    const checkGoogleSession = async () => {
      try {
        // Ambil data user yang login saat ini (dibuat otomatis oleh Appwrite OAuth)
        const currentUser = await account.get();
        const email = currentUser.email.toLowerCase();

        // Cek apakah email berakhiran .ac.id
        if (!email.endsWith('.ac.id')) {
          // Jika bukan .ac.id, hapus sesinya dan kembalikan ke halaman login
          await account.deleteSession('current');
          router.replace('/login?error=non_academic');
          return;
        }

        setStatus('Berhasil login! Memeriksa profil...');

        // Jika email .ac.id, cek apakah sudah punya profil
        const response = await databases.listDocuments(
          DATABASE_ID,
          PROFILES_ID,
          [Query.equal('user_id', currentUser.$id), Query.limit(1)]
        );

        if (response.documents.length > 0) {
          // Profil sudah ada, redirect ke beranda
          window.location.href = '/beranda';
        } else {
          // Profil belum ada, redirect ke register
          window.location.href = '/register';
        }

      } catch (error) {
        console.error('Session error:', error);
        router.replace('/login?error=failed');
      }
    };

    checkGoogleSession();
  }, [router]);

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard} style={{ textAlign: 'center', padding: '40px' }}>
        <span className="spinner" style={{ width: 40, height: 40, borderBottomColor: 'var(--primary)', marginBottom: 20 }}></span>
        <h3 style={{ marginTop: 20 }}>{status}</h3>
      </div>
    </div>
  );
}
