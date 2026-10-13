import React from 'react';
import { Inbox } from 'lucide-react';

/**
 * Shared skeleton loader cho bảng dữ liệu.
 * @param {string[]} columns - mảng tên cột hiển thị ở thead
 * @param {number}   rows    - số dòng skeleton (mặc định 5)
 * @param {string}   label   - aria-label mô tả vùng đang tải
 */
export default function TableSkeleton({ columns = [], rows = 5, label = 'Đang tải dữ liệu...' }) {
  return (
    <section className="table-shell" aria-label={label} aria-busy="true">
      <table className="skeleton-table responsive-table">
        <caption className="visually-hidden">{label}</caption>
        {columns.length > 0 && (
          <thead>
            <tr>
              {columns.map((col) => (
                <th scope="col" key={col}>{col}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }, (_, rowIdx) => (
            <tr key={rowIdx} aria-hidden="true">
              {(columns.length > 0 ? columns : Array.from({ length: 4 })).map((col, colIdx) => (
                <td key={colIdx} data-label={typeof col === 'string' ? col : ''}>
                  <mark className="skeleton skeleton-line" aria-hidden="true" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/**
 * Shared empty-state cho kết quả rỗng.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title = 'Không có dữ liệu',
  description = 'Không tìm thấy bản ghi phù hợp.',
  action
}) {
  return (
    <figure className="empty-state" role="status">
      <figcaption>
        <mark className="empty-state-icon" aria-hidden="true">
          <Icon size={36} strokeWidth={1.5} />
        </mark>
        <strong className="empty-title">{title}</strong>
        {description && <p className="muted">{description}</p>}
        {action}
      </figcaption>
    </figure>
  );
}
