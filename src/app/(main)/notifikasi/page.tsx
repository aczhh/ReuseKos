'use client';

import { Bell } from 'lucide-react';

export default function NotifikasiPage() {
  return (
    <div style={{ minHeight: '100dvh', paddingTop: 'var(--navbar-height)', paddingBottom: 'var(--bottom-nav-height)' }}>
      <div style={{ padding: '24px 16px' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 4 }}>
          Notifikasi
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 24 }}>
          Update transaksi & penawaran terbaru
        </p>

        <div className="empty-state">
          <div className="empty-state-icon">
            <Bell size={28} style={{ color: 'var(--text-muted)' }} />
          </div>
          <p style={{ fontWeight: 600 }}>Tidak ada notifikasi</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Kamu akan mendapat notif saat ada transaksi baru
          </p>
        </div>
      </div>
    </div>
  );
}
