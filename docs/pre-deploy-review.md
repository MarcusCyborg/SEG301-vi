# Báo Cáo Final Pre-Deploy Release Review

**Dự án:** SEG301m - Ghi chú học tập Công cụ Tìm kiếm & Truy xuất Thông tin (Tiếng Việt)  
**Repository:** `F:/1. FPT Material/Sem5/SEG301m/seg301m-vi`  
**GitHub:** `MarcusCyborg/SEG301-vi`  
**Ngày đánh giá:** 04/11/2026  
**Mục tiêu:** Thẩm định nghiệm thu lần cuối trước khi deploy production sau Phase 1, Phase 2 và Phase 3  
**Kết luận:** **READY TO DEPLOY**

---

## 1. Danh Sách Các Lệnh Đã Chạy

Toàn bộ các lệnh build, kiểm tra kiểu/schema, kiểm thử đơn vị, kiểm thử tích hợp, kiểm tra hồi quy giao diện và kiểm thử pre-deploy đều đã được thực thi và đạt **100% PASSED** (mã thoát `0`):

| STT | Lệnh thực thi | Mục đích kiểm tra | Kết quả |
|---|---|---|:---:|
| 1 | `npm run check:terms` | Kiểm tra tính hợp lệ của schema từ điển (344 terms) và 332 markers trong 12 chương | **PASSED** |
| 2 | `npm run build` | Biên dịch toàn bộ 13 trang HTML tĩnh, bundling CSS/JS, KaTeX, highlight.js và assets | **PASSED** |
| 3 | `npm run check:term-modes` | Kiểm tra 12 kịch bản tự động cho 3 chế độ thuật ngữ, localStorage, anti-FOUC | **PASSED** |
| 4 | `npm run check:phase3-qa` | Bộ QA chuyên sâu 5 viewports x 7 trang, WAI-ARIA, roving tabindex, 51 ảnh screenshots | **PASSED** |
| 5 | `npm run check:pre-deploy` | Bộ kiểm tra pre-deploy release suite 10 nhóm tiêu chí toàn diện | **PASSED** |
| 6 | `npm run check:lessons` | Kiểm tra độ chính xác thuật toán và công thức tính toán Ch08–10 và Ch11–12 | **PASSED** |
| 7 | `npm run check:responsive` | Kiểm tra responsive desktop, tablet, mobile chống tràn ngang | **PASSED** |
| 8 | `npm run test:retrieval` | Kiểm tra công cụ truy xuất thông tin, khớp từ khóa tiếng Anh/Việt/CJK | **PASSED** |
| 9 | `npm run test:generated-files` | Kiểm tra khả năng tạo và tải file CSV/báo cáo từ Tutor | **PASSED** |
| 10 | `npm run test:tutor` | Kiểm tra tích hợp Gia sư AI Tutor (SQLite, stream, backup/restore, PDF/ảnh) | **PASSED** |
| 11 | `npm run check` | Tổng kiểm tra liên hoàn toàn bộ hệ thống | **PASSED** |

---

## 2. Kết Quả Chi Tiết Từng Nhóm Kiểm Tra (10 Nhóm Tiêu Chí)

### Nhóm 1: Cấu trúc Repo & Tính toàn vẹn Thuật ngữ (Terminology Integrity)
- **Từ điển `content/terms.json`:** Gồm **344 thuật ngữ chuẩn hóa**, phân bổ đầy đủ qua 7 danh mục chuyên ngành.
- **Tính toàn vẹn của Marker:** Tổng cộng **332 markers** trong 12 file Markdown.
- **Tỷ lệ hợp lệ:** 100% (332/332) markers trỏ đến ID tồn tại thực tế trong từ điển.
- **Không có marker mồ côi hay trỏ sai:** 0 vi phạm.

### Nhóm 2: Build Pipeline & Tính đơn định (Determinism)
- **Độ ổn định:** Thực hiện 2 lần build liên tiếp độc lập (`node scripts/build.mjs`), so sánh mã băm SHA-256 trên toàn bộ cây thư mục `dist/`.
- **Kết quả:** 100% các file trùng khớp mã băm SHA-256 từng byte một. Pipeline hoàn toàn đơn định (deterministic/idempotent).
- **Đầy đủ tệp tin:** Có đầy đủ 13 file HTML (`dist/index.html` và 12 chapters từ `chapter-01.html` đến `chapter-12.html`).

