# Kế hoạch bổ sung thuật ngữ và chế độ hiển thị

## Bối cảnh

- Repo đích đã tồn tại tại `F:/1. FPT Material/Sem5/SEG301m/seg301m-vi`.
- GitHub: `MarcusCyborg/SEG301-vi`.
- Repo gốc `Slides-LectureNote` chỉ được dùng làm tài liệu tham khảo; không sửa, không commit và không đẩy thay đổi vào repo gốc.
- Website hiện tại là bản tiếng Việt. Không cần tạo lại website.
- Mục tiêu là bổ sung lại thuật ngữ tiếng Anh bị lược giản và cho phép người đọc chọn cách hiển thị thuật ngữ.

## Phạm vi tính năng

Mỗi thuật ngữ cần hỗ trợ ba chế độ:

1. `English`: `information retrieval`
2. `English + Vietnamese`: `information retrieval (truy xuất thông tin)`
3. `Tiếng Việt`: `truy xuất thông tin`

Đây là chế độ hiển thị thuật ngữ, không phải language switcher. Phần giải thích, navigation và UI chính vẫn là tiếng Việt.

## Phân chia phase

### Phase 1: Kiểm kê, chuẩn hóa và gắn thuật ngữ

Kết quả cần có:

- Danh mục thuật ngữ chuẩn cho toàn bộ các chương.
- Bản dịch tiếng Việt đã được rà soát.
- Quy tắc viết hoa, số ít/số nhiều, acronym và tên riêng.
- Nội dung Markdown được gắn marker hoặc metadata cho thuật ngữ.
- Báo cáo các thuật ngữ chưa chắc chắn cần người duyệt.

Không được dùng find/replace chuỗi đơn giản trên toàn bộ file vì có thể làm hỏng code block, URL, công thức và tên file.

Đề xuất dữ liệu:

```json
{
  "id": "information-retrieval",
  "en": "information retrieval",
  "vi": "truy xuất thông tin",
  "aliases": ["IR"],
  "category": "core-concept",
  "preserveEnglish": false
}
```

Đề xuất marker trong Markdown:

```text
{{term:information-retrieval}}
```

Các thuật ngữ trong code block, URL, công thức và tên file phải được bỏ qua, trừ khi có chủ ý đánh dấu riêng.

### Phase 2: Build và UI

- Build marker thành HTML có cả hai bản `en` và `vi`.
- Thêm mode `en`, `bilingual`, `vi`.
- Thêm segmented control hoặc button group.
- Mặc định là `bilingual`.
- Lưu lựa chọn bằng `localStorage`.
- Giữ lựa chọn khi chuyển chương hoặc reload.
- Tìm kiếm nhận diện được cả English, Vietnamese và aliases.
- Hỗ trợ keyboard và accessibility.

### Phase 3: Kiểm thử và rà soát

- Validate dictionary và marker.
- Build toàn bộ website.
- Kiểm tra các chương có bảng, công thức, code block, mindmap và Tutor.
- Kiểm tra desktop, tablet và mobile.
- Rà soát các thuật ngữ học thuật còn thiếu.

## Cách dùng subagent

Có thể dùng tối đa bốn subagent:

- Agent A: đọc toàn bộ nội dung, lập inventory thuật ngữ; chỉ tạo báo cáo.
- Agent B: chuẩn hóa dictionary và nội dung Markdown.
- Agent C: sửa build pipeline, schema và validation.
- Agent D: sửa UI, CSS, state và accessibility.

Mỗi agent phải có ownership rõ ràng, không tự ý sửa file ngoài phạm vi. Agent chính chịu trách nhiệm tích hợp, giải quyết conflict và chạy kiểm thử cuối.

## Tiêu chí hoàn thành Phase 1

- Có dictionary thuật ngữ dùng chung.
- Mỗi thuật ngữ có bản English và Vietnamese, trừ thuật ngữ được đánh dấu giữ nguyên.
- Không có marker trỏ tới ID không tồn tại.
- Không có marker sai trong code block hoặc URL.
- Các chương đã được rà soát theo cùng một quy chuẩn.
- Có báo cáo thuật ngữ mơ hồ hoặc cần người duyệt.
- Không có thay đổi nào trong repo gốc.

## Lệnh kiểm tra dự kiến

```bash
npm run check:terms
npm run build
npm run check
npm run test:tutor
```

## Prompt thực thi Phase 1

