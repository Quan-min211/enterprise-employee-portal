import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../api/dashboardApi';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalDepartments: 0,
    leaveStatus: { pending: 0, approved: 0, rejected: 0 },
    recentAnnouncements: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await dashboardApi.getSummary();
        setStats(res.summary || stats);
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      }
    };

    fetchDashboardData();
  }, []);

  const totalLeaveRequests = Object.values(stats.leaveStatus).reduce((sum, value) => sum + Number(value || 0), 0);
  const chartRows = [
    { key: 'pending', label: 'Cho duyet', value: stats.leaveStatus.pending, className: 'warning' },
    { key: 'approved', label: 'Da duyet', value: stats.leaveStatus.approved, className: 'success' },
    { key: 'rejected', label: 'Tu choi', value: stats.leaveStatus.rejected, className: 'danger' }
  ];

  return (
    <section aria-labelledby="dashboard-heading">
      <header className="page-header">
        <section>
          <h1 id="dashboard-heading">Tong Quan He Thong</h1>
          <p>Chao mung tro lai, <strong>{user?.full_name}</strong>. Day la tinh trang hoat dong noi bo hom nay.</p>
        </section>
      </header>

      <section className="metrics-grid" aria-label="Thong ke tom tat">
        <article className="metric-card">
          <h2>Tong Nhan Vien</h2>
          <p className="metric-value">{stats.totalEmployees}</p>
        </article>

        <article className="metric-card warning">
          <h2>Don Cho Duyet</h2>
          <p className="metric-value">{stats.leaveStatus.pending}</p>
        </article>

        <article className="metric-card success">
          <h2>Phong Ban</h2>
          <p className="metric-value">{stats.totalDepartments}</p>
        </article>
      </section>

      <section className="dashboard-grid" aria-label="Bang dieu hanh noi bo">
        <section className="panel" aria-labelledby="leave-chart-heading">
          <h2 id="leave-chart-heading">Trang Thai Don Phep</h2>
          <section className="status-chart" aria-label="Bieu do tom tat don phep">
            {chartRows.map((row) => {
              const width = totalLeaveRequests > 0 ? Math.max((row.value / totalLeaveRequests) * 100, row.value > 0 ? 8 : 0) : 0;

              return (
                <article className="chart-row" key={row.key}>
                  <header>
                    <strong>{row.label}</strong>
                    <data value={row.value}>{row.value}</data>
                  </header>
                  <meter min="0" max="100" value={width} className={row.className}>
                    {Math.round(width)}%
                  </meter>
                </article>
              );
            })}
          </section>
        </section>

        <section className="panel" aria-labelledby="ops-heading">
          <h2 id="ops-heading">Van Hanh He Thong</h2>
          <dl className="ops-list">
            <dt>RBAC</dt>
            <dd>Admin, Manager, Employee</dd>
            <dt>Auth</dt>
            <dd>JWT HttpOnly Cookie</dd>
            <dt>Database</dt>
            <dd>MySQL 8 + Sequelize</dd>
            <dt>Deployment</dt>
            <dd>Docker Compose ready</dd>
          </dl>
        </section>

        <section className="panel" aria-labelledby="announcements-heading">
          <h2 id="announcements-heading">Thong Bao Moi Nhat</h2>
          {stats.recentAnnouncements.length === 0 ? (
            <p className="muted">Chua co thong bao moi.</p>
          ) : (
            <section className="stack" aria-label="Danh sach thong bao moi nhat">
              {stats.recentAnnouncements.map((ann) => (
                <article key={ann.id} className={`announcement-card ${ann.priority}`}>
                  <header>
                    <section>
                      <h3>{ann.title}</h3>
                      <time dateTime={ann.createdAt}>
                        {new Date(ann.createdAt).toLocaleDateString('vi-VN')}
                      </time>
                    </section>
                    <mark className={`badge badge-${ann.priority}`}>{ann.priority}</mark>
                  </header>
                  <p>{ann.content}</p>
                </article>
              ))}
            </section>
          )}
        </section>
      </section>
    </section>
  );
}
