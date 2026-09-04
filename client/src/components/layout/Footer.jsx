import React from 'react';

export default function Footer() {
  return (
    <footer style={{
      backgroundColor: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      padding: 'var(--space-4) var(--space-6)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)'
    }}>
      <p style={{ margin: 0 }}>
        © 2026 <strong>Công ty TNHH Công nghiệp Fu Sheng (Việt Nam)</strong>. Bảo lưu mọi quyền.
      </p>
      <address style={{ fontStyle: 'normal', margin: 0 }}>
        KCN Biên Hòa 2, TP. Biên Hòa, Tỉnh Đồng Nai | Phòng CNTT
      </address>
    </footer>
  );
}
