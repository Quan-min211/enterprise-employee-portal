import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/dashboardApi';
import { leaveBalancesApi } from '../api/leavesApi';
import { useAuth } from '../contexts/AuthContext';

const leaveLabels = {
  annual: 'Phép năm',
  sick: 'Nghỉ ốm',
  unpaid: 'Nghỉ không lương',
  overtime: 'Làm thêm giờ (OT)',
  other: 'Khác'
};

const statusLabels = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy'
};

const roleLabels = {
  admin: 'Quản trị viên',
  manager: 'Quản lý bộ phận',
  employee: 'Nhân viên'
};

export default function Dashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalDepartments: 0,
    leaveStatus: { pending: 0, approved: 0, rejected: 0 },
    recentAnnouncements: [],
    recentLeaves: [],
    pendingActionItems: [],
    departmentLoad: []
  });
  const [leaveBalance, setLeaveBalance] = useState(null);

  const isEmployee = user?.role === 'employee';
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    document.title = 'Tổng quan hệ thống | Fu Sheng Portal';

    const fetchAll = async () => {
      try {
        const [dashRes, balRes] = await Promise.allSettled([
          dashboardApi.getSummary(),
          isEmployee ? leaveBalancesApi.getMyBalance({ year: new Date().getFullYear() }) : Promise.resolve(null)
        ]);

        if (dashRes.status === 'fulfilled' && dashRes.value?.summary) {
          setStats(dashRes.value.summary);
        }
        if (balRes.status === 'fulfilled' && balRes.value) {
          setLeaveBalance(balRes.value?.balance ?? balRes.value ?? null);
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, [isEmployee]);

  const totalLeaveRequests = Object.values(stats.leaveStatus).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );
  const processedLeaveRequests =
    Number(stats.leaveStatus.approved || 0) + Number(stats.leaveStatus.rejected || 0);
  const approvalRate =
    totalLeaveRequests > 0 ? Math.round((processedLeaveRequests / totalLeaveRequests) * 100) : 0;

  const chartRows = [
    { key: 'pending', label: 'Chờ duyệt', value: stats.leaveStatus.pending, className: 'warning' },
    { key: 'approved', label: 'Đã duyệt', value: stats.leaveStatus.approved, className: 'success' },
    { key: 'rejected', label: 'Từ chối', value: stats.leaveStatus.rejected, className: 'danger' }
  ];

  const todayFormatted = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  /* ------------------------------------------------------------------ */
  /* Employee leave-balance summary card                                  */
  /* ------------------------------------------------------------------ */
  const EmployeeLeaveCard = () => {
    if (!isEmployee) return null;

    const remaining = leaveBalance?.remaining_days ?? null;
    const entitlement = leaveBalance?.annual_entitlement ?? null;
    const used = leaveBalance?.used_days ?? null;
    const carriedOver = leaveBalance?.carried_over_days ?? 0;

    const pctUsed =
      entitlement > 0 ? Math.min(Math.round(((used ?? 0) / entitlement) * 100), 100) : 0;

    return (
      <article className="metric-card employee-balance-card" aria-label="Ngày phép còn lại của tôi">
        <header>
          <h2>Ngày Phép Còn Lại</h2>
          <data value={new Date().getFullYear()} className="badge badge-accent">
            Năm {new Date().getFullYear()}
          </data>
        </header>

        {isLoading ? (
          <p className="skeleton skeleton-title" aria-hidden="true"></p>
        ) : remaining !== null ? (
          <>
            <data value={remaining} className="metric-value">
              {remaining}
              <small> ngày</small>
            </data>
            <p className="metric-caption">
              Đã dùng {used ?? 0} / {entitlement ?? 0} ngày
              {carriedOver > 0 ? ` (+ ${carriedOver} ngày chuyển tiếp)` : ''}
            </p>
            <meter
              min="0"
              max="100"
              value={pctUsed}
              className={pctUsed >= 80 ? 'danger' : pctUsed >= 50 ? 'warning' : 'success'}
              aria-label={`Đã sử dụng ${pctUsed}% số ngày phép`}
            >
              {pctUsed}%
            </meter>
          </>
        ) : (
          <p className="muted">Chưa có dữ liệu số dư phép năm.</p>
        )}
      </article>
    );
  };

  return (
    <section aria-labelledby="dashboard-heading">
      <header className="page-header">
        <section>
          <p className="eyebrow">Cổng thông tin nội bộ Fu Sheng</p>
          <h1 id="dashboard-heading">Tổng Quan Hệ Thống</h1>
          <p>
            Chào mừng trở lại, <strong>{user?.full_name || 'Cán bộ / Nhân viên'}</strong>.
            Vai trò: <mark className="badge badge-accent">{roleLabels[user?.role] || user?.role}</mark>
          </p>
        </section>
        <aside className="shift-brief" aria-label="Tóm tắt ca vận hành">
          <header>
            <strong>Ca hành chính</strong>
            <time dateTime={new Date().toISOString().split('T')[0]}>{todayFormatted}</time>
          </header>
          <data value={approvalRate} className="shift-stat">
            <strong>{approvalRate}%</strong> đơn đã xử lý ({processedLeaveRequests}/{totalLeaveRequests})
          </data>
        </aside>
      </header>

      {/* Quick Actions Bar */}
      <nav className="quick-actions-grid" aria-label="Lối tắt thao tác nhanh">
        <Link to="/leaves" className="quick-action-link">
          <strong>📝 Đăng Ký Đơn Mới</strong>
          <small>Nộp đề xuất nghỉ phép hoặc làm thêm giờ trực tuyến</small>
        </Link>
        <Link to="/employees" className="quick-action-link">
          <strong>👥 Tra Cứu Danh Bạ</strong>
          <small>Tìm kiếm danh bạ nhân sự và thông tin liên lạc</small>
        </Link>
        {isManager && (
          <Link to="/leaves" className="quick-action-link highlight">
            <strong>⚡ Duyệt Đơn Chờ ({stats.leaveStatus.pending})</strong>
            <small>Xử lý cấp tốc các yêu cầu nghỉ phép đang chờ phê duyệt</small>
          </Link>
        )}
        {isManager && (
          <Link to="/leaves" className="quick-action-link">
            <strong>📊 Xuất Báo Cáo CSV</strong>
            <small>Lọc dữ liệu và trích xuất báo cáo nhân sự theo thời gian</small>
          </Link>
        )}
      </nav>

      {/* Metric summary cards */}
      <section className="metrics-grid" aria-label="Thống kê tổng hợp">
        {/* Employee: show leave balance card first */}
        {isEmployee && <EmployeeLeaveCard />}

        <article className="metric-card">
          <header>
            <h2>Tổng Nhân Sự</h2>
            <data value="active" className="badge badge-accent">Hoạt động</data>
          </header>
          {isLoading ? (
            <p className="skeleton skeleton-title" aria-hidden="true"></p>
          ) : (
            <data value={stats.totalEmployees} className="metric-value">
              {stats.totalEmployees}
            </data>
          )}
          <p className="metric-caption">Toàn bộ nhà máy</p>
        </article>

        <article className="metric-card warning">
          <header>
            <h2>Đơn Chờ Duyệt</h2>
            <data value="pending" className="badge badge-warning">Cần xử lý</data>
          </header>
          {isLoading ? (
            <p className="skeleton skeleton-title" aria-hidden="true"></p>
          ) : (
            <data value={stats.leaveStatus.pending} className="metric-value">
              {stats.leaveStatus.pending}
            </data>
          )}
          <p className="metric-caption">
            {isEmployee ? 'Đơn của tôi đang chờ' : 'Nghỉ phép & tăng ca'}
          </p>
        </article>

        {!isEmployee && (
          <article className="metric-card success">
            <header>
              <h2>Phòng Ban</h2>
              <data value="active" className="badge badge-success">Bộ phận</data>
            </header>
            {isLoading ? (
              <p className="skeleton skeleton-title" aria-hidden="true"></p>
            ) : (
              <data value={stats.totalDepartments} className="metric-value">
                {stats.totalDepartments}
              </data>
            )}
            <p className="metric-caption">Cơ cấu tổ chức</p>
          </article>
        )}

        <article className="metric-card">
          <header>
            <h2>Tỷ Lệ Xử Lý</h2>
            <data value={approvalRate} className="badge badge-accent">Hiệu suất</data>
          </header>
          {isLoading ? (
            <p className="skeleton skeleton-title" aria-hidden="true"></p>
          ) : (
            <data value={approvalRate} className="metric-value">
              {approvalRate}%
            </data>
          )}
          <p className="metric-caption">{processedLeaveRequests}/{totalLeaveRequests} đơn hoàn tất</p>
        </article>
      </section>

      {/* Main dashboard panels (2-column bento grid) */}
      <section className="dashboard-grid" aria-label="Bảng điều hành chi tiết">
        {/* Panel 1: Pending Action Items */}
        <section className="panel" aria-labelledby="action-items-heading">
          <header className="panel-header">
            <h2 id="action-items-heading">
              {isManager ? 'Đơn Cần Duyệt Gấp' : 'Đơn Của Tôi Đang Chờ'}
            </h2>
            <data value={stats.pendingActionItems?.length || 0} className="badge badge-warning">
              {stats.pendingActionItems?.length || 0} đơn
            </data>
          </header>
          {isLoading ? (
            <section className="stack" aria-hidden="true">
              <p className="skeleton skeleton-card"></p>
              <p className="skeleton skeleton-card"></p>
            </section>
          ) : (stats.pendingActionItems?.length || 0) === 0 ? (
            <figure className="empty-state" role="status">
              <figcaption>
                <strong className="empty-title">Không có đơn chờ xử lý</strong>
                <p className="muted">
                  {isManager
                    ? 'Tuyệt vời! Tất cả đơn nghỉ phép và tăng ca đã được giải quyết.'
                    : 'Bạn hiện không có đơn nào đang chờ duyệt.'}
                </p>
              </figcaption>
            </figure>
          ) : (
            <section className="stack" aria-label="Danh sách đơn cần xử lý">
              {stats.pendingActionItems.map((item) => (
                <article key={item.id} className="action-item-card">
                  <header>
                    <section>
                      <strong>{item.applicant?.full_name || 'Nhân viên'}</strong>
                      <small className="muted"> ({item.applicant?.employee_code || `#${item.id}`})</small>
                    </section>
                    <mark className="badge badge-pending">Chờ duyệt</mark>
                  </header>
                  <p className="action-item-desc">
                    <strong>{item.request_type === 'overtime' ? 'Tăng ca' : leaveLabels[item.leave_type] || item.leave_type}:</strong>{' '}
                    {item.reason}
                  </p>
                  <footer>
                    <small className="muted">
                      Từ <time dateTime={item.start_date}>{item.start_date}</time> đến{' '}
                      <time dateTime={item.end_date}>{item.end_date}</time> ({Number(item.day_count || 0)} ngày)
                    </small>
                    <Link to="/leaves" className="btn btn-primary compact-button">
                      {isManager ? 'Xử lý ngay' : 'Xem chi tiết'}
                    </Link>
                  </footer>
                </article>
              ))}
            </section>
          )}
        </section>

        {/* Panel 2: Status Chart */}
        <section className="panel" aria-labelledby="leave-chart-heading">
          <header className="panel-header">
            <h2 id="leave-chart-heading">Trạng Thái Đơn Phép</h2>
            <data value={totalLeaveRequests} className="badge badge-subtle">
              {totalLeaveRequests} đơn tổng cộng
            </data>
          </header>
          <figure className="status-chart" role="figure" aria-label="Biểu đồ trạng thái đơn nghỉ phép">
            <figcaption className="sr-only">Biểu đồ phân bố đơn phép theo trạng thái xử lý</figcaption>
            {chartRows.map((row) => {
              const width =
                totalLeaveRequests > 0
                  ? Math.max((row.value / totalLeaveRequests) * 100, row.value > 0 ? 8 : 0)
                  : 0;

              return (
                <article className="chart-row" key={row.key}>
                  <header>
                    <strong>{row.label}</strong>
                    <data value={row.value} className="chart-count">
                      {row.value} đơn ({totalLeaveRequests > 0 ? Math.round((row.value / totalLeaveRequests) * 100) : 0}%)
                    </data>
                  </header>
                  <meter
                    min="0"
                    max="100"
                    value={width}
                    className={row.className}
                    aria-label={`${row.label}: ${row.value} đơn`}
                  >
                    {Math.round(width)}%
                  </meter>
                </article>
              );
            })}
          </figure>
        </section>

        {/* Panel 3: Recent Leave Requests */}
        <section className="panel" aria-labelledby="recent-leaves-heading">
          <header className="panel-header">
            <h2 id="recent-leaves-heading">
              {isEmployee ? 'Đơn Gần Đây Của Tôi' : 'Đơn Gần Đây'}
            </h2>
            <Link to="/leaves" className="badge badge-accent">
              Xem tất cả →
            </Link>
          </header>
          {isLoading ? (
            <section className="stack" aria-hidden="true">
              <p className="skeleton skeleton-card"></p>
              <p className="skeleton skeleton-card"></p>
            </section>
          ) : (stats.recentLeaves?.length || 0) === 0 ? (
            <figure className="empty-state" role="status">
              <figcaption>
                <strong className="empty-title">Chưa có đơn nào gần đây</strong>
                <p className="muted">Lịch sử gửi đơn mới sẽ được hiển thị tại đây.</p>
              </figcaption>
            </figure>
          ) : (
            <section className="table-shell" aria-label="Bảng các đơn gần đây">
              <table>
                <caption className="visually-hidden">Danh sách đơn gần đây</caption>
                <thead>
                  <tr>
                    {!isEmployee && <th scope="col">Người nộp</th>}
                    <th scope="col">Loại</th>
                    <th scope="col">Từ ngày</th>
                    <th scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentLeaves.map((req) => (
                    <tr key={req.id}>
                      {!isEmployee && (
                        <td>
                          <strong>{req.applicant?.full_name || 'N/A'}</strong>
                          <br />
                          <small className="muted">{req.applicant?.department?.name || 'Nhà máy'}</small>
                        </td>
                      )}
                      <td>
                        <small>
                          {req.request_type === 'overtime' ? 'Tăng ca' : leaveLabels[req.leave_type] || req.leave_type}
                        </small>
                      </td>
                      <td>
                        <small>{req.start_date}</small>
                      </td>
                      <td>
                        <mark className={`badge badge-${req.status}`}>
                          {statusLabels[req.status] || req.status}
                        </mark>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </section>

        {/* Panel 4: Recent Announcements */}
        <section className="panel" aria-labelledby="announcements-heading">
          <header className="panel-header">
            <h2 id="announcements-heading">Thông Báo Mới Nhất</h2>
            <data value={stats.recentAnnouncements.length} className="badge badge-subtle">
              {stats.recentAnnouncements.length} tin
            </data>
          </header>
          {isLoading ? (
            <section className="stack" aria-hidden="true">
              <p className="skeleton skeleton-card"></p>
              <p className="skeleton skeleton-card"></p>
            </section>
          ) : stats.recentAnnouncements.length === 0 ? (
            <figure className="empty-state" role="status">
              <figcaption>
                <strong className="empty-title">Không có thông báo mới</strong>
                <p className="muted">Tất cả thông báo vận hành sẽ được cập nhật tại đây.</p>
              </figcaption>
            </figure>
          ) : (
            <section className="stack" aria-label="Danh sách thông báo mới">
              {stats.recentAnnouncements.map((ann) => {
                const priorityLabels = {
                  urgent: 'Khẩn cấp',
                  important: 'Quan trọng',
                  normal: 'Thông thường'
                };
                return (
                  <article key={ann.id} className={`announcement-card ${ann.priority}`}>
                    <header>
                      <section>
                        <h3>{ann.title}</h3>
                        <time dateTime={ann.createdAt}>
                          {new Date(ann.createdAt).toLocaleDateString('vi-VN')}
                        </time>
                      </section>
                      <data value={ann.priority} className={`badge badge-${ann.priority}`}>
                        {priorityLabels[ann.priority] || ann.priority}
                      </data>
                    </header>
                    <p>{ann.content}</p>
                  </article>
                );
              })}
            </section>
          )}
        </section>

        {/* Panel 5: Department Load Distribution */}
        {stats.departmentLoad?.length > 0 && (
          <section className="panel" aria-labelledby="dept-load-heading">
            <header className="panel-header">
              <h2 id="dept-load-heading">Phân Bổ Theo Bộ Phận</h2>
              <data value={stats.departmentLoad.length} className="badge badge-subtle">
                {stats.departmentLoad.length} bộ phận
              </data>
            </header>
            <section className="stack" aria-label="Thống kê khối lượng đơn theo bộ phận">
              {stats.departmentLoad.map((item) => (
                <article key={item.department} className="dept-load-row">
                  <header>
                    <strong>{item.department}</strong>
                    <data value={item.total}>{item.total} đơn</data>
                  </header>
                  <meter
                    min="0"
                    max={Math.max(...stats.departmentLoad.map((d) => d.total), 1)}
                    value={item.total}
                    aria-label={`${item.department}: ${item.total} đơn`}
                  >
                    {item.total}
                  </meter>
                </article>
              ))}
            </section>
          </section>
        )}

        {/* Panel 6: System Operations */}
        <section className="panel" aria-labelledby="ops-heading">
          <header className="panel-header">
            <h2 id="ops-heading">Vận Hành Kỹ Thuật</h2>
            <data value="online" className="badge badge-success">Online</data>
          </header>
          <dl className="ops-list">
            <dt>Cơ chế phân quyền</dt>
            <dd>RBAC (Admin, Quản lý, Nhân viên)</dd>
            <dt>Xác thực bảo mật</dt>
            <dd>JWT HttpOnly Cookie (Chống XSS/CSRF)</dd>
            <dt>Hệ quản trị CSDL</dt>
            <dd>MySQL 8.0 + Sequelize ORM (utf8mb4)</dd>
            <dt>Xuất dữ liệu</dt>
            <dd>Báo cáo CSV UTF-8 kèm ký tự BOM Excel</dd>
          </dl>
        </section>
      </section>
    </section>
  );
}
