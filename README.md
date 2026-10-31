# Enterprise Employee Portal (EEP)

> **Cổng thông tin nội bộ & Hệ thống quản lý nhân sự | Fu Sheng Industrial (Vietnam) Co., Ltd.**

[![Live Demo](https://img.shields.io/badge/Demo-Vercel%20Live-10B981?style=for-the-badge&logo=vercel&logoColor=white)](https://enterprise-employee-portal.vercel.app/)
[![CI/CD Pipeline](https://img.shields.io/github/actions/workflow/status/Quan-min211/enterprise-employee-portal/ci.yml?branch=main&style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/Quan-min211/enterprise-employee-portal/actions)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

## 🌐 Trải nghiệm trực tuyến (Live Demo)

Hệ thống đã được đóng gói và triển khai tự động (Continuous Deployment):

* 🚀 **Frontend (Vercel):** [https://enterprise-employee-portal.vercel.app/](https://enterprise-employee-portal.vercel.app/)
* 📦 **Kho lưu trữ GitHub:** [https://github.com/Quan-min211/enterprise-employee-portal](https://github.com/Quan-min211/enterprise-employee-portal)

### 🔑 Tài khoản dùng thử (Demo Accounts)

Hệ thống hỗ trợ phân quyền 3 cấp (Role-Based Access Control). Bạn có thể đăng nhập bằng email hoặc mã nhân viên:

| Vai trò (Role) | Email đăng nhập | Mật khẩu | Quyền hạn chính |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@fusheng.com.vn` | `Admin@123` | Quản trị toàn bộ nhân viên, phòng ban, lịch nghỉ lễ, phân quyền và tra cứu Audit Logs bảo mật |
| **Manager** | `manager@fusheng.com.vn` | `Manager@123` | Phê duyệt đơn nghỉ phép / tăng ca (OT) theo phòng ban, xuất báo cáo nhân sự |
| **Employee** | `employee@fusheng.com.vn` | `Employee@123` | Xem danh bạ, nộp đơn nghỉ phép / OT, tra cứu ngày phép cá nhân |
| **Nhân sự thực tế** | `vo-kieu-trinh.220@fusheng.com.vn` *(hoặc `FSV-LOG-220`)* | `Employee@123` | Dữ liệu mẫu thực tế của 220 nhân viên nhà máy Fu Sheng (yêu cầu đổi mật khẩu lần đầu) |

---

## 📋 Giới thiệu & Bối cảnh dự án

**Enterprise Employee Portal** là phần mềm quản lý nội bộ phục vụ quá trình chuyển đổi số tại **Công ty TNHH Công nghiệp Fu Sheng (Việt Nam)** — doanh nghiệp cơ khí chế tạo máy nén khí và thiết bị công nghiệp quy mô lớn tại KCN Biên Hòa 2, Đồng Nai.

Dự án mô phỏng chính xác cơ cấu tổ chức gồm **8 phòng ban** chủ lực của nhà máy:
1. `PROD` — Khối Sản xuất (Vận hành dây chuyền, gia công, lắp ráp)
2. `ENG` — Phòng Kỹ thuật R&D (Thiết kế cơ khí, bảo trì thiết bị)
3. `QC` — Phòng Kiểm soát Chất lượng (KCS linh kiện & thành phẩm xuất khẩu)
4. `LOG` — Phòng Kho vận & Logistics (Quản lý kho nguyên vật liệu, điều phối vận tải)
5. `SALES` — Phòng Kinh doanh (Đơn hàng dự án, chăm sóc khách hàng công nghiệp)
6. `HR` — Phòng Hành chính Nhân sự (Quản lý hồ sơ, chấm công, chế độ phúc lợi)
7. `ACCT` — Phòng Kế toán Tài chính (Kế toán chi phí, tiền lương, công nợ)
8. `IT` — Phòng Công nghệ Thông tin (Hạ tầng mạng, an toàn thông tin)

---

## ✨ Các tính năng nổi bật (Key Features)

### 1. An toàn & Bảo mật cấp doanh nghiệp (Enterprise Security)
* **JWT trong HttpOnly Cookie:** Ngăn chặn hoàn toàn các cuộc tấn công đánh cắp phiên qua XSS.
* **Double-Submit CSRF Protection:** Cơ chế mã hóa HMAC-signed CSRF token kiểm soát nghiêm ngặt mọi mutation requests (POST/PUT/PATCH/DELETE).
* **Chống Brute-Force & Khóa tài khoản:** Tự động khóa đăng nhập sau 5 lần thất bại liên tiếp (`failed_login_attempts`, `locked_until`) kết hợp Rate Limiting.
* **Chính sách mật khẩu mạnh (Password Policy):** Bắt buộc độ dài, chữ hoa, chữ thường, chữ số, ký tự đặc biệt và ngăn chặn đặt lại mật khẩu mặc định.
* **Bắt buộc đổi mật khẩu lần đầu (`must_change_password`):** Áp dụng cho mọi tài khoản do quản trị viên tạo mới hoặc nạp hàng loạt.
* **Request Tracing & Audit Log Forensics:** Tự động sinh `X-Request-Id` (UUID v4), lưu vết chi tiết Client IP, User-Agent, hành động nghiệp vụ vào bảng `audit_logs`.

### 2. Quản lý Nghỉ phép & Tăng ca thông minh (Leave & OT Management)
* **Tính toán ngày làm việc tự động:** Loại bỏ chính xác các ngày cuối tuần (thứ Bảy, Chủ Nhật) và **12 ngày nghỉ lễ quốc gia Việt Nam** (Tết Nguyên Đán, Giỗ Tổ Hùng Vương, 30/4 - 1/5, Quốc khánh) theo Luật Lao động.
* **Quy trình phê duyệt phân cấp:** Manager chỉ có thẩm quyền duyệt đơn của nhân viên thuộc đúng phòng ban mình phụ trách.
* **Xuất báo cáo chuẩn Excel:** Xuất danh sách đơn nghỉ phép và dữ liệu nhân sự ra file **CSV mã hóa UTF-8 BOM**, hiển thị tiếng Việt có dấu chuẩn xác trong Microsoft Excel.

### 3. Hệ sinh thái Database Migrations & Seeders chuyên nghiệp
* **Migration Runner (`server/src/migrations/`):** Quản lý phiên bản schema có cấu trúc, kiểm soát giao dịch (Transactions) và lưu vết tại `sequelize_meta`.
* **Seeder Runner (`server/src/seeders/`):** Tự động nạp master data (phòng ban, ngày lễ, tài khoản demo) và **220 nhân sự nhà máy thực tế** kèm cơ chế rollback (`down`).
* **Database Indexes:** Đã tối ưu hóa index các cột tần suất truy vấn cao: `users(email)`, `users(employee_code)`, `leave_requests(user_id, status, start_date)` v.v.

---

## 🏗️ Kiến trúc & Công nghệ (Tech Stack)

| Thành phần | Công nghệ sử dụng | Mục đích / Ưu điểm |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite 5, React Router v6 | Hiệu năng cao, Semantic HTML5 chuẩn WCAG 2.1 AA, CSS Tokens |
| **Backend** | Node.js 20 (ES Modules), Express.js 4 | Kiến trúc RESTful chuẩn, Middleware tập trung |
| **ORM & Database**| MySQL 8.0 / TiDB Cloud, Sequelize ORM | Relational Schema toàn vẹn, Migration & Seeder kiểm soát |
| **Xác thực** | JWT (`jsonwebtoken`), `bcryptjs`, Cookies | Stateful sessions qua HttpOnly secure cookies |
| **Testing** | Vitest, React Testing Library, Supertest | Unit & Integration testing toàn diện cả FE & BE |
| **CI/CD & Host** | GitHub Actions, Vercel, Render | Tự động lint, test, build và release liên tục |

---

## 📁 Cấu trúc thư mục dự án

```text
enterprise-employee-portal/
├── client/                        # Mã nguồn Frontend (React + Vite)
│   ├── src/
│   │   ├── api/                   # Module gọi API tập trung (leaves, auth, employees)
│   │   ├── components/            # UI components (Header, Sidebar, Modals...)
│   │   ├── contexts/              # Global state (AuthContext)
│   │   ├── pages/                 # Các màn hình chức năng (Dashboard, Leaves, Profile...)
│   │   ├── styles/                # Design tokens & Global CSS
│   │   └── tests/                 # Frontend tests (Vitest + Testing Library)
│   ├── vercel.json                # Cấu hình rewrite định tuyến SPA cho Vercel
│   └── package.json
├── server/                        # Mã nguồn Backend API (Express.js)
│   ├── src/
│   │   ├── config/                # Cấu hình Database & Security
│   │   ├── controllers/           # Xử lý logic nghiệp vụ
│   │   ├── middleware/            # Auth, CSRF, Rate-limit, Request Logger, Error Handler
│   │   ├── migrations/            # Hệ thống Migration DDL (001 -> 007)
│   │   ├── models/                # Sequelize Models (User, Department, Leave, Holiday...)
│   │   ├── routes/                # Định tuyến REST API
│   │   ├── seeders/               # Hệ thống Seeder DML chuẩn & 220 nhân sự
│   │   └── tests/                 # Backend tests (Vitest + Supertest)
│   ├── server.js                  # Điểm khởi chạy Express Server
│   └── package.json
├── docs/                          # Tài liệu kỹ thuật chi tiết
│   ├── SYSTEM_CONTEXT.md          # Toàn bộ kiến trúc và endpoint map
│   ├── improve.md                 # Kế hoạch cải tiến và checklist hoàn thành
│   └── deploy/                    # Runbook hướng dẫn deploy & vận hành
├── .github/workflows/ci.yml       # Quy trình CI/CD tự động kiểm thử
└── docker-compose.yml             # Cấu hình triển khai trọn gói MySQL + App
```

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy Local

### Yêu cầu môi trường
* Node.js >= 20.x
* MySQL >= 8.0 (hoặc Docker Desktop)
* Git

### 1. Sao chép mã nguồn
```bash
git clone https://github.com/Quan-min211/enterprise-employee-portal.git
cd enterprise-employee-portal
```

### 2. Khởi chạy bằng Docker Compose (Cách nhanh nhất)
```bash
# Khởi động trọn gói MySQL, Backend và Frontend
docker compose up -d

# Xem logs hoạt động
docker compose logs -f
```
* **Frontend:** `http://localhost:5173`
* **Backend API:** `http://localhost:3000`
* **API Healthcheck:** `http://localhost:3000/api/health`

### 3. Hoặc Khởi chạy thủ công từng phần

#### Thiết lập Backend
```bash
cd server
cp .env.example .env
npm install

# Chạy migrations để khởi tạo cấu trúc cơ sở dữ liệu
npm run migrate

# Nạp dữ liệu mẫu ban đầu
npm run seed

# Khởi động backend ở chế độ phát triển
npm run dev
```

#### Thiết lập Frontend
```bash
cd ../client
cp .env.example .env
npm install

# Khởi động ứng dụng React
npm run dev
```

---

## 🧪 Kiểm thử chất lượng (Testing & CI)

Dự án duy trì tỷ lệ bao phủ kiểm thử cao cho cả hai tầng:

```bash
# Chạy kiểm thử Frontend
cd client
npm test

# Chạy kiểm thử Backend
cd ../server
npm test

# Kiểm tra cú pháp và chất lượng mã nguồn
npm run lint
```

Mỗi pull request hoặc commit đẩy lên nhánh `main` đều phải vượt qua toàn bộ các bài test trong GitHub Actions trước khi được đóng gói deploy lên môi trường Live.

---

## 📄 Bản quyền & Tác giả

* **Đơn vị thực hiện:** Sinh viên thực tập Trường Đại học Sư phạm Kỹ thuật TP.HCM (HCMUTE).
* **Đơn vị tiếp nhận:** Công ty TNHH Công nghiệp Fu Sheng (Việt Nam).
* **Giấy phép:** [MIT License](LICENSE) — Tự do sử dụng và phát triển vì mục đích học tập và nghiên cứu.
