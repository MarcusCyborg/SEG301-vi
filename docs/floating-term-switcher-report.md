# Báo cáo Kiểm thử & Triển khai Floating Term Switcher

**Dự án:** SEG301m Vietnamese Study Notes & Search Engine Platform  
**Kho mã nguồn:** `F:\1. FPT Material\Sem5\SEG301m\seg301m-vi`  
**Ngày thực hiện:** 04/11/2026  
**Trạng thái kiểm định:** **READY**

---

## 1. Mục tiêu & Phạm vi triển khai

1. **Vị trí cố định (Floating Fixed Right):** Chuyển cụm điều khiển chế độ hiển thị thuật ngữ (`.term-switcher`) ra ngoài `.site-header`, gắn cố định ở cạnh phải màn hình (`position: fixed`), luôn nhìn thấy khi người dùng cuộn nội dung ở bất kỳ chương nào hay trang chủ.
2. **Desktop & Tablet (> 720px):** Hiển thị trực tiếp thanh điều khiển dạng cột gọn gàng với nhãn "THUẬT NGỮ" và 3 nút chế độ: `EN`, `EN+VI`, `VI`.
3. **Mobile (<= 720px):** Thu gọn thành nút toggle có biểu tượng `Aa` và nhãn chế độ hiện tại (`EN+VI`, `EN`, `VI`). Khi chạm vào nút toggle, panel mở ra phía bên trái nút toggle, căn chỉnh an toàn không bao giờ tràn màn hình ngay cả ở viewport hẹp 320px.
4. **Tương tác & Khả năng tiếp cận (A11y):**
   - Hỗ trợ đóng mở bằng click/touch, phím Escape, click bên ngoài.
   - Khi panel đóng trên mobile, các nút radio bên trong được loại bỏ hoàn toàn khỏi tab order (`tabIndex = -1`).
   - Giữ nguyên các vai trò chuẩn WAI-ARIA: `role="group"`, `role="radiogroup"`, `role="radio"`, `aria-checked`, `aria-expanded`, `aria-controls`.
   - Phân biệt trạng thái kích hoạt bằng đa giác quan: màu nền tương phản cao, chữ đậm 700, viền đậm và dải màu chỉ thị `var(--accent)`.
   - Giữ nguyên logic persistence: lưu `localStorage['seg301m-term-mode']`, đồng bộ giữa reload, chuyển chương và qua các tab.
5. **Tương thích với Tutor AI:**
   - Khi Tutor AI mở toàn màn hình (`body.tutor-full`), term switcher tự động ẩn hoàn toàn (`opacity: 0; pointer-events: none;`).
   - Khi Tutor AI mở dạng ngăn kéo bên phải trên desktop (`body.tutor-open`), term switcher dịch chuyển sang trái theo độ rộng panel của Tutor (`calc(var(--tutor-panel-width, 480px) + max(12px, env(safe-area-inset-right)))`), đảm bảo không bị Tutor che lấp.
   - Trên mobile/tablet (<= 900px), khi Tutor mở, term switcher tự ẩn để nhường toàn bộ không gian cho Tutor.

---

## 2. Các file đã thay đổi

| File | Thay đổi chính |
| :--- | :--- |
| `scripts/build.mjs` | Đưa markup `.term-switcher` ra ngoài `.site-header` trên cả trang chủ (`index.html`) và 12 trang bài học (`chapters/chapter-*.html`). Bổ sung `.term-switcher__toggle` (gồm icon `Aa` và nhãn chế độ hiện tại `EN+VI`) cùng `#term-switcher-panel`. |
| `web/styles.css` | Thiết lập CSS `position: fixed; z-index: 60; right: max(12px, env(safe-area-inset-right)); top: 50%; transform: translateY(-50%);`. Bố cục panel desktop gọn gàng dạng cột. Thiết lập giao diện toggle và panel popover bên trái cho mobile (`<= 720px`). Xử lý an toàn khi Tutor mở (`body.tutor-open`, `body.tutor-full`). Tối ưu touch target tối thiểu 44px và `:focus-visible`. |
| `web/app.js` | Thêm logic điều khiển toggle: đóng/mở panel, cập nhật `aria-expanded`, cập nhật `is-open`, quản lý focus và roving tabindex (loại bỏ radio khỏi tab order khi panel đóng). Cập nhật nhãn toggle (`EN`, `EN+VI`, `VI`) khi chọn mode. Hỗ trợ phím Escape và click ngoài để đóng. Tự động đóng panel sau khi chọn mode trên mobile. |
| `package.json` | Thêm lệnh `check:floating-switcher` vào bộ script kiểm thử tự động. |
| `scripts/verify-floating-term-switcher.mjs` | Bộ kiểm thử tự động chuyên sâu mới gồm 9 test case bao phủ toàn bộ yêu cầu hành vi của floating term switcher. |
| `dist/` | Toàn bộ 13 file HTML (`index.html` + 12 chapters), `styles.css`, và `app.js` được biên dịch lại tự động qua `npm run build`. |

