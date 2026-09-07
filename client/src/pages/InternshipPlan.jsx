import React from 'react';

const phases = [
  {
    title: 'Khao sat va phan tich',
    period: 'Tuan 1',
    status: 'done',
    items: [
      'Xac dinh bai toan cong thong tin noi bo cho nhan vien nha may.',
      'Mo ta 3 vai tro su dung: admin, manager, employee.',
      'Chot nhom nghiep vu: danh ba, nghi phep/OT, thong bao, ho so ca nhan.'
    ]
  },
  {
    title: 'Thiet ke kien truc',
    period: 'Tuan 2',
    status: 'done',
    items: [
      'Dung monorepo gom React frontend va Express backend.',
      'Thiet ke MySQL schema voi Sequelize models va quan he khoa ngoai.',
      'Thong nhat auth bang JWT trong HttpOnly cookie va RBAC theo vai tro.'
    ]
  },
  {
    title: 'Xay dung module chinh',
    period: 'Tuan 3-5',
    status: 'active',
    items: [
      'Hoan thien dashboard tong quan va danh ba nhan vien.',
      'Xay quy trinh nop, xem, duyet, tu choi don nghi phep va OT.',
      'Cho phep manager/admin dang thong bao noi bo theo muc uu tien.'
    ]
  },
  {
    title: 'Kiem thu va dong goi',
    period: 'Tuan 6',
    status: 'next',
    items: [
      'Kiem tra responsive, truy cap ban phim va tuong phan mau.',
      'Kiem thu API theo role va cac truong hop loi xac thuc.',
      'Dong goi Docker Compose va hoan thien tai lieu bao cao thuc tap.'
    ]
  }
];

const deliverables = [
  'Source code monorepo client/server',
  'Database schema va seed account demo',
  'Giao dien noi bo responsive',
  'Docker Compose de trien khai noi bo',
  'Tai lieu SYSTEM_CONTEXT, PRODUCT, DESIGN'
];

const acceptanceChecks = [
  'Nhan vien dang nhap va cap nhat ho so ca nhan.',
  'Nhan vien tim thay dong nghiep theo ten, ma NV, email hoac phong ban.',
  'Nhan vien gui don nghi phep/OT, manager/admin xu ly online.',
  'Manager/admin dang thong bao, nhan vien doc duoc bang tin moi.',
  'Admin quan ly danh muc phong ban va tai khoan nhan vien.'
];

export default function InternshipPlan() {
  return (
    <section aria-labelledby="internship-plan-heading">
      <header className="page-header plan-hero">
        <section>
          <p className="eyebrow">Ke hoach thuc tap</p>
          <h1 id="internship-plan-heading">Xay Dung Web Noi Bo Doanh Nghiep</h1>
          <p>
            Ban ke hoach nay gom muc tieu, pham vi, tien do va tieu chi nghiem thu cho de tai
            Enterprise Employee Portal tai Fu Sheng Vietnam.
          </p>
        </section>
        <aside className="plan-status" aria-label="Trang thai hien tai cua de tai">
          <strong>Dang trien khai</strong>
          <data value="70">70%</data>
          <meter min="0" max="100" value="70">70%</meter>
        </aside>
      </header>

      <section className="plan-summary-grid" aria-label="Tom tat de tai">
        <article className="metric-card">
          <h2>Pham Vi</h2>
          <p className="metric-value">5</p>
          <p>Module nghiep vu noi bo</p>
        </article>
        <article className="metric-card success">
          <h2>Vai Tro</h2>
          <p className="metric-value">3</p>
          <p>Admin, Manager, Employee</p>
        </article>
        <article className="metric-card warning">
          <h2>Thoi Gian</h2>
          <p className="metric-value">6</p>
          <p>Tuan thuc hien va nghiem thu</p>
        </article>
      </section>

      <section className="plan-grid" aria-label="Noi dung ke hoach">
        <article className="panel plan-wide">
          <h2>Lo Trinh Thuc Hien</h2>
          <ol className="timeline-list">
            {phases.map((phase) => (
              <li key={phase.title} className={`timeline-item ${phase.status}`}>
                <article>
                  <header>
                    <section>
                      <h3>{phase.title}</h3>
                      <p>{phase.period}</p>
                    </section>
                    <mark className={`badge badge-${phase.status === 'done' ? 'approved' : phase.status === 'active' ? 'pending' : 'normal'}`}>
                      {phase.status === 'done' ? 'Hoan thanh' : phase.status === 'active' ? 'Dang lam' : 'Tiep theo'}
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

        <section className="plan-side" aria-label="Dau ra va nghiem thu">
          <article className="panel">
            <h2>Dau Ra Can Co</h2>
            <ul className="check-list">
              {deliverables.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <h2>Tieu Chi Nghiem Thu</h2>
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
