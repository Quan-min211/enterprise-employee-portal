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

const priorityLabels = {
  urgent: 'Khẩn cấp',
  important: 'Quan trọng',
  normal: 'Thông thường'
};

const auditActionLabels = {
  'auth.login': { label: 'Đăng nhập', className: 'badge-info' },
  'auth.logout': { label: 'Đăng xuất', className: 'badge-subtle' },
  'leave.create': { label: 'Tạo đơn phép', className: 'badge-accent' },
  'leave.export': { label: 'Xuất CSV phép', className: 'badge-normal' },
  'leave.approved': { label: 'Duyệt đơn phép', className: 'badge-approved' },
  'leave.rejected': { label: 'Từ chối đơn phép', className: 'badge-rejected' },
  'leave.cancelled': { label: 'Hủy đơn phép', className: 'badge-cancelled' },
  'leave_balance.update': { label: 'Chỉnh số dư phép', className: 'badge-warning' },
  'holiday.create': { label: 'Thêm ngày lễ', className: 'badge-success' },
  'holiday.update': { label: 'Sửa ngày lễ', className: 'badge-warning' },
  'holiday.delete': { label: 'Xóa ngày lễ', className: 'badge-danger' },
  'employee.create': { label: 'Thêm nhân viên', className: 'badge-success' },
  'employee.update': { label: 'Sửa nhân viên', className: 'badge-warning' },
  'employee.deactivate': { label: 'Khóa tài khoản', className: 'badge-danger' },
  'employee.profile.update': { label: 'Cập nhật hồ sơ', className: 'badge-accent' },
  'employee.password.change': { label: 'Đổi mật khẩu', className: 'badge-warning' },
  'department.create': { label: 'Thêm phòng ban', className: 'badge-success' },
  'department.update': { label: 'Sửa phòng ban', className: 'badge-warning' },
  'department.delete': { label: 'Xóa phòng ban', className: 'badge-danger' },
  'announcement.create': { label: 'Đăng thông báo', className: 'badge-success' },
  'announcement.update': { label: 'Sửa thông báo', className: 'badge-warning' },
  'announcement.delete': { label: 'Xóa thông báo', className: 'badge-danger' }
};

const holidayTypeLabels = {
  national: 'Nghỉ lễ Quốc gia',
  company: 'Lịch Công ty',
  maintenance: 'Bảo trì nhà máy'
};

/* Sort: urgent trước important */
const sortByPriority = (a, b) => {
  const order = { urgent: 0, important: 1, normal: 2 };
  return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
};

const formatAuditAction = (action) => {
  return auditActionLabels[action] || { label: action || 'Thao tác', className: 'badge-subtle' };
};

const formatAuditDetails = (log) => {
  if (!log?.details) return '-';
  if (typeof log.details === 'string') return log.details;
  if (typeof log.details === 'object') {
    if (log.details.full_name) return log.details.full_name;
    if (log.details.title) return log.details.title;
    if (log.details.name) return log.details.name;
    if (log.details.email) return log.details.email;
    if (log.details.reason) return log.details.reason;
    if (log.details.status) return `Trạng thái: ${log.details.status}`;
    try {
      const entries = Object.entries(log.details);
      if (entries.length > 0) return `${entries[0][0]}: ${entries[0][1]}`;
    } catch {
      return '-';
    }
  }
  return '-';
};

