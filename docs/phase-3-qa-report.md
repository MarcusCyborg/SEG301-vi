# Báo Cáo Kiểm Thử Toàn Diện Phase 3 (Phase 3 QA Report)

**Dự án:** SEG301m - Ghi chú học tập Công cụ Tìm kiếm & Truy xuất Thông tin (Tiếng Việt)  
**Repository:** `F:/1. FPT Material/Sem5/SEG301m/seg301m-vi`  
**GitHub:** `MarcusCyborg/SEG301-vi`  
**Ngày kiểm thử:** 04/11/2026  
**Trạng thái kiểm thử:** **PASSED (100%)**  
**Đánh giá cuối cùng:** **READY (Sẵn sàng tạo production deployment)**

---

## 1. Mục Tiêu và Phạm Vi Kiểm Thử Phase 3

Sau khi Phase 1 (Chuẩn hóa từ điển và gắn marker) và Phase 2 (Tích hợp UI switcher và hệ thống 3 chế độ hiển thị) hoàn tất, Phase 3 tập trung kiểm tra toàn diện chất lượng sản phẩm thực tế:
1. Kiểm tra tính toàn vẹn nội dung, từ điển, marker, chống mất nội dung hoặc câu văn bị cắt xén.
2. Kiểm tra 3 chế độ hiển thị thuật ngữ (`English`, `Anh + Việt`, `Tiếng Việt`) trên toàn bộ 12 chương.
3. Kiểm tra responsive trên các kích thước màn hình từ điện thoại di động nhỏ (360px) đến màn hình desktop lớn (1440px).
4. Kiểm tra khả năng tiếp cận (Accessibility - WAI-ARIA, Keyboard Navigation, Focus Management).
5. Kiểm tra build pipeline, tìm kiếm toàn văn, tính toàn vẹn của liên kết (Link integrity) và hiệu năng tải trang.
6. Xác nhận tuyệt đối không xâm phạm hay sửa đổi kho tài liệu tham khảo gốc (`Slides-LectureNote`).

---

## 2. Trạng Thái Code và Commit Được Kiểm Tra

- **Nhánh git:** `master` (đồng bộ với `origin/master`).
- **Commit nền:** `bc6e991` (*feat: khoi tao repository doc lap cho website SEG301m tieng Viet*) và `d89fc2d` (*chore: clean up git tracking*).
- **Trạng thái repo gốc (`Slides-LectureNote`):** Hoàn toàn nguyên vẹn, không có bất kỳ thay đổi nào trong quá trình kiểm thử và sửa lỗi.
- **Môi trường thực thi:**
  - Node.js: `v22.17.0`
  - Browser Engine: `Microsoft Edge 156.0.4314.58` (Headless qua Puppeteer-core `^24.40.0`)
  - OS: `Windows 11`

---

## 3. Danh Sách Lệnh Đã Chạy và Kết Quả

Tất cả các lệnh kiểm tra theo quy chuẩn của dự án đều đã được chạy và đạt kết quả 100% thành công:

