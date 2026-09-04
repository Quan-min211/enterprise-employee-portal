import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async (query = '') => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`/employees?search=${encodeURIComponent(query)}`);
      setEmployees(res.employees || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchEmployees(search);
  };

  return (
    <section aria-labelledby="emp-heading">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 id="emp-heading">Danh Bạ Nhân Viên</h1>
          <p>Tra cứu thông tin liên lạc, phòng ban và chức vụ của cán bộ công nhân viên Fu Sheng.</p>
        </div>

        <search>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <label htmlFor="search-input" className="visually-hidden" style={{ position: 'absolute', opacity: 0 }}>
              Tìm kiếm nhân viên
            </label>
            <input
              id="search-input"
              type="search"
              placeholder="Tìm theo tên, mã NV, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '280px' }}
            />
            <button type="submit" className="btn btn-primary">Tìm</button>
          </form>
        </search>
      </header>

      {loading ? (
        <p>Đang tải danh sách nhân viên...</p>
      ) : employees.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Không tìm thấy nhân viên nào phù hợp.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <caption>Danh sách cán bộ nhân viên công ty</caption>
            <thead>
              <tr>
                <th scope="col">Mã NV</th>
                <th scope="col">Họ và Tên</th>
                <th scope="col">Phòng Ban</th>
                <th scope="col">Chức Vụ</th>
                <th scope="col">Email</th>
                <th scope="col">Số Điện Thoại</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td><code>{emp.employee_code}</code></td>
                  <td><strong>{emp.full_name}</strong></td>
                  <td>{emp.department?.name || 'Chưa phân bổ'}</td>
                  <td>{emp.position || 'Nhân viên'}</td>
                  <td><a href={`mailto:${emp.email}`}>{emp.email}</a></td>
                  <td>{emp.phone || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
