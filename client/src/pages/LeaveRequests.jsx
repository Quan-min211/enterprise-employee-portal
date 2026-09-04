import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../contexts/AuthContext';

export default function LeaveRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/leaves');
      setRequests(res.requests || []);
    } catch (err) {
      console.error('Error fetching leave requests:', err);
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
      await axiosClient.post('/leaves', formData);
      setShowModal(false);
      setFormData({ leave_type: 'annual', start_date: '', end_date: '', reason: '' });
      fetchRequests();
    } catch (err) {
      alert(err.message || 'Lỗi khi gửi đơn');
    }
  };

  const handleAction = async (id, status) => {
    const comment = prompt(`Lý do ${status === 'approved' ? 'duyệt' : 'từ chối'}:`);
    try {
      await axiosClient.patch(`/leaves/${id}/status`, { status, manager_comment: comment });
      fetchRequests();
    } catch (err) {
      alert(err.message || 'Lỗi xử lý đơn');
    }
  };

  const isManager = user?.role === 'admin' || user?.role === 'manager';

  return (
    <section aria-labelledby="leaves-heading">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 id="leaves-heading">Đơn Nghỉ Phép & Làm Thêm Giờ</h1>
          <p>Quản lý quy trình đăng ký và phê duyệt nghỉ phép trực tuyến.</p>
        </div>

        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          + Tạo đơn mới
        </button>
      </header>

      {/* Leave Request Dialog / Modal */}
      {showModal && (
        <dialog open style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
          width: '90%',
          maxWidth: '500px',
          color: 'var(--text-primary)',
          zIndex: 1000,
          boxShadow: '0 16px 32px rgba(0,0,0,0.5)'
        }}>
          <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>Đăng Ký Nghỉ Phép Mới</h2>
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label htmlFor="leave_type">Loại phép</label>
              <select
                id="leave_type"
                value={formData.leave_type}
                onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
              >
                <option value="annual">Phép năm</option>
                <option value="sick">Nghỉ ốm / Bệnh</option>
                <option value="unpaid">Nghỉ không lương</option>
                <option value="other">Lý do khác</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <div>
                <label htmlFor="start_date">Từ ngày</label>
                <input
                  id="start_date"
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="end_date">Đến ngày</label>
                <input
                  id="end_date"
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label htmlFor="reason">Lý do cụ thể</label>
              <textarea
                id="reason"
                required
                rows={3}
                placeholder="Ghi rõ lý do xin nghỉ..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                Hủy bỏ
              </button>
              <button type="submit" className="btn btn-primary">
                Gửi đơn duyệt
              </button>
            </div>
          </form>
        </dialog>
      )}

      {loading ? (
        <p>Đang tải danh sách đơn...</p>
      ) : requests.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Chưa có đơn xin nghỉ phép nào.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <caption>Lịch sử đơn nghỉ phép</caption>
            <thead>
              <tr>
                <th scope="col">Người nộp</th>
                <th scope="col">Loại phép</th>
                <th scope="col">Thời gian</th>
                <th scope="col">Lý do</th>
                <th scope="col">Trạng thái</th>
                {isManager && <th scope="col">Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td><strong>{req.applicant?.full_name}</strong> ({req.applicant?.employee_code})</td>
                  <td>{req.leave_type === 'annual' ? 'Phép năm' : req.leave_type === 'sick' ? 'Nghỉ ốm' : 'Khác'}</td>
                  <td>{req.start_date} → {req.end_date}</td>
                  <td>{req.reason}</td>
                  <td><span className={`badge badge-${req.status}`}>{req.status}</span></td>
                  {isManager && (
                    <td>
                      {req.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <button onClick={() => handleAction(req.id, 'approved')} className="btn btn-primary" style={{ padding: '2px 8px', fontSize: 'var(--text-xs)' }}>Duyệt</button>
                          <button onClick={() => handleAction(req.id, 'rejected')} className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 'var(--text-xs)', color: 'var(--danger-text)' }}>Từ chối</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Đã xử lý</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
