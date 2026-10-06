import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="empty-page" aria-labelledby="not-found-heading">
      <p className="eyebrow">404 / Không tìm thấy</p>
      <h1 id="not-found-heading">Không Tìm Thấy Trang</h1>
      <p>Đường dẫn bạn truy cập không tồn tại trong cổng thông tin nội bộ.</p>
      <Link className="btn btn-primary" to="/">Về Bảng Điều Khiển</Link>
    </section>
  );
}
