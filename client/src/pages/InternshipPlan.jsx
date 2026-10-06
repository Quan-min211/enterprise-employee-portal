import React from 'react';

const phases = [
  {
    title: 'Khảo sát và phân tích',
    period: 'Tuần 1',
    status: 'done',
    items: [
      'Xác định bài toán cổng thông tin nội bộ cho nhân viên nhà máy.',
      'Mô tả 3 vai trò sử dụng: admin, manager, employee.',
      'Chốt nhóm nghiệp vụ: danh bạ, nghỉ phép / OT, thông báo, hồ sơ cá nhân.'
    ]
  },
  {
    title: 'Thiết kế kiến trúc',
    period: 'Tuần 2',
    status: 'done',
    items: [
      'Dựng monorepo gồm React frontend và Express backend.',
      'Thiết kế MySQL schema với Sequelize models và quan hệ khóa ngoại.',
      'Thống nhất xác thực bằng JWT trong HttpOnly cookie và RBAC theo vai trò.'
    ]
  },
  {
    title: 'Xây dựng module chính',
    period: 'Tuần 3–5',
    status: 'active',
    items: [
      'Hoàn thiện dashboard tổng quan và danh bạ nhân viên.',
      'Xây quy trình nộp, xem, duyệt, từ chối đơn nghỉ phép và OT.',
      'Cho phép manager/admin đăng thông báo nội bộ theo mức ưu tiên.'
    ]
  },
  {
    title: 'Kiểm thử và đóng gói',
    period: 'Tuần 6',
    status: 'next',
    items: [
      'Kiểm tra responsive, truy cập bàn phím và tương phản màu.',
      'Kiểm thử API theo role và các trường hợp lỗi xác thực.',
      'Đóng gói Docker Compose và hoàn thiện tài liệu báo cáo thực tập.'
    ]
  }
];

const deliverables = [
  'Source code monorepo client/server',
  'Database schema và seed tài khoản demo',
  'Giao diện nội bộ responsive',
  'Docker Compose để triển khai nội bộ',
  'Tài liệu SYSTEM_CONTEXT, PRODUCT, DESIGN'
];

const acceptanceChecks = [
  'Nhân viên đăng nhập và cập nhật hồ sơ cá nhân.',
  'Nhân viên tìm thấy đồng nghiệp theo tên, mã NV, email hoặc phòng ban.',
  'Nhân viên gửi đơn nghỉ phép / OT, manager/admin xử lý trực tuyến.',
  'Manager/admin đăng thông báo, nhân viên đọc được bảng tin mới.',
  'Admin quản lý danh mục phòng ban và tài khoản nhân viên.'
];

export default function InternshipPlan() {
  return (
    <section aria-labelledby="internship-plan-heading">
      <header className="page-header plan-hero">
        <section>
          <p className="eyebrow">Kế hoạch thực tập</p>
          <h1 id="internship-plan-heading">Xây Dựng Web Nội Bộ Doanh Nghiệp</h1>
          <p>
            Bản kế hoạch này gồm mục tiêu, phạm vi, tiến độ và tiêu chí nghiệm thu cho đề tài
            Enterprise Employee Portal tại Fu Sheng Vietnam.
          </p>
        </section>
        <aside className="plan-status" aria-label="Trạng thái hiện tại của đề tài">
          <strong>Đang triển khai</strong>
          <data value="70">70%</data>
          <meter min="0" max="100" value="70">70%</meter>
        </aside>
      </header>

      <section className="plan-summary-grid" aria-label="Tóm tắt đề tài">
        <article className="metric-card">
          <h2>Phạm Vi</h2>
          <p className="metric-value">5</p>
          <p>Module nghiệp vụ nội bộ</p>
        </article>
        <article className="metric-card success">
          <h2>Vai Trò</h2>
          <p className="metric-value">3</p>
          <p>Admin, Manager, Employee</p>
        </article>
        <article className="metric-card warning">
          <h2>Thời Gian</h2>
          <p className="metric-value">6</p>
          <p>Tuần thực hiện và nghiệm thu</p>
        </article>
      </section>

      <section className="plan-grid" aria-label="Nội dung kế hoạch">
        <article className="panel plan-wide">
          <h2>Lộ Trình Thực Hiện</h2>
          <ol className="timeline-list">
            {phases.map((phase) => (
              <li key={phase.title} className={`timeline-item ${phase.status}`}>
                <article>
                  <header>
                    <section>
                      <h3>{phase.title}</h3>
                      <p>{phase.period}</p>
                    </section>
                    <mark
                      className={`badge badge-${
                        phase.status === 'done'
                          ? 'approved'
                          : phase.status === 'active'
                            ? 'pending'
                            : 'normal'
                      }`}
                    >
                      {phase.status === 'done'
                        ? 'Hoàn thành'
                        : phase.status === 'active'
                          ? 'Đang làm'
                          : 'Tiếp theo'}
                    </mark>
                  </header>
                  <ul>
                    {phase.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              </li>
            ))}
          </ol>
        </article>

        <section className="plan-side" aria-label="Đầu ra và nghiệm thu">
          <article className="panel">
            <h2>Đầu Ra Cần Có</h2>
            <ul className="check-list">
              {deliverables.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <h2>Tiêu Chí Nghiệm Thu</h2>
            <ul className="check-list">
              {acceptanceChecks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>
      </section>
    </section>
  );
}
