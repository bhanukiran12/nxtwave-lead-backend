// Import shared modules using createRequire for CommonJS interop
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { callDraftUserApi, callSegmentTrack, callSegmentIdentify } = require('./api.cjs');

// CORS headers - explicitly set for all responses
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://nxtwave-lead.netlify.app',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-api-key, Cookie',
  'Access-Control-Max-Age': '86400'
};

function setCorsHeaders(res) {
  console.log('[setCorsHeaders] Setting CORS headers');
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  console.log('[setCorsHeaders] CORS headers set');
}

export default async function handler(req, res) {
  console.log('[handler] Starting with req.method:', req.method);

  // Handle preflight OPTIONS request first - return 204 with CORS headers only
  if (req.method === 'OPTIONS') {
    console.log('[handler] Handling OPTIONS request');
    setCorsHeaders(res);
    return res.status(204).end();
  }

  // Set CORS headers for all other requests
  setCorsHeaders(res);

  // Only allow POST method
  if (req.method !== 'POST') {
    console.log('[handler] Method not allowed:', req.method);
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const phoneNumber = String(req.body?.phoneNumber || '').trim();
    const submissionPayload = req.body?.submissionPayload || {};

    console.log('[handler] Extracted phoneNumber:', phoneNumber, 'submissionPayload keys:', Object.keys(submissionPayload));

    if (!phoneNumber) {
      console.log('[handler] phoneNumber is required, returning 400');
      return res.status(400).json({ ok: false, error: 'phoneNumber is required' });
    }

    console.log('[Flow] Starting DraftUser -> Segment flow');
    const uuid = await callDraftUserApi(phoneNumber);
    console.log('[handler] callDraftUserApi returned uuid:', uuid);

    // Step 1: Send identify event to Segment
    try {
      console.log('[handler] Calling callSegmentIdentify');
      await callSegmentIdentify(phoneNumber, uuid);
      console.log('[Flow] Segment identify event sent successfully');
    } catch (err) {
      console.error('[Flow] Segment identify failed:', err);
      // Don't fail the entire flow if identify fails, just log it
    }

    // Step 2: Send track event to Segment
    console.log('[handler] Calling callSegmentTrack');
    await callSegmentTrack(submissionPayload, uuid);
    console.log('[Flow] DraftUser -> Segment flow completed successfully');

    console.log('[handler] Returning success response with uuid:', uuid);
    return res.status(200).json({ ok: true, uuid });
  } catch (err) {
    console.error('[Flow] Failed:', err);
    console.log('[handler] Returning error response');
    return res.status(500).json({ ok: false, error: err.message || 'Unexpected server error' });
  }
}
