import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../api/dashboardApi';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalDepartments: 0,
    leaveStatus: { pending: 0, approved: 0, rejected: 0 },
    recentAnnouncements: []
  });

  useEffect(() => {
    document.title = 'Tổng quan hệ thống | Fu Sheng Portal';

    const fetchDashboardData = async () => {
      try {
        const res = await dashboardApi.getSummary();
        if (res?.summary) {
          setStats(res.summary);
        }
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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

  return (
    <section aria-labelledby="dashboard-heading">
      <header className="page-header">
        <section>
          <p className="eyebrow">Cổng thông tin nội bộ Fu Sheng</p>
          <h1 id="dashboard-heading">Tổng Quan Hệ Thống</h1>
          <p>
            Chào mừng trở lại, <strong>{user?.full_name || 'Cán bộ / Nhân viên'}</strong>. Đây là tổng hợp hoạt động vận hành hôm nay.
          </p>
        </section>
        <aside className="shift-brief" aria-label="Tóm tắt ca vận hành">
          <header>
            <strong>Ca hành chính</strong>
            <time dateTime={new Date().toISOString().split('T')[0]}>{todayFormatted}</time>
          </header>
          <data value={approvalRate} className="shift-stat">
            <strong>{approvalRate}%</strong> đơn đã xử lý
          </data>
        </aside>
      </header>

      {/* Metric summary cards */}
      <section className="metrics-grid" aria-label="Thống kê tổng hợp">
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
          <p className="metric-caption">Nghỉ phép & tăng ca</p>
        </article>

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
        {/* Panel 1: Status Chart */}
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

        {/* Panel 2: Recent Announcements */}
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

        {/* Panel 3: Internship Focus */}
        <section className="panel" aria-labelledby="internship-focus-heading">
          <header className="panel-header">
            <h2 id="internship-focus-heading">Trọng Tâm Đề Tài</h2>
            <data value="scope" className="badge badge-accent">Mục tiêu</data>
          </header>
          <ol className="focus-list">
            <li>
              <strong>Số hóa quy trình nhân sự nhà máy</strong>
              <p>Loại bỏ phiếu giấy và luồng xử lý email thủ công, tập trung dữ liệu minh bạch.</p>
            </li>
            <li>
              <strong>Phân quyền chặt chẽ theo vai trò (RBAC)</strong>
              <p>Admin quản trị danh mục, Quản lý duyệt cấp tốc, Nhân viên theo dõi trực tuyến.</p>
            </li>
            <li>
              <strong>Kiến trúc sẵn sàng môi trường sản xuất</strong>
              <p>Đóng gói Docker Compose, bảo mật HttpOnly Cookie và tối ưu hóa hiệu năng MySQL 8.</p>
            </li>
          </ol>
        </section>

        {/* Panel 4: System Operations */}
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
            <dt>Hạ tầng triển khai</dt>
            <dd>Docker Compose (Nginx + Node.js 20)</dd>
          </dl>
        </section>
      </section>
    </section>
  );
}