```text
Bạn đang làm việc trong repo đã tồn tại:
F:/1. FPT Material/Sem5/SEG301m/seg301m-vi

GitHub repo:
MarcusCyborg/SEG301-vi

Website đã được tạo sẵn. Không tạo lại website và không sửa repo gốc:
F:/1. FPT Material/Sem5/SEG301m/Slides-LectureNote

Mục tiêu của Phase 1 là rà soát, bổ sung và chuẩn hóa thuật ngữ tiếng Anh cho toàn bộ nội dung tiếng Việt. Phase này chưa cần làm nút chuyển chế độ hiển thị nếu việc đó chưa cần thiết để chuẩn bị dữ liệu.

Yêu cầu:

1. Đọc cấu trúc repo hiện tại và xác định toàn bộ file Markdown, catalog chương, build script và các file có nội dung bài học.
2. Đọc toàn bộ các chương hiện có, không chỉ chương 1.
3. Lập inventory thuật ngữ theo các nhóm:
   - khái niệm nền tảng;
   - Information Retrieval;
   - web search;
   - indexing, ranking và evaluation;
   - thuật toán, mô hình và công thức;
   - acronym;
   - công nghệ, thư viện và tên riêng.
4. Tạo dictionary dùng chung, ưu tiên file:
   content/terms.json

Mỗi record tối thiểu có:
   - id;
   - en;
   - vi;
   - aliases;
   - category;
   - preserveEnglish.

Ví dụ:
{
  "id": "information-retrieval",
  "en": "information retrieval",
  "vi": "truy xuất thông tin",
  "aliases": ["IR"],
  "category": "core-concept",
  "preserveEnglish": false
}

5. Chuẩn hóa thuật ngữ:
   - Dùng information retrieval cho khái niệm chung, không tự ý dùng information retrievals.
   - Giữ nguyên BM25, PageRank, HITS, K-means, TF-IDF, Lucene, Elasticsearch và tên riêng tương tự khi cần.
   - Không dịch cưỡng ép acronym, tên thuật toán hoặc tên sản phẩm.
   - Không thay đổi nội dung code block, URL, công thức, tên file hoặc đường dẫn.
   - Ghi lại những trường hợp chưa chắc chắn để người dùng duyệt.

6. Gắn thuật ngữ vào nội dung bằng marker hoặc cơ chế AST an toàn, ví dụ:
   {{term:information-retrieval}}

Không dùng find/replace chuỗi đơn giản trên toàn bộ file. Không gắn marker vào code block, URL, công thức hoặc nội dung không phải thuật ngữ.

7. Tạo file quy chuẩn:
   docs/terminology-guidelines.md

File này cần ghi rõ cách viết hoa, số ít/số nhiều, acronym, tên riêng, alias và quy tắc xử lý thuật ngữ chỉ có một ngôn ngữ.

8. Tạo hoặc cập nhật validation cho dữ liệu thuật ngữ. Cần phát hiện:
   - ID bị trùng;
   - en hoặc vi bị rỗng;
   - marker trỏ tới ID không tồn tại;
   - marker nằm trong vùng không được phép;
   - thuật ngữ có cách viết không nhất quán.

9. Nếu repo có hệ thống test/check hiện tại, cập nhật để kiểm tra dictionary và marker. Có thể thêm lệnh:
   npm run check:terms

10. Không làm các việc sau trong Phase 1 nếu chưa cần:
   - không viết lại toàn bộ website;
   - không thêm language switcher;
   - không xóa nội dung cần thiết;
   - không sửa repo gốc;
   - không tự động dịch mù toàn bộ văn bản.

Có thể dùng subagent, nhưng phải chia ownership:
   - Agent A: inventory và báo cáo thuật ngữ, chỉ đọc nội dung;
   - Agent B: dictionary và quy chuẩn thuật ngữ;
   - Agent C: marker, validation và build preparation.

Agent chính phải kiểm tra lại toàn bộ thay đổi sau khi tích hợp.

Kết thúc Phase 1, hãy trả về:
   1. Danh sách file đã tạo hoặc thay đổi.
   2. Tổng số thuật ngữ trong dictionary.
   3. Số lượng chương đã rà soát.
   4. Số lượng marker đã thêm.
   5. Kết quả validation/check.
   6. Danh sách thuật ngữ chưa chắc chắn hoặc cần người dùng duyệt.
   7. Xác nhận repo gốc không bị thay đổi.
```
