# NxtWave Form Lead Backend

A Node.js/Express server handling lead registration form submissions with OTP events, Draft User API integration, and Segment analytics tracking.

## Features

- ✅ Express.js REST API server
- ✅ CORS properly configured for frontend-backend communication
- ✅ Draft User API integration for UUID generation
- ✅ Segment analytics event tracking
- ✅ Environment-based configuration
- ✅ Comprehensive error handling and logging

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
   cp .env.example .env
   ```
   Then edit `.env` and add your API keys:
   - `DRAFT_USER_API_KEY`
   - `DRAFT_USER_CSRF_COOKIE`
   - `SEGMENT_API_KEY`

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

## CORS Configuration

The server allows requests from:
- `http://localhost:3000` (local frontend)
- `http://localhost:3001` (local testing)
- `https://nxtwave-lead.netlify.app` (production frontend)

To add more origins, edit the `allowedOrigins` array in `server-express.cjs`.

## API Endpoints

### POST /api/post-otp-events
Handles post-OTP events: registers user with Draft User API and tracks event in Segment.

**Request:**
```json
{
  "phoneNumber": "+919876543210",
  "submissionPayload": {
    "form_id": "test-demo-form",
    "form_data": {
      "selected_webinar_slot_datetime": "2024-03-15 14:30",
      "selectADateToBookASlot": "2024-03-15",
      "timeSlots": "2:30 PM",
      "lead_category": "intensive_lead",
      "language": "Telugu",
      "graduationYear": 2023,
      "utm_campaign": "campaign",
      "utm_content": "content",
      "utm_medium": "medium",
      "utm_source": "source",
      "utm_term": "term"
    }
  }
}
```

**Response (Success):**
```json
{
  "ok": true,
  "uuid": "user-uuid-12345"
}
```

**Response (Error):**
```json
{
  "ok": false,
  "error": "Error message describing what went wrong"
}
```

### GET /health
Health check endpoint to verify server is running.

**Response:**
```json
{
  "status": "ok"
}
```

## Troubleshooting

### CORS Errors
- Check that your frontend origin is in the `allowedOrigins` array
- Verify headers include `Content-Type: application/json`
- Check browser console for specific CORS error messages

### API Integration Issues
- Verify environment variables are set correctly
- Check server logs (marked with `[DraftUser]`, `[Segment]`, `[Flow]`)
- Ensure API keys have proper permissions

### Port Already in Use
Set a different port:
```bash
PORT=3002 npm start
```

## Development Tips

- Use `npm run dev` for development with auto-reload on file changes
- Check terminal logs marked with `[DraftUser]`, `[Segment]`, and `[Flow]` for debugging
- Use environmental variables to switch between staging/production APIs

## License

MIT
# nxtwave-lead-backend