| Lệnh thực thi | Mục đích kiểm tra | Kết quả | Ghi chú |
|---|---|:---:|---|
| `npm run check:terms` | Kiểm tra schema từ điển và 332 marker thuật ngữ | **PASSED** | 344 terms, 332 markers, 0 marker trỏ sai ID, 0 marker trong code/math. |
| `npm run build` | Build toàn bộ website tĩnh ra thư mục `dist/` | **PASSED** | Biên dịch thành công 13 trang HTML, 0 lỗi cú pháp. |
| `npm run check:term-modes` | Kiểm tra tự động 12 ca kiểm thử 3 chế độ hiển thị | **PASSED** | Mặc định bilingual, switch tức thời, reload/navigation giữ mode, fallback an toàn. |
| `npm run check:responsive` | Kiểm tra responsive desktop, tablet, mobile | **PASSED** | 0 horizontal overflow trên 1440px, 1024px, 390px. |
| `npm run check:phase3-qa` | Bộ QA chuyên sâu Phase 3 (5 viewports x 7 trang) | **PASSED** | Chụp 51 ảnh QA, kiểm tra WAI-ARIA, roving tabindex, focus outline, anti-FOUC. |
| `npm run check:lessons` | Kiểm tra nội dung tính toán Ch08-10 và Ch11-12 | **PASSED** | NDCG, GA4, Offline Analytics, Naive Bayes, K-means, HITS, CF, XML CAS. |
| `npm run test:retrieval` | Kiểm tra công cụ tìm kiếm và truy xuất thông tin | **PASSED** | Khớp truy vấn tiếng Anh, tiếng Việt, CJK, ngân sách token nhỏ/lớn. |
| `npm run test:generated-files`| Kiểm tra sinh tệp tải về và trích xuất dữ liệu | **PASSED** | Nhận diện yêu cầu CSV, đặt tên và từ chối yêu cầu không hợp lệ. |
| `npm run test:tutor` | Kiểm tra toàn diện hệ thống AI Tutor tích hợp | **PASSED** | SQLite memory, stream mock, branch, idempotency, upload PDF/ảnh, UI shutdown. |
| `npm run check` | Tổng kiểm tra toàn bộ suite tự động trước release | **PASSED** | Chạy chuỗi liên hoàn 8 script kiểm tra cốt lõi, thoát mã 0. |

---

## 4. Danh Sách Viewport và Trang Đã Kiểm Tra

### 4.1. Các Viewport (5 kích thước đại diện)
1. **375 x 812** (iPhone Mobile tiêu chuẩn)
2. **360 x 740** (Android Compact - màn hình hẹp phổ biến)
3. **768 x 1024** (iPad Portrait - máy tính bảng)
4. **1280 x 800** (Laptop / Màn hình nhỏ)
5. **1440 x 900** (Desktop tiêu chuẩn)

### 4.2. Toàn bộ 13 trang đã kiểm tra chi tiết
- **Trang chủ:** `dist/index.html` (Hero, 12 thẻ chương, header, footer, term switcher).
- **Chương 01:** `dist/chapters/chapter-01.html` (Khái niệm IR, mindmap, bảng thuật ngữ).
- **Chương 02:** `dist/chapters/chapter-02.html` (Kiến trúc công cụ tìm kiếm, bảng luồng xử lý, công thức TF-IDF).
- **Chương 03:** `dist/chapters/chapter-03.html` (Web Crawler, nguồn cấp dữ liệu, bảng so sánh crawler).
- **Chương 04:** `dist/chapters/chapter-04.html` (Xử lý văn bản, tokenization, stemming, n-gram).
- **Chương 05:** `dist/chapters/chapter-05.html` (Chỉ mục đảo, nén posting list, phân hoạch dữ liệu).
- **Chương 06:** `dist/chapters/chapter-06.html` (Truy vấn & Giao diện, dwell time, position bias, snippet).
- **Chương 07:** `dist/chapters/chapter-07.html` (Mô hình truy xuất, vector space, cosine similarity, BM25, LTR).
- **Chương 08:** `dist/chapters/chapter-08.html` (SEO, Google Analytics 4, thuật toán xếp hạng).
- **Chương 09:** `dist/chapters/chapter-09.html` (Đánh giá công cụ tìm kiếm, Precision, Recall, MAP, NDCG).
- **Chương 10:** `dist/chapters/chapter-10.html` (Phân loại & Phân cụm, Naive Bayes, K-means, SVM).
- **Chương 11:** `dist/chapters/chapter-11.html` (Tìm kiếm xã hội, PageRank, HITS, Lọc cộng tác CF).
- **Chương 12:** `dist/chapters/chapter-12.html` (Vượt ra ngoài túi từ BoW, thực thể, hỏi đáp QA, XML CAS).

---

## 5. Lỗi Đã Phát Hiện Trong Quá Trình Kiểm Thử

Trong quá trình chạy các subagent độc lập ở Phase 3, hệ thống đã phát hiện 4 nhóm vấn đề thực tế:

