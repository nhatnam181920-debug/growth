import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { readRequestBody, sendJson } from './apiUtils.mjs';

const require = createRequire(import.meta.url);
const OpenApi = require('@alicloud/openapi-client');
const OcrSdk = require('@alicloud/ocr-api20210707');

const DEFAULT_ENDPOINT = 'ocr-api.cn-hangzhou.aliyuncs.com';
const DEFAULT_REGION = 'cn-hangzhou';
const DEFAULT_TYPE = 'Advanced';
const OCR_REQUEST_LIMIT = 20 * 1024 * 1024;

const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const normalizeString = (value, fallback = '') => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized || fallback;
};

const normalizeType = (value) => normalizeString(value, DEFAULT_TYPE);

const normalizePageNo = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 1;
  }

  const pageNo = Math.floor(value);
  return pageNo > 0 ? pageNo : 1;
};

const buildOcrClient = (env) => {
  const accessKeyId = normalizeString(env.ALIBABA_CLOUD_ACCESS_KEY_ID);
  const accessKeySecret = normalizeString(env.ALIBABA_CLOUD_ACCESS_KEY_SECRET);

  if (!accessKeyId || !accessKeySecret) {
    return null;
  }

  const config = new OpenApi.Config({
    accessKeyId,
    accessKeySecret,
    regionId: normalizeString(env.ALIBABA_CLOUD_OCR_REGION, DEFAULT_REGION),
  });

  config.endpoint = normalizeString(env.ALIBABA_CLOUD_OCR_ENDPOINT, DEFAULT_ENDPOINT);
  return new OcrSdk.default(config);
};

const collectSubImageText = (subImages = []) =>
  subImages
    .flatMap((subImage) => {
      const paragraphText =
        subImage?.paragraphInfo?.paragraphDetails
          ?.map((detail) => normalizeString(detail?.paragraphContent))
          .filter(Boolean) || [];

      if (paragraphText.length > 0) {
        return paragraphText;
      }

      return (
        subImage?.blockInfo?.blockDetails
          ?.map((detail) => normalizeString(detail?.blockContent))
          .filter(Boolean) || []
      );
    })
    .join('\n')
    .trim();

const extractRecognizedText = (data) => {
  const content = normalizeString(data?.content);
  if (content) {
    return content;
  }

  return collectSubImageText(data?.subImages);
};

export const createAliyunOcrApiHandler = (env = {}) => {
  const endpoint = normalizeString(env.ALIBABA_CLOUD_OCR_ENDPOINT, DEFAULT_ENDPOINT);
  const region = normalizeString(env.ALIBABA_CLOUD_OCR_REGION, DEFAULT_REGION);
  const defaultType = normalizeType(env.ALIBABA_CLOUD_OCR_TYPE);
  const client = buildOcrClient(env);

  return async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/api/aliyun/ocr/health') {
      sendJson(res, 200, {
        ok: true,
        configured: Boolean(client),
        endpoint: client ? endpoint : null,
        region: client ? region : null,
        type: client ? defaultType : null,
      });
      return true;
    }

    if (req.method !== 'POST' || url.pathname !== '/api/aliyun/ocr') {
      return false;
    }

    if (!client) {
      sendJson(res, 500, {
        error: 'ALIBABA_CLOUD_ACCESS_KEY_ID 或 ALIBABA_CLOUD_ACCESS_KEY_SECRET 未配置，无法调用阿里云 OCR。',
      });
      return true;
    }

    try {
      const rawBody = await readRequestBody(req, OCR_REQUEST_LIMIT);
      const requestBody = rawBody ? JSON.parse(rawBody) : {};
      const base64Data = normalizeString(requestBody.base64Data);
      const mimeType = normalizeString(requestBody.mimeType).toLowerCase();
      const pageNo = normalizePageNo(requestBody.pageNo);
      const type = normalizeType(requestBody.type || defaultType);

      if (!base64Data) {
        throw new Error('Missing base64Data.');
      }

      if (!mimeType || !SUPPORTED_MIME_TYPES.has(mimeType)) {
        throw new Error('Unsupported file type for OCR.');
      }

      const fileBuffer = Buffer.from(base64Data, 'base64');
      if (!fileBuffer.length) {
        throw new Error('Empty OCR file payload.');
      }

      const request = new OcrSdk.RecognizeAllTextRequest({
        body: Readable.from(fileBuffer),
        pageNo,
        type,
      });

      const upstream = await client.recognizeAllText(request);
      const upstreamCode = normalizeString(upstream?.body?.code);
      const upstreamMessage = normalizeString(upstream?.body?.message);
      const content = extractRecognizedText(upstream?.body?.data);

      if (upstreamCode && upstreamCode !== '200') {
        sendJson(res, upstream?.statusCode || 502, {
          error: upstreamMessage || `阿里云 OCR 返回异常状态：${upstreamCode}`,
        });
        return true;
      }

      if (!content) {
        sendJson(res, 422, {
          error: '阿里云 OCR 未识别到可用文字，请更换更清晰的图片或补充文字说明。',
        });
        return true;
      }

      sendJson(res, 200, {
        content,
        requestId: upstream?.body?.requestId || null,
        pageNo: upstream?.body?.data?.pageNo || pageNo,
        type,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '阿里云 OCR 代理异常。';
      sendJson(res, 500, { error: message });
      return true;
    }
  };
};
