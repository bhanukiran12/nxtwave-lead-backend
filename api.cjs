// Shared API functions - previously duplicated across multiple files
const {
  DRAFT_USER_API_URL,
  DRAFT_USER_API_KEY,
  DRAFT_USER_CSRF_COOKIE,
  SEGMENT_TRACK_URL,
  SEGMENT_API_KEY
} = require('./config.cjs');

const { formatPreferredDate, formatPreferredTime, toIsoWithIst } = require('./utils.cjs');

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

  console.log('[DraftUser] Resolved UUID:', uuid);
  return uuid;
}

async function callSegmentTrack(submissionPayload, userId) {
  const formData = submissionPayload?.form_data || {};
  if (!userId) {
    throw new Error('UUID is required for Segment tracking');
  }

  const body = {
    event: 'Demo Registration Success',
    properties: {
      demo_datetime: toIsoWithIst(formData.selected_webinar_slot_datetime),
      form_id: submissionPayload?.form_id || 'test-demo-form',
      frontend_form_path_id: 'intensive-english',
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
      year_of_graduation: formData.graduationYear || formData.yearOfGraduation || null
    },
    userId: userId,
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

  console.log('[Segment] Track success status:', response.status);
}

async function callSegmentIdentify(phoneNumber, userId) {
  if (!userId) {
    throw new Error('userId is required for Segment identify');
  }

  const body = {
    type: 'identify',
    traits: {
      phone: phoneNumber
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
}

module.exports = {
  callDraftUserApi,
  callSegmentTrack,
  callSegmentIdentify
};
