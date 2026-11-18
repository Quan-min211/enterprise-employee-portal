import React, { useEffect, useState } from 'react';
import {
  Plus,
  Save,
  RotateCcw,
  Pencil,
  Trash2
} from 'lucide-react';
import TableSkeleton, { EmptyState } from '../components/TableSkeleton';
import { departmentsApi } from '../api/departmentsApi';
import { employeesApi } from '../api/employeesApi';
import { useAuth } from '../contexts/AuthContext';

const emptyForm = {
  code: '',
  name: '',
  manager_id: '',
  manager_name: '',
  description: ''
};

export default function Departments() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin';

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const [deptRes, empRes] = await Promise.all([
        departmentsApi.list(),
        employeesApi.list({ limit: 50 }).catch(() => ({ employees: [] }))
      ]);
      setDepartments(deptRes.departments || []);
      setEmployees(empRes.employees || []);
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
      const payload = {
        code: formData.code,
        name: formData.name,
        description: formData.description,
        manager_id: formData.manager_id ? Number(formData.manager_id) : null
      };
      if (!formData.manager_id && formData.manager_name) {
        payload.manager_name = formData.manager_name;
      }

      if (editingId) {
        await departmentsApi.update(editingId, payload);
        setMessage('Cap nhat phong ban thanh cong.');
      } else {
        await departmentsApi.create(payload);
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
      manager_id: department.manager_id ? String(department.manager_id) : '',
      manager_name: department.manager?.full_name || department.manager_name || '',
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
          <hgroup>
            <h1 id="departments-heading">Quan Tri Phong Ban</h1>
            <p>Chi tai khoan admin moi co quyen quan ly danh muc phong ban.</p>
          </hgroup>
        </header>
        <aside className="alert">Ban khong co quyen truy cap chuc nang nay.</aside>
      </section>
    );
  }

  return (
    <section aria-labelledby="departments-heading">
      <header className="page-header">
        <hgroup>
          <h1 id="departments-heading">Quan Tri Phong Ban</h1>
          <p>Quan ly danh muc phong ban, truong bo phan va mo ta nghiep vu trong he thong noi bo.</p>
        </hgroup>
      </header>

      {message && <aside className="alert success-alert" aria-live="polite">{message}</aside>}
      {error && <aside className="alert" aria-live="polite">{error}</aside>}

      <section className="admin-grid" aria-label="Quan tri danh muc phong ban">
        <article className="panel">
          <h2>{editingId ? 'Cap Nhat Phong Ban' : 'Tao Phong Ban Moi'}</h2>
          <form onSubmit={handleSubmit}>
            <fieldset>
              <legend className="visually-hidden">Thong tin phong ban</legend>

              <div className="form-grid">
                <p className="field-group">
                  <label htmlFor="department_code">Ma phong ban</label>
                  <input
                    id="department_code"
                    required
                    minLength={2}
                    maxLength={20}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                </p>

                <p className="field-group">
                  <label htmlFor="department_name">Ten phong ban</label>
                  <input
                    id="department_name"
                    required
                    minLength={2}
                    maxLength={100}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </p>
              </div>

              <p className="field-group">
                <label htmlFor="department_manager_id">Truong bo phan (Manager)</label>
                <select
                  id="department_manager_id"
                  value={formData.manager_id}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const matched = employees.find((emp) => String(emp.id) === selectedId);
                    setFormData({
                      ...formData,
                      manager_id: selectedId,
                      manager_name: matched ? matched.full_name : ''
                    });
                  }}
                >
                  <option value="">-- Chua gan truong bo phan --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code} - {emp.role})
                    </option>
                  ))}
                </select>
              </p>

              <p className="field-group">
                <label htmlFor="department_description">Mo ta</label>
                <textarea
                  id="department_description"
                  rows={4}
                  maxLength={1000}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </p>

              <footer className="action-row">
                <button type="submit" className="btn btn-primary">
                  {editingId ? (
                    <>
                      <Save size={15} aria-hidden="true" />
                      Lưu thay đổi
                    </>
                  ) : (
                    <>
                      <Plus size={15} aria-hidden="true" />
                      Tạo phòng ban
                    </>
                  )}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>
                    <RotateCcw size={15} aria-hidden="true" />
                    Hủy sửa
                  </button>
                )}
              </footer>
            </fieldset>
          </form>
        </article>

        <article className="panel">
          <h2>Danh Sach Phong Ban</h2>
          {loading ? (
            <TableSkeleton rows={4} label="Đang tải danh sách phòng ban" />
          ) : departments.length === 0 ? (
            <EmptyState title="Chưa có phòng ban" description="Hãy tạo phòng ban đầu tiên bằng biểu mẫu bên trái." />
          ) : (
            <section className="department-list" aria-label="Danh sach phong ban hien co">
              {departments.map((department) => (
                <article className="department-item" key={department.id}>
                  <header>
                    <hgroup>
                      <h3>{department.name}</h3>
                      <p>
                        <code>{department.code}</code> |{' '}
                        {department.manager
                          ? `${department.manager.full_name} (${department.manager.employee_code})`
                          : (department.manager_name || 'Chua gan truong bo phan')}
                      </p>
                    </hgroup>
                    <mark className="badge badge-normal">{department.employee_count} NV</mark>
                  </header>
                  <p>{department.description || 'Chua co mo ta phong ban.'}</p>
                  <footer className="action-row">
                    <button type="button" className="btn btn-secondary compact-button" onClick={() => handleEdit(department)}>
                      <Pencil size={14} aria-hidden="true" />
                      Sửa
                    </button>
                    <button type="button" className="btn btn-secondary compact-button danger-text" onClick={() => handleDelete(department)}>
                      <Trash2 size={14} aria-hidden="true" />
                      Xóa
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
