// Handler for Vercel serverless functions
// Standalone version - no CommonJS dependencies

// Updated production API credentials
const DRAFT_USER_API_URL = 'https://ib-user-accounts-backend-prod-apis.ccbp.in/api/nxtwave_clients/user/account/draft/v1/';
const DRAFT_USER_API_KEY = 'E1MyJo32.cMZcI4eGEuAsARxsRU9DnRazrhXRIcJA';
const DRAFT_USER_CSRF_COOKIE = 'csrftoken=xNTQubRZDn4VCec5riyDHDxtEMdN4Fuh';

const SEGMENT_TRACK_URL = 'https://api.segment.io/v1/track';
const SEGMENT_API_KEY = 'Ghu35SHftVD7AJsVsPxgwhYtCBXlHuJc';

const CRM_TRACK_ACTIVITY_URL = 'https://crm-integrations-apis.flowwai.work/api/sales_crm_core/track_activity/v1/';
const CRM_API_KEY = 'JewJk6ZrbaMWWHuYjSvwOHHdOO4m2s';

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://nxtwave-lead.netlify.app',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-api-key, Cookie',
  'Access-Control-Max-Age': '86400'
};

function setCorsHeaders(res) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

function getOrdinal(day) {
  const rem10 = day % 10;
  const rem100 = day % 100;
  if (rem10 === 1 && rem100 !== 11) return `${day}st`;
  if (rem10 === 2 && rem100 !== 12) return `${day}nd`;
  if (rem10 === 3 && rem100 !== 13) return `${day}rd`;
  return `${day}th`;
}

function formatPreferredDate(ymd) {
  if (!ymd) return '';
  const [year, month, day] = String(ymd).split('-').map(Number);
  if (!year || !month || !day) return '';
  const dt = new Date(year, month - 1, day);
  const monthName = dt.toLocaleString('en-IN', { month: 'long' });
  return `${getOrdinal(day)} ${monthName} ${year}`;
}

function formatPreferredTime(datetimeValue) {
  if (!datetimeValue) return '';
  const [datePart, timePart] = String(datetimeValue).split(' ');
  if (!datePart || !timePart) return '';
  const [hh, mm] = timePart.split(':').map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return '';
  const meridian = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 || 12;
  return `${hour12}:${String(mm).padStart(2, '0')} ${meridian}`;
}

function toIsoWithIst(datetimeValue) {
  if (!datetimeValue) return '';
  const [datePart, timePart] = String(datetimeValue).split(' ');
  if (!datePart || !timePart) return '';
  return `${datePart}T${timePart}+05:30`;
}

function formatCurrentIstDateTime() {
  const OFFSET_MILLISECONDS = 5.5 * 60 * 60 * 1000;
  return new Date(Date.now() + OFFSET_MILLISECONDS)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);
}

