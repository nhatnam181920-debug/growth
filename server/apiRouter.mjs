import { createAliyunOcrApiHandler } from './aliyunOcrProxy.mjs';
import { createDeepSeekApiHandler } from './deepseekProxy.mjs';

export const createApiRequestHandler = (env = {}) => {
  const handlers = [createDeepSeekApiHandler(env), createAliyunOcrApiHandler(env)];

  return async (req, res) => {
    for (const handler of handlers) {
      if (await handler(req, res)) {
        return true;
      }
    }

    return false;
  };
};

export default {
  createApiRequestHandler,
};
