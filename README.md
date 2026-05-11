# NxtWave Lead Form Backend

A Node.js/Express server handling lead registration form submissions with OTP events, Draft User API integration, Segment analytics tracking, and CRM activity logging.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Server](#running-the-server)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [CORS Configuration](#cors-configuration)
- [Monitoring & Logging](#monitoring--logging)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security](#security)

## Features

- Express.js REST API server
- CORS properly configured for frontend-backend communication
- Draft User API integration for UUID generation
- Segment analytics event tracking
- CRM (Flow) activity tracking
- Environment-based configuration
- Comprehensive error handling and logging
- Production-ready serverless function for Vercel
- Health check endpoint for monitoring

## Architecture

```
┌─────────────┐
│   Frontend  │ (React App)
└──────┬──────┘
       │ POST /api/post-otp-events
       ├─────────────────────────────────────┐
       ▼                                     │
┌─────────────────────┐                      │
│  Express Server     │                      │
│  (server-express)   │                      │
└──────────┬──────────┘                      │
           │                                  │
           ├──────────────┐                   │
           ▼              ▼                   │
    ┌────────────┐  ┌────────────┐          │
    │ Draft User │  │  Segment   │          │
    │    API     │  │  Analytics │          │
    └────────────┘  └────────────┘          │
           │              │                   │
           └──────┬───────┘                   │
                  ▼                            │
            ┌────────────┐                     │
            │   CRM      │◄────────────────────┘
            │  (Flow)    │
            └────────────┘
```

### Request Flow

1. **Receive Request**: Frontend sends POST request with phone number and form data
2. **Generate UUID**: Call Draft User API to create/retrieve user UUID
3. **Identify User**: Send Segment identify event with phone number
4. **Track Event**: Send Segment track event with form submission data
5. **Log Activity**: Send CRM track activity with lead details
6. **Return Response**: Send UUID back to frontend

## Project Structure

```
nxtwave-lead-backend/
├── server.cjs              # Legacy HTTP server (commented out)
├── server-express.cjs      # Main Express server entry point
├── api.cjs                 # Shared API functions (DraftUser, Segment, CRM)
├── post-otp-events-handler.js  # Vercel serverless function
├── utils.cjs               # Shared utility functions
├── config.cjs              # Environment configuration
├── package.json            # Dependencies and scripts
├── package-lock.json       # Locked dependencies
└── README.md              # This file
```

### File Descriptions

| File | Purpose |
|------|---------|
| `server-express.cjs` | Express app setup, CORS, routes, server startup |
| `api.cjs` | API integration functions for external services |
| `post-otp-events-handler.js` | Standalone serverless function for Vercel deployment |
| `utils.cjs` | Date formatting, phone validation, helper functions |
| `config.cjs` | API URLs and keys loaded from environment |

## Prerequisites

- Node.js 14+ installed
- npm or yarn package manager

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env  # If .env.example exists
```

Or manually create `.env` file:
```env
# Draft User API
DRAFT_USER_API_URL=https://ib-user-accounts-backend-prod-apis.ccbp.in/api/nxtwave_clients/user/account/draft/v1/
DRAFT_USER_API_KEY=your_api_key_here
DRAFT_USER_CSRF_COOKIE=your_csrf_token_here

# Segment Analytics
SEGMENT_TRACK_URL=https://api.segment.io/v1/track
SEGMENT_API_KEY=your_segment_write_key

# CRM (Flow)
CRM_TRACK_ACTIVITY_URL=https://crm-integrations-apis.flowwai.work/api/sales_crm_core/track_activity/v1/
CRM_API_KEY=your_crm_api_key

# Server
PORT=3001
NODE_ENV=development
```

> **Note**: The repository includes production API keys for development. For production deployments, use environment variables in Vercel.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `DRAFT_USER_API_URL` | Draft User API endpoint | Production URL |
| `DRAFT_USER_API_KEY` | API key for Draft User | Dev key |
| `DRAFT_USER_CSRF_COOKIE` | CSRF token for Draft User | Dev token |
| `SEGMENT_TRACK_URL` | Segment track endpoint | `https://api.segment.io/v1/track` |
| `SEGMENT_API_KEY` | Segment write key | Dev key |
| `CRM_TRACK_ACTIVITY_URL` | CRM activity endpoint | Production URL |
| `CRM_API_KEY` | CRM API key | Dev key |

## Running the Server

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on `http://localhost:3001` (or the port specified in `PORT` env variable).

## API Endpoints

### POST /api/post-otp-events

Handles post-OTP events: registers user with Draft User API, tracks event in Segment, and logs activity in CRM.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "phoneNumber": "+919876543210",
  "submissionPayload": {
    "form_id": "intensive-demo-form",
    "form_data": {
      "selected_webinar_slot_datetime": "2024-03-15 14:30:00",
      "fullName": "John Doe",
      "phoneNumber": "9876543210",
      "language": "Telugu",
      "preferredMode": "Online",
      "state": "Telangana",
      "graduationYear": "2023",
      "selectADateToBookASlot": "2024-03-15",
      "timeSlots": "2:30 PM - 3:30 PM",
      "lead_category": "intensive_lead",
      "utm_source": "google",
      "utm_medium": "cpc",
      "utm_campaign": "demo_campaign",
      "utm_content": "ad_1",
      "utm_term": "demo",
      "frontend_url": "https://nxtwave.ccbp.in/intensive"
    }
  }
}
```

**Response (Success - 200):**
```json
{
  "ok": true,
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response (Error - 400):**
```json
{
  "ok": false,
  "error": "phoneNumber is required"
}
```

**Response (Error - 502):**
```json
{
  "ok": false,
  "error": "Draft user API failed. UUID not available."
}
```

**Response (Error - 500):**
```json
{
  "ok": false,
  "error": "Unexpected server error"
}
```

### GET /health

Health check endpoint to verify server is running.

**Response (200):**
```json
{
  "status": "ok"
}
```

### OPTIONS /api/post-otp-events

CORS preflight request handling. Returns 204 No Content with appropriate CORS headers.

## External API Integrations

### 1. Draft User API

- **Purpose**: Create/retrieve draft user UUID
- **Endpoint**: `https://ib-user-accounts-backend-prod-apis.ccbp.in/api/nxtwave_clients/user/account/draft/v1/`
- **Method**: POST
- **Payload**:
  ```json
  {
    "clientKeyDetailsId": 1,
    "data": "'{\"phone_number\":\"9876543210\",\"country_code\":\"+91\"}'"
  }
  ```
- **Headers**: `x-api-key`, `Cookie` (CSRF token)
- **Response UUID fields**: `uuid`, `user_id`, `userId`, `id`, `data.uuid`, `data.user_id`

### 2. Segment Analytics

- **Purpose**: Track form submission events
- **Endpoint**: `https://api.segment.io/v1/track`
- **Event Name**: `Demo Registration Success`
- **Properties**:
  - `demo_datetime` (ISO 8601 with IST offset)
  - `form_id`
  - `lead_category`
  - `preferred_language`
  - `preferred_mode`
  - `currentState`
  - `user_preferred_date` (formatted: "15th March 2024")
  - `user_preferred_time` (formatted: "2:30 PM")
  - UTM parameters
  - `year_of_graduation`

### 3. CRM Track Activity (Flow)

- **Purpose**: Log lead activity in CRM system
- **Endpoint**: `https://crm-integrations-apis.flowwai.work/api/sales_crm_core/track_activity/v1/`
- **Activity Reference ID**: `ACT_DEMO_FORM_SUBMIT`
- **Contact Identification**: PHONE_NUMBER
- **Key Fields**:
  - `ACT_RAD_UID` (user UUID)
  - `ACT_RAD_NAME` (user name)
  - `ACT_PHONE_NUMBER` (phone details)
  - `ACT_RAD_DEM_BKD_SLOT_DATE` (demo date)
  - `ACT_RAD_DEM_PREF_TIME_SLOT` (demo time slot)
  - `ACT_RAD_YOG` (year of graduation)
  - `ACT_RAD_NATIVE_STATE` (state)
  - `PREF_MODE_OF_STDY` (learning mode)

**Note**: CRM call is only made for `form_id === 'intensive-demo-form'`. For other forms, it's skipped with a warning.

## CORS Configuration

Allowed origins in development and production:

- `http://localhost:3000` (local frontend)
- `http://localhost:3001` (local backend testing)
- `http://127.0.0.1:3000` (local alternative)
- `https://nxtwave-lead.netlify.app` (production frontend)

**Allowed Headers**: `Content-Type`, `Authorization`, `X-Requested-With`, `x-api-key`, `Cookie`

**Allowed Methods**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`

**Credentials**: Enabled

To add more origins, edit the `allowedOrigins` array in `server-express.cjs`.

## Deployment

### Vercel (Serverless)

The project includes a Vercel serverless function at:
- `post-otp-events-handler.js` - Standalone handler with hardcoded production credentials
- `vercel.json` - CORS headers configuration

**Deploy steps:**
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the backend directory
3. Set environment variables in Vercel dashboard (optional, overrides defaults)

**Production URL**: `https://nxtwave-lead-backend.vercel.app`

### Express (Traditional Server)

Deploy to any Node.js hosting (AWS EC2, DigitalOcean, Railway, Render):

```bash
# Build (if using TypeScript)
npm run build

# Start
npm start
```

Use PM2 for process management:
```bash
npm install -g pm2
pm2 start server-express.cjs --name nxtwave-lead-backend
pm2 save
pm2 startup
```

## Monitoring & Logging

All logs use prefixed tags for filtering:

- `[Flow]` - Overall request flow
- `[DraftUser]` - Draft User API calls
- `[Segment]` - Segment analytics
- `[Segment Identify]` - Segment identify calls
- `[CRM]` - CRM activity logging

### Example log output:
```
[Flow] Starting DraftUser -> Segment flow
[DraftUser] Request payload: { clientKeyDetailsId: 1, data: '...' }
[DraftUser] API response: { uuid: '...' }
[DraftUser] Resolved UUID: a1b2c3d4...
[Flow] Segment identify event sent successfully
[Segment] Track success status: 200
[CRM] Starting CRM track activity for form: intensive-demo-form
[Flow] DraftUser -> Segment -> CRM flow completed successfully
```

## Testing

### Manual Testing with curl

```bash
# Health check
curl http://localhost:3001/health

# Post OTP events
curl -X POST http://localhost:3001/api/post-otp-events \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919876543210",
    "submissionPayload": {
      "form_id": "intensive-demo-form",
      "form_data": {
        "fullName": "Test User",
        "language": "Telugu",
        "preferredMode": "Online",
        "state": "Telangana",
        "graduationYear": "2023",
        "selectADateToBookASlot": "2024-03-15",
        "timeSlots": "2:30 PM - 3:30 PM",
        "lead_category": "intensive_lead",
        "utm_source": "test"
      }
    }
  }'
```

### Test Scenarios

| Scenario | Expected Response |
|----------|-------------------|
| Missing phoneNumber | 400 - `phoneNumber is required` |
| Invalid phone format | UUID still generated, no validation |
| Draft User API down | 502 - `Draft user API failed` |
| Segment API down | 500 - `Segment API failed` |
| CRM API down | 500 - `CRM Track Activity API failed` |
| Non-intensive form_id | 200 OK, CRM skipped with warning |

## Troubleshooting

### CORS Errors
- Check that frontend origin is in `allowedOrigins` array
- Verify headers include `Content-Type: application/json`
- Check browser console for specific CORS error messages

### API Integration Issues
- Verify environment variables are set correctly
- Check server logs (marked with `[DraftUser]`, `[Segment]`, `[CRM]`)
- Ensure API keys have proper permissions
- Test API endpoints independently

### Port Already in Use
Set a different port:
```bash
PORT=3002 npm start
```

## Security Considerations

1. **API Keys**: Production keys should be stored in environment variables only
2. **CORS**: Whitelist only trusted origins in production
3. **Rate Limiting**: Consider adding rate limiting in production
4. **Request Validation**: Add more robust validation for form_data fields
5. **Logging**: Avoid logging sensitive PII in production

## Development Tips

- Use `npm run dev` for development with auto-reload on file changes
- Check terminal logs with prefixes `[DraftUser]`, `[Segment]`, `[CRM]` for debugging
- Use environment variables to switch between staging/production APIs
- The serverless version (`post-otp-events-handler.js`) is standalone with embedded credentials for Vercel

## License

MIT
