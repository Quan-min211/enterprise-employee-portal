import React, { useEffect, useRef, useState } from 'react';
import { departmentsApi } from '../api/departmentsApi';
import { employeesApi } from '../api/employeesApi';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const emptyEmployeeForm = {
  employee_code: '',
  full_name: '',
  email: '',
  password: '',
  role: 'employee',
  position: '',
  phone: '',
  department_id: '',
  hire_date: '',
  status: 'active'
};

const tableColumns = ['Mã NV', 'Họ và tên', 'Phòng ban', 'Chức vụ', 'Email', 'Điện thoại', 'Thao tác'];

function EmployeeFormFields({ form, departments, isEditing, onChange }) {
  return (
    <section className="employee-form-grid">
      <section className="field-group">
        <label htmlFor={`${isEditing ? 'edit' : 'create'}-employee-code`}>Mã nhân viên</label>
        <input
          id={`${isEditing ? 'edit' : 'create'}-employee-code`}
          required
          minLength={3}
          maxLength={20}
          value={form.employee_code}
          onChange={(event) => onChange('employee_code', event.target.value.toUpperCase())}
        />
      </section>

      <section className="field-group">
        <label htmlFor={`${isEditing ? 'edit' : 'create'}-employee-name`}>Họ và tên</label>
        <input
          id={`${isEditing ? 'edit' : 'create'}-employee-name`}
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
          value={form.full_name}
          onChange={(event) => onChange('full_name', event.target.value)}
        />
      </section>

      <section className="field-group">
        <label htmlFor={`${isEditing ? 'edit' : 'create'}-employee-email`}>Email công việc</label>
        <input
          id={`${isEditing ? 'edit' : 'create'}-employee-email`}
          type="email"
          required
          maxLength={100}
          autoComplete="email"
          value={form.email}
          onChange={(event) => onChange('email', event.target.value)}
        />
      </section>

      <section className="field-group">
        <label htmlFor={`${isEditing ? 'edit' : 'create'}-employee-phone`}>Số điện thoại</label>
        <input
          id={`${isEditing ? 'edit' : 'create'}-employee-phone`}
          type="tel"
          maxLength={20}
          autoComplete="tel"
          value={form.phone}
          onChange={(event) => onChange('phone', event.target.value)}
        />
      </section>

      <section className="field-group">
        <label htmlFor={`${isEditing ? 'edit' : 'create'}-employee-role`}>Vai trò</label>
        <select
          id={`${isEditing ? 'edit' : 'create'}-employee-role`}
          value={form.role}
          onChange={(event) => onChange('role', event.target.value)}
        >
          <option value="employee">Nhân viên</option>
          <option value="manager">Quản lý</option>
          <option value="admin">Quản trị viên</option>
        </select>
      </section>

      <section className="field-group">
        <label htmlFor={`${isEditing ? 'edit' : 'create'}-employee-department`}>Phòng ban</label>
        <select
          id={`${isEditing ? 'edit' : 'create'}-employee-department`}
          value={form.department_id}
          onChange={(event) => onChange('department_id', event.target.value)}
        >
          <option value="">Chưa phân bổ</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>{department.name}</option>
          ))}
        </select>
      </section>

      <section className="field-group">
        <label htmlFor={`${isEditing ? 'edit' : 'create'}-employee-position`}>Chức vụ</label>
        <input
          id={`${isEditing ? 'edit' : 'create'}-employee-position`}
          maxLength={100}
          value={form.position}
          onChange={(event) => onChange('position', event.target.value)}
        />
      </section>

      <section className="field-group">
        <label htmlFor={`${isEditing ? 'edit' : 'create'}-employee-hire-date`}>Ngày vào làm</label>
        <input
          id={`${isEditing ? 'edit' : 'create'}-employee-hire-date`}
          type="date"
          value={form.hire_date}
          onChange={(event) => onChange('hire_date', event.target.value)}
        />
      </section>

      {isEditing && (
        <section className="field-group">
          <label htmlFor="edit-employee-status">Trạng thái tài khoản</label>
          <select id="edit-employee-status" value={form.status} onChange={(event) => onChange('status', event.target.value)}>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã khóa</option>
          </select>
        </section>
      )}

      <section className="field-group">
        <label htmlFor={`${isEditing ? 'edit' : 'create'}-employee-password`}>
          {isEditing ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu tạm thời'}
        </label>
        <input
          id={`${isEditing ? 'edit' : 'create'}-employee-password`}
          type="password"
          required={!isEditing}
          minLength={8}
          autoComplete="new-password"
          value={form.password}
          onChange={(event) => onChange('password', event.target.value)}
        />
      </section>
    </section>
  );
}

