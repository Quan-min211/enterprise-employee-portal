import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    pendingLeaves: 0,
    recentAnnouncements: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [empRes, leaveRes, annRes] = await Promise.all([
          axiosClient.get('/employees?limit=1'),
          axiosClient.get('/leaves'),
          axiosClient.get('/announcements')
        ]);

        const pendingCount = leaveRes.requests?.filter(r => r.status === 'pending').length || 0;

        setStats({
          totalEmployees: empRes.total || 0,
          pendingLeaves: pendingCount,
          recentAnnouncements: annRes.announcements?.slice(0, 3) || []
        });
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <section aria-labelledby="dashboard-heading">
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 id="dashboard-heading">Tổng Quan Hệ Thống</h1>
        <p>Chào mừng trở lại, <strong>{user?.full_name}</strong>! Đây là tình trạng hoạt động nội bộ hôm nay.</p>
      </header>

      {/* Metric Cards Grid */}
      <section aria-label="Thống kê tóm tắt" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-8)'
      }}>
        <article style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderTop: '3px solid var(--accent)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-5)'
        }}>
          <h2 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
            Tổng Nhân Viên
          </h2>
          <p style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {stats.totalEmployees}
          </p>
        </article>

        <article style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderTop: '3px solid var(--warning)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-5)'
        }}>
          <h2 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
            Đơn Nghỉ Phép Chờ Duyệt
          </h2>
          <p style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--warning-text)', margin: 0 }}>
            {stats.pendingLeaves}
          </p>
        </article>

        <article style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderTop: '3px solid var(--success)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-5)'
        }}>
          <h2 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
            Hệ Thống Trực Tuyến
          </h2>
          <p style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--success-text)', margin: 0 }}>
            100%
          </p>
        </article>
      </section>

      {/* Recent Announcements */}
      <section aria-labelledby="announcements-heading">
        <h2 id="announcements-heading">Thông Báo Mới Nhất</h2>
        {stats.recentAnnouncements.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Chưa có thông báo mới.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {stats.recentAnnouncements.map((ann) => (
              <article key={ann.id} style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <h3 style={{ fontSize: 'var(--text-base)', margin: 0 }}>{ann.title}</h3>
                  <span className={`badge badge-${ann.priority}`}>{ann.priority}</span>
                </div>
                <p style={{ fontSize: 'var(--text-sm)', margin: 0 }}>{ann.content}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
