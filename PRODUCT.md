# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (internal — intranet / local network)

## Users

Nhân viên và quản lý của **Công ty TNHH Công nghiệp Fu Sheng (Việt Nam)** — một công ty sản xuất máy nén khí và linh kiện công nghiệp tại KCN Biên Hòa 2, Đồng Nai.

**Three user roles:**
- **Admin (IT Dept.)** — Toàn quyền quản lý hệ thống: tạo/xóa tài khoản, phân quyền, quản lý dữ liệu master.
- **Manager / HR** — Duyệt/từ chối đơn nghỉ phép, xem báo cáo tổng hợp phòng ban, đăng thông báo nội bộ.
- **Employee** — Xem hồ sơ cá nhân, tìm kiếm danh bạ đồng nghiệp, gửi đơn xin nghỉ phép/làm thêm giờ, đọc thông báo.

## Product Purpose

**Enterprise Employee Portal** là hệ thống web nội bộ tập trung hóa các tiện ích quản lý nhân sự và thông tin nội bộ cho Fu Sheng Vietnam. Hệ thống loại bỏ sự phụ thuộc vào giấy tờ thủ công và email nội bộ rời rạc, cung cấp một cổng thông tin duy nhất cho:

1. **Employee Directory** — Danh bạ nhân viên toàn công ty, tìm kiếm theo tên/phòng ban/bộ phận.
2. **Leave Request System** — Nhân viên gửi đơn xin nghỉ phép, OT; Manager duyệt online.
3. **Company Announcements** — Thông báo nội bộ từ Ban giám đốc và HR.
4. **Personal Profile** — Nhân viên xem và cập nhật thông tin cá nhân cơ bản.

## Positioning

Không như các phần mềm HRM thương mại cồng kềnh (SAP, Bitrix24), Enterprise Employee Portal được thiết kế tối giản, tập trung vào đúng 4 nghiệp vụ cốt lõi mà nhân viên nhà máy thực sự cần hàng ngày. Giao diện tối, chuyên nghiệp, tải nhanh ngay cả trên mạng nội bộ tốc độ thấp.

## Operating Context

- Nhân viên truy cập từ máy tính văn phòng tại nhà máy (desktop-first, cũng responsive mobile).
- Hệ thống chạy trên server nội bộ hoặc VPS, không cần internet.
- Kết nối qua MySQL database nội bộ.

## Capabilities and Constraints

- **Tech Stack:** Node.js + Express.js backend, MySQL database, ReactJS (Vite) frontend.
- **Auth:** JWT (HttpOnly cookie) — không dùng localStorage để bảo mật.
- **RBAC:** 3 roles — Admin, Manager, Employee.
- **Strict Constraints:** 100% Semantic HTML5. CSS Modules + Vanilla CSS — không dùng Tailwind.
- **Architecture:** Monorepo (`client/` + `server/`), containerized via Docker Compose.

## Brand Commitments

The brand is professional, trustworthy, and clean — phù hợp với môi trường nhà máy công nghiệp nghiêm túc.
- **Voice:** Rõ ràng, súc tích, formal.
- **Visuals:** **"Corporate Dark"** — nền navy đậm (`hsl(222, 28%, 8%)`), accent xanh dương kỹ thuật (`hsl(210, 85%, 55%)`), typography Inter sạch sẽ. Micro-animations tinh tế, không phô trương.

## Product Principles

1. **Role-Based Access:** Mỗi user chỉ thấy đúng tính năng theo vai trò của họ.
2. **Fast & Reliable:** Tải nhanh trên mạng nội bộ, không phụ thuộc CDN ngoài.
3. **Audit Trail:** Mọi hành động quan trọng (duyệt đơn, đăng thông báo) được log.
4. **Visual Excellence:** Giao diện phải premium, không giống template sinh viên.

## Accessibility & Inclusion

- UI phải điều hướng được hoàn toàn bằng bàn phím.
- Tất cả interactive elements có visible focus rings.
- ARIA labels đúng trên tất cả forms và complex UI components.
- High contrast text (WCAG AA compliance minimum).