---

## 3. Chi tiết hành vi theo thiết bị & Viewport

### 3.1. Desktop & Tablet (> 720px)
- **Vị trí:** Cạnh phải viewport, căn giữa theo chiều dọc (`top: 50%; transform: translateY(-50%)`).
- **Khoảng cách lề:** `right: max(12px, env(safe-area-inset-right, 0px))`.
- **Hành vi cuộn:** `position: fixed` đảm bảo khi cuộn trang từ đầu đến cuối bài giảng, cụm điều khiển luôn giữ nguyên tọa độ trên màn hình.
- **Hiển thị:** Panel nổi trực tiếp với nền kính mờ (`background: rgba(250, 247, 240, .96); backdrop-filter: blur(8px);`), viền tinh tế `#b8c5bf`, đổ bóng nhẹ. Nút toggle được ẩn (`display: none`).
- **Touch target:** Mỗi nút radio (`EN`, `EN+VI`, `VI`) có kích thước tối thiểu đạt chuẩn 50x44px.
- **Bàn phím:** Roving tabindex (chế độ đang chọn nhận `tabIndex = 0`, 2 chế độ còn lại nhận `tabIndex = -1`). Phím `ArrowRight`/`ArrowDown`/`ArrowLeft`/`ArrowUp` chuyển đổi xoay vòng mượt mà; phím `Home`/`End` nhảy về đầu/cuối danh sách.

### 3.2. Mobile (<= 720px)
- **Nút Toggle:** Thu gọn thành nút bấm tròn bo góc 12px với kích thước đạt chuẩn tối thiểu 44x44px, hiển thị biểu tượng `Aa` màu cam ấm (`#f4ae87`) và mã chế độ hiện tại (`EN+VI`, `EN`, hoặc `VI`).
- **Trạng thái mặc định:** Panel thuật ngữ đóng (`display: none`), không chiếm không gian và các nút radio bên trong có `tabIndex = -1` để không gây cản trở phím Tab.
- **Mở Panel:** Chạm vào toggle sẽ mở panel sang **phía bên trái** nút toggle (`right: calc(100% + 8px)`), `aria-expanded` chuyển thành `"true"`, class `is-open` được kích hoạt, đồng thời focus tự động chuyển vào nút radio của chế độ đang kích hoạt.
- **Đóng Panel:**
  1. Chạm lại vào nút toggle.
  2. Bấm phím Escape (focus tự động hoàn trả về nút toggle).
  3. Bấm hoặc chạm vào bất kỳ điểm nào bên ngoài cụm switcher.
  4. Chọn một chế độ thuật ngữ mới (tự động lưu và đóng panel, hoàn trả focus về toggle).
- **Kiểm tra Viewport hẹp (320px, 360px, 390px):**
  - Tại 320px: Panel mở về bên trái tại tọa độ `left = 190px`, cách lề trái màn hình tới 190px, tuyệt đối không bị cấn hay tạo horizontal overflow (`scrollWidth <= clientWidth`).

### 3.3. Tương thích với Tutor AI
- **Tutor Panel (Desktop):** Khi người dùng mở Tutor AI dạng panel 480px, body nhận class `.tutor-open`. Switcher tự động chuyển dịch sang trái một khoảng `calc(var(--tutor-panel-width, 480px) + max(12px, env(safe-area-inset-right)))` (tức cách lề phải 492px), hoàn toàn không bị bảng điều khiển Tutor che khuất.
- **Tutor Fullscreen (Toàn màn hình):** Khi phóng to Tutor, body nhận class `.tutor-full`. Switcher có `opacity: 0; visibility: hidden; pointer-events: none;`, không nổi đè lên giao diện Tutor.
- **Tutor trên Mobile/Tablet (<= 900px):** Do Tutor chiếm toàn bộ chiều ngang màn hình, switcher tự động ẩn để tránh che giao diện chat.

---

## 4. Kết quả kiểm thử tự động

