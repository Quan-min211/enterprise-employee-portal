import React from 'react';

export default function Pagination({ page, totalPages, total, limit, onChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);
  return (
    <nav className="pagination" aria-label="Phan trang danh sach">
      <p>Hien thi {first}-{last} / {total} ket qua</p>
      <section className="action-row">
        <button type="button" className="btn btn-secondary compact-button" disabled={page <= 1} onClick={() => onChange(page - 1)}>Truoc</button>
        <output aria-label="Trang hien tai">Trang {page} / {totalPages}</output>
        <button type="button" className="btn btn-secondary compact-button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Sau</button>
      </section>
    </nav>
  );
}
