# SEG301m - Ghi Chú Học Tập Tiếng Việt (Information Retrieval & Search Engines)

Website ghi chú học tập và tài liệu bài giảng môn SEG301m (Truy xuất thông tin và Công cụ tìm kiếm) hoàn toàn bằng tiếng Việt, được biên soạn dễ hiểu và chi tiết cho sinh viên.

Trang web trực tiếp: Đã sẵn sàng xuất bản độc lập trên Vercel.

## Tính năng chính

- **12 Chương bài học tiếng Việt**: Đầy đủ lý thuyết, phân tích chi tiết, ví dụ thực tế ngoài slide và các câu hỏi tự kiểm tra.
- **Sơ đồ tư duy (Mindmap)**: Tích hợp sơ đồ tư duy trực quan cho toàn bộ 12 chương bài học.
- **Bảng thuật ngữ tương tác (Glossary)**: Tìm kiếm tức thì thuật ngữ Anh - Việt theo thời gian thực.
- **Công thức KaTeX & Code Syntax Highlighting**: Trình bày đẹp mắt các công thức toán học và mã nguồn mẫu.
- **Điều hướng mượt mà**: Mục lục cố định (sticky TOC) tự động nhận diện vị trí đọc (IntersectionObserver), thanh tiến độ đọc (reading progress), nút về đầu trang (back-to-top), và chuyển chương trước/sau.
- **Trợ giảng AI (AI Tutor)**: Hỗ trợ sinh viên giải đáp thắc mắc, hỏi đáp theo ngữ cảnh bài học hiện tại với các trích dẫn ổn định (`-vi`).
- **Giao diện Responsive**: Tối ưu hóa hiển thị mượt mà trên Desktop (1440x900), Tablet (1024x768) và Mobile (390x844).

## Cấu trúc thư mục

```text
├── content/                 # 12 bài học Markdown tiếng Việt + catalog chapters.json
├── mindmap/                 # 12 hình sơ đồ tư duy bài giảng
├── web/                     # Mã nguồn giao diện (styles.css, app.js, tutor/)
├── scripts/                 # Kịch bản build tĩnh và kiểm thử tự động
├── server/                  # Backend cục bộ cho AI Tutor
├── config/                  # Cấu hình danh tính và thiết lập ứng dụng
├── dist/                    # 13 trang HTML xuất bản tĩnh (index.html + 12 chương)
├── vercel.json              # Cấu hình triển khai Vercel độc lập
└── package.json             # Khai báo gói và các lệnh chạy
```

## Hướng dẫn cài đặt & Chạy

### 1. Cài đặt phụ thuộc

```bash
npm install
```

### 2. Biên dịch (Build)

Biên dịch website tĩnh ra thư mục `dist/` gồm trang chủ và 12 chương:

```bash
npm run build
```

### 3. Kiểm tra tính toàn vẹn (Check)

Kiểm tra 13 trang HTML, link, anchor, bộ chọn tiếng Việt, toán học, phân tích offline và responsive:

```bash
npm run check
```

### 4. Kiểm tra AI Tutor

```bash
npm run test:tutor
```

### 5. Triển khai (Deploy)

Dự án được cấu hình sẵn `vercel.json` để triển khai lên Vercel project độc lập:

```bash
npx vercel deploy --prod
```