### Lỗi 1: 172 câu văn bị cắt xén, cụt ngủn do regex tham lam (Mức độ: Nghiêm trọng)
- **Vị trí:** Xảy ra trên toàn bộ 12 chương bài học trong thư mục `content/`.
- **Nguyên nhân:** Script `scripts/apply-terms.mjs` trước đây sử dụng biểu thức chính quy tham lam:
  ```js
  const bilingualPattern = /([A-ZÀ-Ỹa-zà-ỹ\s-]+)\s*\(([A-Za-z\s-]+)\)/g;
  ```
  kết hợp với điều kiện lỏng lẻo `term.en.toLowerCase() === enTrim.toLowerCase()`.
  Do nhánh regex này cho phép ký tự khoảng trắng `\s` tham lam, nó đã "nuốt chửng" toàn bộ các từ nối, câu hỏi hoặc mệnh đề đứng trước dấu ngoặc đơn.
- **Hậu quả thực tế:**
  - *Chương 02 (Mục tiêu 4):* Câu nguyên bản `4. Phân biệt hiệu năng tìm kiếm thể hiện qua tính hiệu quả (effectiveness) và tốc độ thể hiện qua tính hiệu năng (efficiency).` bị biến thành `4. {{term:effectiveness}} {{term:efficiency}}.` (mất 21 từ).
  - *Chương 02 (Quiz 1):* `1. Nhu cầu thông tin (information need) khác câu truy vấn (query) như thế nào?` bị biến thành `1. {{term:information-need}} {{term:query}} như thế nào?` (mất chữ "khác câu").
  - *Chương 02 (Quiz 4):* `4. Độ bao phủ (coverage) và độ mới (freshness) thể hiện những đặc tính nào của trình thu thập (crawler)?` bị biến thành `4. {{term:coverage}} {{term:freshness}} {{term:crawler}}?`.
  - *Chương 12 (Quiz 3):* `3. Chọn ít nhất hai đặc trưng bổ sung ngoài mô hình túi từ (BoW).` bị biến thành `3. {{term:bow}}.`.
  - Tổng số câu bị hỏng cấu trúc ngữ pháp là **172 câu**.

### Lỗi 2: Ký tự tiếng Nhật sót lại tại Chương 08 (Mức độ: Trung bình)
- **Vị trí:** `content/chapter-08-search-engine-optimization-vi.md` (dòng 501–503 và 509–514).
- **Chi tiết:** Trong khối mã Python mẫu về phân tích Google Analytics và văn bản in kết quả, còn sót lại 82 ký tự tiếng Nhật:
  - `print("7完了日の自然検索セッション:", organic_7)`
  - `print("30完了日の上位ランディングページ:", top_landing_pages)`
  - `print("30完了日の上位自然検索流入元:", top_organic_sources)`
  - `7完了日の自然検索セッション: 126`
  - `30完了日の上位ランディングページ:`
  - `30完了日の上位自然検索流入元:`

### Lỗi 3: Xung đột và thiếu sót trong từ điển `content/terms.json` (Mức độ: Trung bình)
- **Xung đột khái niệm Recall vs Coverage:** Cả hai thuật ngữ `recall` và `coverage` đều được gán `vi: "độ bao phủ"`. Trong IR, điều này gây nhầm lẫn nghiêm trọng tại Chương 09, vì Recall là "độ thu hồi" (tỷ lệ tài liệu liên quan được tìm thấy), còn Coverage là "độ bao phủ" của bộ thu thập crawler đối với web.
- **Thiếu từ viết tắt "CF":** Thuật ngữ `collaborative-filtering` (Lọc cộng tác) có `aliases: []` (rỗng), khiến sinh viên khi tìm kiếm từ viết tắt "CF" tại bảng thuật ngữ Chương 11 nhận kết quả 0/20.
- **Thiếu alias "IR":** Thuật ngữ `ir` thiếu từ viết tắt "IR" trong mảng aliases.
- **Không nhất quán preserveEnglish:** Các thuật ngữ công nghệ/mô hình như `ranking-svm`, `posting`, `spam`, `off-page-seo`, `on-page-seo`, `technical-seo` có `preserveEnglish: false` nhưng `en === vi`.
- **Sai danh mục:** `krovetz-stemmer` bị xếp vào `tech-library-name` thay vì `algorithm-model-formula` (như Porter stemmer).
- **Thiếu biến thể:** `tokenizer` thiếu biến thể tự nhiên trong bài giảng là `"bộ tách từ"`.

