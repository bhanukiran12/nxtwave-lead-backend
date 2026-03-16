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
    if (!origin || allowedOrigins.includes(origin)) {
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

const { callDraftUserApi, callSegmentTrack, callSegmentIdentify } = require('./api.cjs');

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
    console.log('[Flow] DraftUser -> Segment flow completed successfully');
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
