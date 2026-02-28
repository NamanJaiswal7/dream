# Environment Setup Guide

## Quick Start

1. Copy `env-config.txt` to `.env.local`
2. Fill in the required values
3. Run `npm run dev`

## Required Configuration

### Google Gemini API (AI Features)

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create an API key
3. Set `GEMINI_API_KEY=your-key`

### Firebase (Data Storage)

1. Create a [Firebase project](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Go to Project Settings > Service Accounts
4. Generate new private key
5. Copy the values to your `.env.local`:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (include full key with `\n` line breaks)

## Optional Configuration

### Job Scraping Adapters

Enable specific job scrapers by setting these flags:

```bash
ENABLE_LINKEDIN_SCRAPING=true    # LinkedIn public jobs
ENABLE_GLASSDOOR_SCRAPING=true   # Glassdoor public jobs
ENABLE_INDEED_ADAPTER=true       # Indeed EU markets
```

**Note**: These scrapers use public job listings. For production at scale, consider official APIs.

### Google Sheets Fallback

Used when Firebase quota is exceeded:

1. Create a [Google Cloud service account](https://console.cloud.google.com/)
2. Enable Sheets API
3. Create a spreadsheet and share with service account email
4. Set the environment variables

## Security Notes

- Never commit `.env.local` to version control
- Use environment secrets in production (Vercel, etc.)
- Rotate API keys periodically
