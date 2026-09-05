import React, { useEffect, useState } from 'react';
import { departmentsApi } from '../api/departmentsApi';
import { employeesApi } from '../api/employeesApi';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ search: '', department_id: '' });
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const res = await employeesApi.list({
        search: nextFilters.search || undefined,
        department_id: nextFilters.department_id || undefined,
        limit: 50
      });
      setEmployees(res.employees || []);
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
      fetchEmployees(filters);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [filters.search, filters.department_id]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchEmployees(filters);
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
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />

            <label htmlFor="department-filter" className="visually-hidden">Loc phong ban</label>
            <select
              id="department-filter"
              value={filters.department_id}
              onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
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
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </section>
  );
}