### Nhóm 3: Kiểm tra Ba Chế Độ Thuật Ngữ (Term Display Modes)
- **Chế độ Song ngữ (Bilingual - Mặc định):**
  - Hiển thị theo định dạng chuẩn: `English (Tiếng Việt)`.
  - Các thuật ngữ giữ nguyên tiếng Anh (`preserveEnglish: true` như `BM25`, `PageRank`, `TF-IDF`, `BigTable`) tự động ẩn phần tiếng Việt bằng class `.term--same`, triệt tiêu hoàn toàn lỗi lặp từ `BM25 (BM25)`.
- **Chế độ English:**
  - Chỉ hiển thị tiếng Anh, ẩn hoàn toàn bản tiếng Việt (`display: none !important`).
  - Quét regex toàn DOM: **0 dấu ngoặc đơn rỗng `()`**, không để lại khoảng trắng hay dấu câu thừa.
- **Chế độ Tiếng Việt:**
  - Chỉ hiển thị tiếng Việt, ẩn tiếng Anh.
  - Câu văn xuôi liền mạch, kết cấu ngữ pháp hoàn chỉnh, không bị đứt đoạn.

### Nhóm 4: Trạng thái, LocalStorage Persistence, Search, Navigation và Tutor
- **Chuyển đổi tức thời:** Đổi mode cập nhật trực tiếp qua `dataset.termMode` trên `<html>` và `<body>`, không reload trang (< 16ms).
- **Persistence:** Lưu trạng thái vào `localStorage` key `seg301m-term-mode`. Tải lại trang (`reload`) hoặc chuyển sang chương khác (`navigation`) đều giữ nguyên chế độ đã chọn.
- **Resilience:** Gặp dữ liệu hỏng trong `localStorage`, hệ thống tự động fallback an toàn về `bilingual`.
- **Anti-FOUC:** Script inline đồng bộ tại thẻ `<head>` thực thi trước khi render DOM body, ngăn chặn 100% hiện tượng flash sai chế độ khi nạp trang.
- **Glossary Search:** Tìm kiếm nhanh chóng theo tên tiếng Anh (`inverted index`, `crawler`), tiếng Việt (`chỉ mục đảo`, `lọc cộng tác`), alias và từ viết tắt (`CF`, `IR`, `SEO`, `BM25`, `MAP`, `NDCG`). Kết quả không bị ẩn nhầm khi chuyển sang mode `vi`.
- **TOC & Navigation:** Thanh mục lục cuộn mượt, liên kết anchor nhảy chính xác đến các heading ID, bộ nút chuyển chương trước/sau (`Previous/Next chapter`) hoạt động trơn tru.
- **AI Tutor:** Tích hợp mượt mà với cả giao diện Desktop (sidebar trượt có kéo resize) và Mobile (full drawer), API backend kết nối thông suốt.

### Nhóm 5: Tính An Toàn Ngữ Cảnh của Thuật Ngữ (Contextual Safety)
- **Trong Headings (`h1` - `h6`):** Toàn bộ anchor explicit `{#...}` được xử lý thành `id="..."` sạch, không bị lẫn marker thô hay rách thẻ.
- **Trong Paragraphs:** 100% marker được mở rộng thành thẻ ngữ nghĩa `<span class="term" data-term-id="...">`.
- **Trong Bảng (Tables):** Bảng thuật ngữ được tối ưu với thuộc tính `data-term-id`, `data-aliases` phục vụ tìm kiếm.
- **Trong Callouts / Answer Keys:** Thẻ `<details class="answer-key">` có `<summary>` tiếng Việt chuẩn hóa ("Đáp án tham khảo").
- **Trong Code Blocks (`<pre><code>` và inline `<code>`):** **Tuyệt đối không chứa thẻ `.term`** (0 vi phạm).
- **Trong Công thức Toán (KaTeX & `.formula-block`):** **Tuyệt đối không chứa thẻ `.term`** (0 vi phạm).
- **Trong Links (`<a href="...">`):** Đường dẫn URL và anchor fragment nguyên vẹn 100%, không bị biến dạng.

