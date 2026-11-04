# Quy Chuẩn Thuật Ngữ và Từ Điển Dùng Chung SEG301m

Tài liệu này xác lập hệ thống quy chuẩn thống nhất về thuật ngữ chuyên ngành (Terminology Guidelines) và cấu trúc từ điển dùng chung (`content/terms.json`) cho toàn bộ 12 chương bài học của khóa học **SEG301m - Search Engines & Information Retrieval** (Phiên bản tiếng Việt: `seg301m-vi`).

---

## 1. Mục Đích và Phạm Vi Áp Dụng

1. **Chuẩn hóa nhất quán 12 chương bài học**: Loại bỏ tình trạng một thuật ngữ chuyên ngành có nhiều bản dịch xung đột giữa các chương (ví dụ: *relevance* lúc dịch là "độ liên quan", lúc dịch là "độ thích hợp"; *stemming* lúc dịch là "rút gọn từ về gốc", lúc dịch là "cắt tỉa từ").
2. **Cung cấp từ điển nền tảng (`content/terms.json`)**: Làm nguồn sự thật duy nhất (Single Source of Truth) cho các công cụ trích xuất, kiểm tra chất lượng (validation), bộ tìm kiếm toàn văn và hệ thống Tutor AI.
3. **Phục vụ cơ chế hiển thị 3 chế độ (Display Modes)**:
   - **Chế độ English**: Chỉ hiển thị thuật ngữ tiếng Anh gốc (ví dụ: `information retrieval`, `inverted index`).
   - **Chế độ Song ngữ (Bilingual - Mặc định)**: Hiển thị cả tiếng Anh và tiếng Việt theo định dạng `en (vi)` (ví dụ: `information retrieval (truy xuất thông tin)`, `inverted index (chỉ mục đảo)`).
   - **Chế độ Tiếng Việt**: Hiển thị bản dịch tiếng Việt chuẩn mực (ví dụ: `truy xuất thông tin`, `chỉ mục đảo`).
4. **Quy tắc an toàn nội dung**: Tuyệt đối không thay đổi chuỗi ký tự trong code block, URL, biểu thức toán học LaTeX, tên tệp hoặc đường dẫn thư mục.

---

## 2. Cấu Trúc Bản Ghi Thuật Ngữ (`content/terms.json`)

Mỗi thuật ngữ trong tệp `content/terms.json` là một đối tượng JSON có cấu trúc tối thiểu và quy chuẩn như sau:

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

### Ý nghĩa các trường:
- **`id`** (`string`, bắt buộc): Định danh duy nhất theo định dạng slug (toàn bộ chữ thường, ngăn cách bằng dấu gạch nối `-`). Phục vụ việc gắn marker `{{term:id}}` trong Markdown và tra cứu máy.
- **`en`** (`string`, bắt buộc): Dạng chuẩn tiếng Anh của thuật ngữ.
- **`vi`** (`string`, bắt buộc): Dạng chuẩn tiếng Việt của thuật ngữ (hoặc giữ nguyên tiếng Anh nếu `preserveEnglish: true`).
- **`aliases`** (`array of strings`, bắt buộc): Danh sách các biến thể số nhiều, từ viết tắt, dạng viết mở rộng hoặc các cách dịch tương đương.
- **`category`** (`string`, bắt buộc): Một trong 7 nhóm danh mục chuẩn quy định bên dưới.
- **`preserveEnglish`** (`boolean`, bắt buộc): Đánh dấu `true` nếu thuật ngữ bắt buộc giữ nguyên tiếng Anh, không dịch cưỡng ép; `false` nếu có bản dịch tiếng Việt chuẩn.

---

## 3. 7 Nhóm Danh Mục Bắt Buộc (Categories)

Toàn bộ thuật ngữ được phân định chặt chẽ vào một trong 7 danh mục sau:

