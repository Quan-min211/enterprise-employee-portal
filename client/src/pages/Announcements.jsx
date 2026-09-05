import React, { useEffect, useState } from 'react';
import { announcementsApi } from '../api/announcementsApi';
import { useAuth } from '../contexts/AuthContext';

export default function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priority, setPriority] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', priority: 'normal', expires_at: '' });

  const fetchAnnouncements = async (nextPriority = priority) => {
    setLoading(true);
    try {
      const res = await announcementsApi.list({ priority: nextPriority || undefined });
      setAnnouncements(res.announcements || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements(priority);
  }, [priority]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await announcementsApi.create({
        ...formData,
        expires_at: formData.expires_at || null
      });
      setShowModal(false);
      setFormData({ title: '', content: '', priority: 'normal', expires_at: '' });
      fetchAnnouncements();
    } catch (err) {
      alert(err.message || 'Loi khi dang thong bao');
    }
  };

  const isPublisher = user?.role === 'admin' || user?.role === 'manager';

  return (
    <section aria-labelledby="news-heading">
      <header className="page-header">
        <section>
          <h1 id="news-heading">Bang Tin & Thong Bao Cong Ty</h1>
          <p>Cac tin tuc chinh sach, an toan nha may va su kien noi bo Fu Sheng.</p>
        </section>

        <section className="toolbar" aria-label="Cong cu bang tin">
          <label htmlFor="priority-filter" className="visually-hidden">Loc muc uu tien</label>
          <select
            id="priority-filter"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            aria-label="Loc thong bao theo muc uu tien"
          >
            <option value="">Tat ca muc uu tien</option>
            <option value="urgent">Urgent</option>
            <option value="important">Important</option>
            <option value="normal">Normal</option>
          </select>

          {isPublisher && (
            <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary">
              Dang thong bao moi
            </button>
          )}
        </section>
      </header>

      {showModal && (
        <dialog open className="dialog" aria-labelledby="announcement-dialog-title">
          <h2 id="announcement-dialog-title">Tao Thong Bao Moi</h2>
          <form onSubmit={handleCreate}>
            <fieldset>
              <legend className="visually-hidden">Thong tin thong bao noi bo</legend>

              <section className="field-group">
                <label htmlFor="ann_title">Tieu de thong bao</label>
                <input
                  id="ann_title"
                  required
                  minLength={5}
                  placeholder="VD: Lich bao tri he thong dien xuong 2..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </section>

              <section className="form-grid">
                <section className="field-group">
                  <label htmlFor="ann_priority">Muc uu tien</label>
                  <select
                    id="ann_priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </section>

                <section className="field-group">
                  <label htmlFor="ann_expires_at">Ngay het han</label>
                  <input
                    id="ann_expires_at"
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  />
                </section>
              </section>

              <section className="field-group">
                <label htmlFor="ann_content">Noi dung chi tiet</label>
                <textarea
                  id="ann_content"
                  required
                  rows={4}
                  minLength={10}
                  placeholder="Noi dung chi tiet cua thong bao..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </section>

              <section className="action-row">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Huy
                </button>
                <button type="submit" className="btn btn-primary">
                  Dang thong bao
                </button>
              </section>
            </fieldset>
          </form>
        </dialog>
      )}

      {loading ? (
        <p>Dang tai thong bao...</p>
      ) : announcements.length === 0 ? (
        <p className="muted">Hien chua co thong bao nao.</p>
      ) : (
        <section className="stack" aria-label="Danh sach thong bao">
          {announcements.map((ann) => (
            <article key={ann.id} className={`announcement-card ${ann.priority}`}>
              <header>
                <section>
                  <h2>{ann.title}</h2>
                  <time dateTime={ann.createdAt}>
                    Dang ngay: {new Date(ann.createdAt).toLocaleDateString('vi-VN')} | Boi: {ann.author?.full_name || 'Ban Quan Tri'}
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
  );
}