function EmployeeTableSkeleton() {
  return (
    <section className="table-shell" aria-label="Đang tải danh bạ nhân viên" aria-busy="true">
      <table className="employee-skeleton-table">
        <caption className="visually-hidden">Đang tải danh sách nhân viên</caption>
        <thead>
          <tr>{tableColumns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }, (_, index) => (
            <tr key={index}>
              {tableColumns.map((column) => <td key={column}><span className="skeleton employee-skeleton-line" aria-hidden="true" /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default function Employees() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const profileDialogRef = useRef(null);
  const editDialogRef = useRef(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ search: '', department_id: '' });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);
  const [editForm, setEditForm] = useState(emptyEmployeeForm);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const isAdmin = user?.role === 'admin';

  const syncDialog = (dialogRef, isOpen, onClose) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
    dialog.oncancel = (event) => { event.preventDefault(); onClose(); };
  };

  useEffect(() => { syncDialog(profileDialogRef, Boolean(selectedEmployee), () => setSelectedEmployee(null)); }, [selectedEmployee]);
  useEffect(() => { syncDialog(editDialogRef, Boolean(editingEmployee), () => setEditingEmployee(null)); }, [editingEmployee]);

  const fetchEmployees = async (nextFilters = filters, nextPage = page) => {
    setLoading(true);
    setFetchError('');
    try {
      const response = await employeesApi.list({
        search: nextFilters.search || undefined,
        department_id: nextFilters.department_id || undefined,
        page: nextPage,
        limit: 10
      });
      setEmployees(response.employees || []);
      setMeta({ total: response.total || 0, totalPages: response.totalPages || 1 });
      setPage(response.page || nextPage);
    } catch (error) {
      const message = error.message || 'Không thể tải danh sách nhân viên.';
      setFetchError(message);
      pushToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    departmentsApi.list()
      .then((response) => setDepartments(response.departments || []))
      .catch((error) => pushToast(error.message || 'Không thể tải danh sách phòng ban.', 'error'));
  }, [pushToast]);

  useEffect(() => {
    const timer = window.setTimeout(() => fetchEmployees(filters, 1), 350);
    return () => window.clearTimeout(timer);
  }, [filters.search, filters.department_id]);

  const updateCreateForm = (field, value) => setEmployeeForm((current) => ({ ...current, [field]: value }));
  const updateEditForm = (field, value) => setEditForm((current) => ({ ...current, [field]: value }));

  const handleSearch = (event) => {
    event.preventDefault();
    fetchEmployees(filters, 1);
  };

  const openEmployeeProfile = async (id) => {
    try {
      const response = await employeesApi.getById(id);
      setSelectedEmployee(response.employee);
    } catch (error) {
      pushToast(error.message || 'Không thể tải hồ sơ nhân viên.', 'error');
    }
  };

  const handleCreateEmployee = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await employeesApi.create({
        ...employeeForm,
        department_id: employeeForm.department_id || null,
        hire_date: employeeForm.hire_date || null
      });
      setEmployeeForm(emptyEmployeeForm);
      pushToast('Tạo tài khoản nhân viên thành công.', 'success');
      fetchEmployees(filters, 1);
    } catch (error) {
      pushToast(error.message || 'Không thể tạo nhân viên.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setEditForm({ ...emptyEmployeeForm, ...employee, password: '', department_id: employee.department_id || '' });
  };

  const handleUpdateEmployee = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...editForm, department_id: editForm.department_id || null, hire_date: editForm.hire_date || null };
      if (!payload.password) delete payload.password;
      await employeesApi.update(editingEmployee.id, payload);
      setEditingEmployee(null);
      pushToast('Cập nhật nhân viên thành công.', 'success');
      fetchEmployees(filters, page);
    } catch (error) {
      pushToast(error.message || 'Không thể cập nhật nhân viên.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateEmployee = async () => {
    if (!deactivateTarget) return;
    try {
      await employeesApi.deactivate(deactivateTarget.id);
      pushToast('Đã khóa tài khoản nhân viên.', 'success');
      setDeactivateTarget(null);
      fetchEmployees(filters, page);
    } catch (error) {
      pushToast(error.message || 'Không thể khóa tài khoản.', 'error');
    }
  };

  return (
    <section aria-labelledby="employees-heading">
      <header className="page-header">
        <section>
          <h1 id="employees-heading">Danh bạ nhân viên</h1>
          <p>Tra cứu thông tin liên lạc, phòng ban và chức vụ của cán bộ công nhân viên Fu Sheng.</p>
        </section>

        <search>
          <form className="search-form" onSubmit={handleSearch}>
            <label htmlFor="employee-search" className="visually-hidden">Tìm kiếm nhân viên</label>
            <input
              id="employee-search"
              type="search"
              placeholder="Tìm theo tên, mã nhân viên hoặc email"
              value={filters.search}
              onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, search: event.target.value })); }}
            />
            <label htmlFor="employee-department-filter" className="visually-hidden">Lọc theo phòng ban</label>
            <select
              id="employee-department-filter"
              value={filters.department_id}
              onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, department_id: event.target.value })); }}
            >
              <option value="">Tất cả phòng ban</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
            <button type="submit" className="btn btn-primary">Tìm kiếm</button>
          </form>
        </search>
      </header>

      {isAdmin && (
        <section className="panel employee-admin-panel" aria-labelledby="employee-create-heading">
          <header><h2 id="employee-create-heading">Tạo tài khoản nhân viên</h2><p>Thiết lập thông tin cơ bản và quyền truy cập cho nhân viên mới.</p></header>
          <form onSubmit={handleCreateEmployee}>
            <fieldset disabled={submitting}>
              <legend className="visually-hidden">Thông tin tài khoản nhân viên mới</legend>
              <EmployeeFormFields form={employeeForm} departments={departments} onChange={updateCreateForm} />
              <footer className="action-row"><button type="submit" className="btn btn-primary">{submitting ? 'Đang tạo...' : 'Tạo nhân viên'}</button></footer>
            </fieldset>
          </form>
        </section>
      )}

      {fetchError && <aside className="alert" role="alert"><p>{fetchError}</p><button type="button" className="btn btn-secondary compact-button" onClick={() => fetchEmployees(filters, page)}>Tải lại</button></aside>}

      {loading ? <EmployeeTableSkeleton /> : employees.length === 0 ? (
        <section className="empty-state" aria-live="polite"><strong className="empty-title">Không tìm thấy nhân viên phù hợp</strong><p>Hãy thử điều chỉnh từ khóa hoặc bộ lọc phòng ban.</p></section>
      ) : (
        <section className="table-shell" aria-label="Bảng danh bạ nhân viên">
          <table>
            <caption>Danh sách cán bộ công nhân viên công ty</caption>
            <thead><tr>{tableColumns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td><code>{employee.employee_code}</code></td>
                  <td><strong>{employee.full_name}</strong></td>
                  <td>{employee.department?.name || 'Chưa phân bổ'}</td>
                  <td>{employee.position || 'Nhân viên'}</td>
                  <td><a href={`mailto:${employee.email}`}>{employee.email}</a></td>
                  <td>{employee.phone || 'Chưa cập nhật'}</td>
                  <td><section className="action-row"><button type="button" className="btn btn-secondary compact-button" onClick={() => openEmployeeProfile(employee.id)}>Xem</button>{isAdmin && <button type="button" className="btn btn-secondary compact-button" onClick={() => openEditEmployee(employee)}>Sửa</button>}{isAdmin && employee.id !== user?.id && <button type="button" className="btn btn-secondary compact-button danger-text" onClick={() => setDeactivateTarget(employee)}>Khóa</button>}</section></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={10} onChange={(nextPage) => fetchEmployees(filters, nextPage)} />

      <dialog ref={profileDialogRef} className="dialog" aria-labelledby="employee-profile-dialog-title">
        {selectedEmployee && <>
          <header className="dialog-header"><section><h2 id="employee-profile-dialog-title">{selectedEmployee.full_name}</h2><p><code>{selectedEmployee.employee_code}</code> · {selectedEmployee.position || 'Nhân viên'}</p></section><button type="button" autoFocus className="btn btn-secondary compact-button" onClick={() => setSelectedEmployee(null)} aria-label="Đóng hồ sơ nhân viên">Đóng</button></header>
          <dl className="detail-list">
            <dt>Phòng ban</dt><dd>{selectedEmployee.department?.name || 'Chưa phân bổ'}</dd>
            <dt>Email</dt><dd><a href={`mailto:${selectedEmployee.email}`}>{selectedEmployee.email}</a></dd>
            <dt>Điện thoại</dt><dd>{selectedEmployee.phone || 'Chưa cập nhật'}</dd>
            <dt>Vai trò</dt><dd>{selectedEmployee.role}</dd>
            <dt>Ngày vào làm</dt><dd>{selectedEmployee.hire_date || 'Chưa cập nhật'}</dd>
            <dt>Trạng thái</dt><dd><data className={`badge ${selectedEmployee.status === 'active' ? 'badge-approved' : 'badge-rejected'}`} value={selectedEmployee.status}>{selectedEmployee.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}</data></dd>
          </dl>
        </>}
      </dialog>

      <dialog ref={editDialogRef} className="dialog dialog-wide" aria-labelledby="employee-edit-dialog-title">
        {editingEmployee && <form onSubmit={handleUpdateEmployee}>
          <fieldset disabled={submitting}>
            <legend className="visually-hidden">Chỉnh sửa thông tin nhân viên</legend>
            <header className="dialog-header"><section><h2 id="employee-edit-dialog-title">Chỉnh sửa nhân viên</h2><p><code>{editingEmployee.employee_code}</code></p></section><button type="button" className="btn btn-secondary compact-button" onClick={() => setEditingEmployee(null)}>Đóng</button></header>
            <EmployeeFormFields form={editForm} departments={departments} isEditing onChange={updateEditForm} />
            <footer className="action-row"><button type="button" className="btn btn-secondary" onClick={() => setEditingEmployee(null)}>Hủy</button><button type="submit" className="btn btn-primary">{submitting ? 'Đang lưu...' : 'Lưu thay đổi'}</button></footer>
          </fieldset>
        </form>}
      </dialog>

      <ConfirmDialog open={Boolean(deactivateTarget)} title="Khóa tài khoản?" message={deactivateTarget ? `Tài khoản ${deactivateTarget.full_name} sẽ không thể đăng nhập.` : ''} confirmLabel="Khóa tài khoản" danger onConfirm={handleDeactivateEmployee} onCancel={() => setDeactivateTarget(null)} />
    </section>
  );
}