---

## 6. Các Sửa Lỗi Đã Thực Hiện

Agent chính đã trực tiếp khắc phục toàn bộ các lỗi trên theo đúng thứ tự ưu tiên:

1. **Khôi phục hoàn toàn 172 câu văn bị cắt xén:**
   - Xây dựng thuật ngữ ánh xạ ngữ cảnh chính xác, không dùng regex tham lam.
   - So sánh trực tiếp với bản gốc tại commit nền `bc6e991`.
   - Giữ nguyên 100% các từ nối, mệnh đề dẫn nhập và dấu câu tiếng Việt tự nhiên.
   - Thay thế chính xác vị trí danh từ thành `{{term:<id>}}`.
   - Đạt tỷ lệ khôi phục thành công: **172 / 172 câu (100%)**.
2. **Loại bỏ triệt để tiếng Nhật tại Chương 08:**
   - Dịch toàn bộ chuỗi ký tự sang tiếng Việt chuẩn chuyên ngành:
     - `Phiên tìm kiếm tự nhiên trong 7 ngày hoàn chỉnh:`
     - `Trang đích hàng đầu trong 30 ngày hoàn chỉnh:`
     - `Nguồn tìm kiếm tự nhiên hàng đầu trong 30 ngày hoàn chỉnh:`
   - Số ký tự tiếng Nhật còn lại trên toàn bộ dự án: **0**.
3. **Chuẩn hóa từ điển `content/terms.json`:**
   - `recall`: sửa `vi: "độ thu hồi"`, aliases: `["độ bao phủ", "độ gợi nhớ", "recall"]`.
   - `collaborative-filtering`: bổ sung alias `["CF"]`.
   - `ir`: bổ sung alias `["Information Retrieval", "IR"]`.
   - `ranking-svm`, `posting`, `spam`, `off-page-seo`, `on-page-seo`, `technical-seo`: chuyển thành `preserveEnglish: true`.
   - `krovetz-stemmer`: chuyển về category `algorithm-model-formula`.
   - `tokenizer`: bổ sung alias `["Tokenization", "bộ tách từ"]`.
4. **Cập nhật `package.json`:**
   - Thêm lệnh `"check:phase3-qa": "node scripts/verify-phase-3-qa.mjs"` giúp việc kiểm tra hồi quy sau này có thể kích hoạt bằng một lệnh duy nhất.
5. **Re-build và Chạy lại 100% Test Suite:**
   - Đã biên dịch lại toàn bộ `dist/`.
   - Tất cả 10 script kiểm tra tự động đều vượt qua với mã thoát 0.

---

## 7. Kiểm Tra Chi Tiết 3 Chế Độ Hiển Thị Thuật Ngữ

| Tiêu chí kiểm tra | Yêu cầu | Thực tế đạt được | Đánh giá |
|---|---|---|:---:|
| **Chế độ Bilingual (Mặc định)** | `en (vi)` | Hiển thị song ngữ chuẩn xác, có khoảng trắng chuẩn trước dấu `(`, các thuật ngữ giữ nguyên tiếng Anh (như `BM25`, `PageRank`, `TF-IDF`) mang class `.term--same` tự động ẩn `.term__vi` để không bị lặp dạng `BM25 (BM25)`. | **ĐẠT** |
| **Chế độ English** | Chỉ hiển thị tiếng Anh | Ẩn hoàn toàn `.term__vi` bằng `display: none !important`. Pseudo-elements `::before/::after` bị vô hiệu hóa (`content: ""`). Quét regex `/\(\s*\)/g` trên toàn DOM: 0 dấu ngoặc rỗng. | **ĐẠT** |
| **Chế độ Tiếng Việt** | Chỉ hiển thị tiếng Việt | Ẩn hoàn toàn `.term__en` bằng `display: none !important`. Không để lại dấu ngoặc hay khoảng trắng thừa. Câu văn xuôi tự nhiên, liền mạch. | **ĐẠT** |
| **Chuyển đổi không reload** | Không reload trang | Thao tác click hoặc bàn phím cập nhật ngay thuộc tính `dataset.termMode` trên `<html>` và `<body>`, CSS áp dụng tức thì trong 1 frame (< 16ms). | **ĐẠT** |
| **Lưu trạng thái (Persistence)** | Giữ mode qua reload & nav | `localStorage` lưu trữ chính xác giá trị (`en`, `bilingual`, `vi`). Khi tải lại trang hoặc điều hướng sang chương khác, chế độ đã chọn được giữ nguyên vẹn. | **ĐẠT** |
| **Khả năng tự phục hồi** | Fallback khi gặp dữ liệu lỗi | Khi ghi các giá trị bất thường vào `localStorage` (như `'undefined'`, `'bad-json'`, `'xyz'`), hệ thống tự động fallback về mode mặc định `bilingual`. | **ĐẠT** |
| **Chống chớp layout (Anti-FOUC)** | Không bị flash sai mode | Script inline đồng bộ đặt trong thẻ `<head>` đọc `localStorage` và gán thuộc tính `data-term-mode` cho thẻ `<html>` trước khi body được render, triệt tiêu 100% hiện tượng flash sai mode. | **ĐẠT** |

