import React, { useEffect, useState } from 'react';
import { departmentsApi } from '../api/departmentsApi';
import { employeesApi } from '../api/employeesApi';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { useToast } from '../contexts/ToastContext';

const emptyEmployeeForm = {
  employee_code: '',
  full_name: '',
  email: '',
  password: 'Employee@123',
  role: 'employee',
  position: '',
  phone: '',
  department_id: '',
  hire_date: ''
};

export default function Employees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ search: '', department_id: '' });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editForm, setEditForm] = useState(emptyEmployeeForm);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const { pushToast } = useToast();
  const isAdmin = user?.role === 'admin';

  const fetchEmployees = async (nextFilters = filters, nextPage = page) => {
    setLoading(true);
    try {
      const res = await employeesApi.list({
        search: nextFilters.search || undefined,
        department_id: nextFilters.department_id || undefined,
        page: nextPage,
        limit: 10
      });
      setEmployees(res.employees || []);
      setMeta({ total: res.total || 0, totalPages: res.totalPages || 1 });
      setPage(res.page || nextPage);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    departmentsApi.list()
      .then((res) => setDepartments(res.departments || []))
      .catch((err) => console.error('Error fetching departments:', err));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchEmployees(filters, 1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [filters.search, filters.department_id]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchEmployees(filters);
  };

  const openEmployeeProfile = async (id) => {
    try {
      const res = await employeesApi.getById(id);
      setSelectedEmployee(res.employee);
    } catch (err) {
      console.error('Error loading employee profile:', err);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      await employeesApi.create({
        ...employeeForm,
        department_id: employeeForm.department_id || null,
        hire_date: employeeForm.hire_date || null
      });
      setEmployeeForm(emptyEmployeeForm);
      setMessage('Tao tai khoan nhan vien thanh cong.');
      fetchEmployees(filters);
    } catch (err) {
      setError(err.message || 'Khong the tao nhan vien.');
    }
  };

  const handleDeactivateEmployee = async (employee) => {
    try {
      await employeesApi.deactivate(employee.id);
      pushToast('Da khoa tai khoan nhan vien.', 'success');
      fetchEmployees(filters);
    } catch (err) {
      pushToast(err.message || 'Khong the khoa tai khoan.', 'error');
    }
  };

  const openEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setEditForm({ ...emptyEmployeeForm, ...employee, password: '', department_id: employee.department_id || '' });
  };

  const handleUpdateEmployee = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...editForm, department_id: editForm.department_id || null, hire_date: editForm.hire_date || null };
      if (!payload.password) delete payload.password;
      await employeesApi.update(editingEmployee.id, payload);
      setEditingEmployee(null);
      pushToast('Cap nhat nhan vien thanh cong.', 'success');
      fetchEmployees(filters);
    } catch (err) {
      pushToast(err.message || 'Khong the cap nhat nhan vien.', 'error');
    }
  };

  return (
    <section aria-labelledby="emp-heading">
      <header className="page-header">
        <section>
          <h1 id="emp-heading">Danh Ba Nhan Vien</h1>
          <p>Tra cuu thong tin lien lac, phong ban va chuc vu cua can bo cong nhan vien Fu Sheng.</p>
        </section>

        <search>
          <form className="search-form" onSubmit={handleSearch}>
            <label htmlFor="search-input" className="visually-hidden">Tim kiem nhan vien</label>
            <input
              id="search-input"
              type="search"
              placeholder="Tim theo ten, ma NV, email..."
              value={filters.search}
              onChange={(e) => { setPage(1); setFilters({ ...filters, search: e.target.value }); }}
            />

            <label htmlFor="department-filter" className="visually-hidden">Loc phong ban</label>
            <select
              id="department-filter"
              value={filters.department_id}
              onChange={(e) => { setPage(1); setFilters({ ...filters, department_id: e.target.value }); }}
              aria-label="Loc theo phong ban"
            >
              <option value="">Tat ca phong ban</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>

            <button type="submit" className="btn btn-primary">Tim</button>
          </form>
        </search>
      </header>

      {message && <aside className="alert success-alert" aria-live="polite">{message}</aside>}
      {error && <aside className="alert" aria-live="polite">{error}</aside>}

      {isAdmin && (
        <section className="panel employee-admin-panel" aria-labelledby="employee-admin-heading">
          <h2 id="employee-admin-heading">Tao Tai Khoan Nhan Vien</h2>
          <form onSubmit={handleCreateEmployee}>
            <fieldset>
              <legend className="visually-hidden">Thong tin tai khoan nhan vien moi</legend>

              <section className="employee-form-grid">
                <section className="field-group">
                  <label htmlFor="employee_code">Ma NV</label>
                  <input
                    id="employee_code"
                    required
                    value={employeeForm.employee_code}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, employee_code: e.target.value.toUpperCase() })}
                  />
                </section>

                <section className="field-group">
                  <label htmlFor="employee_full_name">Ho ten</label>
                  <input
                    id="employee_full_name"
                    required
                    value={employeeForm.full_name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, full_name: e.target.value })}
                  />
                </section>

                <section className="field-group">
                  <label htmlFor="employee_email">Email</label>
                  <input
                    id="employee_email"
                    type="email"
                    required
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                  />
                </section>

                <section className="field-group">
                  <label htmlFor="employee_password">Mat khau tam</label>
                  <input
                    id="employee_password"
                    type="password"
                    required
                    minLength={8}
                    value={employeeForm.password}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                  />
                </section>

                <section className="field-group">
                  <label htmlFor="employee_role">Vai tro</label>
                  <select
                    id="employee_role"
                    value={employeeForm.role}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </section>

                <section className="field-group">
                  <label htmlFor="employee_department">Phong ban</label>
                  <select
                    id="employee_department"
                    value={employeeForm.department_id}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, department_id: e.target.value })}
                  >
                    <option value="">Chua phan bo</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>{department.name}</option>
                    ))}
                  </select>
                </section>

                <section className="field-group">
                  <label htmlFor="employee_position">Chuc vu</label>
                  <input
                    id="employee_position"
                    value={employeeForm.position}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                  />
                </section>

                <section className="field-group">
                  <label htmlFor="employee_hire_date">Ngay vao lam</label>
                  <input
                    id="employee_hire_date"
                    type="date"
                    value={employeeForm.hire_date}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, hire_date: e.target.value })}
                  />
                </section>
              </section>

              <button type="submit" className="btn btn-primary">Tao nhan vien</button>
            </fieldset>
          </form>
        </section>
      )}

      {loading ? (
        <p>Dang tai danh sach nhan vien...</p>
      ) : employees.length === 0 ? (
        <p className="muted">Khong tim thay nhan vien nao phu hop.</p>
      ) : (
        <section className="table-shell" aria-label="Bang danh ba nhan vien">
          <table>
            <caption>Danh sach can bo nhan vien cong ty</caption>
            <thead>
              <tr>
                <th scope="col">Ma NV</th>
                <th scope="col">Ho va Ten</th>
                <th scope="col">Phong Ban</th>
                <th scope="col">Chuc Vu</th>
                <th scope="col">Email</th>
                <th scope="col">So Dien Thoai</th>
                <th scope="col">Thao Tac</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td><code>{emp.employee_code}</code></td>
                  <td><strong>{emp.full_name}</strong></td>
                  <td>{emp.department?.name || 'Chua phan bo'}</td>
                  <td>{emp.position || 'Nhan vien'}</td>
                  <td><a href={`mailto:${emp.email}`}>{emp.email}</a></td>
                  <td>{emp.phone || 'N/A'}</td>
                  <td>
                    <section className="action-row">
                      <button type="button" className="btn btn-secondary compact-button" onClick={() => openEmployeeProfile(emp.id)}>
                        Xem
                      </button>
                      {isAdmin && (
                        <button type="button" className="btn btn-secondary compact-button" onClick={() => openEditEmployee(emp)}>
                          Sua
                        </button>
                      )}
                      {isAdmin && emp.id !== user?.id && (
                        <button type="button" className="btn btn-secondary compact-button danger-text" onClick={() => setDeactivateTarget(emp)}>
                          Khoa
                        </button>
                      )}
                    </section>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={10} onChange={(nextPage) => { setPage(nextPage); fetchEmployees(filters, nextPage); }} />

      {selectedEmployee && (
        <dialog open className="dialog" aria-labelledby="employee-dialog-title">
          <header className="dialog-header">
            <section>
              <h2 id="employee-dialog-title">{selectedEmployee.full_name}</h2>
              <p><code>{selectedEmployee.employee_code}</code> | {selectedEmployee.position || 'Nhan vien'}</p>
            </section>
            <button
              type="button"
              className="btn btn-secondary compact-button"
              onClick={() => setSelectedEmployee(null)}
              aria-label="Dong ho so nhan vien"
            >
              Dong
            </button>
          </header>

          <dl className="detail-list">
            <dt>Phong ban</dt>
            <dd>{selectedEmployee.department?.name || 'Chua phan bo'}</dd>
            <dt>Email</dt>
            <dd><a href={`mailto:${selectedEmployee.email}`}>{selectedEmployee.email}</a></dd>
            <dt>Dien thoai</dt>
            <dd>{selectedEmployee.phone || 'Chua cap nhat'}</dd>
            <dt>Vai tro</dt>
            <dd>{selectedEmployee.role}</dd>
            <dt>Ngay vao lam</dt>
            <dd>{selectedEmployee.hire_date || 'Chua cap nhat'}</dd>
            <dt>Trang thai</dt>
            <dd><mark className="badge badge-approved">{selectedEmployee.status}</mark></dd>
          </dl>
        </dialog>
      )}

      {editingEmployee && (
        <dialog open className="dialog" aria-labelledby="employee-edit-dialog-title">
          <header className="dialog-header"><section><h2 id="employee-edit-dialog-title">Sua thong tin nhan vien</h2><p><code>{editingEmployee.employee_code}</code></p></section><button type="button" className="btn btn-secondary compact-button" onClick={() => setEditingEmployee(null)}>Dong</button></header>
          <form onSubmit={handleUpdateEmployee}><fieldset><legend className="visually-hidden">Form sua nhan vien</legend>
            <section className="form-grid"><section className="field-group"><label htmlFor="edit_employee_name">Ho ten</label><input id="edit_employee_name" required value={editForm.full_name} onChange={(event) => setEditForm({ ...editForm, full_name: event.target.value })} /></section><section className="field-group"><label htmlFor="edit_employee_email">Email</label><input id="edit_employee_email" type="email" required value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} /></section><section className="field-group"><label htmlFor="edit_employee_role">Vai tro</label><select id="edit_employee_role" value={editForm.role} onChange={(event) => setEditForm({ ...editForm, role: event.target.value })}><option value="employee">Employee</option><option value="manager">Manager</option><option value="admin">Admin</option></select></section><section className="field-group"><label htmlFor="edit_employee_status">Trang thai</label><select id="edit_employee_status" value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></section><section className="field-group"><label htmlFor="edit_employee_department">Phong ban</label><select id="edit_employee_department" value={editForm.department_id} onChange={(event) => setEditForm({ ...editForm, department_id: event.target.value })}><option value="">Chua phan bo</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></section><section className="field-group"><label htmlFor="edit_employee_position">Chuc vu</label><input id="edit_employee_position" value={editForm.position || ''} onChange={(event) => setEditForm({ ...editForm, position: event.target.value })} /></section></section>
            <footer className="action-row"><button type="button" className="btn btn-secondary" onClick={() => setEditingEmployee(null)}>Huy</button><button type="submit" className="btn btn-primary">Luu thay doi</button></footer>
          </fieldset></form>
        </dialog>
      )}
      <ConfirmDialog open={Boolean(deactivateTarget)} title="Khoa tai khoan?" message={deactivateTarget ? `Tai khoan ${deactivateTarget.full_name} se khong the dang nhap.` : ''} confirmLabel="Khoa tai khoan" danger onConfirm={() => { const target = deactivateTarget; setDeactivateTarget(null); handleDeactivateEmployee(target); }} onCancel={() => setDeactivateTarget(null)} />
    </section>
  );
}
