// Shared API functions - previously duplicated across multiple files
const {
  DRAFT_USER_API_URL,
  DRAFT_USER_API_KEY,
  DRAFT_USER_CSRF_COOKIE,
  SEGMENT_TRACK_URL,
  SEGMENT_API_KEY,
  CRM_TRACK_ACTIVITY_URL,
  CRM_API_KEY
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

function getFieldObject(fieldName, fieldValue) {
  return {
    field_reference_id: fieldName,
    value: String(fieldValue ?? '')
  };
}
const NEW_INTENSIVE_FORM_ID = '4325534474325403';
const OFFSET_MILLISECONDS = 5.5 * 60 * 60 * 1000;

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

  const demoSlotDate = formData.selectADateToBookASlot || formData.demoSlotDate || '';
  const demoTimeSlot = formData.timeSlots || formData.demoTimeSlot || formData.demo || '';

  const activityDetails = [
    getFieldObject('ACT_RAC_UID', uuid),
    getFieldObject('ACT_RAC_NAME', name),
    getFieldObject('ACT_PHONE_NUMBER', JSON.stringify(phoneDetails)),
    getFieldObject('ACT_PREF_LANGUAGE', nativeLanguage),
    getFieldObject('ACT_RAC_FRNT_END_PATH_ID', frontendPathId),
    getFieldObject('ACT_RAC_UTM_SOURCE', formData.utm_source || ''),
    getFieldObject('ACT_UTM_MEDIUM', formData.utm_medium || ''),
    getFieldObject('ACT_RAC_UTM_CAMPAIGN', formData.utm_campaign || ''),
    getFieldObject('ACT_RAC_UTM_CONTENT', formData.utm_content || ''),
    getFieldObject('PREF_MODE_OF_STDY', getCRMPreferredMode(preferredMode)),
    getFieldObject('ACT_RAC_YOG', yearOfGraduation),
    getFieldObject('ACT_RAC_NATIVE_STATE', nativeState),
    getFieldObject('ACT_RAC_DEM_BKD_SLOT_DATE', demoSlotDate),
    getFieldObject('ACT_RAC_DEM_PREF_TIME_SLOT', demoTimeSlot),
    getFieldObject('ACT_RAC_LEAD_SOURCE', getCRMLeadSource(formData.utm_campaign)),
    getFieldObject('ACT_RAC_TNC', 'True'),
    getFieldObject('activity_datetime', new Date().toISOString().replace('T', ' ').slice(0, 19)),
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
  callSegmentIdentify,
  callCRMTrackActivity
};
