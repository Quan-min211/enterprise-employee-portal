/**
 * Frontend smoke tests
 * - Login page renders correctly
 * - AuthContext redirects when unauthenticated
 * - Sidebar shows correct links per role
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

// Mock API modules to avoid real HTTP calls
vi.mock('../api/authApi', () => ({
  authApi: {
    me: vi.fn().mockRejectedValue(new Error('Unauthorized')),
    login: vi.fn(),
    logout: vi.fn()
  }
}));

vi.mock('../api/employeesApi', () => ({
  employeesApi: {
    list: vi.fn().mockResolvedValue({ employees: [], total: 0, totalPages: 1, page: 1 })
  }
}));

vi.mock('../api/departmentsApi', () => ({
  departmentsApi: {
    list: vi.fn().mockResolvedValue({ departments: [] })
  }
}));

vi.mock('../api/dashboardApi', () => ({
  dashboardApi: {
    getSummary: vi.fn().mockResolvedValue({
      summary: {
        totalEmployees: 42,
        totalDepartments: 5,
        leaveStatus: { pending: 3, approved: 10, rejected: 2, cancelled: 1 },
        recentAnnouncements: [],
        recentLeaves: [],
        pendingActionItems: [],
        departmentLoad: [],
        deptEmployeeCount: null,
        deptInfo: null,
        urgentAnnouncements: [],
        adminData: {
          accounts: {
            total: 45,
            active: 42,
            inactive: 3,
            roles: { admin: 2, manager: 6, employee: 37 },
            recentUsers: []
          },
          audit: {
            recentLogs: [
              {
                id: 1,
                action: 'auth.login',
                entity_type: 'user',
                created_at: new Date().toISOString(),
                actor: { full_name: 'Admin Test', employee_code: 'FS-ADM01' }
              }
            ],
            todayCount: 5,
            totalCount: 120
          },
          systemConfig: {
            totalDepartments: 5,
            totalHolidays: 11,
            upcomingHolidays: [],
            environment: 'test',
            nodeVersion: 'v20.0.0',
            dbStatus: 'connected',
            uptime: 3600
          }
        }
      }
    })
  }
}));

vi.mock('../api/leavesApi', () => ({
  leavesApi: {
    list: vi.fn().mockResolvedValue({ requests: [], total: 0, totalPages: 1, page: 1 })
  },
  leaveBalancesApi: {
    getMyBalance: vi.fn().mockResolvedValue({ balance: { remaining_days: 12, annual_entitlement: 14, used_days: 2 } })
  }
}));

// Helper: render with auth context
const renderWithAuth = (ui, userValue = null) => {
  const authValue = {
    user: userValue,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn()
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter>{ui}</MemoryRouter>
    </AuthContext.Provider>
  );
};

// ─── Login Page ───────────────────────────────────────────────────────────────

describe('Login page', () => {
  it('renders the login heading', async () => {
    const Login = (await import('../pages/Login.jsx')).default;
    renderWithAuth(<Login />);

    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  });

  it('has email and password fields', async () => {
    const Login = (await import('../pages/Login.jsx')).default;
    renderWithAuth(<Login />);

    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/mật khẩu|password/i)).toBeTruthy();
  });

  it('has a submit button', async () => {
    const Login = (await import('../pages/Login.jsx')).default;
    renderWithAuth(<Login />);

    expect(screen.getByRole('button', { name: /đăng nhập|login/i })).toBeTruthy();
  });
});

// ─── Sidebar ─────────────────────────────────────────────────────────────────

describe('Sidebar role-based navigation', () => {
  it('shows admin-only links when role is admin', async () => {
    const Sidebar = (await import('../components/layout/Sidebar.jsx')).default;
    const adminUser = {
      id: 1,
      full_name: 'Admin',
      role: 'admin',
      email: 'admin@test.com',
      department: { name: 'IT' }
    };

    renderWithAuth(<Sidebar isOpen={true} onClose={vi.fn()} />, adminUser);

    // Admin should see "Phòng ban" / "Departments" and "Audit Logs"
    await waitFor(() => {
      const links = screen.getAllByRole('link');
      const hrefs = links.map((l) => l.getAttribute('href'));
      expect(hrefs.some((h) => h === '/departments' || h?.includes('department'))).toBe(true);
    });
  });

  it('does not show admin links for employee role', async () => {
    const Sidebar = (await import('../components/layout/Sidebar.jsx')).default;
    const empUser = {
      id: 2,
      full_name: 'Employee',
      role: 'employee',
      email: 'emp@test.com',
      department: { name: 'PROD' }
    };

    renderWithAuth(<Sidebar isOpen={true} onClose={vi.fn()} />, empUser);

    await waitFor(() => {
      const links = screen.getAllByRole('link');
      const hrefs = links.map((l) => l.getAttribute('href'));
      // Employee should NOT see /departments
      expect(hrefs.every((h) => h !== '/departments')).toBe(true);
    });
  });
});

// ─── Dashboard Role-Based Rendering ──────────────────────────────────────────

describe('Dashboard role-based rendering', () => {
  it('renders admin widgets when role is admin', async () => {
    const Dashboard = (await import('../pages/Dashboard.jsx')).default;
    const adminUser = {
      id: 1,
      full_name: 'Admin User',
      role: 'admin',
      email: 'admin@test.com'
    };

    renderWithAuth(<Dashboard />, adminUser);

    await waitFor(() => {
      expect(screen.getByText(/Tổng Quan Hệ Thống/i)).toBeTruthy();
      expect(screen.getByText(/Hoạt Động Kiểm Toán Gần Đây/i)).toBeTruthy();
      expect(screen.getByText(/Phân Bổ & Trạng Thái Tài Khoản/i)).toBeTruthy();
      expect(screen.getByText(/Cấu Hình Hệ Thống & Master Data/i)).toBeTruthy();
    });
  });

  it('renders employee balance widget when role is employee', async () => {
    const Dashboard = (await import('../pages/Dashboard.jsx')).default;
    const empUser = {
      id: 2,
      full_name: 'Regular Employee',
      role: 'employee',
      email: 'emp@test.com'
    };

    renderWithAuth(<Dashboard />, empUser);

    await waitFor(() => {
      expect(screen.getByText(/Tổng Quan Hệ Thống/i)).toBeTruthy();
      expect(screen.getByText(/Ngày Phép Còn Lại/i)).toBeTruthy();
    });
  });
});