Tất cả các suite kiểm thử tự động đã được thực thi với trình duyệt Microsoft Edge (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`) qua `puppeteer-core`:

### 4.1. Suite chuyên biệt Floating Term Switcher (`npm run check:floating-switcher`)
- **Test 1:** Desktop fixed position, viewport bounds, scroll invariance, direct panel display: **PASS**
- **Test 2:** Mobile (390px, 360px, 320px) default state (toggle visible, panel closed, tabIndex=-1): **PASS**
- **Test 3:** Mobile toggle click opens panel with `aria-expanded="true"` and focuses active radio: **PASS**
- **Test 4:** Escape closes mobile panel and returns focus to toggle: **PASS**
- **Test 5:** Click outside cleanly closes mobile panel: **PASS**
- **Test 6:** Mode selection updates toggle label, localStorage, and auto-closes on mobile: **PASS**
- **Test 7:** Zero horizontal overflow across 320px, 390px, 768px, 1024px, 1440px (both closed and open): **PASS**
- **Test 8:** Tutor integration (desktop side-panel shift, full-screen hide, mobile/tablet hide): **PASS**
- **Test 9:** Exactly 1 `.term-switcher` and 0 duplicate IDs across `index.html` and all 12 chapters: **PASS**

### 4.2. Bộ kiểm tra chế độ thuật ngữ (`npm run check:term-modes`)
- **Case 1:** Default mode is bilingual with both EN and VI visible: **PASS**
- **Case 2:** Switch to en hides VI and shows EN: **PASS**
- **Case 3:** Switch to vi hides EN and shows VI: **PASS**
- **Case 4:** Switch back to bilingual shows both EN and VI: **PASS**
- **Case 5:** Reload preserves selected mode: **PASS**
- **Case 6:** Navigation between chapters preserves selected mode: **PASS**
- **Case 7:** Invalid localStorage value falls back to bilingual: **PASS**
- **Case 8:** Home page (without terms) operates cleanly with zero console errors: **PASS**
- **Case 9:** Code blocks across all chapters are pristine and free of `.term` spans: **PASS**
- **Case 10:** Links and URLs across all chapters are well-formed and undamaged: **PASS**
- **Case 11:** Glossary search by EN, VI, alias, and acronym filters correctly in all modes: **PASS**
- **Case 12:** Responsive layout validated on mobile viewports (390x844 and 360x740) without overflow: **PASS**

### 4.3. Bộ kiểm tra giao diện Responsive (`npm run check:responsive`)
- Kiểm tra không tràn màn hình ngang (horizontal overflow) trên Desktop (1440x900), Tablet (1024x768), Mobile (390x844): **PASS**

### 4.4. Bộ kiểm tra Pre-deploy Release Review Suite (`npm run check:pre-deploy`)
- **[1/10]** Verifying Build Pipeline & Determinism: **PASS**
- **[2/10]** Checking Terminology & Contextual Safety across 13 HTML pages: **PASS**
- **[3/10]** Verifying Metadata, Favicon, SEO & Vercel Configuration: **PASS**
- **[4/10]** Verifying Reference Repo Isolation & Language Cleanliness: **PASS**
- **[5/10]** Starting Local Server (Static + Tutor API): **PASS**
- **[6/10]** Launching Headless Microsoft Edge Browser: **PASS**
- **[7/10]** Browsing all 13 pages to detect runtime errors, 404s, or broken assets: **PASS**
- **[8/10]** Testing Three Term Display Modes, Persistence, and Storage Fallback: **PASS**
- **[9/10]** Testing Glossary Search by EN, VI, Alias, and Acronym in various modes: **PASS**
- **[10/10]** Verifying Responsive Layout (5 Viewports) and Accessibility: **PASS**

### 4.5. Bộ kiểm tra Tutor Integration (`npm run test:tutor`)
- Projects, 200k text limits, CSV download, mock stream, branch, idempotency, upload, export, backup/restore, recovery: **PASS**

### 4.6. Bộ kiểm tra tổng hợp (`npm run check`)
- `check:terms` + `check-build` + `verify-chapters-08-10` + `verify-chapters-11-12` + `test-retrieval` + `test-generated-files` + `verify-responsive` + `verify-term-modes`: **ALL PASS**

---

## 5. Môi trường kiểm thử

- **Hệ điều hành:** Windows 11
- **Node.js:** v22.17.0
- **Trình duyệt kiểm thử:** Microsoft Edge (Chromium engine) tại `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
- **Thư viện điều khiển:** `puppeteer-core@24.40.0`
- **Lỗi môi trường phát hiện:** Không có (Edge khả dụng và hoạt động ổn định trong toàn bộ các phiên test).

---

## 6. Kết luận

**ĐÁNH GIÁ CHUNG: READY (SẴN SÀNG TRIỂN KHAI)**

- Nút chuyển chế độ thuật ngữ đã được cố định bên phải màn hình một cách chuẩn xác, thanh thoát và không che nội dung.
- Hoạt động mượt mà trên toàn bộ các kích thước màn hình từ 320px đến 1440px.
- Đáp ứng đầy đủ các tiêu chuẩn tiếp cận WAI-ARIA, phím tắt và khả năng tương thích cao với Tutor AI.
- Không phát sinh bất kỳ lỗi console hay xung đột ID nào trên cả 13 trang tĩnh.