### Nhóm 6: Responsive trên Đa Dạng Thiết Bị (5 Viewports)
Đã kiểm tra tự động bằng Puppeteer / Microsoft Edge trên 5 kích thước màn hình:
1. **375 x 812 (iPhone Mobile):** Overflow = 0px, nút Term Switcher hiển thị vừa vặn trong header (172px), cách wordmark 76px.
2. **360 x 740 (Android Compact):** Overflow = 0px, Term Switcher co giãn linh hoạt (168px), cách wordmark 65px.
3. **768 x 1024 (iPad Portrait):** Overflow = 0px, layout 2 cột chuyển đổi hài hòa.
4. **1280 x 800 (Laptop nhỏ):** Overflow = 0px, sticky TOC và layout bài đọc tối ưu.
5. **1440 x 900 (Desktop tiêu chuẩn):** Overflow = 0px, hiển thị sắc nét toàn bộ biểu đồ, mindmap và bảng so sánh.

### Nhóm 7: Console Errors, Runtime Errors, Hydration, Broken Assets & 404
- **Console Errors:** **0 lỗi**.
- **Console Warnings:** **0 cảnh báo**.
- **Hydration Errors:** Không áp dụng (website là kiến trúc tĩnh HTML/JS thuần cực kỳ ổn định).
- **Broken Assets:** Đã kiểm tra 292 đường dẫn asset cục bộ (`styles.css`, `app.js`, `tutor.css`, `tutor.js`, font KaTeX, highlight.js, ảnh mindmap PNG, favicon SVG/ICO) -> **292/292 (100%) tồn tại thực tế**, không có bất kỳ request 404 nào.
- **Broken Internal Links:** Đã quét 403 liên kết `<a href>` và 201 anchor fragments `#...` -> **100% liên kết hợp lệ**.

### Nhóm 8: Khả Năng Tiếp Cận Cơ Bản (Accessibility) & Keyboard Navigation
- Cụm nút Term Switcher áp dụng chuẩn **WAI-ARIA Radiogroup**:
  - Khung bao: `role="group"` kèm `aria-label="Chế độ hiển thị thuật ngữ"`.
  - Khung nút: `role="radiogroup"` kèm `aria-labelledby="term-switcher-label"`.
  - Nút con: `role="radio"`, cập nhật `aria-checked="true/false"`, có `title` tooltip giải thích rõ ràng.
- **Roving Tabindex:** Nút đang chọn có `tabIndex="0"`, các nút còn lại có `tabIndex="-1"`.
- **Keyboard Navigation:** Hỗ trợ đầy đủ phím mũi tên `ArrowRight`, `ArrowLeft` (hỗ trợ xoay vòng tuần hoàn), phím `Home`, phím `End`, phím `Space` và `Enter`.
- **Focus Visibility:** `:focus-visible` có viền màu cam tương phản cao (`outline: 2px solid var(--accent); outline-offset: 2px`), focus được duy trì trên nút đang chọn sau khi bấm.
- **Thiết kế đa dấu hiệu trực quan:** Phân biệt trạng thái active bằng màu nền đậm (`#163b3c`), font chữ in đậm (`font-weight: 700`) và bóng đổ nhẹ, không phụ thuộc vào màu sắc đơn thuần.

### Nhóm 9: Metadata, Favicon, SEO Cơ Bản & Vercel Configuration
- **Vercel Configuration (`vercel.json`):**
  ```json
  {
    "buildCommand": "npm run build",
    "outputDirectory": "dist"
  }
  ```
  Cấu hình chuẩn xác cho nền tảng Vercel Static Deployment.
- **Favicon Thương Hiệu:**
  - Đã thiết kế và tạo favicon SVG vector chuẩn nhận diện SEG301m (`#163b3c` nền teal, `#e07a5f` chấm cam, chữ `SEG` nổi bật).
  - Xuất ra đầy đủ: `web/favicon.svg`, `dist/assets/favicon.svg`, `dist/favicon.ico`, `dist/favicon.svg`.
  - Liên kết trong `<head>`: `<link rel="icon" type="image/svg+xml" href="${assetPrefix}assets/favicon.svg">`.