async function callDraftUserApi(phoneNumber) {
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
  let frontendPathId = 'intensive';
  try {
    const frontendUrl = formData.frontend_url || '';
    if (frontendUrl) {
      const parsed = new URL(frontendUrl);
      const path = parsed.pathname.replace(/^\/+|\/+$/g, '');
      if (path) {
        frontendPathId = path.split('/')[0].toLowerCase();
      }
    }
  } catch {}
async function callSegmentIdentify(phoneNumber, userId) {
  if (!userId) throw new Error('userId is required for Segment identify');

  const body = {
    type: 'identify',
    traits: { phone: phoneNumber },
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
}

async function callSegmentTrack(submissionPayload, userId) {
  const formData = submissionPayload?.form_data || {};
  if (!userId) throw new Error('UUID is required for Segment tracking');

  const body = {
    event: 'Demo Registration Success',
    properties: {
      demo_datetime: toIsoWithIst(formData.selected_webinar_slot_datetime),
      form_id: submissionPayload?.form_id || 'test-demo-form',
      frontend_form_path_id: frontendPathId,
      lead_category: formData.lead_category || 'intensive_lead',
      preferred_language: formData.language || 'Telugu',
      preferred_mode: formData.preferred_mode || formData.preferredMode || formData.mode || null,
      currentState: formData.state || formData.State || formData.current_state || formData.currentState || null,
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

function getPhoneDetails(phoneNumber) {
  let phone = String(phoneNumber || '').replace(/\s+/g, '');

  if (phone.startsWith('91') && phone.length === 12) {
    phone = phone.slice(2);
  }
  if (phone.startsWith('+91') && phone.length === 13) {
    phone = phone.slice(3);
  }

  if (!/^[6789]\d{9}$/.test(phone)) {
    throw new Error('Invalid phone number format');
  }

  return {
    iso2_country_code: 'IN',
    dial_code: '+91',
    phone_number: phone
  };
}

function getFieldObject(fieldName, fieldValue) {
  return { field_reference_id: fieldName, value: String(fieldValue ?? '') };
}

function getCRMPreferredMode(preferredMode) {
  if (preferredMode === 'Offline') return 'Learn at Training Center (Offline)';
  if (preferredMode === 'Online') return 'Learn from Home (Online)';
  return 'Learn from Home (Online)';
}

function getCRMLeadSource(utmCampaign) {
  const campaign = String(utmCampaign || '').trim().toLowerCase();
  if (campaign === 'digitalads') return 'Digital Marketing';
  if (campaign === 'ifmkt') return 'Influencer Marketing';
  return 'Organic';
}

async function callCRMTrackActivity(submissionPayload, uuid, phoneNumber) {
  const formData = submissionPayload?.form_data || {};
  const formId = formData.form_id || submissionPayload?.form_id || '';

  if (!formId) {
    console.warn('[CRM] Skipping CRM call because form_id is missing in the payload');
    return { skipped: true, reason: 'missing_form_id' };
  }

  if (formId !== 'intensive-demo-form') {
    console.warn('[CRM] Skipping CRM call because form_id does not match intensive-demo-form:', formId);
    return { skipped: true, reason: 'form_id_mismatch', formId };
  }

  if (!uuid) {
    throw new Error('UUID is required for CRM track activity');
  }

  console.log('[CRM] Starting CRM track activity for form:', formId);
  console.log('[CRM] Payload form_id fields:', {
    topLevelFormId: submissionPayload?.form_id || '',
    nestedFormId: formData.form_id || ''
  });

  const phoneDetails = getPhoneDetails(phoneNumber);
  const name = formData.fullName || formData.name || '';
  const yearOfGraduation = formData.graduationYear || formData.yearOfGraduation || formData.year_of_graduation || '';
  const preferredMode = formData.preferredMode || formData.preferred_mode || '';
  const nativeLanguage = formData.language || '';
  const nativeState = formData.state || formData.nativeState || formData.currentState || '';



  const demoSlotDate = formData.selectADateToBookASlot || formData.demoSlotDate || '';
  const demoTimeSlot = formData.timeSlots || formData.demoTimeSlot || formData.demo || '';

  const activityDetails = [
    getFieldObject('ACT_RAD_UID', uuid),
    getFieldObject('ACT_RAD_NAME', name),
    getFieldObject('ACT_PHONE_NUMBER', JSON.stringify(phoneDetails)),
    getFieldObject('ACT_PREF_LANGUAGE', nativeLanguage),
    getFieldObject('ACT_RAD_FRNT_END_PATH_ID', frontendPathId),
    getFieldObject('ACT_RAD_UTM_SOURCE', formData.utm_source || ''),
    getFieldObject('ACT_RAD_UTM_MEDIUM', formData.utm_medium || ''),
    getFieldObject('ACT_RAD_UTM_CAMPAIGN', formData.utm_campaign || ''),
    getFieldObject('ACT_RAD_UTM_CONTENT', formData.utm_content || ''),
    getFieldObject('PREF_MODE_OF_STDY', getCRMPreferredMode(preferredMode)),
    getFieldObject('ACT_RAD_YOG', yearOfGraduation),
    getFieldObject('ACT_RAD_NATIVE_STATE', nativeState),
    getFieldObject('ACT_RAD_DEM_BKD_SLOT_DATE', demoSlotDate),
    getFieldObject('ACT_RAD_DEM_PREF_TIME_SLOT', demoTimeSlot),
    getFieldObject('ACT_RAD_LEAD_SOURCE', getCRMLeadSource(formData.utm_campaign)),
    getFieldObject('ACT_RAD_TNC', 'True'),
    getFieldObject('activity_datetime', formatCurrentIstDateTime()),
    getFieldObject('FORM_ID', formId)
  ];

  const body = {
    activity_reference_id: 'ACT_DEMO_FORM_SUBMIT',
    activity_details: activityDetails,
    contact_identification_type: 'PHONE_NUMBER',
    phone_number: phoneDetails
  };

  console.log('[CRM] Request payload:', JSON.stringify(body));

  const response = await fetch(CRM_TRACK_ACTIVITY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CRM_API_KEY,
      Accept: 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('[CRM] API failed:', response.status, errorText);
    throw new Error(`CRM Track Activity API failed with status ${response.status}: ${errorText}`);
  }

  const json = await response.json().catch(() => ({}));
  console.log('[CRM] Track activity success:', json);
  return { skipped: false, response: json };
}

export default async function handler(req, res) {
  console.log('[handler] Starting with req.method:', req.method);

  // Handle preflight OPTIONS request first
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

    console.log('[handler] Extracted phoneNumber:', phoneNumber);

    if (!phoneNumber) {
      return res.status(400).json({ ok: false, error: 'phoneNumber is required' });
    }

    console.log('[Flow] Starting DraftUser -> Segment flow');
    const uuid = await callDraftUserApi(phoneNumber);
    console.log('[handler] callDraftUserApi returned uuid:', uuid);

    try {
      await callSegmentIdentify(phoneNumber, uuid);
      console.log('[Flow] Segment identify event sent successfully');
    } catch (err) {
      console.error('[Flow] Segment identify failed:', err);
    }

    await callSegmentTrack(submissionPayload, uuid);
    console.log('[Flow] DraftUser -> Segment flow completed successfully');

    const crmResult = await callCRMTrackActivity(submissionPayload, uuid, phoneNumber);
    if (crmResult?.skipped) {
      console.warn('[CRM] CRM call skipped:', crmResult.reason);
    }
    console.log('[Flow] CRM track activity completed successfully');

    return res.status(200).json({ ok: true, uuid });
  } catch (err) {
    console.error('[Flow] Failed:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Unexpected server error' });
  }
}
