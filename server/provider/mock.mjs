export async function generateMock({ messages, effort, signal, onDelta }) {
  const last = [...messages].reverse().find((m) => m.role === 'user');
  const question = last?.content?.slice(0, 160) || '(không có nội dung)';
  const response = /\bcsv\b/iu.test(question) && /(?:export|create|generate|download|xuất|tạo|tải)/iu.test(question)
    ? '**[MOCK - không dùng API thật]**\n\nĐã tạo tệp CSV.\n\nCSV_FILE: mock-results.csv\n```csv\nname,score\nAlice,9\nBob,8\n```'
    : `**[MOCK - không dùng API thật]**\n\nBạn hỏi: ${question}\n\nĐây là phản hồi kiểm thử luồng hội thoại ở mức ${effort}. Khi cấu hình 9router, câu trả lời sẽ do GPT-5.6-luna tạo.`;
  for (const chunk of response.match(/.{1,18}/gs) ?? []) {
    if (signal.aborted) throw signal.reason ?? new Error('Stopped');
    await new Promise((resolve) => setTimeout(resolve, 35));
    onDelta(chunk);
  }
  return { usage: null };
}
