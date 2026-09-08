import React, { useEffect, useState } from 'react';
import { leavesApi } from '../api/leavesApi';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';
import { useToast } from '../contexts/ToastContext';

const leaveLabels = {
  annual: 'Phep nam',
  sick: 'Nghi om',
  unpaid: 'Nghi khong luong',
  overtime: 'Lam them gio',
  other: 'Khac'
};

export default function LeaveRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [actionTarget, setActionTarget] = useState(null);
  const [managerComment, setManagerComment] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const { pushToast } = useToast();
  const [formData, setFormData] = useState({
    request_type: 'leave',
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const fetchRequests = async (nextPage = page) => {
    setLoading(true);
    try {
      const res = await leavesApi.list({ page: nextPage, limit: 10 });
      setRequests(res.requests || []);
      setMeta({ total: res.total || 0, totalPages: res.totalPages || 1 });
      setPage(res.page || nextPage);
    } catch (err) {
      pushToast(err.message || 'Khong the tai danh sach don.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await leavesApi.create(formData);
      setShowModal(false);
      setFormData({ request_type: 'leave', leave_type: 'annual', start_date: '', end_date: '', reason: '' });
      fetchRequests();
    } catch (err) {
      pushToast(err.message || 'Loi khi gui don.', 'error');
    }
  };

  const handleAction = async () => {
    try {
      await leavesApi.updateStatus(actionTarget.id, { status: actionTarget.status, manager_comment: managerComment || null });
      setActionTarget(null);
      setManagerComment('');
      pushToast(actionTarget.status === 'approved' ? 'Da duyet don thanh cong.' : 'Da tu choi don thanh cong.', 'success');
      fetchRequests(page);
    } catch (err) {
      pushToast(err.message || 'Loi xu ly don.', 'error');
    }
  };

  const isManager = user?.role === 'admin' || user?.role === 'manager';

  return (
    <section aria-labelledby="leaves-heading">
      <header className="page-header">
        <section>
          <h1 id="leaves-heading">Don Nghi Phep & Lam Them Gio</h1>
          <p>Quan ly quy trinh dang ky va phe duyet nghi phep truc tuyen.</p>
        </section>

        <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary">
          Tao don moi
        </button>
      </header>

      {showModal && (
        <dialog open className="dialog" aria-labelledby="leave-dialog-title">
          <h2 id="leave-dialog-title">Dang Ky Yeu Cau Moi</h2>
          <form onSubmit={handleCreate}>
            <fieldset>
              <legend className="visually-hidden">Thong tin don nghi phep hoac OT</legend>

              <section className="field-group">
                <label htmlFor="request_type">Nhom yeu cau</label>
                <select
                  id="request_type"
                  value={formData.request_type}
                  onChange={(e) => setFormData({
                    ...formData,
                    request_type: e.target.value,
                    leave_type: e.target.value === 'overtime' ? 'overtime' : 'annual'
                  })}
                >
                  <option value="leave">Nghi phep</option>
                  <option value="overtime">Lam them gio (OT)</option>
                </select>
              </section>

              <section className="field-group">
                <label htmlFor="leave_type">Loai phep</label>
                <select
                  id="leave_type"
                  value={formData.leave_type}
                  disabled={formData.request_type === 'overtime'}
                  onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                >
                  <option value="annual">Phep nam</option>
                  <option value="sick">Nghi om / Benh</option>
                  <option value="unpaid">Nghi khong luong</option>
                  <option value="other">Ly do khac</option>
                  <option value="overtime">Lam them gio</option>
                </select>
              </section>

              <section className="form-grid">
                <section className="field-group">
                  <label htmlFor="start_date">Tu ngay</label>
                  <input
                    id="start_date"
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </section>
                <section className="field-group">
                  <label htmlFor="end_date">Den ngay</label>
                  <input
                    id="end_date"
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </section>
              </section>

              <section className="field-group">
                <label htmlFor="reason">Ly do cu the</label>
                <textarea
                  id="reason"
                  required
                  rows={3}
                  minLength={10}
                  placeholder="Ghi ro ly do xin nghi hoac lam them gio..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </section>

              <section className="action-row">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Huy bo
                </button>
                <button type="submit" className="btn btn-primary">
                  Gui don duyet
                </button>
              </section>
            </fieldset>
          </form>
        </dialog>
      )}

      {actionTarget && (
        <dialog open className="dialog" aria-labelledby="leave-action-dialog-title">
          <h2 id="leave-action-dialog-title">{actionTarget.status === 'approved' ? 'Duyet don' : 'Tu choi don'}</h2>
          <p>Ghi chu xu ly cho {actionTarget.applicant?.full_name || 'nhan vien'}.</p>
          <label htmlFor="manager-comment">Ghi chu</label>
          <textarea id="manager-comment" rows={4} maxLength={1000} value={managerComment} onChange={(event) => setManagerComment(event.target.value)} />
          <footer className="action-row"><button type="button" className="btn btn-secondary" onClick={() => setActionTarget(null)}>Huy</button><button type="button" className="btn btn-primary" onClick={handleAction}>Xac nhan</button></footer>
        </dialog>
      )}

      {loading ? (
        <p>Dang tai danh sach don...</p>
      ) : requests.length === 0 ? (
        <p className="muted">Chua co don xin nghi phep nao.</p>
      ) : (
        <section className="table-shell" aria-label="Bang lich su don nghi phep">
          <table>
            <caption>Lich su don nghi phep va OT</caption>
            <thead>
              <tr>
                <th scope="col">Nguoi nop</th>
                <th scope="col">Loai</th>
                <th scope="col">Thoi gian</th>
                <th scope="col">So ngay</th>
                <th scope="col">Ly do</th>
                <th scope="col">Trang thai</th>
                {isManager && <th scope="col">Thao tac</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td><strong>{request.applicant?.full_name}</strong> ({request.applicant?.employee_code})</td>
                  <td>{leaveLabels[request.leave_type] || 'Khac'}</td>
                  <td>{request.start_date} - {request.end_date}</td>
                  <td>{Number(request.day_count || 0)}</td>
                  <td>{request.reason}</td>
                  <td><mark className={`badge badge-${request.status}`}>{request.status}</mark></td>
                  {isManager && (
                    <td>
                      {request.status === 'pending' ? (
                        <section className="action-row">
                          <button type="button" onClick={() => setActionTarget({ ...request, status: 'approved' })} className="btn btn-primary compact-button">Duyet</button>
                          <button type="button" onClick={() => setActionTarget({ ...request, status: 'rejected' })} className="btn btn-secondary compact-button danger-text">Tu choi</button>
                        </section>
                      ) : (
                        <small className="muted">Da xu ly</small>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={10} onChange={fetchRequests} />
    </section>
  );
}
