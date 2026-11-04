import { readFile } from 'node:fs/promises';

export const gatewayResponseTimeoutMs = 300000;
export const gatewayStreamIdleTimeoutMs = 300000;

function gatewayError(status, body) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  const lower = raw.toLowerCase();
  let code = 'gateway_error', message = `Gateway trả về HTTP ${status}.`;
  if (status === 401 || status === 403) { code = 'invalid_key'; message = 'API key was rejected. Check config/settings.json.'; }
  else if (status === 404 || lower.includes('model_not_found')) { code = 'unknown_model'; message = 'Gateway không nhận mã model hoặc endpoint này.'; }
  else if (status === 429) { code = 'rate_limit'; message = 'Gateway đang giới hạn yêu cầu. Hãy thử lại sau.'; }
  else if (lower.includes('reasoning') || lower.includes('effort') || lower.includes('image')) {
    code = 'unsupported_capability'; message = 'Gateway không hỗ trợ mức suy luận hoặc ảnh được yêu cầu.';
  }
  return Object.assign(new Error(message), { code, status: 502 });
}

export async function generateGateway({ settings, messages, effort, attachments, signal, onDelta,
  responseTimeoutMs = gatewayResponseTimeoutMs }) {
  const endpoint = `${settings.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const input = [];
  for (const message of messages) {
    if (message.role !== 'user' || !attachments?.has(message.id)) { input.push({ role: message.role, content: message.content }); continue; }
    const parts = [{ type: 'text', text: message.content }];
    for (const item of attachments.get(message.id)) {
      if (item.mediaType.startsWith('image/')) {
        const bytes = await readFile(item.path);
        parts.push({ type: 'image_url', image_url: { url: `data:${item.mediaType};base64,${bytes.toString('base64')}` } });
      } else {
        const attachmentText = item.contextText ?? item.extractedText;
        if (attachmentText) parts.push({ type: 'text', text: `\n[${item.contextReduced ? 'Selected excerpts from ' : ''}File: ${item.name}]\n${attachmentText}` });
      }
    }
    input.push({ role: 'user', content: parts });
  }
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  if (signal.aborted) controller.abort(signal.reason);
  else signal.addEventListener('abort', abort, { once: true });
  let reader;
  try {
    const responseTimeout = setTimeout(() => controller.abort(new Error('Gateway response timeout')), responseTimeoutMs);
    let response;
    try {
      response = await fetch(endpoint, { method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
        body: JSON.stringify({ model: settings.modelId, messages: input, reasoning_effort: effort,
          max_completion_tokens: 4096, stream: true,
          stream_options: { include_usage: true } }) });
    } catch (error) {
      if (signal.aborted) throw Object.assign(new Error('Kiểm tra gateway đã hết thời gian chờ.'), { code: 'gateway_timeout', status: 504 });
      if (controller.signal.aborted) throw Object.assign(new Error('Gateway chưa bắt đầu trả dữ liệu sau 5 phút.'), { code: 'gateway_timeout', status: 504 });
      throw Object.assign(new Error('Không kết nối được gateway. Kiểm tra URL, mạng và 9router.'), { code: 'gateway_unreachable', status: 502 });
    } finally { clearTimeout(responseTimeout); }
    if (!response.ok) {
      const body = (await response.text()).slice(0, 3000);
      throw gatewayError(response.status, body);
    }
    if (!response.body) throw Object.assign(new Error('Gateway không trả về stream.'), { code: 'no_stream', status: 502 });
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', usage = null, done = false;
    while (!done) {
      const idle = setTimeout(() => controller.abort(new Error('Gateway stream timeout')), gatewayStreamIdleTimeoutMs);
      let packet;
      try { packet = await reader.read(); }
      catch (error) {
        if (controller.signal.aborted && !signal.aborted) throw Object.assign(new Error('Gateway ngừng trả dữ liệu quá lâu.'), { code: 'gateway_timeout', status: 504 });
        throw error;
      } finally { clearTimeout(idle); }
      if (packet.done) break;
      buffer += decoder.decode(packet.value, { stream: true });
      buffer = buffer.replace(/\r\n/g, '\n');
      let end;
      while ((end = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        const data = frame.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
        if (!data) continue;
        if (data === '[DONE]') { done = true; break; }
        let parsed;
        try { parsed = JSON.parse(data); } catch { throw Object.assign(new Error('Stream gateway không hợp lệ.'), { code: 'invalid_stream' }); }
        if (parsed.error) throw gatewayError(parsed.error.status || 502, parsed.error);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (typeof delta === 'string') onDelta(delta);
        if (parsed.usage) usage = parsed.usage;
        if (parsed.choices?.some((choice) => choice.finish_reason != null)) { done = true; break; }
      }
    }
    if (!done && !signal.aborted) throw Object.assign(new Error('Gateway ngắt stream trước khi hoàn tất.'), { code: 'stream_interrupted' });
    return { usage };
  } finally {
    signal.removeEventListener('abort', abort);
    await reader?.cancel().catch(() => {});
  }
}
