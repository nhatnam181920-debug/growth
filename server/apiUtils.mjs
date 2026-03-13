export const sendJson = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
};

export const readRequestBody = async (req, maxBytes = 2 * 1024 * 1024) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let settled = false;

    const fail = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    };

    req.on('data', (chunk) => {
      const normalizedChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += normalizedChunk.length;

      if (totalBytes > maxBytes) {
        req.destroy();
        fail(new Error('Request body is too large.'));
        return;
      }

      chunks.push(normalizedChunk);
    });

    req.on('end', () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(Buffer.concat(chunks).toString('utf8'));
    });

    req.on('error', fail);
  });
