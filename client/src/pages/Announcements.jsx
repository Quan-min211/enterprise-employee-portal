import React, { useEffect, useState } from 'react';
import { announcementsApi } from '../api/announcementsApi';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const emptyForm = { title: '', content: '', priority: 'normal', expires_at: '' };

export default function Announcements() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const fetchAnnouncements = async (nextPage = page) => {
    setLoading(true);
    try {
      const res = await announcementsApi.list({ priority: priority || undefined, page: nextPage, limit: 10 });
      setAnnouncements(res.announcements || []);
      setMeta({ total: res.total || 0, totalPages: res.totalPages || 1 });
      setPage(res.page || nextPage);
    } catch (error) {
      pushToast(error.message || 'Khong the tai thong bao.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(1); }, [priority]);

  const openCreate = () => { setEditing(null); setFormData(emptyForm); setDialogOpen(true); };
  const openEdit = (announcement) => {
    setEditing(announcement);
    setFormData({ title: announcement.title, content: announcement.content, priority: announcement.priority, expires_at: announcement.expires_at ? announcement.expires_at.slice(0, 10) : '' });
    setDialogOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...formData, expires_at: formData.expires_at || null };
      if (editing) await announcementsApi.update(editing.id, payload);
      else await announcementsApi.create(payload);
      setDialogOpen(false);
      pushToast(editing ? 'Cap nhat thong bao thanh cong.' : 'Dang thong bao thanh cong.', 'success');
      fetchAnnouncements(page);
    } catch (error) {
      pushToast(error.message || 'Khong the luu thong bao.', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await announcementsApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      pushToast('Xoa thong bao thanh cong.', 'success');
      fetchAnnouncements(page);
    } catch (error) {
      pushToast(error.message || 'Khong the xoa thong bao.', 'error');
    }
  };

  const canEdit = (announcement) => user?.role === 'admin' || announcement.author_id === user?.id || announcement.author?.id === user?.id;
  const isPublisher = user?.role === 'admin' || user?.role === 'manager';

  return (
    <section aria-labelledby="news-heading">
      <header className="page-header">
        <section><h1 id="news-heading">Bang Tin & Thong Bao Cong Ty</h1><p>Cac tin tuc chinh sach, an toan nha may va su kien noi bo Fu Sheng.</p></section>
        <section className="toolbar" aria-label="Cong cu bang tin">
          <label htmlFor="priority-filter" className="visually-hidden">Loc muc uu tien</label>
          <select id="priority-filter" value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">Tat ca muc uu tien</option><option value="urgent">Urgent</option><option value="important">Important</option><option value="normal">Normal</option></select>
          {isPublisher && <button type="button" onClick={openCreate} className="btn btn-primary">Dang thong bao moi</button>}
        </section>
      </header>

      {dialogOpen && <dialog open className="dialog" aria-labelledby="announcement-dialog-title">
        <h2 id="announcement-dialog-title">{editing ? 'Sua Thong Bao' : 'Tao Thong Bao Moi'}</h2>
        <form onSubmit={handleSubmit}><fieldset><legend className="visually-hidden">Thong tin thong bao noi bo</legend>
          <section className="field-group"><label htmlFor="ann_title">Tieu de thong bao</label><input id="ann_title" required minLength={5} value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} /></section>
          <section className="form-grid"><section className="field-group"><label htmlFor="ann_priority">Muc uu tien</label><select id="ann_priority" value={formData.priority} onChange={(event) => setFormData({ ...formData, priority: event.target.value })}><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select></section><section className="field-group"><label htmlFor="ann_expires_at">Ngay het han</label><input id="ann_expires_at" type="date" value={formData.expires_at} onChange={(event) => setFormData({ ...formData, expires_at: event.target.value })} /></section></section>
          <section className="field-group"><label htmlFor="ann_content">Noi dung chi tiet</label><textarea id="ann_content" required rows={5} minLength={10} value={formData.content} onChange={(event) => setFormData({ ...formData, content: event.target.value })} /></section>
          <footer className="action-row"><button type="button" onClick={() => setDialogOpen(false)} className="btn btn-secondary">Huy</button><button type="submit" className="btn btn-primary">{editing ? 'Luu thay doi' : 'Dang thong bao'}</button></footer>
        </fieldset></form>
      </dialog>}

      {loading ? <p>Dang tai thong bao...</p> : announcements.length === 0 ? <p className="empty-state">Hien chua co thong bao nao.</p> : <section className="stack" aria-label="Danh sach thong bao">
        {announcements.map((ann) => <article key={ann.id} className={`announcement-card ${ann.priority}`}>
          <header><section><h2>{ann.title}</h2><time dateTime={ann.created_at}>{new Date(ann.created_at).toLocaleDateString('vi-VN')} | Boi: {ann.author?.full_name || 'Ban Quan Tri'}</time></section><mark className={`badge badge-${ann.priority}`}>{ann.priority}</mark></header>
          <p>{ann.content}</p>
          {isPublisher && canEdit(ann) && <footer className="action-row"><button type="button" className="btn btn-secondary compact-button" onClick={() => openEdit(ann)}>Sua</button><button type="button" className="btn btn-secondary compact-button danger-text" onClick={() => setDeleteTarget(ann)}>Xoa</button></footer>}
        </article>)}
      </section>}
      <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={10} onChange={fetchAnnouncements} />
      <ConfirmDialog open={Boolean(deleteTarget)} title="Xoa thong bao?" message={deleteTarget ? `Thong bao "${deleteTarget.title}" se bi xoa vinh vien.` : ''} confirmLabel="Xoa thong bao" danger onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </section>
  );
}