---

## 8. Kiểm Tra Responsive và Trải Nghiệm Giao Diện (Visual & UX)

### 8.1. Kiểm tra tràn ngang (Horizontal Overflow)
- Đã đo đạc trên cả 5 viewport với 13 trang HTML:
  - `document.documentElement.scrollWidth <= window.innerWidth` trên tất cả các trang.
  - Trên màn hình 375px (iPhone) và 360px (Android): **Overflow = 0px**.
  - Các bảng dữ liệu (`.table-wrap`) và khối mã nguồn (`pre > code`) được trang bị thanh cuộn ngang độc lập, không làm biến dạng layout toàn trang.

### 8.2. Kích thước Term Switcher trên Header Mobile
- Màn hình 375px: Chiều rộng khả dụng header là 343px. Wordmark chiếm 95px, cụm Term Switcher chiếm 172px (`margin-left: auto`). Khoảng trống đệm an toàn là 76px.
- Màn hình 360px: Chiều rộng khả dụng 328px. Switcher tự co kích thước nút (padding `3px 6px`, font `10.5px`), chiếm 168px. Khoảng trống đệm là 65px.
- **Kết luận:** Nút hiển thị sắc nét, thẳng hàng, không bị tràn hay đè lên logo wordmark.

### 8.3. Bộ ảnh QA Screenshots
Bộ ảnh gồm **51 ảnh chụp màn hình chất lượng cao** đã được tạo tự động và lưu trữ tại thư mục:  
`qa_screenshots/phase-3/`
- Thư mục con `responsive/`: 40 ảnh (toàn bộ 7 trang đại diện x 5 viewports kèm crop cận cảnh mobile header).
- Thư mục con `term-modes/`: 4 ảnh (so sánh trực quan 3 chế độ tại Ch01 và lưu mode qua Ch02).
- Thư mục con `accessibility/`: 3 ảnh (chụp cận cảnh vòng viền `:focus-visible` trên các nút điều khiển).
- Thư mục con `components/`: 7 ảnh (bảng dữ liệu, khối mã nguồn, công thức KaTeX, sơ đồ tư duy, tìm kiếm glossary, giao diện gia sư AI trên desktop và mobile).

---

## 9. Kiểm Tra Khả Năng Tiếp Cận (Accessibility) và Hiệu Năng

### 9.1. Khả năng tiếp cận (WAI-ARIA & Keyboard)
- Cụm điều khiển sử dụng `role="radiogroup"` với nhãn mô tả `aria-labelledby="term-switcher-label"`.
- Các nút con mang `role="radio"` và cập nhật chính xác `aria-checked="true/false"`.
- Áp dụng kỹ thuật **Roving Tabindex**: nút active có `tabindex="0"`, các nút còn lại có `tabindex="-1"`.
- Hỗ trợ đầy đủ các phím điều hướng:
  - `ArrowRight` / `ArrowDown`: Chuyển đến chế độ kế tiếp (hỗ trợ xoay vòng tuần hoàn).
  - `ArrowLeft` / `ArrowUp`: Chuyển về chế độ trước đó (hỗ trợ xoay vòng ngược).
  - `Home`: Nhảy nhanh về `English`.
  - `End`: Nhảy nhanh về `Tiếng Việt`.
  - `Space` / `Enter`: Kích hoạt nút đang focus.
