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
  );
}
