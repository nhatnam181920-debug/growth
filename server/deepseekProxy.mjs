import { readRequestBody, sendJson } from './apiUtils.mjs';

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';

const normalizeBaseUrl = (value) => (value || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');

const normalizeModel = (value) => (value || DEFAULT_MODEL).trim() || DEFAULT_MODEL;

const buildDeepSeekPayload = (body, fallbackModel) => {
  const system = typeof body.system === 'string' ? body.system.trim() : '';
  const user = typeof body.user === 'string' ? body.user.trim() : '';

  if (!user) {
    throw new Error('Missing user prompt.');
  }

  const messages = [];
  if (system) {
    messages.push({ role: 'system', content: system });
  }
  messages.push({ role: 'user', content: user });

  const payload = {
    model: normalizeModel(body.model) || fallbackModel,
    messages,
    stream: false,
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.3,
    max_tokens: typeof body.maxTokens === 'number' ? body.maxTokens : 1200,
  };

  if (body.responseFormat === 'json') {
    payload.response_format = { type: 'json_object' };
  }

  return payload;
};

export const createDeepSeekApiHandler = (env = {}) => {
  const apiKey = typeof env.DEEPSEEK_API_KEY === 'string' ? env.DEEPSEEK_API_KEY.trim() : '';
  const baseUrl = normalizeBaseUrl(env.DEEPSEEK_BASE_URL);
  const model = normalizeModel(env.DEEPSEEK_MODEL);

  return async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/api/deepseek/health') {
      sendJson(res, 200, {
        ok: true,
        configured: Boolean(apiKey),
        model: apiKey ? model : null,
      });
      return true;
    }

    if (req.method !== 'POST' || url.pathname !== '/api/deepseek/chat') {
      return false;
    }

    if (!apiKey) {
      sendJson(res, 500, {
        error: 'DEEPSEEK_API_KEY 未配置，本地服务器无法代理 DeepSeek 请求。',
      });
      return true;
    }

    try {
      const rawBody = await readRequestBody(req);
      const requestBody = rawBody ? JSON.parse(rawBody) : {};
      const payload = buildDeepSeekPayload(requestBody, model);

      const upstream = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const upstreamText = await upstream.text();
      let upstreamJson = null;

      try {
        upstreamJson = upstreamText ? JSON.parse(upstreamText) : null;
      } catch {
        upstreamJson = null;
      }

      if (!upstream.ok) {
        const message =
          upstreamJson?.error?.message ||
          upstreamJson?.message ||
          upstreamText ||
          'DeepSeek 请求失败。';
        sendJson(res, upstream.status, { error: message });
        return true;
      }

      const content = upstreamJson?.choices?.[0]?.message?.content;
      sendJson(res, 200, {
        content: typeof content === 'string' ? content : '',
        model: upstreamJson?.model || payload.model,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'DeepSeek 代理异常。';
      sendJson(res, 500, { error: message });
      return true;
    }
  };
};
