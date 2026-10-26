# Database Seeders System — Enterprise Employee Portal

Thư mục này chứa toàn bộ hệ sinh thái quản lý dữ liệu khởi tạo (Seed Data) chuẩn doanh nghiệp cho MySQL. Hệ thống tuân thủ **Quy tắc 4 (Rule 4)** và kiến trúc nhất quán với `server/src/migrations/`:
- Dữ liệu mẫu, dữ liệu danh mục ban đầu (Master Data) và dữ liệu thử nghiệm đều được định danh qua các file seeder có thứ tự rõ ràng.
- Mọi seeder đều có khả năng thực thi tuần tự (`up`), hoàn tác đảo ngược (`down`), và kiểm tra trạng thái (`status`).
- Trạng thái các seeder đã thực thi được ghi nhận tự động trong bảng `sequelize_data`.

---

## 1. Cấu trúc và Quy ước đặt tên

Các file seeder chuẩn được đặt tên theo định dạng số thứ tự 3 chữ số tăng dần:

```text
server/src/seeders/
├── 001_core_departments.js         # Khởi tạo 8 phòng ban chuẩn (IT, HR, PROD, ENG, SALES, QC, ACCT, LOG)
├── 002_vietnam_holidays_2026.js    # Khởi tạo 12 ngày nghỉ lễ quốc gia Việt Nam năm 2026
├── 003_demo_accounts.js            # Khởi tạo tài khoản demo (admin, manager, employee) và thông báo mẫu
├── 004_bulk_factory_employees.js   # Khởi tạo 220 nhân viên thực tế nhà máy Fu Sheng Vietnam
├── create.js                       # CLI generator tạo nhanh file seeder mới
├── run.js                          # Seeder runner chuẩn (hỗ trợ up, down/undo, status, transaction)
├── seed.bulk-employees.js          # Generator logic và standalone bulk seeder
├── seed.dev.js                     # Standalone legacy seeder cho môi trường dev
├── seed.production.js              # Standalone legacy seeder cho môi trường production
└── README.md                       # Tài liệu hướng dẫn chuẩn
```

---

## 2. Các lệnh CLI (NPM Scripts)

Chạy từ thư mục `server/`:

| Lệnh | Ý nghĩa |
|---|---|
| `npm run seed` | Thực thi toàn bộ các seeder chưa chạy theo thứ tự tăng dần (`up`). |
| `npm run seed:undo` | Rollback (hoàn tác) seeder mới nhất đã chạy (`down`). |
| `npm run seed:status` | Hiển thị bảng trạng thái tất cả các seeder (`APPLIED` hoặc `PENDING`). |
| `npm run seed:create <ten_seeder>` | Tự động sinh file seeder mới với số thứ tự kế tiếp và template chuẩn. |
| `npm run seed:bulk` | Chạy nhanh nạp 220 nhân sự nhà máy Fu Sheng Vietnam (direct run). |
| `npm run seed:dev` | Nạp dữ liệu phát triển ban đầu (legacy mode). |
| `npm run seed:prod` | Chỉ khởi tạo danh mục phòng ban cốt lõi trên Production (không tạo tài khoản). |

### Ví dụ sử dụng:

```bash
# Xem trạng thái seeder hiện tại
npm run seed:status

# Thực thi tất cả seeder còn chờ
npm run seed

# Hoàn tác seeder vừa chạy gần nhất
npm run seed:undo

# Tạo seeder mới (ví dụ thêm chức vụ phụ cấp)
npm run seed:create allowance_types
# -> Tự động sinh file: server/src/seeders/005_allowance_types.js
```

---

## 3. Cấu trúc một file Seeder chuẩn

Mỗi file seeder bắt buộc phải xuất ra 2 hàm bất đồng bộ: `up` và `down`.

```javascript
/**
 * 005 — allowance_types
 */

/**
 * @param {import('sequelize').QueryInterface} qi
 * @param {import('sequelize').Sequelize} sequelize
 */
export async function up(qi, sequelize) {
  // Thực hiện thêm dữ liệu mẫu (idempotent / kiểm tra trùng lặp)
  await qi.bulkInsert('allowance_types', [
    { code: 'MEAL', name: 'Phụ cấp cơm trưa', amount: 730000, created_at: new Date(), updated_at: new Date() }
  ]);
}

/**
 * @param {import('sequelize').QueryInterface} qi
 * @param {import('sequelize').Sequelize} sequelize
 */
export async function down(qi, sequelize) {
  // Hoàn tác chính xác những gì hàm up() đã làm
  await qi.bulkDelete('allowance_types', { code: 'MEAL' });
}
```

---

## 4. Các nguyên tắc kỹ thuật bắt buộc (Best Practices)

1. **Transaction an toàn**: `run.js` tự động bọc mỗi seeder trong một Sequelize Transaction. Nếu có lỗi xảy ra, toàn bộ thao tác trong seeder đó sẽ tự động Rollback.
2. **Khả năng khôi phục (Reversibility)**: Hàm `down()` phải đảo ngược chính xác những bản ghi được tạo ra bởi hàm `up()`, tránh xóa nhầm dữ liệu thực của người dùng.
3. **Tính lũy kế (Idempotency)**: Seeder phải an toàn khi chạy nhiều lần mà không tạo trùng lặp khóa chính hoặc lỗi ràng buộc `UNIQUE` (sử dụng kiểm tra `existing` hoặc `findOrCreate`).
4. **Phân tách ranh giới rõ ràng**:
   - `migrations/`: Quản lý cấu trúc bảng (DDL - `CREATE TABLE`, `ADD COLUMN`, `ADD INDEX`).
   - `seeders/`: Quản lý dữ liệu bản ghi (DML - `INSERT`, `UPDATE`, `DELETE`).
5. **Bảo mật Production**: Tuyệt đối không nạp tài khoản mẫu hoặc mật khẩu mặc định yếu vào cơ sở dữ liệu Production thật.