const formatUptime = (seconds) => {
  if (!seconds || seconds <= 0) return 'Vừa khởi động';
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} ngày ${h} giờ`;
  if (h > 0) return `${h} giờ ${m} phút`;
  return `${m} phút`;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalDepartments: 0,
    leaveStatus: { pending: 0, approved: 0, rejected: 0, cancelled: 0 },
    recentAnnouncements: [],
    recentLeaves: [],
    pendingActionItems: [],
    departmentLoad: [],
    // manager extras
    deptEmployeeCount: null,
    deptInfo: null,
    urgentAnnouncements: [],
    // admin extras
    adminData: null
  });
  const [leaveBalance, setLeaveBalance] = useState(null);

  const isEmployee = user?.role === 'employee';
  const isPureManager = user?.role === 'manager';
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    document.title = 'Tổng quan hệ thống | Fu Sheng Portal';

    const fetchAll = async () => {
      try {
        const [dashRes, balRes] = await Promise.allSettled([
          dashboardApi.getSummary(),
          isEmployee
            ? leaveBalancesApi.getMyBalance({ year: new Date().getFullYear() })
            : Promise.resolve(null)
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
    Number(stats.leaveStatus.approved || 0) +
    Number(stats.leaveStatus.rejected || 0) +
    Number(stats.leaveStatus.cancelled || 0);
  const approvalRate =
    totalLeaveRequests > 0
      ? Math.round((processedLeaveRequests / totalLeaveRequests) * 100)
      : 0;

  const chartRows = [
    { key: 'pending', label: 'Chờ duyệt', value: stats.leaveStatus.pending, className: 'warning' },
    { key: 'approved', label: 'Đã duyệt', value: stats.leaveStatus.approved, className: 'success' },
    { key: 'rejected', label: 'Từ chối', value: stats.leaveStatus.rejected, className: 'danger' },
    { key: 'cancelled', label: 'Đã hủy', value: stats.leaveStatus.cancelled || 0, className: '' }
  ];

  const todayFormatted = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  /* ------------------------------------------------------------------ */
  /* Reusable: Skeleton                                                   */
  /* ------------------------------------------------------------------ */
  const SkeletonCards = ({ count = 2 }) => (
    <section className="stack" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <p key={i} className="skeleton skeleton-card"></p>
      ))}
    </section>
  );

  /* ------------------------------------------------------------------ */
  /* Employee widget: số ngày phép còn lại                               */
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

  /* ------------------------------------------------------------------ */
  /* Manager widget: nhân sự phòng ban                                   */
  /* ------------------------------------------------------------------ */
  const ManagerDeptCard = () => {
    if (!isPureManager) return null;

    const deptName = stats.deptInfo?.name || 'Phòng ban của tôi';
    const count = stats.deptEmployeeCount;

    return (
      <article
        className="metric-card manager-dept-card"
        aria-label={`Nhân sự phòng ban ${deptName}`}
      >
        <header>
          <h2>Nhân Sự Phòng Ban</h2>
          <data value={stats.deptInfo?.code ?? ''} className="badge badge-accent">
            {stats.deptInfo?.code || 'BP'}
          </data>
        </header>

        {isLoading ? (
          <p className="skeleton skeleton-title" aria-hidden="true"></p>
        ) : count !== null ? (
          <>
            <data value={count} className="metric-value">
              {count}
              <small> nhân viên</small>
            </data>
            <p className="metric-caption">{deptName}</p>
          </>
        ) : (
          <p className="muted">Chưa được phân công phòng ban.</p>
        )}
      </article>
    );
  };

  /* ------------------------------------------------------------------ */
  /* Manager panel: thông báo quan trọng                                 */
  /* ------------------------------------------------------------------ */
  const UrgentAnnouncementsPanel = () => {
    if (!isPureManager) return null;

    const sorted = [...(stats.urgentAnnouncements ?? [])].sort(sortByPriority);

    return (
      <section className="panel panel-urgent" aria-labelledby="urgent-ann-heading">
        <header className="panel-header">
          <h2 id="urgent-ann-heading">⚠️ Thông Báo Quan Trọng</h2>
          <data
            value={sorted.length}
            className={`badge ${sorted.some((a) => a.priority === 'urgent') ? 'badge-danger' : 'badge-warning'}`}
          >
            {sorted.length} tin
          </data>
        </header>

        {isLoading ? (
          <SkeletonCards count={2} />
        ) : sorted.length === 0 ? (
          <figure className="empty-state" role="status">
            <figcaption>
              <strong className="empty-title">Không có thông báo khẩn</strong>
              <p className="muted">Hiện tại không có thông báo quan trọng hoặc khẩn cấp.</p>
            </figcaption>
          </figure>
        ) : (
          <section className="stack" aria-label="Danh sách thông báo quan trọng">
            {sorted.map((ann) => (
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
                {ann.author && (
                  <footer>
                    <small className="muted">Đăng bởi: {ann.author.full_name}</small>
                  </footer>
                )}
              </article>
            ))}
          </section>
        )}
      </section>
    );
  };

  /* ------------------------------------------------------------------ */
  /* Admin widget: Audit Logs Panel                                      */
  /* ------------------------------------------------------------------ */
  const AdminAuditPanel = () => {
    if (!isAdmin) return null;

    const auditData = stats.adminData?.audit;
    const logs = auditData?.recentLogs || [];

    return (
      <section className="panel" aria-labelledby="admin-audit-heading">
        <header className="panel-header">
          <h2 id="admin-audit-heading">🛡️ Hoạt Động Kiểm Toán Gần Đây</h2>
          <section className="action-row">
            <data value={auditData?.todayCount || 0} className="badge badge-info">
              {auditData?.todayCount || 0} hôm nay
            </data>
            <Link to="/audit-logs" className="badge badge-accent">
              Xem tất cả nhật ký →
            </Link>
          </section>
        </header>

        {isLoading ? (
          <SkeletonCards count={3} />
        ) : logs.length === 0 ? (
          <figure className="empty-state" role="status">
            <figcaption>
              <strong className="empty-title">Chưa có nhật ký ghi nhận</strong>
              <p className="muted">Các hoạt động đăng nhập, duyệt đơn và cấu hình sẽ được lưu lại tại đây.</p>
            </figcaption>
          </figure>
        ) : (
          <section className="table-shell" aria-label="Bảng các hoạt động kiểm toán gần nhất">
            <table className="admin-audit-table">
              <caption className="visually-hidden">Danh sách hoạt động kiểm toán gần nhất</caption>
              <thead>
                <tr>
                  <th scope="col">Thời gian</th>
                  <th scope="col">Người thực hiện</th>
                  <th scope="col">Hành động</th>
                  <th scope="col">Đối tượng</th>
                  <th scope="col">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const act = formatAuditAction(log.action);
                  return (
                    <tr key={log.id}>
                      <td>
                        <time dateTime={log.created_at}>
                          {new Date(log.created_at).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </time>
                      </td>
                      <td>
                        <strong>{log.actor?.full_name || 'Hệ thống'}</strong>
                        <br />
                        <small className="muted">{log.actor?.employee_code || 'SYSTEM'}</small>
                      </td>
                      <td>
                        <mark className={`badge ${act.className}`}>{act.label}</mark>
                      </td>
                      <td>
                        <small className="muted">{log.entity_type}</small>
                      </td>
                      <td>
                        <small>{formatAuditDetails(log)}</small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}
      </section>
    );
  };

  /* ------------------------------------------------------------------ */
  /* Admin widget: Accounts & Role Distribution Panel                    */
  /* ------------------------------------------------------------------ */
  const AdminAccountsPanel = () => {
    if (!isAdmin) return null;

    const acc = stats.adminData?.accounts;
    const total = acc?.total || stats.totalEmployees || 0;
    const roles = acc?.roles || { admin: 0, manager: 0, employee: 0 };
    const recentUsers = acc?.recentUsers || [];

    const adminPct = total > 0 ? Math.round((roles.admin / total) * 100) : 0;
    const mgrPct = total > 0 ? Math.round((roles.manager / total) * 100) : 0;
    const empPct = total > 0 ? Math.round((roles.employee / total) * 100) : 0;

    return (
      <section className="panel" aria-labelledby="admin-accounts-heading">
        <header className="panel-header">
          <h2 id="admin-accounts-heading">👥 Phân Bổ & Trạng Thái Tài Khoản</h2>
          <section className="action-row">
            <data value={total} className="badge badge-accent">
              {total} tài khoản
            </data>
            <Link to="/employees" className="badge badge-accent">
              Quản trị tài khoản →
            </Link>
          </section>
        </header>

        {isLoading ? (
          <SkeletonCards count={2} />
        ) : (
          <>
            <section className="admin-role-bars" aria-label="Tỷ lệ phân bổ vai trò người dùng">
              <article className="chart-row">
                <header>
                  <strong>👑 Quản trị viên (Admin)</strong>
                  <data value={roles.admin} className="chart-count">
                    {roles.admin} người ({adminPct}%)
                  </data>
                </header>
                <meter
                  min="0"
                  max="100"
                  value={adminPct}
                  className="danger"
                  aria-label={`Quản trị viên: ${roles.admin} người`}
                >
                  {adminPct}%
                </meter>
              </article>

              <article className="chart-row">
                <header>
                  <strong>💼 Quản lý bộ phận (Manager)</strong>
                  <data value={roles.manager} className="chart-count">
                    {roles.manager} người ({mgrPct}%)
                  </data>
                </header>
                <meter
                  min="0"
                  max="100"
                  value={mgrPct}
                  className="warning"
                  aria-label={`Quản lý: ${roles.manager} người`}
                >
                  {mgrPct}%
                </meter>
              </article>

              <article className="chart-row">
                <header>
                  <strong>👷 Nhân viên (Employee)</strong>
                  <data value={roles.employee} className="chart-count">
                    {roles.employee} người ({empPct}%)
                  </data>
                </header>
                <meter
                  min="0"
                  max="100"
                  value={empPct}
                  className="success"
                  aria-label={`Nhân viên: ${roles.employee} người`}
                >
                  {empPct}%
                </meter>
              </article>
            </section>

            <header className="panel-header" style={{ marginTop: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
              <h3>Tài Khoản Mới Khởi Tạo</h3>
              <data value={acc?.active ?? 0} className="badge badge-success">
                {acc?.active ?? 0} đang hoạt động
              </data>
            </header>

            {recentUsers.length === 0 ? (
              <p className="muted">Chưa có người dùng mới được tạo.</p>
            ) : (
              <section className="table-shell" aria-label="Danh sách tài khoản người dùng mới tạo">
                <table>
                  <caption className="visually-hidden">Tài khoản mới tạo</caption>
                  <thead>
                    <tr>
                      <th scope="col">Mã NV</th>
                      <th scope="col">Họ và tên</th>
                      <th scope="col">Phòng ban</th>
                      <th scope="col">Vai trò</th>
                      <th scope="col">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <mark className="code-text">{u.employee_code}</mark>
                        </td>
                        <td>
                          <strong>{u.full_name}</strong>
                          <br />
                          <small className="muted">{u.email}</small>
                        </td>
                        <td>
                          <small>{u.department?.name || 'Nhà máy'}</small>
                        </td>
                        <td>
                          <mark className={`badge badge-${u.role}`}>{roleLabels[u.role] || u.role}</mark>
                        </td>
                        <td>
                          <mark className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                            {u.status === 'active' ? 'Hoạt động' : 'Tạm khóa'}
                          </mark>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}
      </section>
    );
  };

  /* ------------------------------------------------------------------ */
  /* Admin widget: System Configuration & Master Data Panel              */
  /* ------------------------------------------------------------------ */
  const AdminConfigPanel = () => {
    if (!isAdmin) return null;

    const cfg = stats.adminData?.systemConfig;
    const holidays = cfg?.upcomingHolidays || [];

    return (
      <section className="panel" aria-labelledby="admin-config-heading">
        <header className="panel-header">
          <h2 id="admin-config-heading">⚙️ Cấu Hình Hệ Thống & Master Data</h2>
          <data value="active" className="badge badge-success">
            Vận hành ổn định
          </data>
        </header>

        {isLoading ? (
          <SkeletonCards count={2} />
        ) : (
          <section className="admin-config-grid" aria-label="Danh mục cấu hình hệ thống">
            {/* Card 1: Phòng ban */}
            <article className="admin-config-card">
              <header>
                <h3>🏢 Cơ Cấu Phòng Ban</h3>
                <data value={stats.totalDepartments} className="badge badge-accent">
                  {stats.totalDepartments} phòng
                </data>
              </header>
              <p>
                Quản lý các bộ phận sản xuất, phân bổ trưởng bộ phận phụ trách duyệt phép và tăng ca.
              </p>
              <footer>
                <Link to="/departments" className="btn btn-primary compact-button">
                  Quản trị phòng ban
                </Link>
              </footer>
            </article>

            {/* Card 2: Ngày nghỉ lễ */}
            <article className="admin-config-card">
              <header>
                <h3>📅 Lịch Nghỉ Lễ & Nhà Máy</h3>
                <data value={cfg?.totalHolidays || 0} className="badge badge-admin">
                  {cfg?.totalHolidays || 0} ngày ({new Date().getFullYear()})
                </data>
              </header>
              <p>
                Quy chuẩn ngày nghỉ hưởng lương và căn cứ tự động loại trừ khi duyệt đơn phép/OT.
              </p>
              {holidays.length > 0 ? (
                <ul className="admin-holiday-list" aria-label="Ngày lễ sắp tới">
                  {holidays.map((h) => (
                    <li key={h.id} className="admin-holiday-item">
                      <section>
                        <strong>{h.name}</strong>
                        <br />
                        <small className="muted">{holidayTypeLabels[h.type] || h.type}</small>
                      </section>
                      <time dateTime={h.date}>{h.date}</time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Không có ngày lễ sắp tới trong danh mục.</p>
              )}
            </article>

            {/* Card 3: Chính sách bảo mật */}
            <article className="admin-config-card">
              <header>
                <h3>🔒 An Ninh & Xác Thực</h3>
                <mark className="badge badge-success">Bảo mật cao</mark>
              </header>
              <dl className="ops-list">
                <dt>Cơ chế phiên đăng nhập</dt>
                <dd>JWT HttpOnly Cookie (Chống XSS/CSRF)</dd>
                <dt>Mô hình phân quyền</dt>
                <dd>RBAC 3 cấp (Admin, Manager, Employee)</dd>
                <dt>Khóa tài khoản</dt>
                <dd>Chặn đăng nhập ngay lập tức khi inactive</dd>
              </dl>
            </article>

            {/* Card 4: Môi trường máy chủ */}
            <article className="admin-config-card">
              <header>
                <h3>🖥️ Môi Trường Kỹ Thuật</h3>
                <mark className="code-text">{cfg?.environment || 'development'}</mark>
              </header>
              <dl className="ops-list">
                <dt>Node.js Runtime</dt>
                <dd className="code-text">{cfg?.nodeVersion || 'v20'}</dd>
                <dt>Cơ sở dữ liệu</dt>
                <dd>MySQL 8.0 (Sequelize ORM, utf8mb4)</dd>
                <dt>Thời gian hoạt động (Uptime)</dt>
                <dd>{formatUptime(cfg?.uptime)}</dd>
              </dl>
            </article>
          </section>
        )}
      </section>
    );
  };

  /* ================================================================== */

  return (
    <section aria-labelledby="dashboard-heading">
      <header className="page-header">
        <section>
          <p className="eyebrow">Cổng thông tin nội bộ Fu Sheng</p>
          <h1 id="dashboard-heading">Tổng Quan Hệ Thống</h1>
          <p>
            Chào mừng trở lại, <strong>{user?.full_name || 'Cán bộ / Nhân viên'}</strong>.
            Vai trò:{' '}
            <mark className="badge badge-accent">{roleLabels[user?.role] || user?.role}</mark>
          </p>
        </section>
        <aside className="shift-brief" aria-label="Tóm tắt ca vận hành">
          <header>
            <strong>Ca hành chính</strong>
            <time dateTime={new Date().toISOString().split('T')[0]}>{todayFormatted}</time>
          </header>
          <data value={approvalRate} className="shift-stat">
            <strong>{approvalRate}%</strong> đơn đã xử lý ({processedLeaveRequests}/
            {totalLeaveRequests})
          </data>
        </aside>
      </header>

      {/* Quick Actions Bar */}
      {isAdmin ? (
        <nav className="quick-actions-grid" aria-label="Lối tắt quản trị hệ thống">
          <Link to="/audit-logs" className="quick-action-link highlight">
            <strong>🛡️ Nhật Ký Hệ Thống</strong>
            <small>
              Tra cứu lịch sử thao tác & kiểm toán ({stats.adminData?.audit?.todayCount || 0} log hôm nay)
            </small>
          </Link>
          <Link to="/employees" className="quick-action-link">
            <strong>👥 Quản Lý Tài Khoản</strong>
            <small>Thêm nhân sự mới, phân quyền vai trò & mở/khóa tài khoản</small>
          </Link>
          <Link to="/departments" className="quick-action-link">
            <strong>🏢 Quản Trị Phòng Ban</strong>
            <small>Cơ cấu tổ chức nhà máy & bổ nhiệm trưởng bộ phận ({stats.totalDepartments} PB)</small>
          </Link>
          <Link to="/leaves" className="quick-action-link">
            <strong>📋 Giám Sát Đơn Phép & OT</strong>
            <small>Tổng hợp đối soát đơn nghỉ và tăng ca toàn nhà máy ({stats.leaveStatus.pending} chờ duyệt)</small>
          </Link>
        </nav>
      ) : (
        <nav className="quick-actions-grid" aria-label="Lối tắt thao tác nhanh">
          <Link to="/leaves" className="quick-action-link">
            <strong>📝 Đăng Ký Đơn Mới</strong>
            <small>Nộp đề xuất nghỉ phép hoặc làm thêm giờ trực tuyến</small>
          </Link>
          <Link to="/employees" className="quick-action-link">
            <strong>👥 Tra Cứu Danh Bạ</strong>
            <small>Tìm kiếm danh bạ nhân sự và thông tin liên lạc</small>
          </Link>
          {isPureManager && (
            <Link to="/leaves" className="quick-action-link highlight">
              <strong>⚡ Duyệt Đơn Chờ ({stats.leaveStatus.pending})</strong>
              <small>Xử lý cấp tốc các yêu cầu nghỉ phép đang chờ phê duyệt</small>
            </Link>
          )}
          {isPureManager && (
            <Link to="/leaves" className="quick-action-link">
              <strong>📊 Xuất Báo Cáo CSV</strong>
              <small>Lọc dữ liệu và trích xuất báo cáo nhân sự theo thời gian</small>
            </Link>
          )}
        </nav>
      )}

      {/* ── Metric summary cards ── */}
      <section className="metrics-grid" aria-label="Thống kê tổng hợp">
        {/* Employee: ngày phép còn lại */}
        {isEmployee && <EmployeeLeaveCard />}

        {/* Manager: nhân sự phòng ban */}
        {isPureManager && <ManagerDeptCard />}

        {/* Admin Metric 1: Tổng Tài Khoản */}
        {isAdmin ? (
          <article className="metric-card admin-accent" aria-label="Tổng tài khoản hệ thống">
            <header>
              <h2>Tổng Tài Khoản</h2>
              <data value="users" className="badge badge-admin">
                Tài khoản
              </data>
            </header>
            {isLoading ? (
              <p className="skeleton skeleton-title" aria-hidden="true"></p>
            ) : (
              <data value={stats.adminData?.accounts?.total || stats.totalEmployees} className="metric-value">
                {stats.adminData?.accounts?.total || stats.totalEmployees}
              </data>
            )}
            <p className="metric-caption">
              {stats.adminData?.accounts?.active ?? stats.totalEmployees} hoạt động · {stats.adminData?.accounts?.inactive ?? 0} tạm khóa
            </p>
          </article>
        ) : (
          <article className="metric-card">
            <header>
              <h2>Tổng Nhân Sự</h2>
              <data value="active" className="badge badge-accent">
                Hoạt động
              </data>
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
        )}

        {/* Metric 2: Đơn Chờ Duyệt */}
        <article className="metric-card warning">
          <header>
            <h2>{isPureManager ? 'Đơn Chờ Duyệt (BP)' : 'Đơn Chờ Duyệt'}</h2>
            <data value="pending" className="badge badge-warning">
              Cần xử lý
            </data>
          </header>
          {isLoading ? (
            <p className="skeleton skeleton-title" aria-hidden="true"></p>
          ) : (
            <data value={stats.leaveStatus.pending} className="metric-value">
              {stats.leaveStatus.pending}
            </data>
          )}
          <p className="metric-caption">
            {isEmployee
              ? 'Đơn của tôi đang chờ'
              : isPureManager
                ? 'Trong phòng ban của bạn'
                : 'Toàn bộ nhà máy'}
          </p>
        </article>

        {/* Metric 3: Phòng ban */}
        {!isEmployee && (
          <article className="metric-card success">
            <header>
              <h2>Phòng Ban</h2>
              <data value="active" className="badge badge-success">
                Bộ phận
              </data>
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

        {/* Admin Metric 4: Audit Hôm Nay */}
        {isAdmin ? (
          <article className="metric-card admin-info" aria-label="Hoạt động kiểm toán hôm nay">
            <header>
              <h2>Audit Hôm Nay</h2>
              <data value="audit" className="badge badge-info">
                Ghi nhận
              </data>
            </header>
            {isLoading ? (
              <p className="skeleton skeleton-title" aria-hidden="true"></p>
            ) : (
              <data value={stats.adminData?.audit?.todayCount ?? 0} className="metric-value">
                {stats.adminData?.audit?.todayCount ?? 0}
              </data>
            )}
            <p className="metric-caption">
              Tổng {stats.adminData?.audit?.totalCount ?? 0} bản ghi kiểm toán
            </p>
          </article>
        ) : (
          <article className="metric-card">
            <header>
              <h2>Tỷ Lệ Xử Lý</h2>
              <data value={approvalRate} className="badge badge-accent">
                Hiệu suất
              </data>
            </header>
            {isLoading ? (
              <p className="skeleton skeleton-title" aria-hidden="true"></p>
            ) : (
              <data value={approvalRate} className="metric-value">
                {approvalRate}%
              </data>
            )}
            <p className="metric-caption">
              {processedLeaveRequests}/{totalLeaveRequests} đơn hoàn tất
            </p>
          </article>
        )}
      </section>

      {/* ── Main dashboard panels (bento grid) ── */}
      <section className="dashboard-grid" aria-label="Bảng điều hành chi tiết">
        {/* Admin Panel 1: Nhật ký kiểm toán */}
        {isAdmin && <AdminAuditPanel />}

        {/* Admin Panel 2: Quản lý & Phân bổ tài khoản */}
        {isAdmin && <AdminAccountsPanel />}

        {/* Admin Panel 3: Cấu hình hệ thống & Master Data */}
        {isAdmin && <AdminConfigPanel />}

        {/* Manager only: Thông báo quan trọng */}
        {isPureManager && <UrgentAnnouncementsPanel />}

        {/* Panel (Non-Admin or Manager/Employee): Pending Action Items */}
        {!isAdmin && (
          <section className="panel" aria-labelledby="action-items-heading">
            <header className="panel-header">
              <h2 id="action-items-heading">
                {isPureManager ? 'Đơn Cần Duyệt Gấp' : 'Đơn Của Tôi Đang Chờ'}
              </h2>
              <data
                value={stats.pendingActionItems?.length || 0}
                className="badge badge-warning"
              >
                {stats.pendingActionItems?.length || 0} đơn
              </data>
            </header>
            {isLoading ? (
              <SkeletonCards />
            ) : (stats.pendingActionItems?.length || 0) === 0 ? (
              <figure className="empty-state" role="status">
                <figcaption>
                  <strong className="empty-title">Không có đơn chờ xử lý</strong>
                  <p className="muted">
                    {isPureManager
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
                        <small className="muted">
                          {' '}
                          ({item.applicant?.employee_code || `#${item.id}`})
                        </small>
                      </section>
                      <mark className="badge badge-pending">Chờ duyệt</mark>
                    </header>
                    <p className="action-item-desc">
                      <strong>
                        {item.request_type === 'overtime'
                          ? 'Tăng ca'
                          : leaveLabels[item.leave_type] || item.leave_type}
                        :
                      </strong>{' '}
                      {item.reason}
                    </p>
                    <footer>
                      <small className="muted">
                        Từ <time dateTime={item.start_date}>{item.start_date}</time> đến{' '}
                        <time dateTime={item.end_date}>{item.end_date}</time> (
                        {Number(item.day_count || 0)} ngày)
                      </small>
                      <Link to="/leaves" className="btn btn-primary compact-button">
                        {isPureManager ? 'Xử lý ngay' : 'Xem chi tiết'}
                      </Link>
                    </footer>
                  </article>
                ))}
              </section>
            )}
          </section>
        )}

        {/* Status Chart */}
        <section className="panel" aria-labelledby="leave-chart-heading">
          <header className="panel-header">
            <h2 id="leave-chart-heading">
              {isAdmin
                ? 'Tổng Quan Đơn Phép Toàn Nhà Máy'
                : isPureManager
                  ? 'Trạng Thái Đơn Phép (Phòng Ban)'
                  : 'Trạng Thái Đơn Phép'}
            </h2>
            <data value={totalLeaveRequests} className="badge badge-subtle">
              {totalLeaveRequests} đơn tổng cộng
            </data>
          </header>
          <figure
            className="status-chart"
            role="figure"
            aria-label="Biểu đồ trạng thái đơn nghỉ phép"
          >
            <figcaption className="sr-only">
              Biểu đồ phân bố đơn phép theo trạng thái xử lý
            </figcaption>
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
                      {row.value} đơn (
                      {totalLeaveRequests > 0
                        ? Math.round((row.value / totalLeaveRequests) * 100)
                        : 0}
                      %)
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

        {/* Recent Leave Requests */}
        <section className="panel" aria-labelledby="recent-leaves-heading">
          <header className="panel-header">
            <h2 id="recent-leaves-heading">
              {isEmployee
                ? 'Đơn Gần Đây Của Tôi'
                : isPureManager
                  ? 'Đơn Gần Đây (Phòng Ban)'
                  : 'Đơn Phép & OT Gần Đây'}
            </h2>
            <Link to="/leaves" className="badge badge-accent">
              Xem tất cả →
            </Link>
          </header>
          {isLoading ? (
            <SkeletonCards />
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
                          <small className="muted">
                            {req.applicant?.department?.name || 'Nhà máy'}
                          </small>
                        </td>
                      )}
                      <td>
                        <small>
                          {req.request_type === 'overtime'
                            ? 'Tăng ca'
                            : leaveLabels[req.leave_type] || req.leave_type}
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

        {/* Recent Announcements */}
        <section className="panel" aria-labelledby="announcements-heading">
          <header className="panel-header">
            <h2 id="announcements-heading">Thông Báo Mới Nhất</h2>
            <section className="action-row">
              <data value={stats.recentAnnouncements.length} className="badge badge-subtle">
                {stats.recentAnnouncements.length} tin
              </data>
              {isManager && (
                <Link to="/announcements" className="badge badge-accent">
                  Quản lý bảng tin →
                </Link>
              )}
            </section>
          </header>
          {isLoading ? (
            <SkeletonCards />
          ) : stats.recentAnnouncements.length === 0 ? (
            <figure className="empty-state" role="status">
              <figcaption>
                <strong className="empty-title">Không có thông báo mới</strong>
                <p className="muted">Tất cả thông báo vận hành sẽ được cập nhật tại đây.</p>
              </figcaption>
            </figure>
          ) : (
            <section className="stack" aria-label="Danh sách thông báo mới">
              {stats.recentAnnouncements.map((ann) => (
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
              ))}
            </section>
          )}
        </section>

        {/* Department Load Distribution */}
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
      </section>
    </section>
  );
}
