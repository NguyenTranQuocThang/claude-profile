# Claude Profile — Project Rules & Architecture

## Mục đích
File này được Claude đọc tự động khi bắt đầu mỗi task. Đặt ở đây các quy tắc, kiến trúc, conventions bạn muốn Claude luôn nhớ.

---

## Nội dung app
Tạo 1 app giao diện đơn giản mục đích switch profile claude (dùng cho công ty và cá nhân)
1. Select claude private -> dùng profile cá nhân đăng nhập or profile cá nhân đã lưu
2. Select claude company -> điền thông tin key api claude tương ứng
sau khi select 1 trong 2 option trên và nếu điền đủ thông tin cần điền thì sẽ switch profile tương ứng để khi dùng terminal không cần setup lằng nhằng

## Tech Stack mặc định
- **Language**: React
- **Framework**: ReactJs
- **Database**: (điền vào đây) - cache file
- **Styling**: (Tailwind CSS, v.v.)

---

## Code Conventions

### Naming
- Files: `kebab-case.ts`
- Components: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`

### Structure
```
src/
  components/   # UI components
  lib/          # utilities, helpers
  hooks/        # custom React hooks
  types/        # TypeScript types/interfaces
  api/          # API routes / server logic
```

### Git commit format
```
feat: thêm tính năng X
fix: sửa bug Y
refactor: cải thiện Z
docs: cập nhật README
```

---

## Rules quan trọng
- Luôn viết TypeScript strict, không dùng `any`
- Không thêm comment giải thích "what" — chỉ comment khi "why" không rõ ràng
- Không tạo abstraction trước khi cần thiết
- Test coverage cho business logic, không test implementation details
- Không mock database trong integration tests

---

## Architecture Decisions
<!-- Ghi lại các quyết định kiến trúc quan trọng ở đây -->
<!-- Ví dụ: "Dùng Zustand thay Redux vì state đơn giản, không cần middleware" -->

---

## Gotchas & Known Issues
<!-- Ghi các "bẫy" trong codebase để Claude không lặp lại lỗi cũ -->
<!-- Ví dụ: "API /users trả về snake_case, nhưng frontend dùng camelCase — có transformer ở lib/api.ts" -->
