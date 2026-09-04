/**
 * Enterprise Employee Portal — DESIGN.md
 * Direction: Corporate Dark / Industrial Tech
 * Company: Fu Sheng Industrial (Vietnam) Co., Ltd.
 */

# Design System — Enterprise Employee Portal

<!-- impeccable:design-schema 1 -->

## Visual World

**Corporate Dark / Industrial Tech.** Giao diện được xây dựng từ ngôn ngữ thị giác của một công ty sản xuất nghiêm túc: bảng điều khiển kỹ thuật, màn hình giám sát nhà máy, dashboard quản lý cấp doanh nghiệp. Mỗi quyết định thiết kế đặt câu hỏi: *"Đây có phải là thứ bạn thấy trên phần mềm ERP nội bộ của Samsung hay Foxconn không?"* — không phải app lifestyle, không phải landing page marketing. Đây là công cụ làm việc thực thụ.

---

## Color Palette

| Role | Value | Usage |
|------|-------|-------|
| Ground | `hsl(222, 28%, 8%)` | Page background — deep navy |
| Surface | `hsl(222, 24%, 12%)` | Cards, panels, sidebar |
| Raised | `hsl(222, 22%, 16%)` | Elevated elements, dropdowns |
| Hover | `hsl(222, 20%, 20%)` | Interactive hover state |
| Border | `hsl(222, 20%, 22%)` | Separators, dividers |
| Accent | `hsl(210, 85%, 55%)` | Primary CTA, active nav, links |
| Accent Hover | `hsl(210, 85%, 65%)` | Lifted accent |
| Accent Subtle | `hsl(210, 85%, 55%, 0.12)` | Accent backgrounds, tags |
| Success | `hsl(145, 63%, 42%)` | Approved status, success states |
| Warning | `hsl(38, 90%, 52%)` | Pending, warning states |
| Danger | `hsl(4, 80%, 55%)` | Rejected, delete, danger |
| Text Primary | `hsl(210, 20%, 94%)` | Headlines, primary content |
| Text Secondary | `hsl(210, 15%, 65%)` | Body copy, descriptions |
| Text Muted | `hsl(210, 10%, 45%)` | Captions, labels, placeholders |

**Color strategy:** Restrained — deep navy ground + single saturated blue accent. Status colors (green/amber/red) appear only in data contexts (leave status badges, form feedback). No decorative gradients.

---

## Typography

| Role | Font | Weight | Style |
|------|------|--------|-------|
| Display / Page Titles | Inter | 700–800 | Normal |
| Section Headings | Inter | 600–700 | Normal |
| Navigation Labels | Inter | 500–600 | Normal |
| Body Copy | Inter | 400 | Normal |
| Data / Mono | JetBrains Mono | 400 | Normal |
| Tags / Badges | Inter | 600 | UPPERCASE, letter-spacing 0.06em |

**Key rule:** All text uses Inter. JetBrains Mono reserved for IDs, codes, technical values. No decorative fonts.

Font size scale (using `clamp` for responsiveness):
- `--text-xs: 0.75rem`
- `--text-sm: 0.875rem`
- `--text-base: 1rem`
- `--text-lg: 1.125rem`
- `--text-xl: 1.25rem`
- `--text-2xl: 1.5rem`
- `--text-3xl: clamp(1.75rem, 3vw, 2.25rem)`

---

## Borders & Radius

Slightly rounded — professional without being cold.
- Components (cards, panels): `--radius-md` (8px)
- Buttons: `--radius-sm` (6px)
- Tags/Badges: `--radius-xs` (4px)
- Modals: `--radius-lg` (12px)
- Input fields: `--radius-sm` (6px)

---

## Spacing System

Base unit: `4px`

```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
```

---

## Key Components

### Sidebar Navigation
- Fixed left sidebar: 240px wide, `--surface` background, `2px solid var(--border)` right border.
- Active nav item: `--accent-subtle` background, `--accent` colored icon + text, `3px solid var(--accent)` left border.
- Nav icons: 20px, aligned left with label.
- Collapsed state: 64px icon-only on mobile.

### Stat Cards (Dashboard)
- `--surface` background, `--radius-md` corners, `1px solid var(--border)`.
- Top accent line: `3px solid var(--accent)` at top or left.
- Value: `--text-2xl` Inter 700, `--text-primary`.
- Label: `--text-sm` Inter 500 UPPERCASE, `--text-muted`, letter-spacing 0.08em.

### Buttons

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| Primary | `--accent` | white | none |
| Secondary | `--raised` | `--text-secondary` | `1px solid var(--border)` |
| Danger | `--danger` | white | none |
| Ghost | transparent | `--accent` | `1px solid var(--accent)` |

Height: 36px (compact), 40px (default), 44px (large).
Padding: 0 `--space-4`.

### Status Badges

| Status | Background | Text | Style |
|--------|-----------|------|-------|
| Approved | `hsl(145, 63%, 42%, 0.15)` | `hsl(145, 63%, 52%)` | UPPERCASE xs |
| Pending | `hsl(38, 90%, 52%, 0.15)` | `hsl(38, 90%, 62%)` | UPPERCASE xs |
| Rejected | `hsl(4, 80%, 55%, 0.15)` | `hsl(4, 80%, 65%)` | UPPERCASE xs |

### Data Tables
- Header: `--raised` bg, `--text-muted` text, UPPERCASE xs, `border-bottom: 1px solid var(--border)`.
- Rows: alternate `--surface` / `--ground` for subtle striping.
- Hover: `--hover` background.

### Forms
- Input: `--raised` bg, `1px solid var(--border)`, `--radius-sm`, 40px height, `--text-primary`.
- Focus: `2px solid var(--accent)`, border-color `--accent`.
- Label: `--text-sm` Inter 500, `--text-secondary`, 8px bottom gap.
- Error: `2px solid var(--danger)`, error message in `--danger` text below.

---

## Animation

- All transitions: `150ms ease` for color/background/border.
- Transform hover effects: `translateY(-1px)` for cards/buttons — subtle lift only.
- Page entrance: `opacity 0 → 1`, `translateY(8px → 0)`, `250ms ease-out`.
- Modal: fade in + scale from `0.96 → 1`, `200ms ease-out`.
- **No** bounce/elastic easing. No `cubic-bezier` with overshoot.

---

## Anti-Patterns (Banned)

- No gradients on component backgrounds (only allowed on hero sections if any)
- No pure bright white backgrounds — always tinted navy
- No rounded pill buttons (border-radius > 10px on buttons)
- No glassmorphism / frosted glass effects
- No teal, purple, or orange as primary accent
- No generic gray (#808080 or similar)
- No Roboto, Nunito, Poppins as heading fonts
- No `border-radius: 50%` on step indicators — use rounded squares
- No skeleton loaders with bright white shimmer — use dark-themed skeletons
