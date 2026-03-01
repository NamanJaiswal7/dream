# Dream — AI Job Discovery Platform

An intelligent job discovery and resume management platform built with **Next.js 16**, **Firebase**, **Google Gemini AI**, and **Tailwind CSS**. It aggregates job listings from multiple sources (LinkedIn, Glassdoor, Indeed), provides AI-powered resume tailoring, and delivers personalised job recommendations.

---

## Tech Stack

| Layer       | Technology                                      |
| ----------- | ----------------------------------------------- |
| Framework   | Next.js 16 (App Router, React 19)               |
| Language    | TypeScript                                       |
| Styling     | Tailwind CSS v4                                  |
| Database    | Firebase Firestore                               |
| Auth        | Firebase Authentication                          |
| AI          | Google Gemini API · Ollama (local, optional)     |
| Scraping    | Custom adapters (LinkedIn, Glassdoor, Indeed)     |
| Deployment  | Vercel · Docker                                  |

---

## Prerequisites

Make sure you have the following installed before starting:

- **Node.js** ≥ 20 — [Download](https://nodejs.org/)
- **npm** ≥ 10 (ships with Node 20+)
- **Git** — [Download](https://git-scm.com/)
- **Docker & Docker Compose** *(only if you want to run with Docker)* — [Download](https://www.docker.com/)

---

## Local Setup (Step by Step)

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd dream
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the template and fill in your own values:

```bash
cp env-config.txt .env.local
```

Open `.env.local` in your editor and set the **required** variables:

#### Required

| Variable                                  | Where to get it                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`                          | [Google AI Studio](https://aistudio.google.com/) → Create API Key              |
| `FIREBASE_PROJECT_ID`                     | [Firebase Console](https://console.firebase.google.com/) → Project Settings    |
| `FIREBASE_CLIENT_EMAIL`                   | Firebase Console → Project Settings → Service Accounts                          |
| `FIREBASE_PRIVATE_KEY`                    | Firebase Console → Generate New Private Key (JSON) → copy the `private_key`     |
| `NEXT_PUBLIC_FIREBASE_API_KEY`            | Firebase Console → Project Settings → General → Web App config                  |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`        | Same as above                                                                   |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`         | Same as above                                                                   |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`     | Same as above                                                                   |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`| Same as above                                                                   |
| `NEXT_PUBLIC_FIREBASE_APP_ID`             | Same as above                                                                   |

#### Optional

| Variable                         | Purpose                                     |
| -------------------------------- | ------------------------------------------- |
| `ENABLE_LINKEDIN_SCRAPING`       | Enable LinkedIn job scraping (`true/false`)  |
| `ENABLE_GLASSDOOR_SCRAPING`      | Enable Glassdoor job scraping (`true/false`) |
| `ENABLE_INDEED_ADAPTER`          | Enable Indeed job scraping (`true/false`)     |
| `GOOGLE_SHEETS_*`                | Fallback storage when Firestore quota is hit |
| `OLLAMA_URL` / `OLLAMA_MODEL`    | Local AI via Ollama (default: `mistral`)     |
| `CRON_SECRET`                    | Secret token for the cron job endpoint       |
| `DEFAULT_JOB_TITLES`             | Comma-separated default job search titles    |
| `DEFAULT_LOCATIONS`              | Comma-separated default locations            |

> [!TIP]
> See [`ENV_SETUP.md`](./ENV_SETUP.md) for a detailed walkthrough on obtaining each key.

### 4. Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project (or use an existing one).
2. **Enable Firestore Database** — Firestore → Create Database → Start in test mode.
3. **Enable Authentication** — Authentication → Get Started → Enable Email/Password (or your preferred provider).
4. **Get client config** — Project Settings → General → scroll to "Your apps" → Add a Web App → copy the config object values into your `.env.local`.
5. **Get Admin SDK credentials** — Project Settings → Service Accounts → Generate New Private Key → copy `project_id`, `client_email`, and `private_key` into your `.env.local`.

### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at **[http://localhost:3000](http://localhost:3000)**.

---

## Running with Docker

If you prefer Docker (includes an Ollama LLM server for local AI):

### 1. Build and Start All Services

```bash
docker compose up --build
```

This starts three services:

| Service        | Port    | Description                         |
| -------------- | ------- | ----------------------------------- |
| `app`          | `3000`  | Next.js application                  |
| `ollama`       | `11434` | Ollama LLM server                    |
| `ollama-init`  | —       | One-time model pull (Mistral)        |

### 2. Stop Services

```bash
docker compose down
```

> [!NOTE]
> The Ollama model data is persisted in a Docker volume (`ollama-data`), so subsequent starts are faster.

---

## Available Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start dev server with hot reload     |
| `npm run build`   | Create production build              |
| `npm run start`   | Start production server              |
| `npm run lint`    | Run ESLint                           |

---

## Project Structure

```
dream/
├── src/
│   ├── adapters/        # Job scraping adapters (LinkedIn, Glassdoor, Indeed)
│   ├── app/             # Next.js App Router pages & API routes
│   │   ├── api/         # Backend API endpoints
│   │   ├── jobs/        # Job listing page
│   │   ├── profile/     # User profile page
│   │   └── settings/    # Settings page
│   ├── components/      # Reusable React components (including resume editor)
│   ├── lib/             # Shared utilities and Firebase config
│   ├── prompts/         # AI prompt templates
│   ├── services/        # Business logic services
│   ├── templates/       # Resume/document templates
│   └── types/           # TypeScript type definitions
├── public/              # Static assets
├── env-config.txt       # Environment variable template
├── Dockerfile           # Multi-stage production Docker build
├── docker-compose.yml   # Docker Compose (app + Ollama)
└── vercel.json          # Vercel cron job configuration
```

---

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub / GitLab / Bitbucket.
2. Import the project in [Vercel](https://vercel.com/new).
3. Add all required environment variables in the Vercel dashboard under **Settings → Environment Variables**.
4. Deploy — Vercel auto-detects Next.js and handles the rest.

A cron job (`/api/cron/fetch-jobs`) is configured to run daily at **06:00 UTC** via `vercel.json`.

### Docker (Self-hosted)

```bash
docker compose up --build -d
```

---

## Troubleshooting

| Issue                              | Fix                                                                 |
| ---------------------------------- | ------------------------------------------------------------------- |
| `FIREBASE_PRIVATE_KEY` parse error | Make sure the key is wrapped in double quotes with `\n` line breaks |
| Port 3000 already in use           | Kill the process: `lsof -ti:3000 \| xargs kill -9`                  |
| Ollama model not loading           | Run `docker compose logs ollama` to check health status             |
| Build fails on `standalone` output | Verify `output: 'standalone'` is set in `next.config.ts`            |

---

## License

This project is private and not licensed for public distribution.
