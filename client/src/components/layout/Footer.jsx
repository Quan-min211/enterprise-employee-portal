import React from 'react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <section className="footer-company-info">
        <p>
          &copy; 2026 <strong>Công ty TNHH Công nghiệp Fu Sheng (Việt Nam)</strong>. Bảo lưu mọi quyền.
        </p>
        <address>KCN Biên Hòa 2, TP. Biên Hòa, Tỉnh Đồng Nai | Phòng Công Nghệ Thông Tin</address>
      </section>
      <section className="footer-system-info">
        <aside className="footer-status-pill" aria-label="Bảo mật kết nối nội bộ">
          <mark className="footer-status-dot" aria-hidden="true" />
          <small>Hệ thống HRM &bull; ERP Nội bộ</small>
        </aside>
        <small className="footer-version-tag">v1.4.0 &bull; TLS 1.3</small>
      </section>
    </footer>
  );
}

