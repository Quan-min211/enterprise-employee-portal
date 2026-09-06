import React, { useEffect, useState } from 'react';
import { departmentsApi } from '../api/departmentsApi';
import { useAuth } from '../contexts/AuthContext';

const emptyForm = {
  code: '',
  name: '',
  manager_name: '',
  description: ''
};

export default function Departments() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin';

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await departmentsApi.list();
      setDepartments(res.departments || []);
    } catch (err) {
      setError(err.message || 'Khong the tai danh sach phong ban.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (editingId) {
        await departmentsApi.update(editingId, formData);
        setMessage('Cap nhat phong ban thanh cong.');
      } else {
        await departmentsApi.create(formData);
        setMessage('Tao phong ban thanh cong.');
      }

      resetForm();
      fetchDepartments();
    } catch (err) {
      setError(err.message || 'Khong the luu phong ban.');
    }
  };

  const handleEdit = (department) => {
    setEditingId(department.id);
    setFormData({
      code: department.code || '',
      name: department.name || '',
      manager_name: department.manager_name || '',
      description: department.description || ''
    });
  };

  const handleDelete = async (department) => {
    const confirmed = window.confirm(`Xoa phong ban ${department.name}? Nhan vien se duoc bo gan phong ban.`);
    if (!confirmed) {
      return;
    }

    setError('');
    setMessage('');
    try {
      await departmentsApi.remove(department.id);
      setMessage('Xoa phong ban thanh cong.');
      fetchDepartments();
      if (editingId === department.id) {
        resetForm();
      }
    } catch (err) {
      setError(err.message || 'Khong the xoa phong ban.');
    }
  };

  if (!isAdmin) {
    return (
      <section aria-labelledby="departments-heading">
        <header className="page-header">
          <section>
            <h1 id="departments-heading">Quan Tri Phong Ban</h1>
            <p>Chi tai khoan admin moi co quyen quan ly danh muc phong ban.</p>
          </section>
        </header>
        <aside className="alert">Ban khong co quyen truy cap chuc nang nay.</aside>
      </section>
    );
  }

  return (
    <section aria-labelledby="departments-heading">
      <header className="page-header">
        <section>
          <h1 id="departments-heading">Quan Tri Phong Ban</h1>
          <p>Quan ly danh muc phong ban, truong bo phan va mo ta nghiep vu trong he thong noi bo.</p>
        </section>
      </header>

      {message && <aside className="alert success-alert" aria-live="polite">{message}</aside>}
      {error && <aside className="alert" aria-live="polite">{error}</aside>}

      <section className="admin-grid" aria-label="Quan tri danh muc phong ban">
        <article className="panel">
          <h2>{editingId ? 'Cap Nhat Phong Ban' : 'Tao Phong Ban Moi'}</h2>
          <form onSubmit={handleSubmit}>
            <fieldset>
              <legend className="visually-hidden">Thong tin phong ban</legend>

              <section className="form-grid">
                <section className="field-group">
                  <label htmlFor="department_code">Ma phong ban</label>
                  <input
                    id="department_code"
                    required
                    minLength={2}
                    maxLength={20}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                </section>

                <section className="field-group">
                  <label htmlFor="department_name">Ten phong ban</label>
                  <input
                    id="department_name"
                    required
                    minLength={2}
                    maxLength={100}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </section>
              </section>

              <section className="field-group">
                <label htmlFor="department_manager">Truong bo phan</label>
                <input
                  id="department_manager"
                  maxLength={100}
                  value={formData.manager_name}
                  onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                />
              </section>

              <section className="field-group">
                <label htmlFor="department_description">Mo ta</label>
                <textarea
                  id="department_description"
                  rows={4}
                  maxLength={1000}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </section>

              <section className="action-row">
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Luu thay doi' : 'Tao phong ban'}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>
                    Huy sua
                  </button>
                )}
              </section>
            </fieldset>
          </form>
        </article>

        <article className="panel">
          <h2>Danh Sach Phong Ban</h2>
          {loading ? (
            <p>Dang tai phong ban...</p>
          ) : (
            <section className="department-list" aria-label="Danh sach phong ban hien co">
              {departments.map((department) => (
                <article className="department-item" key={department.id}>
                  <header>
                    <section>
                      <h3>{department.name}</h3>
                      <p><code>{department.code}</code> | {department.manager_name || 'Chua gan truong bo phan'}</p>
                    </section>
                    <mark className="badge badge-normal">{department.employee_count} NV</mark>
                  </header>
                  <p>{department.description || 'Chua co mo ta phong ban.'}</p>
                  <footer className="action-row">
                    <button type="button" className="btn btn-secondary compact-button" onClick={() => handleEdit(department)}>
                      Sua
                    </button>
                    <button type="button" className="btn btn-secondary compact-button danger-text" onClick={() => handleDelete(department)}>
                      Xoa
                    </button>
                  </footer>
                </article>
              ))}
            </section>
          )}
        </article>
      </section>
    </section>
  );
}