| Mã Danh Mục | Tên Danh Mục | Mô Tả & Tiêu Chí Phân Loại | Ví Dụ Điển Hình |
| :--- | :--- | :--- | :--- |
| **`core-concept`** | Khái niệm nền tảng | Các khái niệm lý thuyết cốt lõi, thành phần kiến trúc hệ thống và khái niệm định nghĩa ban đầu của môn học. | `information-retrieval`, `search-engine`, `information-need`, `query`, `document`, `relevance`, `ranking`, `clustering`, `classification` |
| **`information-retrieval`** | Nhiệm vụ & Phương pháp IR | Các kỹ thuật, tác vụ và phân ngành mở rộng trong truy xuất thông tin. | `document-filtering`, `summarization`, `information-extraction`, `query-expansion`, `relevance-feedback`, `pseudo-relevance-feedback`, `snippet` |
| **`web-search`** | Tìm kiếm Web & Thu thập | Các khái niệm đặc thù của Web Search, crawler, đồ thị web, giao thức mạng và SEO. | `crawl`, `crawler`, `frontier`, `politeness-policy`, `anchor-text`, `link-spam`, `nofollow`, `sitemap`, `robots-txt`, `bounce-rate` |
| **`indexing-ranking-evaluation`**| Chỉ mục, Xếp hạng & Đánh giá | Cấu trúc dữ liệu chỉ mục, nén dữ liệu, thuật toán duyệt truy vấn và các độ đo hiệu năng hệ thống. | `inverted-index`, `posting-list`, `skip-pointer`, `variable-byte-code`, `gap-encoding`, `precision`, `recall`, `mean-average-precision`, `discounted-cumulative-gain` |
| **`algorithm-model-formula`** | Thuật toán, Mô hình & Công thức | Các thuật toán cụ thể, mô hình toán học xác suất, học máy, đại số tuyến tính và công thức tính điểm. | `pagerank`, `hits`, `bm25`, `tf-idf`, `vector-space-model`, `cosine-similarity`, `hidden-markov-model`, `support-vector-machine`, `k-means` |
| **`acronym`** | Từ viết tắt chuyên ngành | Các chữ viết tắt quốc tế phổ biến được sinh viên và chuyên gia sử dụng trực tiếp trong thực hành. | `ir`, `tf-idf`, `bm25`, `serp`, `seo`, `ctr`, `map`, `mrr`, `dcg`, `ndcg`, `taat`, `daat`, `svm`, `hmm`, `ltr`, `xml`, `html`, `json-ld` |
| **`tech-library-name`** | Công nghệ, Thư viện & Tên riêng | Tên phần mềm, công cụ mã nguồn mở, thư viện IR, hệ thống phân tán, tập dữ liệu chuẩn hoặc tổ chức quốc tế. | `lucene`, `elasticsearch`, `solr`, `indri`, `galago`, `terrier`, `mapreduce`, `hadoop`, `bigtable`, `google`, `trec`, `wordnet`, `wikipedia` |

---

## 4. Quy Chuẩn Chi Tiết

### 4.1. Quy chuẩn Viết hoa (Capitalization Standard)

1. **Danh từ chung (Common Nouns)**:
   - Trong cả tiếng Anh (`en`) và tiếng Việt (`vi`), danh từ chung bắt buộc phải **viết thường toàn bộ** (lowercase).
   - *Ví dụ chuẩn*:
     + `en`: `"information retrieval"`, `vi`: `"truy xuất thông tin"`
     + `en`: `"search engine"`, `vi`: `"công cụ tìm kiếm"`
     + `en`: `"inverted index"`, `vi`: `"chỉ mục đảo"`
     + `en`: `"posting list"`, `vi`: `"danh sách posting"`
     + `en`: `"cosine similarity"`, `vi`: `"độ tương đồng cosine"`
   - *Lý do*: Khi thuật ngữ được chèn vào giữa câu văn thông qua template/marker, việc viết thường giúp câu văn liền mạch tự nhiên, không bị gián đoạn thị giác như khi viết hoa tùy tiện kiểu Title Case.

2. **Tên riêng, Thương hiệu, Thư viện, Nền tảng (Proper Nouns & Brands)**:
   - Viết hoa chính xác theo quy chuẩn thương hiệu quốc tế hoặc quy ước của nhà sáng lập.
   - *Ví dụ chuẩn*:
     + `Lucene`, `Elasticsearch`, `Solr`, `Indri`, `Galago`, `Terrier`, `MapReduce`, `Hadoop`, `BigTable`
     + `Google`, `Google Analytics`, `Google Search Console`, `Bing`, `Yahoo`, `Yandex`, `Baidu`
     + `Schema.org`, `Open Graph`, `Twitter Cards`, `WordNet`, `Wikipedia`, `TREC`, `DMOZ`
     + `Tablet` (trong kiến trúc phân vùng của Google BigTable)

