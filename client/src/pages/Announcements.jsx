import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../contexts/AuthContext';

export default function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', priority: 'normal' });

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/announcements');
      setAnnouncements(res.announcements || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post('/announcements', formData);
      setShowModal(false);
      setFormData({ title: '', content: '', priority: 'normal' });
      fetchAnnouncements();
    } catch (err) {
      alert(err.message || 'Lỗi khi đăng thông báo');
    }
  };

  const isPublisher = user?.role === 'admin' || user?.role === 'manager';

  return (
    <section aria-labelledby="news-heading">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 id="news-heading">Bảng Tin & Thông Báo Công Ty</h1>
          <p>Các tin tức chính sách, an toàn nhà máy và sự kiện nội bộ Fu Sheng.</p>
        </div>

        {isPublisher && (
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            + Đăng thông báo mới
          </button>
        )}
      </header>

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
          maxWidth: '550px',
          color: 'var(--text-primary)',
          zIndex: 1000
        }}>
          <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>Tạo Thông Báo Mới</h2>
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label htmlFor="ann_title">Tiêu đề thông báo</label>
              <input
                id="ann_title"
                required
                placeholder="VD: Lịch bảo trì hệ thống điện xưởng 2..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label htmlFor="ann_priority">Mức độ ưu tiên</label>
              <select
                id="ann_priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="normal">Bình thường (Normal)</option>
                <option value="important">Quan trọng (Important)</option>
                <option value="urgent">Khẩn cấp (Urgent)</option>
              </select>
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label htmlFor="ann_content">Nội dung chi tiết</label>
              <textarea
                id="ann_content"
                required
                rows={4}
                placeholder="Nội dung chi tiết của thông báo..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                Hủy
              </button>
              <button type="submit" className="btn btn-primary">
                Đăng thông báo
              </button>
            </div>
          </form>
        </dialog>
      )}

      {loading ? (
        <p>Đang tải thông báo...</p>
      ) : announcements.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Hiện chưa có thông báo nào.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {announcements.map((ann) => (
            <article key={ann.id} style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderLeft: ann.priority === 'urgent' ? '4px solid var(--danger)' : ann.priority === 'important' ? '4px solid var(--warning)' : '4px solid var(--accent)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-5)'
            }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <div>
                  <h2 style={{ fontSize: 'var(--text-lg)', margin: 0 }}>{ann.title}</h2>
                  <time dateTime={ann.createdAt} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Đăng ngày: {new Date(ann.createdAt).toLocaleDateString('vi-VN')} | Bởi: {ann.author?.full_name || 'Ban Quản Trị'}
                  </time>
                </div>
                <span className={`badge badge-${ann.priority}`}>{ann.priority}</span>
              </header>
              <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{ann.content}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