- **Metadata & SEO:**
  - `<meta charset="utf-8">`
  - `<meta name="viewport" content="width=device-width, initial-scale=1">`
  - `<meta name="theme-color" content="#163b3c">`
  - `<meta name="description" content="...">`
  - Đầy đủ thẻ **OpenGraph**: `og:title`, `og:description`, `og:type="website"`.
  - Đầy đủ thẻ **Twitter Card**: `twitter:card="summary"`, `twitter:title`, `twitter:description`.

### Nhóm 10: Git Diff, Cách Ly Repo Gốc & Kiểm Tra Ngôn Ngữ
- **Cách ly tuyệt đối Repo gốc:**
  - Đường dẫn: `F:/1. FPT Material/Sem5/SEG301m/Slides-LectureNote`.
  - Kết quả kiểm tra `git status`: **100% nguyên vẹn**, không có bất kỳ tệp tin nào bị chỉnh sửa hay commit.
- **Loại bỏ hoàn toàn nội dung tiếng Nhật:**
  - Đã quét toàn bộ thư mục `content/` và `dist/`: **0 ký tự tiếng Nhật sót lại**.
- **UI Tiếng Anh cũ:**
  - Toàn bộ các thành phần điều hướng, thẻ `<summary>`, nhãn tìm kiếm, nút chuyển chế độ đều đã được Việt hóa đồng bộ.

---

## 3. Tổng Hợp Các Lỗi Đã Được Khắc Phục

1. **Khôi phục 172 câu văn bị cắt xén do regex tham lam cũ:** Khôi phục trọn vẹn ngữ pháp và câu từ tiếng Việt từ commit gốc `bc6e991`, gắn đúng marker cho danh từ chuyên ngành.
2. **Xóa bỏ 82 ký tự tiếng Nhật tại Chương 08:** Dịch chuẩn xác sang tiếng Việt trong khối code mẫu và kết quả in ra của script GA4.
3. **Chuẩn hóa xung đột từ điển Recall vs Coverage:** Gán `recall` thành "độ thu hồi" (phân biệt với `coverage` - "độ bao phủ").
4. **Bổ sung từ viết tắt "CF" cho Lọc cộng tác:** Giúp tìm kiếm từ khóa viết tắt "CF" tại Chương 11 hiển thị kết quả chính xác.
5. **Đồng bộ hóa các thuật ngữ preserveEnglish:** Đặt `preserveEnglish: true` cho `ranking-svm`, `posting`, `spam`, `off-page-seo`, `on-page-seo`, `technical-seo`.
6. **Bổ sung Favicon và OpenGraph/Twitter SEO Metadata:** Đảm bảo trang web hiển thị chuyên nghiệp trên tab trình duyệt, mạng xã hội và không bị lỗi 404 `/favicon.ico`.
7. **Tạo bộ kịch bản kiểm tra tự động Pre-Deploy:** Tích hợp lệnh `check:pre-deploy` vào `package.json`.

---

## 4. Các Cảnh Báo Còn Lại (Warnings / Non-blocking Notices)

- **Kích thước Payload `termsList` JSON trong thẻ `#locale-data`:**
  - Nhúng tĩnh danh mục 344 terms vào mỗi trang HTML để phục vụ tìm kiếm glossary tức thì không phụ thuộc mạng. Kích thước thẻ script này khoảng ~49 KB.
  - Tuy nhiên, khi nén Gzip truyền qua mạng, kích thước trang trung bình chỉ còn **~25 KB**, thời gian tải dưới 50ms trên kết nối tiêu chuẩn. Đây là sự đánh đổi thiết kế hợp lý nhằm đảm bảo tính độc lập và offline-first của trang tĩnh.
- **Không có bất kỳ cảnh báo nguy hiểm hoặc lỗi runtime nào tồn đọng.**

---

## 5. Kết Luận Cuối Cùng

> ### **READY TO DEPLOY**
> 
> Website học tập **SEG301m tiếng Việt** đã hoàn toàn ổn định, vượt qua 100% các tiêu chuẩn kiểm thử kỹ thuật, trải nghiệm người dùng, tính chính xác thuật ngữ, khả năng tiếp cận và cấu hình triển khai. Kho tài liệu tham khảo gốc được bảo vệ an toàn tuyệt đối. Dự án đã sẵn sàng để tạo production deployment lên Vercel hoặc bất kỳ nền tảng lưu trữ web tĩnh nào.