3. **Thuật toán & Định luật mang tên nhà khoa học**:
   - Viết hoa tên riêng của tác giả phát minh, viết thường danh từ chung đi kèm.
   - Áp dụng đồng nhất cho cả tiếng Anh và tiếng Việt:
     + `Porter stemmer` $\rightarrow$ `bộ stemmer Porter`
     + `Krovetz stemmer` $\rightarrow$ `bộ stemmer Krovetz`
     + `Rocchio algorithm` $\rightarrow$ `thuật toán Rocchio`
     + `Viterbi algorithm` $\rightarrow$ `thuật toán Viterbi`
     + `Zipf's law` $\rightarrow$ `định luật Zipf`
     + `Heaps' law` $\rightarrow$ `định luật Heaps`
     + `Levenshtein distance` $\rightarrow$ `khoảng cách Levenshtein`
     + `Damerau-Levenshtein distance` $\rightarrow$ `khoảng cách Damerau-Levenshtein`
     + `Jelinek-Mercer smoothing` $\rightarrow$ `làm mịn Jelinek-Mercer`
     + `Dirichlet smoothing` $\rightarrow$ `làm mịn Dirichlet`
     + `Laplace smoothing` $\rightarrow$ `làm mịn Laplace`
     + `Pearson correlation` $\rightarrow$ `tương quan Pearson`
     + `Kendall tau` $\rightarrow$ `hệ số Kendall tau`
     + `Elias code` $\rightarrow$ `mã Elias`
     + `Golomb code` $\rightarrow$ `mã Golomb`
     + `Naive Bayes` $\rightarrow$ `Naive Bayes`
     + `Ranking SVM` $\rightarrow$ `Ranking SVM`
     + `Markov property` $\rightarrow$ `tính chất Markov`

---

### 4.2. Quy chuẩn Số ít / Số nhiều (Singular vs Plural)

1. **Dạng chuẩn bắt buộc dùng số ít (Singular)**:
   - Mọi bản ghi trong từ điển `terms.json` bắt buộc dùng dạng số ít làm giá trị chuẩn cho `id`, `en` và `vi`.
   - Tuyệt đối không dùng dạng số nhiều làm ID chính (ví dụ: dùng `document` chứ không dùng `documents`; dùng `query` chứ không dùng `queries`; dùng `feature` chứ không dùng `features`; dùng `shingle` chứ không dùng `shingles`).
   - Đối với thuật ngữ chung của ngành, dùng `information retrieval`, tuyệt đối không dùng `information retrievals`.

2. **Đưa dạng số nhiều vào mảng `aliases`**:
   - Nhằm giúp bộ phân tích ngữ pháp (parser) và marker detector nhận diện được khi tác giả viết ở thể số nhiều trong văn bản tiếng Anh, toàn bộ các dạng số nhiều thông dụng được khai báo trong trường `aliases`.
   - *Ví dụ*:
     ```json
     {
       "id": "document",
       "en": "document",
       "vi": "tài liệu",
       "aliases": ["documents"],
       "category": "core-concept",
       "preserveEnglish": false
     }
     ```

---

### 4.3. Quy chuẩn Từ Viết Tắt (Acronyms)

1. **Viết hoa chuẩn quốc tế**:
   - Các chữ viết tắt giữ nguyên toàn bộ chữ hoa (hoặc dạng quy chuẩn có dấu gạch ngang): `IR`, `BM25`, `TF-IDF`, `HITS`, `TAAT`, `DAAT`, `HMM`, `MRF`, `SVM`, `LTR`, `LSI`, `LDA`, `NER`, `POS`, `OCR`, `P2P`, `QA`, `MAP`, `GMAP`, `MRR`, `AP`, `RR`, `DCG`, `NDCG`, `IDCG`, `CTR`, `SERP`, `SEO`, `URL`, `URI`, `HTTP`, `HTML`, `XML`, `JSON-LD`, `DNS`, `UTF-8`, `ASCII`, `BoW`.

