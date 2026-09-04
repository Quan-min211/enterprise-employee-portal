# AGENTS.md — Mandatory AI Coding Rules

> **READ THIS FILE BEFORE WRITING ANY CODE.**
> All AI agents (Copilot, Cursor, Claude Code, Codex, Gemini, etc.) must strictly adhere to 100% of the rules below.

---

## 0. MANDATORY — Read System Context First

> **TRƯỚC KHI LÀM BẤT KỲ TASK NÀO**, AI agent **BẮT BUỘC** phải đọc file [`docs/SYSTEM_CONTEXT.md`](./docs/SYSTEM_CONTEXT.md).

File này chứa toàn bộ kiến trúc hệ thống, ý tưởng, công nghệ, nội dung chi tiết, và các lưu ý kỹ thuật quan trọng cho **mọi phần** của dự án (Database schema, API endpoints, React components, Docker, CI/CD).

**Mục đích**: Đảm bảo AI agent hiểu rõ hệ thống đã xây dựng trước khi thêm/sửa bất cứ điều gì, tránh:
- Phá vỡ design system đang dùng
- Tạo lại schema không khớp với Sequelize models hiện tại
- Import sai tên module hoặc đường dẫn
- Viết API route trùng lặp với routes đã có
- Dùng wrong HTTP methods cho REST conventions

**Quy trình bắt buộc**:
1. Đọc `docs/SYSTEM_CONTEXT.md` để nắm kiến trúc tổng thể
2. Đọc `DESIGN.md` nếu task liên quan đến UI/Frontend
3. Thực hiện task
4. **Cập nhật `docs/SYSTEM_CONTEXT.md`** nếu task thay đổi kiến trúc, thêm endpoint, thêm bảng DB, thêm trang FE

---

## 1. Semantic HTML5 — 100% MANDATORY

### Core Principles

- **ABSOLUTELY NO** use of `<div>` or `<span>` when an appropriate Semantic HTML5 tag exists.
- Every page must use **100% Semantic HTML5** — no exceptions.
- `<div>` and `<span>` may only be used when **NO** semantic tag is suitable (e.g., pure CSS layout wrappers).

### Mandatory Semantic HTML5 Tags

| Purpose | Correct Tag | INCORRECT |
|---------|-------------|-----------|
| Page Layout | `<header>`, `<main>`, `<footer>`, `<aside>`, `<nav>` | `<div class="header">`, `<div class="footer">` |
| Article Content | `<article>`, `<section>` | `<div class="article">`, `<div class="section">` |
| Headings | `<h1>` → `<h6>` (proper hierarchy) | `<div class="title">`, `<span class="heading">` |
| Navigation List | `<nav>` + `<ul>` / `<ol>` | `<div class="nav">` |
| Captioned Image | `<figure>` + `<figcaption>` | `<div class="image-wrapper">` |
| Time | `<time datetime="...">` | `<span class="date">` |
| Text Markup | `<mark>`, `<strong>`, `<em>`, `<abbr>`, `<cite>`, `<code>` | `<span class="highlight">`, `<b>` (unless contextually correct) |
| Form | `<form>`, `<fieldset>`, `<legend>`, `<label>`, `<output>` | `<div class="form">` |
| Expandable Details| `<details>` + `<summary>` | `<div class="accordion">` |
| Data Tables | `<table>`, `<thead>`, `<tbody>`, `<tfoot>`, `<caption>`, `<th scope="...">` | `<div class="table">` |
| Dialog Content | `<dialog>` | `<div class="modal">` |
| Search | `<search>` | `<div class="search-wrapper">` |

### Heading Hierarchy Rules

```text
<h1> — EXACTLY 1 per page (main title)
  <h2> — Main sections
    <h3> — Sub-sections
      <h4> → <h6> — Deeper details
```

- **DO NOT** skip levels.

---

## 2. Accessibility (a11y) — Mandatory

- Every image must have a clear descriptive `alt` attribute (or `alt=""` if decorative).
- Every interactive element must have an `aria-label` or a visible label.
- Use `aria-labelledby` and `aria-describedby` when necessary.
- Form controls must be linked to a `<label>` via the `for`/`id` attributes.
- Keyboard navigation must be fully functional (visible focus, logical tab order).
- Color contrast must meet a minimum of 4.5:1 (AA) for regular text and 3:1 for large text.

---

## 3. CSS & Styling

- Use CSS Custom Properties (`--var`) for design tokens from `client/src/styles/tokens.css`.
- Follow a mobile-first responsive design approach.
- Avoid inline styles unless they are dynamic (JavaScript-driven).
- Do NOT use TailwindCSS — use Vanilla CSS or CSS Modules.
- Reference `DESIGN.md` for the full design system before writing any CSS.

---

## 4. Tech Stack Rules

### Frontend (React + Vite)
- Use React functional components with hooks — no class components.
- Use React Context API for global state (auth, user info) — no Redux.
- Use React Router v6 for routing.
- API calls go through `client/src/api/` modules — never call `fetch`/`axios` directly in components.
- Use `client/src/styles/tokens.css` CSS custom properties for all colors, spacing, etc.

### Backend (Node.js + Express)
- Use ES Modules (`import`/`export`) — no CommonJS `require()`.
- Use Sequelize ORM for all MySQL queries — no raw SQL queries in business logic.
- All routes go through `server/src/routes/` — no inline route handlers in `server.js`.
- Authentication via JWT (jsonwebtoken) — store tokens in HttpOnly cookies, not localStorage.
- Use `express-validator` for request validation in all POST/PUT routes.
- Error handling via centralized `server/src/middleware/errorHandler.js`.

### Database (MySQL)
- All schema changes go through Sequelize migrations — no manual ALTER TABLE.
- Use `utf8mb4` charset for all tables.
- Foreign keys must have explicit `ON DELETE` / `ON UPDATE` constraints.

---

## 5. Pre-installed Project Tools

The following tools have been installed into the project directory for reference and usage:

| Tool | Directory | Description |
|------|-----------|-------------|
| **Spec Kit** | `./spec-kit/` | Toolkit for Spec-Driven Development — define specs before coding. |
| **Taste Skill** | `./taste-skill/` | AI design skills — elevates UI quality and prevents generic AI designs. |
| **Impeccable** | `./impeccable/` | Design guidance for AI agents — 23 commands, 58 detector rules for frontend design. |

### Usage Instructions

- **Spec Kit**: Read `./spec-kit/` to understand the spec-driven workflow.
- **Taste Skill**: Reference the skills in `./taste-skill/skills/` to enhance UI design quality.
- **Impeccable**: Reference the rules in `./impeccable/` to ensure the design is neither generic nor boring.

---

## 6. Pre-Submission Checklist

- [ ] 100% Semantic HTML5 — no `<div>` / `<span>` used as substitutes for semantic tags.
- [ ] Correct heading hierarchy (`h1` → `h2` → `h3`, no skipped levels).
- [ ] Exactly **1** `<h1>` tag per page.
- [ ] All `<img>` tags have an `alt` text attribute.
- [ ] All form controls have an associated `<label>`.
- [ ] API routes follow REST conventions (GET/POST/PUT/DELETE).
- [ ] JWT authentication implemented correctly (HttpOnly cookie).
- [ ] No hardcoded credentials or secrets.
- [ ] `docs/SYSTEM_CONTEXT.md` updated if architecture changed.
- [ ] Fully responsive and mobile-first design.
- [ ] Accessibility complies with WCAG 2.1 AA standards.

---

> **Remember**: This file is the law. The AI must read and strictly adhere to it BEFORE writing any code.
