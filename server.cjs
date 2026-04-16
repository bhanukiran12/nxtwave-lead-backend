const http = require('http');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3001);

const { callDraftUserApi, callSegmentTrack, callCRMTrackActivity } = require('./api.cjs');

function json(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    return json(res, 200, { ok: true });
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/post-otp-events') {
    try {
      const body = await readBody(req);
      const phoneNumber = String(body?.phoneNumber || '').trim();
      const submissionPayload = body?.submissionPayload || {};

      if (!phoneNumber) {
        return json(res, 400, { ok: false, error: 'phoneNumber is required' });
      }

      console.log('[Flow] Starting DraftUser -> Segment flow');
      let uuid = '';
      try {
        uuid = await callDraftUserApi(phoneNumber);
      } catch (err) {
        console.error('[Flow] DraftUser UUID failed:', err);
        return json(res, 502, { ok: false, error: 'Draft user API failed. UUID not available.' });
      }

      await callSegmentTrack(submissionPayload, uuid);

      await callCRMTrackActivity(submissionPayload, uuid, phoneNumber);

      console.log('[Flow] DraftUser -> Segment -> CRM flow completed successfully');
      return json(res, 200, { ok: true, uuid });
    } catch (err) {
      console.error('[Flow] Failed:', err);
      return json(res, 500, { ok: false, error: err.message || 'Unexpected server error' });
    }
  }

  return json(res, 404, { ok: false, error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`[backend] Listening on http://localhost:${PORT}`);
});
