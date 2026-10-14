import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, total, limit, onChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);
  return (
    <nav className="pagination" aria-label="Phan trang danh sach">
      <p>Hien thi {first}-{last} / {total} ket qua</p>
      <menu className="action-row">
        <button
          type="button"
          className="btn btn-secondary compact-button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Trước
        </button>
        <output aria-label="Trang hien tai">Trang {page} / {totalPages}</output>
        <button
          type="button"
          className="btn btn-secondary compact-button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Trang sau"
        >
          Sau
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </menu>
    </nav>
  );
}