2. **Quan hệ hai chiều giữa Acronym và Thuật ngữ mở rộng**:
   - Đối với bản ghi acronym: bắt buộc khai báo tên tiếng Anh mở rộng trong mảng `aliases` (ví dụ: bản ghi `map` có alias `["Mean Average Precision"]`; bản ghi `seo` có alias `["Search Engine Optimization"]`).
   - Đối với bản ghi khái niệm đầy đủ: bắt buộc đưa acronym vào mảng `aliases` (ví dụ: bản ghi `search-engine-optimization` có alias `["SEO"]`; bản ghi `support-vector-machine` có alias `["SVM"]`).
   - *Lợi ích*: Đảm bảo dù người viết dùng cụm từ đầy đủ hay chỉ viết tắt trong Markdown, hệ thống đều nhận diện đúng thực thể ngữ nghĩa.

---

### 4.4. Quy chuẩn Tên Riêng (Proper Nouns)

- Giữ nguyên tên nguyên bản tiếng Anh của các thương hiệu phần mềm, công ty công nghệ và tác giả khoa học.
- **Tuyệt đối không Việt hóa phiên âm**: Không viết *Lu-xen*, *Gu-gồ*, *Bích-tây-bồ*, *Bê-mờ-hai-lăm*, *Pây-gơ-ranh*.
- Trong tiếng Việt, có thể bổ sung danh từ chỉ loại phía trước để câu văn rõ ràng hơn nếu cần thiết (ví dụ: *công cụ tìm kiếm Google*, *hệ thống lưu trữ BigTable*, *khung phân tán Hadoop*, *hội nghị đánh giá TREC*).

---

### 4.5. Quy chuẩn Bí Danh / Biến Thể (Aliases)

Trường `aliases` đóng vai trò tối quan trọng cho việc tra cứu thông minh và gắn marker:
1. **Dạng biến thể hình thái học**: Các dạng số nhiều (`documents`, `queries`, `features`, `shingles`, `crawlers`).
2. **Từ viết tắt tương ứng**: `IR` cho `information retrieval`, `SEO` cho `search engine optimization`.
3. **Dạng mở rộng của từ viết tắt**: `HyperText Markup Language` cho `HTML`, `Okapi BM25` cho `BM25`.
4. **Cách gọi tương đương trong tiếng Việt**: Các phương án dịch phổ biến nhưng không được chọn làm dạng chuẩn (ví dụ: `độ thích hợp` cho `relevance`; `lọc phối hợp` cho `collaborative filtering`; `sơ đồ trang web` cho `sitemap`).

---

### 4.6. Thuật Ngữ Giữ Nguyên Tiếng Anh (`preserveEnglish: true`)

1. **Tiêu chuẩn áp dụng**:
   - Thuật ngữ là tên thuật toán kinh điển, công thức toán học, công nghệ, giao thức mạng, định dạng dữ liệu đã trở thành tiêu chuẩn công nghiệp toàn cầu.
   - Việc cố tình dịch sang tiếng Việt sẽ gây khó hiểu, xa rời thực tế tuyển dụng hoặc làm sai lệch ngữ cảnh kỹ thuật.

2. **Danh mục các thuật ngữ giữ nguyên tiếng Anh trong SEG301m**:
   - **Tên thuật toán & công thức xếp hạng**: `BM25`, `PageRank`, `HITS`, `K-means`, `TF-IDF`, `WAND`, `MaxScore`, `SimHash`, `MinHash`.
   - **Hệ thống, công cụ & thư viện**: `Lucene`, `Elasticsearch`, `Solr`, `Indri`, `Galago`, `Lemur`, `Terrier`, `MapReduce`, `Hadoop`, `BigTable`, `Google`, `Google Analytics`, `Google Search Console`, `Bing`, `Yahoo`, `Yandex`, `Baidu`, `Schema.org`, `Open Graph`, `Twitter Cards`, `WordNet`, `Wikipedia`, `TREC`, `DMOZ`, `Cranfield`.
   - **Giao thức, định dạng, tiêu chuẩn Web & lập trình**: `XML`, `HTML`, `JSON-LD`, `robots.txt`, `HTTP`, `URL`, `URI`, `DNS`, `UTF-8`, `ASCII`, `GET`, `POST`, `HEAD`, `nofollow`, `Tablet`, `n-gram`, `F1`.

