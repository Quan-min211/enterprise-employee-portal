import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="empty-page" aria-labelledby="not-found-heading">
      <p className="eyebrow">404 / Not Found</p>
      <h1 id="not-found-heading">Khong tim thay trang</h1>
      <p>Duong dan ban truy cap khong ton tai trong cong thong tin noi bo.</p>
      <Link className="btn btn-primary" to="/">Ve bang dieu khien</Link>
    </section>
  );
}
