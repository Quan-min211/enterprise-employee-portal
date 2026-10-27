# Database Migrations System — Enterprise Employee Portal

Thư mục này chứa toàn bộ các file migration quản lý phiên bản cơ sở dữ liệu MySQL của dự án. Hệ thống tuân thủ **Quy tắc 4 (Rule 4)**: Tuyệt đối không can thiệp thay đổi cấu trúc bảng bằng lệnh thủ công (`ALTER TABLE`) bên ngoài; mọi thay đổi schema đều phải thông qua migration file.

---

## 1. Cấu trúc và Quy ước đặt tên

Các file migration được đặt tên theo định dạng số thứ tự 3 chữ số tăng dần:

```text
server/src/migrations/
├── 001_initial_schema.js            # Khởi tạo bảng ban đầu (users, departments, leave_requests, announcements, audit_logs)
├── 002_hr_domain.js                 # Bổ sung nghiệp vụ HR (leave_balances, holidays, leave_approval_logs, ot_hours)
├── 003_first_time_password_change.js# Thêm must_change_password cho tài khoản admin tạo
├── 004_account_lockout.js           # Thêm failed_login_attempts và locked_until (khóa tài khoản brute-force)
├── 005_audit_log_traceability.js    # Bổ sung ip_address, user_agent, request_id vào audit_logs
├── 006_user_indexes.js              # Thêm indexes idx_users_email, idx_users_employee_code
├── create.js                        # CLI generator tạo nhanh file migration mới
├── run.js                           # Migration runner (hỗ trợ up, down/undo, status)
└── README.md                        # Tài liệu hướng dẫn chuẩn
```

Bảng `sequelize_meta` trong MySQL ghi nhận danh sách các file migration đã thực thi cùng thời điểm chạy (`executed_at`).

---

## 2. Các lệnh CLI (NPM Scripts)

Chạy từ thư mục `server/`:

| Lệnh | Ý nghĩa |
|---|---|
| `npm run migrate` | Thực thi toàn bộ các migration chưa chạy theo thứ tự tăng dần (`up`). |
| `npm run migrate:undo` | Rollback (hoàn tác) migration mới nhất đã chạy (`down`). |
| `npm run migrate:status` | Hiển thị bảng trạng thái tất cả các migration (`APPLIED` hoặc `PENDING`). |
| `npm run migrate:create <ten_migration>` | Tự động sinh file migration mới với số thứ tự kế tiếp và template mẫu chuẩn. |

### Ví dụ sử dụng:

```bash
# Xem trạng thái migration hiện tại
npm run migrate:status

# Tạo migration mới thêm index
npm run migrate:create add_indexes_to_tables
# -> Sinh ra file: server/src/migrations/006_add_indexes_to_tables.js

# Thực thi migration
npm run migrate

# Hoàn tác migration gần nhất nếu cần sửa đổi
npm run migrate:undo
```

---

## 3. Cấu trúc một file Migration chuẩn

Mỗi file migration bắt buộc phải xuất ra 2 hàm bất đồng bộ: `up` và `down`.

```javascript
/**
 * 006 — add_indexes_to_tables
 */

/**
 * @param {import('sequelize').QueryInterface} qi
 * @param {import('sequelize').Sequelize} sequelize
 */
export async function up(qi, sequelize) {
  // Thực hiện thêm bảng, cột, hoặc index
  await qi.addIndex('users', ['email'], { name: 'idx_users_email' });
}

/**
 * @param {import('sequelize').QueryInterface} qi
 * @param {import('sequelize').Sequelize} sequelize
 */
export async function down(qi, sequelize) {
  // Hoàn tác chính xác những gì hàm up() đã làm
  await qi.removeIndex('users', 'idx_users_email');
}
```

---

## 4. Các lưu ý kỹ thuật bắt buộc (Best Practices)

1. **Transaction an toàn**: `run.js` tự động bọc mỗi migration trong một Sequelize Database Transaction. Nếu một câu lệnh bị lỗi, toàn bộ thao tác trong migration đó sẽ tự động Rollback và ghi lỗi chi tiết.
2. **Khả năng khôi phục (Reversibility)**: Bắt buộc viết hàm `down()` đảo ngược chính xác thao tác của hàm `up()`.
3. **Bộ mã UTF-8 chuẩn**: Tất cả bảng và chuỗi đều sử dụng `utf8mb4` và `utf8mb4_unicode_ci`.
4. **Khóa ngoại rõ ràng**: Mọi foreign key liên kết giữa các bảng phải khai báo tường minh `ON DELETE` và `ON UPDATE` (e.g. `CASCADE` hoặc `SET NULL`).
5. **Tính bất biến (Immutability)**: Không bao giờ sửa nội dung của migration đã được merge hoặc chạy trên môi trường Production/Staging. Nếu cần sửa cấu trúc, hãy tạo migration mới với số thứ tự tiếp theo.