3. **Quy tắc giá trị**:
   - Đối với các bản ghi này: trường `vi` có giá trị **hoàn toàn trùng khớp** với `en` (ví dụ: `en: "BM25"`, `vi: "BM25"`).
   - Ở mọi chế độ hiển thị, người dùng đều thấy tên chuẩn này một cách tự nhiên, không bị lặp từ kỳ quặc dạng `BM25 (BM25)`.

---

### 4.7. Thuật Ngữ Có Bản Dịch Tiếng Việt (`preserveEnglish: false`)

1. **Tiêu chuẩn áp dụng**:
   - Áp dụng cho các khái niệm lý thuyết, thành phần kiến trúc, chỉ số đánh giá và thao tác kỹ thuật có bản dịch tiếng Việt chuẩn mực, mạch lạc và đã định hình trong chương trình giảng dạy của Đại học FPT.

2. **Cách hiển thị qua 3 chế độ**:
   - **Chế độ English**: `inverted index`
   - **Chế độ Song ngữ (mặc định)**: `inverted index (chỉ mục đảo)`
   - **Chế độ Tiếng Việt**: `chỉ mục đảo`

---

### 4.8. Quy Tắc Bảo Vệ Vùng Văn Bản (Text Isolation Rules)

Khi gắn marker `{{term:id}}` hoặc render thuật ngữ trên giao diện, tuyệt đối **không can thiệp** vào các vùng sau:
- Khối mã nguồn (Code blocks ` ```...``` `) và mã nội dòng (inline code `` `...` ``).
- Đường dẫn URL trong siêu liên kết `[text](url)` và thẻ hình ảnh `![alt](url)`.
- Công thức toán học LaTeX inline (`$...$`) và display block (`$$...$$`).
- Tên tệp tin, tên tham số cấu hình, biến môi trường (ví dụ: `terms.json`, `robots.txt`, `app.js`).

---

## 5. Quy Tắc Xử Lý Thuật Ngữ Chưa Chắc Chắn (Ambiguous Terms)

Trong quá trình đối soát giữa slide gốc tiếng Anh, bài giảng tiếng Việt và các nguồn dịch thuật học thuật, một số thuật ngữ có nhiều cách hiểu hoặc nhiều phương án dịch khác nhau. Quy trình chuẩn hóa áp dụng 4 nguyên tắc sau:

1. **Nguyên tắc 1 (Ưu tiên giáo trình)**: Lấy bản dịch trong `content/glossary-en-vi.md` và bài học làm cơ sở chính để duy trì tính liên tục cho sinh viên đang theo học.
2. **Nguyên tắc 2 (Phân biệt tường minh ngữ nghĩa kỹ thuật)**: Tuyệt đối không dùng chung một từ tiếng Việt cho hai khái niệm kỹ thuật khác nhau (ví dụ: không thể cùng dịch *effectiveness* và *efficiency* là "hiệu quả").
3. **Nguyên tắc 3 (Bảo tồn phương án phụ trong aliases)**: Chọn phương án tối ưu nhất về mặt khoa học làm dạng chuẩn, đồng thời đưa các phương án dịch phổ biến khác vào `aliases` để hỗ trợ tra cứu.
4. **Nguyên tắc 4 (Đánh dấu người dùng duyệt)**: Lập bảng danh mục các thuật ngữ nhạy cảm kèm luận cứ rõ ràng để giảng viên / chủ nhiệm bộ môn thẩm định khi có yêu cầu điều chỉnh.

---

## 6. Bảng Danh Sách Các Trường Hợp Cần Người Dùng Duyệt

Dưới đây là bảng tổng hợp các thuật ngữ có sự khác biệt giữa các tài liệu tham khảo, lý do phân tích và đề xuất chuẩn hóa đã được áp dụng trong `terms.json`:

