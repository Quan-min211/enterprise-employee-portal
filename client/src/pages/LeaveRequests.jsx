import React, { useEffect, useRef, useState } from 'react';
import { departmentsApi } from '../api/departmentsApi';
import { leavesApi } from '../api/leavesApi';
import Pagination from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const leaveLabels = {
  annual: 'Phép năm',
  sick: 'Nghỉ ốm / Khám bệnh',
  unpaid: 'Nghỉ không lương',
  overtime: 'Làm thêm giờ (OT)',
  other: 'Lý do khác'
};

const statusLabels = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy'
};

const initialFilters = {
  status: '',
  request_type: '',
  leave_type: '',
  department_id: '',
  date_from: '',
  date_to: ''
};

const emptyFormData = {
  request_type: 'leave',
  leave_type: 'annual',
  start_date: '',
  end_date: '',
  reason: ''
};

export default function LeaveRequests() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const createDialogRef = useRef(null);
  const actionDialogRef = useRef(null);

  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionTarget, setActionTarget] = useState(null);
  const [managerComment, setManagerComment] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [formData, setFormData] = useState(emptyFormData);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  const syncDialog = (dialogRef, isOpen, onClose) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
    dialog.oncancel = (event) => {
      event.preventDefault();
      onClose();
    };
  };

  useEffect(() => {
    syncDialog(createDialogRef, showCreateModal, () => setShowCreateModal(false));
  }, [showCreateModal]);

  useEffect(() => {
    syncDialog(actionDialogRef, Boolean(actionTarget), () => {
      setActionTarget(null);
      setManagerComment('');
    });
  }, [actionTarget]);

  const fetchRequests = async (activeFilters = filters, nextPage = page) => {
    setLoading(true);
    try {
      const cleanParams = { page: nextPage, limit: 10 };
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) cleanParams[key] = value;
      });
      const res = await leavesApi.list(cleanParams);
      setRequests(res.requests || []);
      setMeta({ total: res.total || 0, totalPages: res.totalPages || 1 });
      setPage(res.page || nextPage);
    } catch (err) {
      pushToast(err.message || 'Không thể tải danh sách đơn nghỉ phép.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(filters, 1);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      departmentsApi.list()
        .then((res) => setDepartments(res.departments || []))
        .catch((err) => pushToast(err.message || 'Không thể tải danh sách phòng ban.', 'error'));
    }
  }, [isAdmin, pushToast]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchRequests(filters, 1);
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    fetchRequests(initialFilters, 1);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await leavesApi.create(formData);
      setShowCreateModal(false);
      setFormData(emptyFormData);
      pushToast('Gửi đơn đề xuất thành công.', 'success');
      fetchRequests(filters, 1);
    } catch (err) {
      pushToast(err.message || 'Lỗi khi gửi đơn đề xuất.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async () => {
    if (!actionTarget) return;
    try {
      await leavesApi.updateStatus(actionTarget.id, {
        status: actionTarget.status,
        manager_comment: managerComment.trim() || null
      });
      setActionTarget(null);
      setManagerComment('');
      pushToast(
        actionTarget.status === 'approved' ? 'Đã duyệt đơn thành công.' : 'Đã từ chối đơn thành công.',
        'success'
      );
      fetchRequests(filters, page);
    } catch (err) {
      pushToast(err.message || 'Lỗi xử lý duyệt đơn.', 'error');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Bạn có chắc muốn hủy đơn này không?')) return;
    try {
      await leavesApi.cancel(id);
      pushToast('Đã hủy đơn thành công.', 'success');
      fetchRequests(filters, page);
    } catch (err) {
      pushToast(err.message || 'Không thể hủy đơn.', 'error');
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const activeFilters = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value) activeFilters[key] = value;
      });
      const blob = await leavesApi.exportCsv(activeFilters);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `danh-sach-don-phep-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      pushToast('Đã xuất báo cáo CSV thành công.', 'success');
    } catch (err) {
      pushToast(err.message || 'Không thể xuất báo cáo CSV.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section aria-labelledby="leaves-heading">
      <header className="page-header">
        <section>
          <p className="eyebrow">Quy trình nhân sự Fu Sheng</p>
          <h1 id="leaves-heading">Đơn Nghỉ Phép & Làm Thêm Giờ</h1>
          <p>
            Quản lý quy trình đăng ký, tra cứu và phê duyệt đơn nghỉ phép, tăng ca trực tuyến.
          </p>
        </section>

        <section className="action-row">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            Tạo đơn mới
          </button>
          {isManager && (
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="btn btn-secondary"
            >
              {isExporting ? 'Đang xuất CSV...' : 'Xuất báo cáo CSV'}
            </button>
          )}
        </section>
      </header>

      {/* Filter panel */}
      <search aria-label="Bộ lọc tìm kiếm đơn nghỉ phép">
        <form className="panel filter-panel" onSubmit={handleFilterSubmit}>
          <fieldset>
            <legend className="visually-hidden">Tùy chọn lọc đơn</legend>
            <section className="form-grid leave-filter-grid">
              <section className="field-group">
                <label htmlFor="filter-status">Trạng thái</label>
                <select
                  id="filter-status"
                  value={filters.status}
                  onChange={(e) => setFilters((curr) => ({ ...curr, status: e.target.value }))}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="pending">Chờ duyệt</option>
                  <option value="approved">Đã duyệt</option>
                  <option value="rejected">Từ chối</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </section>

              <section className="field-group">
                <label htmlFor="filter-req-type">Nhóm yêu cầu</label>
                <select
                  id="filter-req-type"
                  value={filters.request_type}
                  onChange={(e) => setFilters((curr) => ({ ...curr, request_type: e.target.value }))}
                >
                  <option value="">Tất cả nhóm</option>
                  <option value="leave">Nghỉ phép</option>
                  <option value="overtime">Làm thêm giờ (OT)</option>
                </select>
              </section>

              <section className="field-group">
                <label htmlFor="filter-leave-type">Loại phép</label>
                <select
                  id="filter-leave-type"
                  value={filters.leave_type}
                  onChange={(e) => setFilters((curr) => ({ ...curr, leave_type: e.target.value }))}
                >
                  <option value="">Tất cả loại phép</option>
                  <option value="annual">Phép năm</option>
                  <option value="sick">Nghỉ ốm / Khám bệnh</option>
                  <option value="unpaid">Nghỉ không lương</option>
                  <option value="overtime">Tăng ca</option>
                  <option value="other">Khác</option>
                </select>
              </section>

              {isAdmin && (
                <section className="field-group">
                  <label htmlFor="filter-dept">Phòng ban</label>
                  <select
                    id="filter-dept"
                    value={filters.department_id}
                    onChange={(e) => setFilters((curr) => ({ ...curr, department_id: e.target.value }))}
                  >
                    <option value="">Tất cả phòng ban</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </section>
              )}

              <section className="field-group">
                <label htmlFor="filter-date-from">Từ ngày</label>
                <input
                  id="filter-date-from"
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters((curr) => ({ ...curr, date_from: e.target.value }))}
                />
              </section>

              <section className="field-group">
                <label htmlFor="filter-date-to">Đến ngày</label>
                <input
                  id="filter-date-to"
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters((curr) => ({ ...curr, date_to: e.target.value }))}
                />
              </section>
            </section>

            <section className="filter-actions">
              <button type="submit" className="btn btn-primary">
                Lọc dữ liệu
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-secondary"
              >
                Đặt lại
              </button>
              <data value={meta.total} className="shift-stat">
                Tìm thấy <strong>{meta.total}</strong> đơn
              </data>
            </section>
          </fieldset>
        </form>
      </search>

      {/* Main Table */}
      {loading ? (
        <section className="table-shell" aria-busy="true" aria-label="Đang tải dữ liệu đơn">
          <p className="skeleton skeleton-title"></p>
          <p className="skeleton skeleton-card"></p>
          <p className="skeleton skeleton-card"></p>
        </section>
      ) : requests.length === 0 ? (
        <figure className="empty-state" role="status">
          <figcaption>
            <strong className="empty-title">Không tìm thấy đơn nào</strong>
            <p className="muted">
              Không có bản ghi phù hợp với điều kiện lọc hiện tại. Thử thay đổi điều kiện hoặc tạo đơn mới.
            </p>
          </figcaption>
        </figure>
      ) : (
        <section className="table-shell" aria-label="Bảng danh sách đơn nghỉ phép và tăng ca">
          <table>
            <caption>Lịch sử đơn nghỉ phép và làm thêm giờ</caption>
            <thead>
              <tr>
                <th scope="col">Mã đơn</th>
                <th scope="col">Người nộp</th>
                <th scope="col">Phòng ban</th>
                <th scope="col">Phân loại</th>
                <th scope="col">Thời gian</th>
                <th scope="col">Số ngày</th>
                <th scope="col">Lý do</th>
                <th scope="col">Trạng thái</th>
                {isManager && <th scope="col">Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <code>#{request.id}</code>
                  </td>
                  <td>
                    <strong>{request.applicant?.full_name || 'N/A'}</strong>
                    <br />
                    <small className="muted">{request.applicant?.employee_code}</small>
                  </td>
                  <td>
                    {request.applicant?.department?.name || (
                      <span className="muted">Chưa phân bổ</span>
                    )}
                  </td>
                  <td>
                    <strong>
                      {request.request_type === 'overtime' ? 'Tăng ca' : 'Nghỉ phép'}
                    </strong>
                    <br />
                    <small className="muted">{leaveLabels[request.leave_type] || request.leave_type}</small>
                  </td>
                  <td>
                    <time dateTime={request.start_date}>{request.start_date}</time>
                    <br />
                    <small className="muted">đến</small>{' '}
                    <time dateTime={request.end_date}>{request.end_date}</time>
                  </td>
                  <td>
                    <strong>{Number(request.day_count || 0)}</strong> ngày
                    {request.ot_hours && (
                      <small className="muted" style={{ display: 'block' }}>
                        {Number(request.ot_hours)} giờ OT
                      </small>
                    )}
                  </td>
                  <td>
                    <p className="table-reason-text">{request.reason}</p>
                    {request.manager_comment && (
                      <small className="manager-note">
                        <strong>QL:</strong> {request.manager_comment}
                      </small>
                    )}
                  </td>
                  <td>
                    <mark className={`badge badge-${request.status}`}>
                      {statusLabels[request.status] || request.status}
                    </mark>
                  </td>
                  {isManager && (
                    <td>
                      {request.status === 'pending' ? (
                        <section className="action-row">
                          <button
                            type="button"
                            onClick={() => setActionTarget({ ...request, status: 'approved' })}
                            className="btn btn-primary compact-button"
                            aria-label={`Duyệt đơn số ${request.id} của ${request.applicant?.full_name}`}
                          >
                            Duyệt
                          </button>
                          <button
                            type="button"
                            onClick={() => setActionTarget({ ...request, status: 'rejected' })}
                            className="btn btn-secondary compact-button danger-text"
                            aria-label={`Từ chối đơn số ${request.id} của ${request.applicant?.full_name}`}
                          >
                            Từ chối
                          </button>
                        </section>
                      ) : (
                        <small className="muted">
                          {request.approver?.full_name ? `Bởi ${request.approver.full_name}` : 'Đã xử lý'}
                        </small>
                      )}
                    </td>
                  )}
                  {/* Nút hủy cho nhân viên với đơn pending của chính mình */}
                  {!isManager && request.user_id === user?.id && request.status === 'pending' && (
                    <td>
                      <button
                        type="button"
                        onClick={() => handleCancel(request.id)}
                        className="btn btn-secondary compact-button danger-text"
                        aria-label={`Hủy đơn số ${request.id}`}
                      >
                        Hủy đơn
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <Pagination
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        limit={10}
        onChange={(nextPage) => fetchRequests(filters, nextPage)}
      />

      {/* Dialog tạo đơn mới */}
      <dialog ref={createDialogRef} className="dialog dialog-wide" aria-labelledby="create-dialog-title">
        <header className="dialog-header">
          <h2 id="create-dialog-title">Đăng Ký Đơn Nghỉ Phép / Tăng Ca</h2>
          <p>Điền thông tin chi tiết để gửi cấp quản lý phê duyệt trực tuyến.</p>
        </header>
        <form onSubmit={handleCreate}>
          <fieldset disabled={submitting}>
            <legend className="visually-hidden">Biểu mẫu đăng ký đơn mới</legend>

            <section className="form-grid">
              <section className="field-group">
                <label htmlFor="req-type-input">Nhóm yêu cầu</label>
                <select
                  id="req-type-input"
                  value={formData.request_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      request_type: e.target.value,
                      leave_type: e.target.value === 'overtime' ? 'overtime' : 'annual'
                    })
                  }
                >
                  <option value="leave">Nghỉ phép</option>
                  <option value="overtime">Làm thêm giờ (OT)</option>
                </select>
              </section>

              <section className="field-group">
                <label htmlFor="leave-type-input">Loại phép</label>
                <select
                  id="leave-type-input"
                  value={formData.leave_type}
                  disabled={formData.request_type === 'overtime'}
                  onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                >
                  <option value="annual">Phép năm</option>
                  <option value="sick">Nghỉ ốm / Khám bệnh</option>
                  <option value="unpaid">Nghỉ không lương</option>
                  <option value="other">Lý do khác</option>
                  <option value="overtime">Làm thêm giờ (OT)</option>
                </select>
              </section>

              <section className="field-group">
                <label htmlFor="start-date-input">Từ ngày</label>
                <input
                  id="start-date-input"
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </section>

              <section className="field-group">
                <label htmlFor="end-date-input">Đến ngày</label>
                <input
                  id="end-date-input"
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </section>
            </section>

            <section className="field-group">
              <label htmlFor="reason-input">Lý do cụ thể</label>
              <textarea
                id="reason-input"
                required
                rows={3}
                minLength={10}
                maxLength={1000}
                placeholder="Ghi rõ lý do xin nghỉ phép hoặc nhiệm vụ tăng ca..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </section>

            <footer className="action-row">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn btn-secondary"
              >
                Hủy bỏ
              </button>
              <button type="submit" className="btn btn-primary">
                {submitting ? 'Đang gửi...' : 'Gửi đơn duyệt'}
              </button>
            </footer>
          </fieldset>
        </form>
      </dialog>

      {/* Dialog duyệt / từ chối */}
      <dialog ref={actionDialogRef} className="dialog" aria-labelledby="action-dialog-title">
        <header className="dialog-header">
          <h2 id="action-dialog-title">
            {actionTarget?.status === 'approved' ? 'Phê Duyệt Đơn' : 'Từ Chối Đơn'}
          </h2>
          <p>
            Đơn của nhân viên <strong>{actionTarget?.applicant?.full_name}</strong> (#{actionTarget?.id}).
          </p>
        </header>

        <section className="field-group">
          <label htmlFor="manager-comment-input">Ghi chú phê duyệt (tùy chọn)</label>
          <textarea
            id="manager-comment-input"
            rows={3}
            maxLength={1000}
            placeholder="Nhập ghi chú hoặc lý do từ chối gửi nhân viên..."
            value={managerComment}
            onChange={(e) => setManagerComment(e.target.value)}
          />
        </section>

        <footer className="action-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setActionTarget(null)}
          >
            Hủy
          </button>
          <button
            type="button"
            className={`btn ${actionTarget?.status === 'approved' ? 'btn-primary' : 'btn-danger'}`}
            onClick={handleAction}
          >
            {actionTarget?.status === 'approved' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
          </button>
        </footer>
      </dialog>
    </section>
  );
}
