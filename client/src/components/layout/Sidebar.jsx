import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar() {
  const { user } = useAuth();
  const navItems = [
    { to: '/', label: 'Bang dieu khien', icon: 'DB' },
    { to: '/employees', label: 'Danh ba nhan vien', icon: 'NV' },
    { to: '/leaves', label: 'Don nghi phep & OT', icon: 'OT' },
    { to: '/announcements', label: 'Bang tin cong ty', icon: 'TB' },
    { to: '/internship-plan', label: 'Ke hoach thuc tap', icon: 'KH' },
    ...(user?.role === 'admin' ? [{ to: '/departments', label: 'Quan tri phong ban', icon: 'PB' }] : []),
    { to: '/profile', label: 'Ho so ca nhan', icon: 'HS' }
  ];

  return (
    <aside className="sidebar" aria-label="Menu dieu huong chinh">
      <nav aria-label="Sidebar Navigation">
        <ul className="nav-list">
          {navItems.map((item) => (
            <li className="nav-item" key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <mark className="nav-icon" aria-hidden="true">{item.icon}</mark>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