| STT | Thuật Ngữ Tiếng Anh (`en`) | Đề Xuất Chuẩn Hóa (`vi`) | Các Phương Án Khác | Lý Do Phân Tích & Luận Cứ Đề Xuất |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Relevance** | **độ liên quan** | độ thích hợp, độ phù hợp | "Độ liên quan" là thuật ngữ kinh điển trong IR tại Việt Nam từ thập niên 1990. "Độ thích hợp" nghe trừu tượng và dễ nhầm với khái niệm usability. |
| **2** | **Effectiveness** | **tính hiệu quả** | hiệu lực, chất lượng tìm kiếm | Cần phân biệt rõ với *efficiency*: *Effectiveness* đo lường chất lượng kết quả (độ chính xác, độ bao phủ), nên dịch là "tính hiệu quả". |
| **3** | **Efficiency** | **tính hiệu năng** | tính hiệu quả, năng suất | *Efficiency* đo lường tốc độ xử lý, thông lượng truy vấn và mức tiêu thụ RAM/CPU. Bắt buộc dịch là "tính hiệu năng" để tránh nhầm lẫn với *effectiveness*. |
| **4** | **Recall** | **độ bao phủ** | độ thu hồi, độ gọi lại | Mặc dù một số sách dịch máy gọi là "độ thu hồi", nhưng trong giáo trình SEG301m và thực tế IR tại FPT, "độ bao phủ" phản ánh chính xác tỷ lệ tài liệu liên quan được tìm thấy trên tổng số tài liệu liên quan hiện có. |
| **5** | **Fallout** | **tỷ lệ dương tính giả** | fallout, tỷ lệ phát hiện nhầm | Dịch là "tỷ lệ dương tính giả" giúp sinh viên liên hệ trực tiếp với ma trận nhầm lẫn (confusion matrix: false positive rate) trong học máy và kiểm định thống kê. |
| **6** | **Stemming** | **rút gọn từ về gốc** | cắt tỉa từ, stemming | "Rút gọn từ về gốc" thể hiện đúng bản chất thuật toán loại bỏ tiền tố/hậu tố để đưa về dạng stem (khác với dạng từ điển lemma). Giữ "cắt tỉa từ" trong alias. |
| **7** | **Lemmatization** | **chuẩn hóa từ điển** | lemmar hóa, đưa về dạng từ điển | Dùng "chuẩn hóa từ điển" giúp người học hiểu rõ quá trình này có sử dụng từ điển và phân tích ngữ pháp, vượt trội so với rút gốc thô bạo (stemming). |
| **8** | **Posting / Posting list** | **posting / danh sách posting** | bản ghi chỉ mục | Trong lập chỉ mục hiện đại, từ "posting" đã được quốc tế hóa thành danh từ kỹ thuật riêng. Việc dịch ép thành "bản ghi chỉ mục" gây khó hiểu khi làm việc với Lucene/Elasticsearch API. |
| **9** | **Dwell time** | **thời gian dừng đọc** | thời gian lưu trang | "Thời gian dừng đọc" phản ánh đúng hành vi người dùng click vào kết quả tìm kiếm và dừng lại đọc nội dung trước khi quay lại SERP (tín hiệu đánh giá độ hài lòng). |
| **10** | **Frontier** | **hàng đợi biên** | biên thu thập, frontier | Trong crawler architecture, frontier là hàng đợi các URL chờ tải. Dùng "hàng đợi biên" vừa giữ được nghĩa cấu trúc dữ liệu vừa thể hiện vùng biên giới khám phá Web. |
| **11** | **Tablet** | **Tablet** (`preserveEnglish: true`) | máy tính bảng, bảng con | Trong kiến trúc Google BigTable (Chương 3), "Tablet" là đơn vị phân mảnh dữ liệu phân tán. Dịch máy thành "máy tính bảng" là sai hoàn toàn ngữ cảnh kỹ thuật. |
| **12** | **Gap encoding / d-gap** | **mã hóa khoảng cách** | mã hóa d-gap, mã khoảng cách | Dịch là "mã hóa khoảng cách" giúp sinh viên hiểu bản chất lưu hiệu số giữa các DocID liên tiếp ($DocID_i - DocID_{i-1}$) để thu nhỏ độ lớn số nguyên cần nén. |
| **13** | **Collaborative filtering** | **lọc cộng tác** | lọc phối hợp, lọc cộng tác | "Lọc cộng tác" là chuẩn dịch thuật quốc gia và khoa học dữ liệu, mô tả thuật toán gợi ý dựa trên sở thích tương đồng giữa các người dùng. |
| **14** | **Query likelihood** | **khả năng xảy ra truy vấn** | hàm hợp lý truy vấn | Trong mô hình ngôn ngữ (Language Model), query likelihood tính xác suất sinh ra chuỗi truy vấn $P(Q \mid D)$. "Khả năng xảy ra truy vấn" dễ hiểu cho sinh viên hơn thuật ngữ thống kê thuần túy. |
| **15** | **Smoothing** | **làm mịn** | làm mượt, hiệu chỉnh xác suất | "Làm mịn" là thuật ngữ chuẩn được dùng xuyên suốt Chương 7 và Chương 10 khi giải quyết vấn đề từ vựng bị xác suất 0 (zero-frequency problem). |
| **16** | **Generative QA** | **hỏi đáp dạng tạo sinh** | hỏi đáp sinh | Thống nhất dùng "dạng tạo sinh" để đồng bộ với làn sóng công nghệ GenAI hiện nay (khác với Extractive QA - hỏi đáp dạng trích xuất). |
| **17** | **Null hypothesis** | **giả thuyết không** | giả thuyết vô hiệu | "Giả thuyết không" ($H_0$) là thuật ngữ thống kê toán học chuẩn mực tại Việt Nam dùng trong kiểm định ý nghĩa thống kê (Chương 9). |
| **18** | **Snippet** | **đoạn trích kết quả** | đoạn tóm tắt kết quả | "Đoạn trích kết quả" thể hiện đúng bản chất trích đoạn văn bản chứa từ khóa hiển thị bên dưới tiêu đề trên SERP. |