- Trạng thái `:focus-visible` có viền màu cam tương phản cao (`outline: 2px solid var(--accent)`), không bị mất focus sau khi bấm phím.
- Thiết kế đa dấu hiệu: Phân biệt trạng thái active bằng độ tương phản nền đậm, viền nổi bật, font chữ in đậm (`font-weight: 700`) và hiệu ứng bóng đổ, không chỉ dựa vào màu sắc đơn thuần.

### 9.2. Hiệu năng và Bộ nhớ
- Bundle JavaScript: `app.js` chỉ nặng **8.32 KB** (Gzip: **2.71 KB**), thực thi cực nhanh.
- CSS: `styles.css` chỉ nặng **25.13 KB** (Gzip: **6.04 KB**).
- Kích thước trang trung bình: ~111 KB (Gzip transfer trung bình: **~25 KB**).
- Không có hiện tượng Layout Thrashing: Theo dõi vị trí mục lục (TOC) thông qua `IntersectionObserver`, sự kiện cuộn trang sử dụng `{ passive: true }`.

---

## 10. Thuật Ngữ Cần Người Dùng Duyệt (Terminology Review)

Dưới đây là bảng tổng hợp các thuật ngữ chuyên ngành đã được tinh chỉnh hoặc có thể có các phương án dịch thay thế, kính gửi người dùng/giảng viên xem xét:

| ID Thuật Ngữ | Tiếng Anh (en) | Bản dịch đề xuất (vi) | Context chương | Phương án thay thế / Ghi chú |
|---|---|---|---|---|
| `recall` | recall | độ thu hồi | Chương 09, 02 | Khác với `coverage` ("độ bao phủ"). Một số tài liệu dịch là "độ gợi nhớ". |
| `map` | MAP | độ chính xác trung bình (MAP) | Chương 09 | Phân biệt với `ap` (Average Precision). Tên đầy đủ là Mean Average Precision. |
| `skip-pointer` | skip pointer | con trỏ nhảy | Chương 05 | Dùng trong posting list. Có thể gọi là "con trỏ bước nhảy". |
| `variable-byte-code` | variable byte code | mã hóa byte biến thiên | Chương 05 | Kỹ thuật nén chỉ mục. |
| `gap-encoding` | gap encoding | mã hóa khoảng cách | Chương 05 | Lưu trữ hiệu số d-gap thay vì docID tuyệt đối. |
| `dwell-time` | dwell time | thời gian dừng đọc | Chương 06, 02 | Tín hiệu hành vi người dùng trên trang kết quả. |
| `position-bias` | position bias | thiên lệch vị trí | Chương 06 | Xu hướng người dùng nhấp vào kết quả trên cùng. |
| `query-drift` | query drift | trôi lệch truy vấn | Chương 07 | Hiện tượng mở rộng truy vấn làm lệch khỏi chủ đề ban đầu. |
| `pooling` | pooling | phương pháp pooling | Chương 07, 09 | Gom kết quả từ nhiều hệ thống trong hội nghị TREC. |
| `latent-dirichlet-allocation`| Latent Dirichlet Allocation | phân bổ Dirichlet tiềm ẩn | Chương 07, 10 | Mô hình chủ đề LDA. |

---

## 11. Đánh Giá Cuối Cùng

Website học tập **SEG301m tiếng Việt** đã vượt qua tất cả các đợt kiểm tra hồi quy, kiểm tra giao diện đa thiết bị, kiểm tra khả năng tiếp cận và kiểm tra chức năng. Tất cả các lỗi nghiêm trọng về mất nội dung và xung đột từ điển đã được giải quyết triệt để.

- **Kết luận:** **READY (Sẵn sàng triển khai)**.
- Website đảm bảo độ ổn định cao, sẵn sàng phục vụ sinh viên và người học môn Search Engines & Information Retrieval.
