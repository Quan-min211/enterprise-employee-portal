import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  Building2,
  CalendarClock,
  FilePlus,
  Clock,
  Download
} from 'lucide-react';
import { dashboardApi } from '../api/dashboardApi';
import { leaveBalancesApi } from '../api/leavesApi';
import { departmentsApi } from '../api/departmentsApi';
import { reportsApi } from '../api/reportsApi';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

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

  const toast = useToast();
  const pushToast = toast?.pushToast || (() => {});
  const reportDialogRef = useRef(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState(false);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState('');
  const [reportDeptId, setReportDeptId] = useState('');
  const [departmentsList, setDepartmentsList] = useState([]);

  // Báo cáo số đơn theo tháng (Monthly requests report state)
  const [monthlyStatsYear, setMonthlyStatsYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyViewMode, setMonthlyViewMode] = useState('chart');

  const handleMonthlyYearChange = async (newYear) => {
    setMonthlyStatsYear(newYear);
    setMonthlyLoading(true);
    try {
      const res = await dashboardApi.getMonthlyRequests({ year: newYear });
      if (res?.data) {
        setMonthlyData(res.data);
      }
    } catch (err) {
      console.error('Error loading monthly requests:', err);
      pushToast('Không thể tải dữ liệu thống kê tháng.', 'error');
    } finally {
      setMonthlyLoading(false);
    }
  };

  // Top phòng ban có nhiều OT (Top OT departments report state)
  const [otYear, setOtYear] = useState(new Date().getFullYear());
  const [otLimit, setOtLimit] = useState(5);
  const [topOtData, setTopOtData] = useState(null);
  const [otLoading, setOtLoading] = useState(false);
  const [otViewMode, setOtViewMode] = useState('ranking');

  const handleOtFilterChange = async (newYear, newLimit = otLimit) => {
    setOtYear(newYear);
    setOtLimit(newLimit);
    setOtLoading(true);
    try {
      const res = await dashboardApi.getTopOtDepartments({ year: newYear, limit: newLimit });
      if (res?.data) {
        setTopOtData(res.data);
      }
    } catch (err) {
      console.error('Error loading top OT departments:', err);
      pushToast('Không thể tải xếp hạng làm thêm giờ.', 'error');
    } finally {
      setOtLoading(false);
    }
  };

  // Báo cáo tỷ lệ duyệt / từ chối (Approval Rate Report state)
  const [approvalStatsYear, setApprovalStatsYear] = useState(new Date().getFullYear());
  const [approvalRequestType, setApprovalRequestType] = useState('all');
  const [approvalDeptId, setApprovalDeptId] = useState('');
  const [approvalData, setApprovalData] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalViewMode, setApprovalViewMode] = useState('overview');

  const handleApprovalFilterChange = async (
    newYear,
    newType = approvalRequestType,
    newDeptId = approvalDeptId
  ) => {
    setApprovalStatsYear(newYear);
    setApprovalRequestType(newType);
    setApprovalDeptId(newDeptId);
    setApprovalLoading(true);
    try {
      const params = { year: newYear };
      if (newType && newType !== 'all') params.request_type = newType;
      if (newDeptId) params.department_id = newDeptId;
      const res = await dashboardApi.getApprovalRate(params);
      if (res?.data) {
        setApprovalData(res.data);
      }
    } catch (err) {
      console.error('Error loading approval rate stats:', err);
      pushToast('Không thể tải báo cáo tỷ lệ duyệt/từ chối.', 'error');
    } finally {
      setApprovalLoading(false);
    }
  };

  // Báo cáo số ngày phép đã dùng / còn lại (Leave Balance Report state)
  const [balanceStatsYear, setBalanceStatsYear] = useState(new Date().getFullYear());
  const [balanceTier, setBalanceTier] = useState('all');
  const [balanceDeptId, setBalanceDeptId] = useState('');
  const [balanceData, setBalanceData] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceViewMode, setBalanceViewMode] = useState('overview');

  const handleBalanceFilterChange = async (
    newYear,
    newTier = balanceTier,
    newDeptId = balanceDeptId
  ) => {
    setBalanceStatsYear(newYear);
    setBalanceTier(newTier);
    setBalanceDeptId(newDeptId);
    setBalanceLoading(true);
    try {
      const params = { year: newYear };
      if (newTier && newTier !== 'all') params.tier = newTier;
      if (newDeptId) params.department_id = newDeptId;
      const res = await dashboardApi.getLeaveBalances(params);
      if (res?.data) {
        setBalanceData(res.data);
      }
    } catch (err) {
      console.error('Error loading leave balance stats:', err);
      pushToast('Không thể tải báo cáo số ngày phép đã dùng/còn lại.', 'error');
    } finally {
      setBalanceLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      departmentsApi
        .list()
        .then((res) => setDepartmentsList(res.departments || []))
        .catch(() => setDepartmentsList([]));
    }
  }, [isAdmin]);

  useEffect(() => {
    const dialog = reportDialogRef.current;
    if (!dialog) return;
    if (showReportModal && !dialog.open) {
      dialog.showModal();
    } else if (!showReportModal && dialog.open) {
      dialog.close();
    }
  }, [showReportModal]);

  const handleExportMonthlyReport = async (e) => {
    e.preventDefault();
    setIsExportingReport(true);
    try {
      const params = { year: reportYear };
      if (reportMonth) params.month = Number(reportMonth);
      if (isAdmin && reportDeptId) params.department_id = Number(reportDeptId);

      const blob = await reportsApi.exportMonthlySummary(params);
      const periodSlug = reportMonth
        ? `${reportYear}-${String(reportMonth).padStart(2, '0')}`
        : `${reportYear}`;
      const filename = `bao-cao-dinh-ky-${periodSlug}-${new Date().toISOString().slice(0, 10)}.csv`;

      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setShowReportModal(false);
      pushToast('Đã xuất báo cáo định kỳ CSV thành công.', 'success');
    } catch (err) {
      pushToast(err.message || 'Không thể xuất báo cáo định kỳ.', 'error');
    } finally {
      setIsExportingReport(false);
    }
  };

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
          if (dashRes.value.summary.monthlyRequests) {
            setMonthlyData(dashRes.value.summary.monthlyRequests);
          }
          if (dashRes.value.summary.topOtDepartments) {
            setTopOtData(dashRes.value.summary.topOtDepartments);
          }
          if (dashRes.value.summary.approvalStats) {
            setApprovalData(dashRes.value.summary.approvalStats);
          }
          if (dashRes.value.summary.leaveBalanceStats) {
            setBalanceData(dashRes.value.summary.leaveBalanceStats);
          }
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
                  <hgroup>
                    <h3>{ann.title}</h3>
                    <time dateTime={ann.createdAt}>
                      {new Date(ann.createdAt).toLocaleDateString('vi-VN')}
                    </time>
                  </hgroup>
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
          <div className="action-row">
            <data value={auditData?.todayCount || 0} className="badge badge-info">
              {auditData?.todayCount || 0} hôm nay
            </data>
            <Link to="/audit-logs" className="badge badge-accent">
              Xem tất cả nhật ký →
            </Link>
          </div>
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
            <table className="admin-audit-table responsive-table">
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
                      <td data-label="Thời gian">
                        <time dateTime={log.created_at}>
                          {new Date(log.created_at).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </time>
                      </td>
                      <td data-label="Người thực hiện">
                        <strong>{log.actor?.full_name || 'Hệ thống'}</strong>
                        <br />
                        <small className="muted">{log.actor?.employee_code || 'SYSTEM'}</small>
                      </td>
                      <td data-label="Hành động">
                        <mark className={`badge ${act.className}`}>{act.label}</mark>
                      </td>
                      <td data-label="Đối tượng">
                        <small className="muted">{log.entity_type}</small>
                      </td>
                      <td data-label="Chi tiết">
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
          <div className="action-row">
            <data value={total} className="badge badge-accent">
              {total} tài khoản
            </data>
            <Link to="/employees" className="badge badge-accent">
              Quản trị tài khoản →
            </Link>
          </div>
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
                <table className="responsive-table">
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
                        <td data-label="Mã NV">
                          <mark className="code-text">{u.employee_code}</mark>
                        </td>
                        <td data-label="Họ và tên">
                          <strong>{u.full_name}</strong>
                          <br />
                          <small className="muted">{u.email}</small>
                        </td>
                        <td data-label="Phòng ban">
                          <small>{u.department?.name || 'Nhà máy'}</small>
                        </td>
                        <td data-label="Vai trò">
                          <mark className={`badge badge-${u.role}`}>{roleLabels[u.role] || u.role}</mark>
                        </td>
                        <td data-label="Trạng thái">
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
                      <p className="holiday-details">
                        <strong>{h.name}</strong>
                        <br />
                        <small className="muted">{holidayTypeLabels[h.type] || h.type}</small>
                      </p>
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

  /* ------------------------------------------------------------------ */
  /* Báo cáo số đơn theo tháng (Monthly Requests Report Panel)         */
  /* ------------------------------------------------------------------ */
  const MonthlyRequestsReportPanel = () => {
    const totalLeavesYear =
      monthlyData?.months?.reduce((sum, m) => sum + m.leaveCount, 0) || 0;
    const totalOtYear =
      monthlyData?.months?.reduce((sum, m) => sum + m.otCount, 0) || 0;
    const totalApprovedYear =
      monthlyData?.months?.reduce((sum, m) => sum + m.approvedCount, 0) || 0;
    const totalRejectedYear =
      monthlyData?.months?.reduce((sum, m) => sum + m.rejectedCount, 0) || 0;
    const totalPendingYear =
      monthlyData?.months?.reduce((sum, m) => sum + m.pendingCount, 0) || 0;
    const totalLeaveDaysYear = (
      monthlyData?.months?.reduce((sum, m) => sum + m.approvedLeaveDays, 0) || 0
    ).toFixed(1);
    const totalOtHoursYear = (
      monthlyData?.months?.reduce((sum, m) => sum + m.approvedOtHours, 0) || 0
    ).toFixed(1);
    const peakMonth = monthlyData?.peakMonth;

    return (
      <section className="panel monthly-report-panel" aria-labelledby="monthly-report-heading">
        <header className="panel-header">
          <hgroup>
            <h2 id="monthly-report-heading">
              {isAdmin
                ? 'Báo Cáo Số Đơn Theo Tháng (Toàn Nhà Máy)'
                : isPureManager
                  ? 'Báo Cáo Số Đơn Theo Tháng (Phòng Ban)'
                  : 'Báo Cáo Số Đơn Theo Tháng Của Tôi'}
            </h2>
            <p>Phân bố số lượng đơn nghỉ phép và tăng ca qua 12 tháng năm {monthlyStatsYear}</p>
          </hgroup>
          <form className="panel-controls-group" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="monthly-year-select" className="sr-only">
              Năm thống kê
            </label>
            <select
              id="monthly-year-select"
              value={monthlyStatsYear}
              onChange={(e) => handleMonthlyYearChange(Number(e.target.value))}
              aria-label="Chọn năm thống kê số đơn"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
            <menu className="action-row" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              <li>
                <button
                  type="button"
                  className={`btn compact-button ${monthlyViewMode === 'chart' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMonthlyViewMode('chart')}
                >
                  Biểu đồ cột
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`btn compact-button ${monthlyViewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMonthlyViewMode('table')}
                >
                  Bảng chi tiết
                </button>
              </li>
            </menu>
          </form>
        </header>

        {/* High-level yearly metric highlights */}
        <section className="monthly-summary-badges" aria-label={`Tóm tắt số đơn năm ${monthlyStatsYear}`}>
          <article className="monthly-badge-item">
            <strong className="monthly-badge-label">Tổng đơn cả năm</strong>
            <data value={monthlyData?.yearTotal || 0} className="monthly-badge-value">
              {monthlyData?.yearTotal || 0} <small>đơn</small>
            </data>
          </article>
          <article className="monthly-badge-item">
            <strong className="monthly-badge-label">Đơn nghỉ phép</strong>
            <data value={totalLeavesYear} className="monthly-badge-value">
              {totalLeavesYear} <small>đơn ({totalLeaveDaysYear} ngày)</small>
            </data>
          </article>
          <article className="monthly-badge-item">
            <strong className="monthly-badge-label">Đơn tăng ca (OT)</strong>
            <data value={totalOtYear} className="monthly-badge-value">
              {totalOtYear} <small>đơn ({totalOtHoursYear} giờ)</small>
            </data>
          </article>
          <article className="monthly-badge-item">
            <strong className="monthly-badge-label">Tháng cao điểm</strong>
            <data
              value={peakMonth ? peakMonth.label : 'Chưa có'}
              className="monthly-badge-value"
            >
              {peakMonth ? `${peakMonth.label} (${peakMonth.total} đơn)` : '0 đơn'}
            </data>
          </article>
        </section>

        {monthlyLoading ? (
          <SkeletonCards count={3} />
        ) : monthlyViewMode === 'chart' ? (
          <figure
            className="monthly-chart-container"
            role="figure"
            aria-label={`Biểu đồ phân bổ 12 tháng năm ${monthlyStatsYear}`}
          >
            <figcaption className="sr-only">
              Biểu đồ cột thể hiện số lượng đơn nghỉ phép và tăng ca qua từng tháng
            </figcaption>
            <ol className="monthly-bar-chart">
              {monthlyData?.months?.map((m) => {
                const maxVal = monthlyData.maxMonthTotal || 1;
                const pct = maxVal > 0 && m.total > 0 ? Math.max(Math.round((m.total / maxVal) * 100), 12) : 0;
                return (
                  <li key={m.month} className="monthly-bar-item">
                    <data value={m.total} className="bar-val-badge">
                      {m.total > 0 ? m.total : ''}
                    </data>
                    <p className="bar-column-wrapper">
                      <meter
                        min="0"
                        max={maxVal}
                        value={m.total}
                        className="sr-only"
                        aria-label={`${m.fullLabel}: ${m.total} đơn`}
                      >
                        {m.total}
                      </meter>
                      <data
                        value={pct}
                        className={`bar-column-fill ${m.otCount > 0 ? 'has-ot' : ''} ${m.total === 0 ? 'empty' : ''}`}
                        style={{ height: m.total > 0 ? `${pct}%` : '3px' }}
                      ></data>
                    </p>
                    <time dateTime={m.yearMonth} className="bar-month-caption">
                      {m.label}
                    </time>
                    <aside className="bar-info-tooltip">
                      <strong>
                        {m.fullLabel} / {monthlyStatsYear}
                      </strong>
                      <p>Tổng: {m.total} đơn</p>
                      <small>Nghỉ phép: {m.leaveCount} ({m.approvedLeaveDays} ngày)</small>
                      <small>Tăng ca OT: {m.otCount} ({m.approvedOtHours} giờ)</small>
                      <small>
                        Đã duyệt: {m.approvedCount} | Từ chối: {m.rejectedCount}
                      </small>
                    </aside>
                  </li>
                );
              })}
            </ol>
          </figure>
        ) : (
          <section className="table-shell" aria-label={`Bảng số liệu 12 tháng năm ${monthlyStatsYear}`}>
            <table className="responsive-table monthly-table">
              <caption>
                Thống kê số lượng đơn nghỉ phép và làm thêm giờ qua 12 tháng trong năm {monthlyStatsYear}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Kỳ báo cáo</th>
                  <th scope="col">Tổng đơn</th>
                  <th scope="col">Đơn phép</th>
                  <th scope="col">Đơn OT</th>
                  <th scope="col">Đã duyệt</th>
                  <th scope="col">Từ chối</th>
                  <th scope="col">Chờ duyệt</th>
                  <th scope="col">Ngày phép duyệt</th>
                  <th scope="col">Giờ OT duyệt</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData?.months?.map((m) => (
                  <tr key={m.month}>
                    <td data-label="Kỳ báo cáo">
                      <strong>{m.fullLabel}</strong>
                    </td>
                    <td data-label="Tổng đơn">
                      <data value={m.total}>
                        <strong>{m.total}</strong>
                      </data>
                    </td>
                    <td data-label="Đơn phép">{m.leaveCount}</td>
                    <td data-label="Đơn OT">{m.otCount}</td>
                    <td data-label="Đã duyệt">
                      <mark className="badge badge-success">{m.approvedCount}</mark>
                    </td>
                    <td data-label="Từ chối">
                      <mark className="badge badge-danger">{m.rejectedCount}</mark>
                    </td>
                    <td data-label="Chờ duyệt">
                      <mark className="badge badge-warning">{m.pendingCount}</mark>
                    </td>
                    <td data-label="Ngày phép duyệt">{m.approvedLeaveDays} ngày</td>
                    <td data-label="Giờ OT duyệt">{m.approvedOtHours} giờ</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Tổng cả năm</th>
                  <td>
                    <strong>{monthlyData?.yearTotal || 0}</strong>
                  </td>
                  <td>{totalLeavesYear}</td>
                  <td>{totalOtYear}</td>
                  <td>{totalApprovedYear}</td>
                  <td>{totalRejectedYear}</td>
                  <td>{totalPendingYear}</td>
                  <td>{totalLeaveDaysYear} ngày</td>
                  <td>{totalOtHoursYear} giờ</td>
                </tr>
              </tfoot>
            </table>
          </section>
        )}
      </section>
    );
  };

  /* ------------------------------------------------------------------ */
  /* Top phòng ban có nhiều OT (Top OT Departments Report Panel)        */
  /* ------------------------------------------------------------------ */
  const TopOtDepartmentsPanel = () => {
    const factoryAvg =
      topOtData?.factoryTotalStaff > 0
        ? (topOtData.factoryTotalOtHours / topOtData.factoryTotalStaff).toFixed(1)
        : '0.0';
    const topDept = topOtData?.topDepartment;

    return (
      <section className="panel top-ot-panel" aria-labelledby="top-ot-heading">
        <header className="panel-header">
          <hgroup>
            <h2 id="top-ot-heading">Top Phòng Ban Nhiều Giờ Tăng Ca (OT)</h2>
            <p>Xếp hạng các bộ phận có khối lượng làm thêm giờ cao nhất trong năm {otYear}</p>
          </hgroup>
          <form className="panel-controls-group" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="top-ot-year-select" className="sr-only">
              Năm thống kê OT
            </label>
            <select
              id="top-ot-year-select"
              value={otYear}
              onChange={(e) => handleOtFilterChange(Number(e.target.value), otLimit)}
              aria-label="Chọn năm thống kê OT"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>

            <label htmlFor="top-ot-limit-select" className="sr-only">
              Số lượng hiển thị
            </label>
            <select
              id="top-ot-limit-select"
              value={otLimit}
              onChange={(e) => handleOtFilterChange(otYear, Number(e.target.value))}
              aria-label="Số lượng phòng ban hiển thị"
            >
              <option value={5}>Top 5 phòng ban</option>
              <option value={8}>Top 8 phòng ban</option>
              <option value={20}>Tất cả phòng ban</option>
            </select>

            <menu className="action-row" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              <li>
                <button
                  type="button"
                  className={`btn compact-button ${otViewMode === 'ranking' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setOtViewMode('ranking')}
                >
                  Xếp hạng
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`btn compact-button ${otViewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setOtViewMode('table')}
                >
                  Bảng chi tiết
                </button>
              </li>
            </menu>
          </form>
        </header>

        {/* High-level OT summary badges */}
        <section className="monthly-summary-badges" aria-label={`Tóm tắt chỉ số làm thêm giờ năm ${otYear}`}>
          <article className="monthly-badge-item">
            <strong className="monthly-badge-label">Tổng giờ OT nhà máy</strong>
            <data value={topOtData?.factoryTotalOtHours || 0} className="monthly-badge-value">
              {topOtData?.factoryTotalOtHours || 0} <small>giờ</small>
            </data>
          </article>
          <article className="monthly-badge-item">
            <strong className="monthly-badge-label">Tổng số đơn OT</strong>
            <data value={topOtData?.factoryTotalOtRequests || 0} className="monthly-badge-value">
              {topOtData?.factoryTotalOtRequests || 0} <small>đơn ({topOtData?.factoryApprovedOtRequests || 0} đã duyệt)</small>
            </data>
          </article>
          <article className="monthly-badge-item">
            <strong className="monthly-badge-label">Bộ phận OT nhiều nhất</strong>
            <data value={topDept ? topDept.name : 'Chưa có'} className="monthly-badge-value">
              {topDept ? `[${topDept.code}] ${topDept.totalOtHours}h` : 'Chưa có'}
            </data>
          </article>
          <article className="monthly-badge-item">
            <strong className="monthly-badge-label">Trung bình/lao động</strong>
            <data value={factoryAvg} className="monthly-badge-value">
              {factoryAvg} <small>giờ/người</small>
            </data>
          </article>
        </section>

        {otLoading ? (
          <SkeletonCards count={3} />
        ) : (topOtData?.departments?.length || 0) === 0 ? (
          <figure className="empty-state" role="status">
            <figcaption>
              <strong className="empty-title">Chưa có dữ liệu làm thêm giờ</strong>
              <p className="muted">Không có đơn làm thêm giờ nào được ghi nhận trong năm {otYear}.</p>
            </figcaption>
          </figure>
        ) : otViewMode === 'ranking' ? (
          <ol className="top-ot-list" aria-label={`Xếp hạng phòng ban nhiều OT nhất năm ${otYear}`}>
            {topOtData.departments.map((dept) => {
              const maxVal = topOtData.maxOtHours || 1;
              const pct = maxVal > 0 ? Math.round((dept.totalOtHours / maxVal) * 100) : 0;
              return (
                <li
                  key={dept.id}
                  className={`top-ot-item ${dept.isMyDepartment ? 'highlight-my-dept' : ''}`}
                >
                  <header className="top-ot-item-header">
                    <p className="top-ot-item-title">
                      <data
                        value={dept.rank}
                        className={`top-ot-rank badge ${dept.rank === 1 ? 'badge-warning' : dept.rank === 2 ? 'badge-accent' : 'badge-subtle'}`}
                      >
                        #{dept.rank}
                      </data>
                      <strong>
                        [{dept.code}] {dept.name}
                      </strong>
                      {dept.isMyDepartment && (
                        <mark className="badge badge-info" style={{ marginLeft: 'var(--space-2)' }}>
                          Phòng ban của bạn
                        </mark>
                      )}
                    </p>
                    <data value={dept.totalOtHours} className="top-ot-hours-stat">
                      <strong>{dept.totalOtHours}</strong> giờ
                      <small className="muted">
                        {' '}
                        ({dept.totalRequests} đơn · TB {dept.avgOtHoursPerStaff}h/người)
                      </small>
                    </data>
                  </header>
                  <p className="top-ot-meter-wrapper">
                    <meter
                      min="0"
                      max={maxVal}
                      value={dept.totalOtHours}
                      className="top-ot-meter"
                      aria-label={`${dept.name}: ${dept.totalOtHours} giờ OT (${pct}% so với cao nhất)`}
                    >
                      {pct}%
                    </meter>
                  </p>
                </li>
              );
            })}
          </ol>
        ) : (
          <section className="table-shell" aria-label={`Bảng chi tiết xếp hạng OT các phòng ban năm ${otYear}`}>
            <table className="responsive-table top-ot-table">
              <caption>
                Thống kê chi tiết khối lượng làm thêm giờ (OT) theo từng phòng ban năm {otYear}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Thứ hạng</th>
                  <th scope="col">Phòng ban</th>
                  <th scope="col">Nhân sự</th>
                  <th scope="col">Tổng đơn OT</th>
                  <th scope="col">Đã duyệt</th>
                  <th scope="col">Chờ duyệt</th>
                  <th scope="col">Tổng giờ OT</th>
                  <th scope="col">TB/Nhân sự</th>
                </tr>
              </thead>
              <tbody>
                {topOtData.departments.map((dept) => (
                  <tr
                    key={dept.id}
                    className={dept.isMyDepartment ? 'highlight-row' : ''}
                  >
                    <td data-label="Thứ hạng">
                      <data
                        value={dept.rank}
                        className={`badge ${dept.rank === 1 ? 'badge-warning' : dept.rank === 2 ? 'badge-accent' : 'badge-subtle'}`}
                      >
                        #{dept.rank}
                      </data>
                    </td>
                    <td data-label="Phòng ban">
                      <strong>
                        [{dept.code}] {dept.name}
                      </strong>
                      {dept.isMyDepartment && (
                        <mark className="badge badge-info" style={{ marginLeft: 'var(--space-2)' }}>
                          Bạn quản lý
                        </mark>
                      )}
                    </td>
                    <td data-label="Nhân sự">{dept.totalStaff} người</td>
                    <td data-label="Tổng đơn OT">
                      <strong>{dept.totalRequests}</strong>
                    </td>
                    <td data-label="Đã duyệt">
                      <mark className="badge badge-success">{dept.approvedCount}</mark>
                    </td>
                    <td data-label="Chờ duyệt">
                      <mark className="badge badge-warning">{dept.pendingCount}</mark>
                    </td>
                    <td data-label="Tổng giờ OT">
                      <strong style={{ color: '#D97706' }}>{dept.totalOtHours} giờ</strong>
                    </td>
                    <td data-label="TB/Nhân sự">{dept.avgOtHoursPerStaff} giờ/người</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={2}>
                    Tổng cộng
                  </th>
                  <td>{topOtData.factoryTotalStaff} người</td>
                  <td>
                    <strong>{topOtData.factoryTotalOtRequests}</strong>
                  </td>
                  <td>{topOtData.factoryApprovedOtRequests}</td>
                  <td>{topOtData.factoryPendingOtRequests}</td>
                  <td>
                    <strong style={{ color: '#D97706' }}>
                      {topOtData.factoryTotalOtHours} giờ
                    </strong>
                  </td>
                  <td>{factoryAvg} giờ/người</td>
                </tr>
              </tfoot>
            </table>
          </section>
        )}
      </section>
    );
  };

  /* ------------------------------------------------------------------ */
  /* Báo cáo tỷ lệ duyệt / từ chối (Approval Rate Report Panel)         */
  /* ------------------------------------------------------------------ */
  const ApprovalRateReportPanel = () => {
    return (
      <section className="panel approval-rate-panel" aria-labelledby="approval-rate-heading">
        <header className="panel-header">
          <hgroup>
            <h2 id="approval-rate-heading">
              {isAdmin
                ? 'Báo Cáo Tỷ Lệ Duyệt / Từ Chối (Toàn Nhà Máy)'
                : isPureManager
                  ? 'Báo Cáo Tỷ Lệ Duyệt / Từ Chối (Phòng Ban)'
                  : 'Báo Cáo Tỷ Lệ Duyệt / Từ Chối Của Tôi'}
            </h2>
            <p>
              Hiệu suất giải quyết đơn nghỉ phép và tăng ca năm {approvalStatsYear}
              {approvalRequestType === 'leave'
                ? ' (Chỉ đơn nghỉ phép)'
                : approvalRequestType === 'overtime'
                  ? ' (Chỉ đơn làm thêm giờ)'
                  : ' (Tất cả loại đơn)'}
            </p>
          </hgroup>
          <form className="panel-controls-group" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="approval-year-select" className="sr-only">
              Năm thống kê
            </label>
            <select
              id="approval-year-select"
              value={approvalStatsYear}
              onChange={(e) =>
                handleApprovalFilterChange(Number(e.target.value), approvalRequestType, approvalDeptId)
              }
              aria-label="Chọn năm thống kê tỷ lệ duyệt"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>

            <label htmlFor="approval-type-select" className="sr-only">
              Loại đơn
            </label>
            <select
              id="approval-type-select"
              value={approvalRequestType}
              onChange={(e) =>
                handleApprovalFilterChange(approvalStatsYear, e.target.value, approvalDeptId)
              }
              aria-label="Chọn loại đơn thống kê"
            >
              <option value="all">Tất cả loại đơn</option>
              <option value="leave">Chỉ nghỉ phép</option>
              <option value="overtime">Chỉ tăng ca (OT)</option>
            </select>

            {isAdmin && (
              <>
                <label htmlFor="approval-dept-select" className="sr-only">
                  Phòng ban
                </label>
                <select
                  id="approval-dept-select"
                  value={approvalDeptId}
                  onChange={(e) =>
                    handleApprovalFilterChange(approvalStatsYear, approvalRequestType, e.target.value)
                  }
                  aria-label="Lọc theo phòng ban"
                >
                  <option value="">Toàn bộ nhà máy</option>
                  {departmentsList.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.code}] {d.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            <menu className="action-row" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              <li>
                <button
                  type="button"
                  className={`btn compact-button ${approvalViewMode === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setApprovalViewMode('overview')}
                >
                  Tổng quan
                </button>
              </li>
              {(isAdmin || isPureManager) && (
                <li>
                  <button
                    type="button"
                    className={`btn compact-button ${approvalViewMode === 'departments' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setApprovalViewMode('departments')}
                  >
                    Phòng ban
                  </button>
                </li>
              )}
              <li>
                <button
                  type="button"
                  className={`btn compact-button ${approvalViewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setApprovalViewMode('table')}
                >
                  12 tháng
                </button>
              </li>
            </menu>
          </form>
        </header>

        {/* KPI Badges */}
        <section
          className="monthly-summary-badges"
          aria-label={`Tóm tắt chỉ số duyệt đơn năm ${approvalStatsYear}`}
        >
          <article className="monthly-badge-item">
            <strong className="monthly-badge-label">Tỷ lệ duyệt (Approval)</strong>
            <data value={approvalData?.approvalRate ?? 0} className="monthly-badge-value text-success">
              {approvalData?.approvalRate ?? 0}%
            </data>
            <small className="muted">
              {approvalData?.approvedCount || 0} / {approvalData?.decidedCount || 0} đơn đã giải quyết
            </small>
          </article>
          <article className="monthly-badge-item">
            <strong className="monthly-badge-label">Tỷ lệ từ chối (Rejection)</strong>
            <data value={approvalData?.rejectionRate ?? 0} className="monthly-badge-value text-danger">
              {approvalData?.rejectionRate ?? 0}%
            </data>
            <small className="muted">{approvalData?.rejectedCount || 0} đơn không được duyệt</small>
          </article>
          <article className="monthly-badge-item">
            <strong className="monthly-badge-label">Đang chờ xử lý (Pending)</strong>
            <data value={approvalData?.pendingCount ?? 0} className="monthly-badge-value text-warning">
              {approvalData?.pendingCount || 0} <small>đơn ({approvalData?.pendingRate ?? 0}%)</small>
            </data>
            <small className="muted">Tổng {approvalData?.totalRequests || 0} đơn phát sinh</small>
          </article>
          <article className="monthly-badge-item">
            <strong className="monthly-badge-label">Thời gian phản hồi TB</strong>
            <data value={approvalData?.avgProcessingHours ?? 0} className="monthly-badge-value">
              {approvalData?.avgProcessingHours && approvalData.avgProcessingHours > 0
                ? `${approvalData.avgProcessingHours}h`
                : '< 1 giờ'}
            </data>
            <small className="muted">Từ khi tạo đến khi duyệt/từ chối</small>
          </article>
        </section>

        {approvalLoading ? (
          <SkeletonCards count={3} />
        ) : !approvalData || approvalData.totalRequests === 0 ? (
          <figure className="empty-state" role="status">
            <figcaption>
              <strong className="empty-title">Chưa có dữ liệu xử lý đơn</strong>
              <p className="muted">
                Không tìm thấy đơn nghỉ phép hoặc tăng ca nào phù hợp với bộ lọc trong năm {approvalStatsYear}.
              </p>
            </figcaption>
          </figure>
        ) : approvalViewMode === 'overview' ? (
          <section className="approval-overview-view" aria-label="Phân tích tổng quan và xu hướng">
            {/* Phân loại theo loại đơn */}
            {approvalData.byType && (
              <section className="approval-type-grid" aria-label="Tỷ lệ duyệt theo từng phân loại đơn">
                <article className="approval-type-card">
                  <header className="approval-type-header">
                    <h3 className="approval-type-title">📋 Đơn Nghỉ Phép (Leave)</h3>
                    <mark className="badge badge-normal">{approvalData.byType.leave.total} đơn</mark>
                  </header>
                  <dl className="approval-type-metrics">
                    <dt>Đã duyệt:</dt>
                    <dd>
                      <strong className="text-success">{approvalData.byType.leave.approved}</strong> (
                      {approvalData.byType.leave.totalApprovedDays} ngày công)
                    </dd>
                    <dt>Từ chối:</dt>
                    <dd>
                      <strong className="text-danger">{approvalData.byType.leave.rejected}</strong>
                    </dd>
                    <dt>Đang chờ:</dt>
                    <dd>
                      <strong className="text-warning">{approvalData.byType.leave.pending}</strong>
                    </dd>
                    <dt>Tỷ lệ duyệt:</dt>
                    <dd>
                      <strong className="text-success">
                        {approvalData.byType.leave.approvalRate}%
                      </strong>{' '}
                      <small className="muted">
                        ({approvalData.byType.leave.decided} đơn đã giải quyết)
                      </small>
                    </dd>
                  </dl>
                  <figure className="approval-meter-container">
                    <meter
                      min="0"
                      max="100"
                      value={approvalData.byType.leave.approvalRate}
                      className="approval-meter-bar"
                      aria-label={`Tỷ lệ duyệt đơn phép: ${approvalData.byType.leave.approvalRate}%`}
                    >
                      {approvalData.byType.leave.approvalRate}%
                    </meter>
                  </figure>
                </article>

                <article className="approval-type-card">
                  <header className="approval-type-header">
                    <h3 className="approval-type-title">⚡ Đơn Tăng Ca (Overtime)</h3>
                    <mark className="badge badge-warning">{approvalData.byType.overtime.total} đơn</mark>
                  </header>
                  <dl className="approval-type-metrics">
                    <dt>Đã duyệt:</dt>
                    <dd>
                      <strong className="text-success">{approvalData.byType.overtime.approved}</strong> (
                      {approvalData.byType.overtime.totalApprovedHours} giờ OT)
                    </dd>
                    <dt>Từ chối:</dt>
                    <dd>
                      <strong className="text-danger">{approvalData.byType.overtime.rejected}</strong>
                    </dd>
                    <dt>Đang chờ:</dt>
                    <dd>
                      <strong className="text-warning">{approvalData.byType.overtime.pending}</strong>
                    </dd>
                    <dt>Tỷ lệ duyệt:</dt>
                    <dd>
                      <strong className="text-success">
                        {approvalData.byType.overtime.approvalRate}%
                      </strong>{' '}
                      <small className="muted">
                        ({approvalData.byType.overtime.decided} đơn đã giải quyết)
                      </small>
                    </dd>
                  </dl>
                  <figure className="approval-meter-container">
                    <meter
                      min="0"
                      max="100"
                      value={approvalData.byType.overtime.approvalRate}
                      className="approval-meter-bar"
                      aria-label={`Tỷ lệ duyệt đơn tăng ca: ${approvalData.byType.overtime.approvalRate}%`}
                    >
                      {approvalData.byType.overtime.approvalRate}%
                    </meter>
                  </figure>
                </article>
              </section>
            )}

            {/* Xu hướng 12 tháng */}
            {approvalData.monthlyTrend && (
              <section
                className="approval-trend-container"
                aria-label={`Xu hướng tỷ lệ duyệt 12 tháng năm ${approvalStatsYear}`}
              >
                <header className="approval-trend-header">
                  <h3>📈 Diễn Biến Tỷ Lệ Duyệt / Từ Chối Qua 12 Tháng</h3>
                  <small className="muted">Tỷ lệ tính trên số đơn đã giải quyết trong từng tháng</small>
                </header>
                <ol className="approval-trend-grid">
                  {approvalData.monthlyTrend.map((m) => (
                    <li key={m.month} className="approval-trend-col">
                      <header className="trend-month-header">
                        <strong>{m.label}</strong>
                        <small className="muted">{m.total} đơn</small>
                      </header>
                      <figure className="trend-bar-wrapper">
                        <meter
                          min="0"
                          max="100"
                          value={m.approvalRate}
                          className="trend-meter-vertical"
                          aria-label={`${m.fullLabel}: Tỷ lệ duyệt ${m.approvalRate}%, từ chối ${m.rejectionRate}%`}
                        >
                          {m.approvalRate}%
                        </meter>
                      </figure>
                      <footer className="trend-month-footer">
                        <data
                          value={m.approvalRate}
                          className={`trend-rate-data ${
                            m.decided === 0
                              ? 'muted'
                              : m.approvalRate >= 80
                                ? 'text-success'
                                : 'text-warning'
                          }`}
                        >
                          {m.decided === 0 ? '-' : `${m.approvalRate}%`}
                        </data>
                        {m.rejected > 0 && (
                          <small className="text-danger">({m.rejected} loại)</small>
                        )}
                      </footer>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </section>
        ) : approvalViewMode === 'departments' && approvalData.departmentComparison ? (
          <section
            className="table-shell"
            aria-label={`So sánh tỷ lệ duyệt đơn giữa các phòng ban năm ${approvalStatsYear}`}
          >
            <table className="responsive-table approval-dept-table">
              <caption>
                So sánh tỷ lệ phê duyệt và từ chối đơn theo từng phòng ban năm {approvalStatsYear}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Mã PB</th>
                  <th scope="col">Phòng ban</th>
                  <th scope="col">Tổng đơn</th>
                  <th scope="col">Đã duyệt</th>
                  <th scope="col">Từ chối</th>
                  <th scope="col">Chờ duyệt</th>
                  <th scope="col">Tỷ lệ duyệt</th>
                  <th scope="col">Tỷ lệ từ chối</th>
                </tr>
              </thead>
              <tbody>
                {approvalData.departmentComparison.map((d) => (
                  <tr key={d.id} className={d.isMyDepartment ? 'highlight-row' : ''}>
                    <th scope="row">
                      <code>{d.code}</code>
                      {d.isMyDepartment && (
                        <mark className="badge badge-info" style={{ marginLeft: 'var(--space-2)' }}>
                          Của bạn
                        </mark>
                      )}
                    </th>
                    <td>{d.name}</td>
                    <td>
                      <strong>{d.totalRequests}</strong>
                    </td>
                    <td className="text-success">{d.approvedCount}</td>
                    <td className="text-danger">{d.rejectedCount}</td>
                    <td className="text-warning">{d.pendingCount}</td>
                    <td>
                      <data value={d.approvalRate} className="rate-badge success">
                        {d.decidedCount > 0 ? `${d.approvalRate}%` : 'Chưa có'}
                      </data>
                    </td>
                    <td>
                      <data value={d.rejectionRate} className="rate-badge danger">
                        {d.decidedCount > 0 ? `${d.rejectionRate}%` : '0%'}
                      </data>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <section
            className="table-shell"
            aria-label={`Bảng chi tiết tỷ lệ duyệt 12 tháng năm ${approvalStatsYear}`}
          >
            <table className="responsive-table approval-monthly-table">
              <caption>
                Bảng thống kê chi tiết tỷ lệ duyệt và từ chối qua 12 tháng năm {approvalStatsYear}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Tháng</th>
                  <th scope="col">Tổng đơn</th>
                  <th scope="col">Đã duyệt</th>
                  <th scope="col">Từ chối</th>
                  <th scope="col">Chờ xử lý</th>
                  <th scope="col">Đã hủy</th>
                  <th scope="col">Đã giải quyết</th>
                  <th scope="col">Tỷ lệ duyệt</th>
                  <th scope="col">Tỷ lệ từ chối</th>
                </tr>
              </thead>
              <tbody>
                {approvalData.monthlyTrend.map((m) => (
                  <tr key={m.month}>
                    <th scope="row">
                      <strong>{m.fullLabel}</strong>
                    </th>
                    <td>{m.total}</td>
                    <td className="text-success">{m.approved}</td>
                    <td className="text-danger">{m.rejected}</td>
                    <td className="text-warning">{m.pending}</td>
                    <td>{m.cancelled}</td>
                    <td>{m.decided}</td>
                    <td>
                      <data
                        value={m.approvalRate}
                        className={`rate-badge ${m.decided === 0 ? '' : 'success'}`}
                      >
                        {m.decided > 0 ? `${m.approvalRate}%` : '-'}
                      </data>
                    </td>
                    <td>
                      <data
                        value={m.rejectionRate}
                        className={`rate-badge ${m.rejected > 0 ? 'danger' : ''}`}
                      >
                        {m.decided > 0 ? `${m.rejectionRate}%` : '-'}
                      </data>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Tổng cả năm {approvalStatsYear}</th>
                  <td>
                    <strong>{approvalData.totalRequests}</strong>
                  </td>
                  <td className="text-success">
                    <strong>{approvalData.approvedCount}</strong>
                  </td>
                  <td className="text-danger">
                    <strong>{approvalData.rejectedCount}</strong>
                  </td>
                  <td className="text-warning">
                    <strong>{approvalData.pendingCount}</strong>
                  </td>
                  <td>
                    <strong>{approvalData.cancelledCount}</strong>
                  </td>
                  <td>
                    <strong>{approvalData.decidedCount}</strong>
                  </td>
                  <td className="text-success">
                    <strong>{approvalData.approvalRate}%</strong>
                  </td>
                  <td className="text-danger">
                    <strong>{approvalData.rejectionRate}%</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>
        )}
      </section>
    );
  };

  /* ------------------------------------------------------------------ */
  /* Báo cáo số ngày phép đã dùng / còn lại (Leave Balance Report Panel)*/
  /* ------------------------------------------------------------------ */
  const LeaveBalanceReportPanel = () => {
    const tierLabels = {
      all: 'Tất cả tiến độ',
      low: 'Dưới 25% (Ít nghỉ phép)',
      medium: '25% - 50% (Tiến độ bình thường)',
      high: '50% - 75% (Tiêu thụ khá)',
      exhausted: 'Trên 75% (Gần hết phép)'
    };

    return (
      <section className="panel leave-balance-panel" aria-labelledby="leave-balance-heading">
        <header className="panel-header">
          <hgroup>
            <h2 id="leave-balance-heading">
              {isAdmin
                ? 'Báo Cáo Tình Hình Sử Dụng & Tồn Phép (Toàn Nhà Máy)'
                : isPureManager
                  ? 'Báo Cáo Tình Hình Sử Dụng & Tồn Phép (Phòng Ban)'
                  : 'Báo Cáo Tình Hình Sử Dụng Phép Năm Của Tôi'}
            </h2>
            <p>
              Theo dõi định mức ngày phép, số ngày đã sử dụng và quỹ phép còn lại năm {balanceStatsYear}
              {balanceTier !== 'all' ? ` · ${tierLabels[balanceTier] || balanceTier}` : ''}
            </p>
          </hgroup>
          <form className="panel-controls-group" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="balance-year-select" className="sr-only">
              Năm thống kê
            </label>
            <select
              id="balance-year-select"
              value={balanceStatsYear}
              onChange={(e) =>
                handleBalanceFilterChange(Number(e.target.value), balanceTier, balanceDeptId)
              }
              aria-label="Chọn năm thống kê ngày phép"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>

            {/* Phân nhóm tiến độ */}
            <label htmlFor="balance-tier-select" className="sr-only">
              Tiến độ tiêu thụ
            </label>
            <select
              id="balance-tier-select"
              value={balanceTier}
              onChange={(e) =>
                handleBalanceFilterChange(balanceStatsYear, e.target.value, balanceDeptId)
              }
              aria-label="Lọc theo phân nhóm tiến độ"
            >
              <option value="all">Tất cả tiến độ</option>
              <option value="low">Dưới 25% (Ít nghỉ)</option>
              <option value="medium">25% - 50% (Bình thường)</option>
              <option value="high">50% - 75% (Tiêu thụ khá)</option>
              <option value="exhausted">Trên 75% (Gần hết phép)</option>
            </select>

            {isAdmin && (
              <>
                <label htmlFor="balance-dept-select" className="sr-only">
                  Phòng ban
                </label>
                <select
                  id="balance-dept-select"
                  value={balanceDeptId}
                  onChange={(e) =>
                    handleBalanceFilterChange(balanceStatsYear, balanceTier, e.target.value)
                  }
                  aria-label="Lọc theo phòng ban"
                >
                  <option value="">Toàn bộ nhà máy</option>
                  {departmentsList.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.code}] {d.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            <menu className="action-row" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              <li>
                <button
                  type="button"
                  className={`btn compact-button ${balanceViewMode === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setBalanceViewMode('overview')}
                >
                  Tổng quan
                </button>
              </li>
              {(isAdmin || isPureManager) && (
                <li>
                  <button
                    type="button"
                    className={`btn compact-button ${balanceViewMode === 'departments' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setBalanceViewMode('departments')}
                  >
                    Phòng ban
                  </button>
                </li>
              )}
              <li>
                <button
                  type="button"
                  className={`btn compact-button ${balanceViewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setBalanceViewMode('table')}
                >
                  {isEmployee ? 'Chi tiết của tôi' : 'Chi tiết nhân sự'}
                </button>
              </li>
            </menu>
          </form>
        </header>

        {/* Top Badges */}
        <section
          className="monthly-summary-badges"
          aria-label={`Tóm tắt chỉ số số dư phép năm ${balanceStatsYear}`}
        >
          <article className="monthly-badge-item">
            <strong className="monthly-badge-label">Tổng quỹ phép</strong>
            <data value={balanceData?.totalEntitledDays ?? 0} className="monthly-badge-value">
              {balanceData?.totalEntitledDays ?? 0} <small>ngày</small>
            </data>
            <small className="muted">
              {balanceData?.totalEmployees || 0} nhân sự · TB {balanceData?.avgRemainingPerWorker ?? 0} ngày tồn/người
            </small>
          </article>
          <article className="monthly-badge-item">
            <strong className="monthly-badge-label">Ngày phép đã dùng</strong>
            <data value={balanceData?.totalUsedDays ?? 0} className="monthly-badge-value text-warning">
              {balanceData?.totalUsedDays ?? 0} <small>ngày</small>
            </data>
            <small className="muted">
              Đã tiêu thụ {balanceData?.averageUtilizationRate ?? 0}% quỹ phép năm
            </small>
          </article>
          <article className="monthly-badge-item">
            <strong className="monthly-badge-label">Quỹ phép còn tồn</strong>
            <data value={balanceData?.totalRemainingDays ?? 0} className="monthly-badge-value text-success">
              {balanceData?.totalRemainingDays ?? 0} <small>ngày</small>
            </data>
            <small className="muted">
              Còn lại {balanceData?.totalEntitledDays > 0 ? (100 - (balanceData?.averageUtilizationRate || 0)).toFixed(1) : 0}% quỹ phép
            </small>
          </article>
          <article className="monthly-badge-item">
            <strong className="monthly-badge-label">Chuyển tiếp từ năm trước</strong>
            <data value={balanceData?.totalCarriedOverDays ?? 0} className="monthly-badge-value">
              {balanceData?.totalCarriedOverDays ?? 0} <small>ngày</small>
            </data>
            <small className="muted">Cộng dồn vào quỹ phép khả dụng</small>
          </article>
        </section>

        {balanceLoading ? (
          <SkeletonCards count={3} />
        ) : !balanceData || balanceData.totalEmployees === 0 ? (
          <figure className="empty-state" role="status">
            <figcaption>
              <strong className="empty-title">Chưa có dữ liệu ngày phép</strong>
              <p className="muted">
                Không tìm thấy dữ liệu ngày phép phù hợp với bộ lọc trong năm {balanceStatsYear}.
              </p>
            </figcaption>
          </figure>
        ) : balanceViewMode === 'overview' ? (
          <section className="balance-overview-view" aria-label="Tổng quan tiến độ sử dụng phép">
            {/* Nếu là nhân viên thường: Hiển thị Thẻ phân tích cá nhân */}
            {isEmployee && balanceData.employees && balanceData.employees.length > 0 && (
              <article className="personal-balance-card">
                <header className="personal-balance-header">
                  <h3>🎯 Tiến Độ Nghỉ Phép Cá Nhân Năm {balanceStatsYear}</h3>
                  <mark
                    className={`badge ${
                      balanceData.employees[0].utilizationRate >= 75
                        ? 'badge-danger'
                        : balanceData.employees[0].utilizationRate >= 50
                          ? 'badge-warning'
                          : 'badge-normal'
                    }`}
                  >
                    Đã dùng {balanceData.employees[0].utilizationRate}%
                  </mark>
                </header>
                <dl className="personal-balance-metrics">
                  <dt>Định mức năm:</dt>
                  <dd>
                    <strong>{balanceData.employees[0].annualEntitlement}</strong> ngày
                  </dd>
                  <dt>Chuyển từ năm trước:</dt>
                  <dd>
                    <strong>{balanceData.employees[0].carriedOverDays}</strong> ngày
                  </dd>
                  <dt>Tổng quỹ phép khả dụng:</dt>
                  <dd>
                    <strong>{balanceData.employees[0].totalEntitledDays}</strong> ngày
                  </dd>
                  <dt>Đã sử dụng:</dt>
                  <dd className="text-warning">
                    <strong>{balanceData.employees[0].usedDays}</strong> ngày
                  </dd>
                  <dt>Còn lại:</dt>
                  <dd className="text-success">
                    <strong>{balanceData.employees[0].remainingDays}</strong> ngày
                  </dd>
                </dl>
                <figure className="balance-meter-container">
                  <meter
                    min="0"
                    max={balanceData.employees[0].totalEntitledDays || 12}
                    value={balanceData.employees[0].usedDays}
                    className="balance-meter-bar"
                    aria-label={`Tiến độ dùng phép: ${balanceData.employees[0].usedDays} / ${balanceData.employees[0].totalEntitledDays} ngày`}
                  >
                    {balanceData.employees[0].utilizationRate}%
                  </meter>
                </figure>
                <footer className="personal-balance-footer">
                  <small className="muted">
                    💡 Quy định Fu Sheng: Người lao động được phép chuyển tối đa 5 ngày phép chưa sử dụng sang năm tiếp theo trước ngày 31/03.
                  </small>
                </footer>
              </article>
            )}

            {/* Phân nhóm tiến độ sử dụng phép (Tiers Grid) - Dành cho Admin/Manager */}
            {(isAdmin || isPureManager) && balanceData.tiers && (
              <section className="balance-tiers-section" aria-label="Phân bổ tiến độ sử dụng phép của nhân viên">
                <header className="tiers-section-header">
                  <h3>📊 Phân Bổ Nhân Lực Theo Mức Tiêu Thụ Phép Năm {balanceStatsYear}</h3>
                  <small className="muted">Giúp quản đốc và HR phát hiện nguy cơ dồn phép cuối năm hoặc kiệt sức lao động</small>
                </header>
                <section className="balance-tier-grid">
                  <article className="tier-card tier-low">
                    <header className="tier-card-header">
                      <h4 className="tier-title">Ít nghỉ phép (&lt; 25%)</h4>
                      <mark className="badge badge-normal">{balanceData.tiers.low.count} người</mark>
                    </header>
                    <p className="tier-desc">Còn tồn hầu hết ngày phép trong năm. Cần nhắc nhở sắp xếp lịch nghỉ hợp lý.</p>
                    <figure className="tier-meter-wrapper">
                      <meter
                        min="0"
                        max="100"
                        value={balanceData.tiers.low.percentage}
                        className="tier-meter"
                        aria-label={`Tỷ lệ nhóm ít nghỉ: ${balanceData.tiers.low.percentage}%`}
                      >
                        {balanceData.tiers.low.percentage}%
                      </meter>
                      <data value={balanceData.tiers.low.percentage} className="tier-pct">
                        {balanceData.tiers.low.percentage}% nhân lực
                      </data>
                    </figure>
                  </article>

                  <article className="tier-card tier-medium">
                    <header className="tier-card-header">
                      <h4 className="tier-title">Bình thường (25% - 50%)</h4>
                      <mark className="badge badge-info">{balanceData.tiers.medium.count} người</mark>
                    </header>
                    <p className="tier-desc">Tiến độ tiêu thụ ngày phép cân đối và ổn định theo kế hoạch quý.</p>
                    <figure className="tier-meter-wrapper">
                      <meter
                        min="0"
                        max="100"
                        value={balanceData.tiers.medium.percentage}
                        className="tier-meter"
                        aria-label={`Tỷ lệ nhóm bình thường: ${balanceData.tiers.medium.percentage}%`}
                      >
                        {balanceData.tiers.medium.percentage}%
                      </meter>
                      <data value={balanceData.tiers.medium.percentage} className="tier-pct">
                        {balanceData.tiers.medium.percentage}% nhân lực
                      </data>
                    </figure>
                  </article>

                  <article className="tier-card tier-high">
                    <header className="tier-card-header">
                      <h4 className="tier-title">Tiêu thụ khá (50% - 75%)</h4>
                      <mark className="badge badge-warning">{balanceData.tiers.high.count} người</mark>
                    </header>
                    <p className="tier-desc">Đã dùng hơn một nửa định mức phép năm, chủ yếu nghỉ việc riêng gia đình.</p>
                    <figure className="tier-meter-wrapper">
                      <meter
                        min="0"
                        max="100"
                        value={balanceData.tiers.high.percentage}
                        className="tier-meter"
                        aria-label={`Tỷ lệ nhóm dùng khá: ${balanceData.tiers.high.percentage}%`}
                      >
                        {balanceData.tiers.high.percentage}%
                      </meter>
                      <data value={balanceData.tiers.high.percentage} className="tier-pct">
                        {balanceData.tiers.high.percentage}% nhân lực
                      </data>
                    </figure>
                  </article>

                  <article className="tier-card tier-exhausted">
                    <header className="tier-card-header">
                      <h4 className="tier-title">Gần hết phép (&gt; 75%)</h4>
                      <mark className="badge badge-danger">{balanceData.tiers.exhausted.count} người</mark>
                    </header>
                    <p className="tier-desc">Chỉ còn ≤ 2-3 ngày phép khả dụng. Nếu nghỉ thêm sẽ phải xét nghỉ không hưởng lương.</p>
                    <figure className="tier-meter-wrapper">
                      <meter
                        min="0"
                        max="100"
                        value={balanceData.tiers.exhausted.percentage}
                        className="tier-meter"
                        aria-label={`Tỷ lệ nhóm gần hết phép: ${balanceData.tiers.exhausted.percentage}%`}
                      >
                        {balanceData.tiers.exhausted.percentage}%
                      </meter>
                      <data value={balanceData.tiers.exhausted.percentage} className="tier-pct">
                        {balanceData.tiers.exhausted.percentage}% nhân lực
                      </data>
                    </figure>
                  </article>
                </section>

                {/* Quản trị Insights */}
                {balanceData.insights && (
                  <section className="balance-insights-box" aria-label="Ghi chú quản trị nhân sự">
                    <header>
                      <h4>📌 Nhận Định Quản Trị Nhân Lực</h4>
                    </header>
                    <ul className="insights-list">
                      {balanceData.insights.topUsedDepartment && (
                        <li>
                          Bộ phận sử dụng phép tích cực nhất:{' '}
                          <strong>
                            [{balanceData.insights.topUsedDepartment.code}]{' '}
                            {balanceData.insights.topUsedDepartment.name}
                          </strong>{' '}
                          (đã tiêu thụ {balanceData.insights.topUsedDepartment.rate}% quỹ phép).
                        </li>
                      )}
                      {balanceData.insights.topRemainingDepartment && (
                        <li>
                          Bộ phận còn tồn nhiều ngày phép nhất:{' '}
                          <strong>
                            [{balanceData.insights.topRemainingDepartment.code}]{' '}
                            {balanceData.insights.topRemainingDepartment.name}
                          </strong>{' '}
                          (còn tồn tổng cộng {balanceData.insights.topRemainingDepartment.remainingDays} ngày phép).
                        </li>
                      )}
                      <li>
                        Có <strong>{balanceData.insights.untouchedCount}</strong> nhân sự chưa sử dụng ngày phép nào và{' '}
                        <strong>{balanceData.insights.exhaustedCount}</strong> nhân sự sắp hết quỹ phép năm {balanceStatsYear}.
                      </li>
                    </ul>
                  </section>
                )}
              </section>
            )}
          </section>
        ) : balanceViewMode === 'departments' && balanceData.departmentSummary ? (
          <section
            className="table-shell"
            aria-label={`Bảng so sánh số dư phép giữa các phòng ban năm ${balanceStatsYear}`}
          >
            <table className="responsive-table balance-dept-table">
              <caption>
                So sánh số ngày phép đã sử dụng và còn tồn theo từng bộ phận năm {balanceStatsYear}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Mã PB</th>
                  <th scope="col">Phòng ban</th>
                  <th scope="col">Nhân sự</th>
                  <th scope="col">Tổng quỹ phép</th>
                  <th scope="col">Đã sử dụng</th>
                  <th scope="col">Còn lại</th>
                  <th scope="col">TB tồn/người</th>
                  <th scope="col">Tỷ lệ sử dụng</th>
                </tr>
              </thead>
              <tbody>
                {balanceData.departmentSummary.map((d) => (
                  <tr key={d.id} className={d.isMyDepartment ? 'highlight-row' : ''}>
                    <th scope="row">
                      <code>{d.code}</code>
                      {d.isMyDepartment && (
                        <mark className="badge badge-info" style={{ marginLeft: 'var(--space-2)' }}>
                          Của bạn
                        </mark>
                      )}
                    </th>
                    <td>{d.name}</td>
                    <td>{d.staffCount} người</td>
                    <td>
                      <strong>{d.entitledDays}</strong> ngày
                    </td>
                    <td className="text-warning">
                      <strong>{d.usedDays}</strong> ngày
                    </td>
                    <td className="text-success">
                      <strong>{d.remainingDays}</strong> ngày
                    </td>
                    <td>{d.avgRemainingPerWorker} ngày</td>
                    <td>
                      <data
                        value={d.utilizationRate}
                        className={`rate-badge ${
                          d.utilizationRate >= 75
                            ? 'danger'
                            : d.utilizationRate >= 25
                              ? 'success'
                              : ''
                        }`}
                      >
                        {d.utilizationRate}%
                      </data>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <section
            className="table-shell"
            aria-label={`Danh sách chi tiết số dư phép nhân viên năm ${balanceStatsYear}`}
          >
            <table className="responsive-table balance-employee-table">
              <caption>
                Danh sách chi tiết số ngày phép năm, chuyển tiếp, đã dùng và còn lại của nhân sự năm {balanceStatsYear}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Mã NV</th>
                  <th scope="col">Họ và tên</th>
                  <th scope="col">Phòng ban</th>
                  <th scope="col">Định mức</th>
                  <th scope="col">Chuyển tiếp</th>
                  <th scope="col">Đã dùng</th>
                  <th scope="col">Còn lại</th>
                  <th scope="col">Tiến độ tiêu thụ</th>
                  <th scope="col">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {balanceData.employees.map((e) => (
                  <tr key={e.userId}>
                    <th scope="row">
                      <code>{e.employeeCode}</code>
                    </th>
                    <td>
                      <strong>{e.fullName}</strong>
                      <br />
                      <small className="muted">{e.position}</small>
                    </td>
                    <td>{e.department?.name || 'Chưa phân bổ'}</td>
                    <td>{e.annualEntitlement}</td>
                    <td>{e.carriedOverDays > 0 ? `+${e.carriedOverDays}` : '0'}</td>
                    <td className="text-warning">
                      <strong>{e.usedDays}</strong>
                    </td>
                    <td className="text-success">
                      <strong>{e.remainingDays}</strong>
                    </td>
                    <td>
                      <data value={e.utilizationRate} className="rate-badge">
                        {e.utilizationRate}%
                      </data>
                    </td>
                    <td>
                      {e.isNearExhaustion ? (
                        <mark className="badge badge-danger">Sắp hết phép</mark>
                      ) : e.isUntouched ? (
                        <mark className="badge badge-normal">Chưa nghỉ phép</mark>
                      ) : e.tier === 'high' ? (
                        <mark className="badge badge-warning">Đã dùng &gt; 50%</mark>
                      ) : (
                        <mark className="badge badge-success">Bình thường</mark>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={3}>
                    Tổng hợp ({balanceData.employees.length} nhân sự)
                  </th>
                  <td>
                    <strong>{balanceData.totalEntitledDays} ngày</strong>
                  </td>
                  <td>
                    <strong>+{balanceData.totalCarriedOverDays} ngày</strong>
                  </td>
                  <td className="text-warning">
                    <strong>{balanceData.totalUsedDays} ngày</strong>
                  </td>
                  <td className="text-success">
                    <strong>{balanceData.totalRemainingDays} ngày</strong>
                  </td>
                  <td colSpan={2}>
                    <strong className="text-success">
                      Trung bình đã dùng {balanceData.averageUtilizationRate}%
                    </strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>
        )}
      </section>
    );
  };

  /* ================================================================== */

  return (
    <section aria-labelledby="dashboard-heading">
      <header className="page-header">
        <hgroup>
          <p className="eyebrow">Cổng thông tin nội bộ Fu Sheng</p>
          <h1 id="dashboard-heading">Tổng Quan Hệ Thống</h1>
          <p>
            Chào mừng trở lại, <strong>{user?.full_name || 'Cán bộ / Nhân viên'}</strong>.
            Vai trò:{' '}
            <mark className="badge badge-accent">{roleLabels[user?.role] || user?.role}</mark>
          </p>
        </hgroup>
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
            <strong>
              <mark className="quick-action-icon" aria-hidden="true"><ShieldCheck size={18} /></mark>
              Nhật Ký Hệ Thống
            </strong>
            <small>
              Tra cứu lịch sử thao tác & kiểm toán ({stats.adminData?.audit?.todayCount || 0} log hôm nay)
            </small>
          </Link>
          <Link to="/employees" className="quick-action-link">
            <strong>
              <mark className="quick-action-icon" aria-hidden="true"><Users size={18} /></mark>
              Quản Lý Tài Khoản
            </strong>
            <small>Thêm nhân sự mới, phân quyền vai trò & mở/khóa tài khoản</small>
          </Link>
          <Link to="/departments" className="quick-action-link">
            <strong>
              <mark className="quick-action-icon" aria-hidden="true"><Building2 size={18} /></mark>
              Quản Trị Phòng Ban
            </strong>
            <small>Cơ cấu tổ chức nhà máy & bổ nhiệm trưởng bộ phận ({stats.totalDepartments} PB)</small>
          </Link>
          <Link to="/leaves" className="quick-action-link">
            <strong>
              <mark className="quick-action-icon" aria-hidden="true"><CalendarClock size={18} /></mark>
              Giám Sát Đơn Phép & OT
            </strong>
            <small>Tổng hợp đối soát đơn nghỉ và tăng ca toàn nhà máy ({stats.leaveStatus.pending} chờ duyệt)</small>
          </Link>
          <button
            type="button"
            className="quick-action-link"
            onClick={() => setShowReportModal(true)}
            style={{ textAlign: 'left', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            aria-label="Xuất báo cáo định kỳ theo tháng/năm"
          >
            <strong>
              <mark className="quick-action-icon" aria-hidden="true"><Download size={18} /></mark>
              Báo Cáo Định Kỳ
            </strong>
            <small>Xuất file CSV tổng hợp nhân sự, phép & OT theo tháng/năm</small>
          </button>
        </nav>
      ) : (
        <nav className="quick-actions-grid" aria-label="Lối tắt thao tác nhanh">
          <Link to="/leaves" className="quick-action-link">
            <strong>
              <mark className="quick-action-icon" aria-hidden="true"><FilePlus size={18} /></mark>
              Đăng Ký Đơn Mới
            </strong>
            <small>Nộp đề xuất nghỉ phép hoặc làm thêm giờ trực tuyến</small>
          </Link>
          <Link to="/employees" className="quick-action-link">
            <strong>
              <mark className="quick-action-icon" aria-hidden="true"><Users size={18} /></mark>
              Tra Cứu Danh Bạ
            </strong>
            <small>Tìm kiếm danh bạ nhân sự và thông tin liên lạc</small>
          </Link>
          {isPureManager && (
            <Link to="/leaves" className="quick-action-link highlight">
              <strong>
                <mark className="quick-action-icon" aria-hidden="true"><Clock size={18} /></mark>
                Duyệt Đơn Chờ ({stats.leaveStatus.pending})
              </strong>
              <small>Xử lý cấp tốc các yêu cầu nghỉ phép đang chờ phê duyệt</small>
            </Link>
          )}
          {isPureManager && (
            <button
              type="button"
              className="quick-action-link"
              onClick={() => setShowReportModal(true)}
              style={{ textAlign: 'left', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              aria-label="Xuất báo cáo định kỳ theo tháng/năm"
            >
              <strong>
                <mark className="quick-action-icon" aria-hidden="true"><Download size={18} /></mark>
                Báo Cáo Định Kỳ
              </strong>
              <small>Trích xuất báo cáo nhân sự & nghỉ phép/OT theo tháng/năm</small>
            </button>
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
                      <p className="action-item-applicant">
                        <strong>{item.applicant?.full_name || 'Nhân viên'}</strong>
                        <small className="muted">
                          {' '}
                          ({item.applicant?.employee_code || `#${item.id}`})
                        </small>
                      </p>
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

        {/* Báo Cáo Số Đơn Theo Tháng */}
        <MonthlyRequestsReportPanel />

        {/* Top Phòng Ban Có Nhiều OT */}
        <TopOtDepartmentsPanel />

        {/* Báo Cáo Tỷ Lệ Duyệt / Từ Chối */}
        <ApprovalRateReportPanel />

        {/* Báo Cáo Số Ngày Phép Đã Dùng / Còn Lại */}
        <LeaveBalanceReportPanel />

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
              <table className="responsive-table">
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
                        <td data-label="Người nộp">
                          <strong>{req.applicant?.full_name || 'N/A'}</strong>
                          <br />
                          <small className="muted">
                            {req.applicant?.department?.name || 'Nhà máy'}
                          </small>
                        </td>
                      )}
                      <td data-label="Loại">
                        <small>
                          {req.request_type === 'overtime'
                            ? 'Tăng ca'
                            : leaveLabels[req.leave_type] || req.leave_type}
                        </small>
                      </td>
                      <td data-label="Từ ngày">
                        <small>{req.start_date}</small>
                      </td>
                      <td data-label="Trạng thái">
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
            <div className="action-row">
              <data value={stats.recentAnnouncements.length} className="badge badge-subtle">
                {stats.recentAnnouncements.length} tin
              </data>
              {isManager && (
                <Link to="/announcements" className="badge badge-accent">
                  Quản lý bảng tin →
                </Link>
              )}
            </div>
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
                    <hgroup>
                      <h3>{ann.title}</h3>
                      <time dateTime={ann.createdAt}>
                        {new Date(ann.createdAt).toLocaleDateString('vi-VN')}
                      </time>
                    </hgroup>
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

      {/* Dialog Xuất Báo Cáo Định Kỳ Tháng / Năm */}
      {isManager && (
        <dialog
          ref={reportDialogRef}
          className="dialog"
          aria-labelledby="report-dialog-title"
          onClose={() => setShowReportModal(false)}
        >
          <header className="dialog-header">
            <hgroup>
              <h2 id="report-dialog-title">Xuất Báo Cáo Định Kỳ (Tháng / Năm)</h2>
              <p>Tổng hợp chỉ số nhân sự, đơn nghỉ phép & tăng ca OT toàn diện.</p>
            </hgroup>
            <button
              type="button"
              className="btn btn-secondary compact-button"
              onClick={() => setShowReportModal(false)}
              aria-label="Đóng hộp thoại"
            >
              ✕
            </button>
          </header>

          <form onSubmit={handleExportMonthlyReport}>
            <fieldset disabled={isExportingReport}>
              <legend className="visually-hidden">Tùy chọn trích xuất báo cáo định kỳ</legend>

              <div className="form-grid">
                <p className="field-group">
                  <label htmlFor="report-year-select">Năm thống kê</label>
                  <select
                    id="report-year-select"
                    value={reportYear}
                    onChange={(e) => setReportYear(Number(e.target.value))}
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        Năm {y}
                      </option>
                    ))}
                  </select>
                </p>

                <p className="field-group">
                  <label htmlFor="report-month-select">Kỳ báo cáo</label>
                  <select
                    id="report-month-select"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                  >
                    <option value="">Cả năm {reportYear}</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        Tháng {m}/{reportYear}
                      </option>
                    ))}
                  </select>
                </p>
              </div>

              {isAdmin && (
                <p className="field-group">
                  <label htmlFor="report-dept-select">Phạm vi phòng ban</label>
                  <select
                    id="report-dept-select"
                    value={reportDeptId}
                    onChange={(e) => setReportDeptId(e.target.value)}
                  >
                    <option value="">Toàn nhà máy (Tất cả phòng ban)</option>
                    {departmentsList.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        [{dept.code}] {dept.name}
                      </option>
                    ))}
                  </select>
                </p>
              )}

              {isPureManager && stats.deptInfo && (
                <p className="field-group">
                  <label htmlFor="report-dept-fixed">Phòng ban phụ trách</label>
                  <input
                    id="report-dept-fixed"
                    type="text"
                    readOnly
                    value={`[${stats.deptInfo.code}] ${stats.deptInfo.name}`}
                    disabled
                  />
                </p>
              )}

              <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
                File CSV xuất ra chuẩn UTF-8 BOM, tương thích hiển thị tiếng Việt trên Microsoft Excel, bao gồm số liệu nhân sự, tổng số đơn, đơn duyệt, từ chối, số ngày phép và giờ OT.
              </p>

              <footer className="action-row" style={{ marginTop: 'var(--space-4)' }}>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="btn btn-secondary"
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary" disabled={isExportingReport}>
                  <Download size={14} aria-hidden="true" />
                  {isExportingReport ? 'Đang trích xuất CSV...' : 'Tải Báo Cáo CSV'}
                </button>
              </footer>
            </fieldset>
          </form>
        </dialog>
      )}
    </section>
  );
}