---

## 7. Thống Kê Tổng Hợp Từ Điển (`content/terms.json`)

Sau khi chuẩn hóa và hợp nhất từ toàn bộ 12 chương bài học và bảng thuật ngữ trung tâm, tệp `content/terms.json` đạt các chỉ số kỹ thuật sau:

- **Tổng số thuật ngữ chuẩn hóa**: **344 thuật ngữ**.
- **Phân bổ theo 7 nhóm Category**:
  + `algorithm-model-formula`: **89 thuật ngữ** (chiếm tỷ trọng cao nhất: các mô hình ranking, xác suất, học máy, phân cụm, phân loại).
  + `indexing-ranking-evaluation`: **55 thuật ngữ** (các cấu trúc chỉ mục, mã hóa nén, độ đo đánh giá).
  + `core-concept`: **49 thuật ngữ** (các khái niệm lý thuyết cốt lõi của công cụ tìm kiếm).
  + `web-search`: **48 thuật ngữ** (crawler, SEO, đồ thị liên kết web).
  + `information-retrieval`: **46 thuật ngữ** (các bài toán và nhiệm vụ mở rộng của IR).
  + `acronym`: **36 thuật ngữ** (các từ viết tắt quốc tế độc lập).
  + `tech-library-name`: **21 thuật ngữ** (các công nghệ, hệ thống phân tán, thư viện và tên riêng).
- **Số thuật ngữ giữ nguyên tiếng Anh (`preserveEnglish: true`)**: **45 thuật ngữ**.
- **Độ tin cậy dữ liệu**: **100% không có ID trùng lặp, 100% không có trường `en` hoặc `vi` rỗng, đã sắp xếp alphabet toàn diện theo trường `id`**.

---

## 8. Hướng Dẫn Kiểm Tra và Xác Thực (Validation)

Để kiểm tra độ hợp lệ của tệp từ điển `content/terms.json` trong các đợt phát triển tiếp theo (CI/CD hoặc build pipeline), chạy lệnh Node.js sau:

```bash
node -e "
const fs = require('fs');
const terms = JSON.parse(fs.readFileSync('content/terms.json', 'utf8'));
const validCats = new Set(['core-concept', 'information-retrieval', 'web-search', 'indexing-ranking-evaluation', 'algorithm-model-formula', 'acronym', 'tech-library-name']);
const ids = new Set();
terms.forEach((t, i) => {
  if (!t.id || ids.has(t.id)) throw new Error('Invalid or duplicate ID at index ' + i + ': ' + t.id);
  ids.add(t.id);
  if (!t.en || !t.vi) throw new Error('Missing en or vi for ID: ' + t.id);
  if (!validCats.has(t.category)) throw new Error('Invalid category for ID: ' + t.id);
  if (typeof t.preserveEnglish !== 'boolean') throw new Error('Invalid preserveEnglish for ID: ' + t.id);
});
console.log('Validation passed: ' + terms.length + ' valid records.');
"
```
