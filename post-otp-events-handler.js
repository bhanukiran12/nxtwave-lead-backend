const DRAFT_USER_API_URL = process.env.DRAFT_USER_API_URL || 'https://ib-user-accounts-backend-gamma-apis.ccbp.in/api/nxtwave_clients/user/account/draft/v1/';
const DRAFT_USER_API_KEY = process.env.DRAFT_USER_API_KEY || 'aX6TI0JV.GD0Bz43ntlBHsRZAqFBeGE0zB0SdRWqh';
const DRAFT_USER_CSRF_COOKIE = process.env.DRAFT_USER_CSRF_COOKIE || 'csrftoken=xNTQubRZDn4VCec5riyDHDxtEMdN4Fuh';

const SEGMENT_TRACK_URL = process.env.SEGMENT_TRACK_URL || 'https://api.segment.io/v1/track';
const SEGMENT_API_KEY = process.env.SEGMENT_API_KEY || 'Ghu35SHftVD7AJsVsPxgwhYtCBXlHuJc';

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

function getOrdinal(day) {
  console.log('[getOrdinal] Input day:', day);
  const rem10 = day % 10;
  const rem100 = day % 100;
  let result;
  if (rem10 === 1 && rem100 !== 11) result = `${day}st`;
  else if (rem10 === 2 && rem100 !== 12) result = `${day}nd`;
  else if (rem10 === 3 && rem100 !== 13) result = `${day}rd`;
  else result = `${day}th`;
  console.log('[getOrdinal] Output:', result);
  return result;
}

function formatPreferredDate(ymd) {
  console.log('[formatPreferredDate] Input ymd:', ymd);
  if (!ymd) return '';
  const [year, month, day] = String(ymd).split('-').map(Number);
  if (!year || !month || !day) return '';
  const dt = new Date(year, month - 1, day);
  const monthName = dt.toLocaleString('en-IN', { month: 'long' });
  const result = `${getOrdinal(day)} ${monthName} ${year}`;
  console.log('[formatPreferredDate] Output:', result);
  return result;
}

function formatPreferredTime(datetimeValue) {
  console.log('[formatPreferredTime] Input datetimeValue:', datetimeValue);
  if (!datetimeValue) return '';
  const [datePart, timePart] = String(datetimeValue).split(' ');
  if (!datePart || !timePart) return '';
  const [hh, mm] = timePart.split(':').map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return '';
  const meridian = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 || 12;
  const result = `${hour12}:${String(mm).padStart(2, '0')} ${meridian}`;
  console.log('[formatPreferredTime] Output:', result);
  return result;
}

function toIsoWithIst(datetimeValue) {
  console.log('[toIsoWithIst] Input datetimeValue:', datetimeValue);
  if (!datetimeValue) return '';
  const [datePart, timePart] = String(datetimeValue).split(' ');
  if (!datePart || !timePart) return '';
  const result = `${datePart}T${timePart}+05:30`;
  console.log('[toIsoWithIst] Output:', result);
  return result;
}

async function callDraftUserApi(phoneNumber) {
  console.log('[callDraftUserApi] Starting with phoneNumber:', phoneNumber);

  const innerJson = JSON.stringify({
    phone_number: phoneNumber,
    country_code: '+91'
  });

  const payload = {
    clientKeyDetailsId: 1,
    data: `'${innerJson}'`
  };

  console.log('[DraftUser] Request payload:', payload);

  const response = await fetch(DRAFT_USER_API_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-api-key': DRAFT_USER_API_KEY,
      Cookie: DRAFT_USER_CSRF_COOKIE
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('[DraftUser] API failed:', response.status, errorText);
    throw new Error(`Draft user API failed with status ${response.status}`);
  }

  const json = await response.json().catch(() => ({}));
  console.log('[DraftUser] API response:', json);

  const uuid = (
    json?.uuid ||
    json?.user_id ||
    json?.userId ||
    json?.id ||
    json?.data?.uuid ||
    json?.data?.user_id ||
    json?.data?.userId ||
    ''
  );

  console.log('[callDraftUserApi] Returning uuid:', uuid);
  return uuid;
}

async function callSegmentIdentify(phoneNumber, userId) {
  console.log('[callSegmentIdentify] Starting with phoneNumber:', phoneNumber, 'userId:', userId);

  if (!userId) throw new Error('userId is required for Segment identify');

  // Extract last 3 digits of phone for privacy
  const maskedPhone = phoneNumber.slice(-3) ? `7***${phoneNumber.slice(-3)}` : phoneNumber;

  const body = {
    type: 'identify',
    traits: {
      phone: maskedPhone
    },
    userId: userId,
    writeKey: SEGMENT_API_KEY
  };

  console.log('[Segment Identify] Request payload:', body);

  const response = await fetch(SEGMENT_TRACK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('[Segment Identify] API failed:', response.status, errorText);
    throw new Error(`Segment identify API failed with status ${response.status}`);
  }

  console.log('[Segment Identify] Success status:', response.status);
  console.log('[callSegmentIdentify] Completed successfully');
}

async function callSegmentTrack(submissionPayload, userId) {
  console.log('[callSegmentTrack] Starting with submissionPayload:', JSON.stringify(submissionPayload), 'userId:', userId);

  const formData = submissionPayload?.form_data || {};
  if (!userId) throw new Error('UUID is required for Segment tracking');

  const body = {
    event: 'Demo Registration Success',
    properties: {
      demo_datetime: toIsoWithIst(formData.selected_webinar_slot_datetime),
      form_id: submissionPayload?.form_id || 'test-demo-form',
      frontend_form_path_id: 'intensive-english',
      lead_category: formData.lead_category || 'intensive_lead',
      preferred_language: formData.language || 'Telugu',
      user_preferred_date: formatPreferredDate(formData.selectADateToBookASlot),
      user_preferred_time: formData.timeSlots || formatPreferredTime(formData.selected_webinar_slot_datetime),
      utm_campaign: formData.utm_campaign || null,
      utm_content: formData.utm_content || null,
      utm_medium: formData.utm_medium || null,
      utm_source: formData.utm_source || null,
      utm_term: formData.utm_term || null,
      name: formData.name || null,
      year_of_graduation: formData.graduationYear || formData.yearOfGraduation || null
    },
    userId,
    writeKey: SEGMENT_API_KEY
  };

  console.log('[Segment] Request payload:', body);

  const response = await fetch(SEGMENT_TRACK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('[Segment] API failed:', response.status, errorText);
    throw new Error(`Segment API failed with status ${response.status}`);
  }

  console.log('[callSegmentTrack] Completed successfully');
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
