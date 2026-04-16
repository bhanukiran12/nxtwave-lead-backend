// Shared configuration for all server files
// Updated with production API URL and KEY

const DRAFT_USER_API_URL = process.env.DRAFT_USER_API_URL || 'https://ib-user-accounts-backend-prod-apis.ccbp.in/api/nxtwave_clients/user/account/draft/v1/';
const DRAFT_USER_API_KEY = process.env.DRAFT_USER_API_KEY || 'E1MyJo32.cMZcI4eGEuAsARxsRU9DnRazrhXRIcJA';
const DRAFT_USER_CSRF_COOKIE = process.env.DRAFT_USER_CSRF_COOKIE || 'csrftoken=xNTQubRZDn4VCec5riyDHDxtEMdN4Fuh';

const SEGMENT_TRACK_URL = process.env.SEGMENT_TRACK_URL || 'https://api.segment.io/v1/track';
const SEGMENT_API_KEY = process.env.SEGMENT_API_KEY || 'Ghu35SHftVD7AJsVsPxgwhYtCBXlHuJc';

const CRM_TRACK_ACTIVITY_URL = process.env.CRM_TRACK_ACTIVITY_URL || 'https://crm-integrations-apis.flowwai.work/api/sales_crm_core/track_activity/v1/';
const CRM_API_KEY = process.env.CRM_API_KEY || 'JewJk6ZrbaMWWHuYjSvwOHHdOO4m2s';

module.exports = {
  DRAFT_USER_API_URL,
  DRAFT_USER_API_KEY,
  DRAFT_USER_CSRF_COOKIE,
  SEGMENT_TRACK_URL,
  SEGMENT_API_KEY,
  CRM_TRACK_ACTIVITY_URL,
  CRM_API_KEY
};
