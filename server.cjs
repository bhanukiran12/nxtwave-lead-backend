// const http = require('http');
// const { URL } = require('url');

// const PORT = Number(process.env.PORT || 3001);

// const { callDraftUserApi, callSegmentTrack, callCRMTrackActivity } = require('./api.cjs');

// function json(res, statusCode, body) {
//   res.writeHead(statusCode, {
//     'Content-Type': 'application/json',
//     'Access-Control-Allow-Origin': '*',
//     'Access-Control-Allow-Methods': 'POST, OPTIONS',
//     'Access-Control-Allow-Headers': 'Content-Type'
//   });
//   res.end(JSON.stringify(body));
// }

// function readBody(req) {
//   return new Promise((resolve, reject) => {
//     let raw = '';
//     req.on('data', (chunk) => {
//       raw += chunk;
//       if (raw.length > 2 * 1024 * 1024) {
//         reject(new Error('Payload too large'));
//         req.destroy();
//       }
//     });
//     req.on('end', () => {
//       try {
//         resolve(raw ? JSON.parse(raw) : {});
//       } catch {
//         reject(new Error('Invalid JSON body'));
//       }
//     });
//     req.on('error', reject);
//   });
// }

// const server = http.createServer(async (req, res) => {
//   const reqUrl = new URL(req.url, `http://${req.headers.host}`);

//   if (req.method === 'OPTIONS') {
//     return json(res, 200, { ok: true });
//   }

//   if (req.method === 'POST' && reqUrl.pathname === '/api/post-otp-events') {
//     try {
//       const body = await readBody(req);
//       const phoneNumber = String(body?.phoneNumber || '').trim();
//       const submissionPayload = body?.submissionPayload || {};

//       if (!phoneNumber) {
//         return json(res, 400, { ok: false, error: 'phoneNumber is required' });
//       }

//       console.log('[Flow] Starting DraftUser -> Segment flow');
//       let uuid = '';
//       try {
//         uuid = await callDraftUserApi(phoneNumber);
//       } catch (err) {
//         console.error('[Flow] DraftUser UUID failed:', err);
//         return json(res, 502, { ok: false, error: 'Draft user API failed. UUID not available.' });
//       }

//       await callSegmentTrack(submissionPayload, uuid);

//       await callCRMTrackActivity(submissionPayload, uuid, phoneNumber);

//       console.log('[Flow] DraftUser -> Segment -> CRM flow completed successfully');
//       return json(res, 200, { ok: true, uuid });
//     } catch (err) {
//       console.error('[Flow] Failed:', err);
//       return json(res, 500, { ok: false, error: err.message || 'Unexpected server error' });
//     }
//   }

//   return json(res, 404, { ok: false, error: 'Not found' });
// });

// server.listen(PORT, () => {
//   console.log(`[backend] Listening on http://localhost:${PORT}`);
// });
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = Number(process.env.PORT || 3001);

// Allowed origins - support both development and production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'https://nxtwave-lead.netlify.app'
];

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    // Also allow all origins in development
    if (!origin || process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-api-key', 'Cookie'],
  credentials: true,
  maxAge: 86400
};

app.use(cors(corsOptions));

// Preflight requests
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '2mb' }));

const { callDraftUserApi, callSegmentTrack, callSegmentIdentify, callCRMTrackActivity } = require('./api.cjs');

// API route for post-otp-events
app.post('/api/post-otp-events', async (req, res) => {
  try {
    const phoneNumber = String(req.body?.phoneNumber || '').trim();
    const submissionPayload = req.body?.submissionPayload || {};

    if (!phoneNumber) {
      return res.status(400).json({ ok: false, error: 'phoneNumber is required' });
    }

    console.log('[Flow] Starting DraftUser -> Segment flow');
    let uuid = '';
    try {
      uuid = await callDraftUserApi(phoneNumber);
    } catch (err) {
      console.error('[Flow] DraftUser UUID failed:', err);
      return res.status(502).json({ ok: false, error: 'Draft user API failed. UUID not available.' });
    }

    try {
      await callSegmentIdentify(phoneNumber, uuid);
      console.log('[Flow] Segment identify event sent successfully');
    } catch (err) {
      console.error('[Flow] Segment identify failed:', err);
      // Don't fail the entire flow if identify fails, just log it
    }

    await callSegmentTrack(submissionPayload, uuid);
    const crmResult = await callCRMTrackActivity(submissionPayload, uuid, phoneNumber);
    if (crmResult?.skipped) {
      console.warn('[CRM] CRM call skipped:', crmResult.reason);
    }
    console.log('[Flow] DraftUser -> Segment -> CRM flow completed successfully');
    return res.status(200).json({ ok: true, uuid });
  } catch (err) {
    console.error('[Flow] Failed:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Unexpected server error' });
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`[backend] Express server listening on http://localhost:${PORT}`);
});
