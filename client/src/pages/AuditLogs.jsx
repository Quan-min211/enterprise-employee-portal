import React, { useEffect, useState } from 'react';
import { Filter, ScrollText } from 'lucide-react';
import { auditLogsApi } from '../api/auditLogsApi';
import Pagination from '../components/Pagination';
import TableSkeleton, { EmptyState } from '../components/TableSkeleton';
import { useToast } from '../contexts/ToastContext';

const AUDIT_COLUMNS = ['Thời gian', 'Người thực hiện', 'Hành động', 'Đối tượng', 'IP & Trace ID', 'Chi tiết'];

const initialFilters = { action: '', entity_type: '', date_from: '', date_to: '', ip_address: '' };

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  const fetchLogs = async (page = meta.page) => {
    setLoading(true);
    try {
      const res = await auditLogsApi.list({ ...filters, page, limit: 20 });
      setLogs(res.logs || []);
      setMeta({ page: res.page || page, totalPages: res.totalPages || 1, total: res.total || 0 });
    } catch (error) {
      pushToast(error.message || 'Khong the tai nhat ky he thong.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(1); }, [filters.action, filters.entity_type, filters.date_from, filters.date_to, filters.ip_address]);

  return (
    <section aria-labelledby="audit-heading">
      <header className="page-header">
        <hgroup>
          <p className="eyebrow">Compliance / Admin only</p>
          <h1 id="audit-heading">Nhat Ky He Thong</h1>
          <p>Tra cuu ai da thuc hien hanh dong nao tren cong thong tin noi bo.</p>
        </hgroup>
      </header>

      <search aria-label="Bộ lọc nhật ký hệ thống">
        <form className="panel filter-panel" onSubmit={(event) => { event.preventDefault(); fetchLogs(1); }}>
          <fieldset>
            <legend className="visually-hidden">Bo loc nhat ky</legend>
            <div className="form-grid audit-filter-grid">
              <p className="field-group"><label htmlFor="audit_action">Hanh dong</label><input id="audit_action" value={filters.action} placeholder="VD: auth.login" onChange={(event) => setFilters({ ...filters, action: event.target.value })} /></p>
              <p className="field-group"><label htmlFor="audit_entity">Doi tuong</label><input id="audit_entity" value={filters.entity_type} placeholder="VD: user" onChange={(event) => setFilters({ ...filters, entity_type: event.target.value })} /></p>
              <p className="field-group"><label htmlFor="audit_ip">Địa chỉ IP</label><input id="audit_ip" value={filters.ip_address} placeholder="VD: 127.0.0.1" onChange={(event) => setFilters({ ...filters, ip_address: event.target.value })} /></p>
              <p className="field-group"><label htmlFor="audit_from">Tu ngay</label><input id="audit_from" type="date" value={filters.date_from} onChange={(event) => setFilters({ ...filters, date_from: event.target.value })} /></p>
              <p className="field-group"><label htmlFor="audit_to">Den ngay</label><input id="audit_to" type="date" value={filters.date_to} onChange={(event) => setFilters({ ...filters, date_to: event.target.value })} /></p>
            </div>
            <footer className="action-row">
              <button type="submit" className="btn btn-primary">
                <Filter size={15} aria-hidden="true" />
                Lọc nhật ký
              </button>
            </footer>
          </fieldset>
        </form>
      </search>

      {loading ? (
        <TableSkeleton columns={AUDIT_COLUMNS} rows={6} label="Đang tải nhật ký hệ thống" />
      ) : logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="Chưa có bản ghi" description="Không tìm thấy nhật ký phù hợp với điều kiện lọc." />
      ) : (
        <section className="table-shell admin-audit-table" aria-label="Bang nhat ky he thong">
          <table className="responsive-table">
            <caption>Danh sach hoat dong he thong</caption>
            <thead><tr><th scope="col">Thoi gian</th><th scope="col">Nguoi thuc hien</th><th scope="col">Hanh dong</th><th scope="col">Doi tuong</th><th scope="col">IP &amp; Trace ID</th><th scope="col">Chi tiet</th></tr></thead>
            <tbody>{logs.map((log) => <tr key={log.id}>
              <td data-label="Thời gian"><time dateTime={log.created_at}>{new Date(log.created_at).toLocaleString('vi-VN')}</time></td>
              <td data-label="Người thực hiện">{log.actor ? `${log.actor.full_name} (${log.actor.employee_code})` : 'System'}</td>
              <td data-label="Hành động"><code>{log.action}</code></td>
              <td data-label="Đối tượng">{log.entity_type} #{log.entity_id || '-'}</td>
              <td data-label="IP & Trace ID">
                {log.ip_address ? <code>{log.ip_address}</code> : '-'}
                {log.request_id && (
                  <>
                    <br />
                    <small title={`Request ID: ${log.request_id}`} className="text-muted">
                      <code>{log.request_id.slice(0, 8)}...</code>
                    </small>
                  </>
                )}
              </td>
              <td data-label="Chi tiết"><code>{log.details ? JSON.stringify(log.details) : '-'}</code></td>
            </tr>)}</tbody>
          </table>
        </section>
      )}
      <Pagination {...meta} limit={20} onChange={fetchLogs} />
    </section>
  );
}

