import React, { useEffect, useState } from 'react';
import { auditLogsApi } from '../api/auditLogsApi';
import Pagination from '../components/Pagination';
import { useToast } from '../contexts/ToastContext';

const initialFilters = { action: '', entity_type: '', date_from: '', date_to: '' };

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

  useEffect(() => { fetchLogs(1); }, [filters.action, filters.entity_type, filters.date_from, filters.date_to]);

  return (
    <section aria-labelledby="audit-heading">
      <header className="page-header">
        <section>
          <p className="eyebrow">Compliance / Admin only</p>
          <h1 id="audit-heading">Nhat Ky He Thong</h1>
          <p>Tra cuu ai da thuc hien hanh dong nao tren cong thong tin noi bo.</p>
        </section>
      </header>

      <form className="panel filter-panel" onSubmit={(event) => { event.preventDefault(); fetchLogs(1); }}>
        <fieldset>
          <legend className="visually-hidden">Bo loc nhat ky</legend>
          <section className="form-grid audit-filter-grid">
            <section className="field-group"><label htmlFor="audit_action">Hanh dong</label><input id="audit_action" value={filters.action} placeholder="VD: auth.login" onChange={(event) => setFilters({ ...filters, action: event.target.value })} /></section>
            <section className="field-group"><label htmlFor="audit_entity">Doi tuong</label><input id="audit_entity" value={filters.entity_type} placeholder="VD: user" onChange={(event) => setFilters({ ...filters, entity_type: event.target.value })} /></section>
            <section className="field-group"><label htmlFor="audit_from">Tu ngay</label><input id="audit_from" type="date" value={filters.date_from} onChange={(event) => setFilters({ ...filters, date_from: event.target.value })} /></section>
            <section className="field-group"><label htmlFor="audit_to">Den ngay</label><input id="audit_to" type="date" value={filters.date_to} onChange={(event) => setFilters({ ...filters, date_to: event.target.value })} /></section>
          </section>
          <button type="submit" className="btn btn-primary">Loc nhat ky</button>
        </fieldset>
      </form>

      {loading ? <p>Dang tai nhat ky...</p> : logs.length === 0 ? <p className="empty-state">Chua co ban ghi phu hop.</p> : (
        <section className="table-shell" aria-label="Bang nhat ky he thong">
          <table>
            <caption>Danh sach hoat dong he thong</caption>
            <thead><tr><th scope="col">Thoi gian</th><th scope="col">Nguoi thuc hien</th><th scope="col">Hanh dong</th><th scope="col">Doi tuong</th><th scope="col">Chi tiet</th></tr></thead>
            <tbody>{logs.map((log) => <tr key={log.id}>
              <td><time dateTime={log.created_at}>{new Date(log.created_at).toLocaleString('vi-VN')}</time></td>
              <td>{log.actor ? `${log.actor.full_name} (${log.actor.employee_code})` : 'System'}</td>
              <td><code>{log.action}</code></td>
              <td>{log.entity_type} #{log.entity_id || '-'}</td>
              <td><code>{log.details ? JSON.stringify(log.details) : '-'}</code></td>
            </tr>)}</tbody>
          </table>
        </section>
      )}
      <Pagination {...meta} limit={20} onChange={fetchLogs} />
    </section>
  );
}
