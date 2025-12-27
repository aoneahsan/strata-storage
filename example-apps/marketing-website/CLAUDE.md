# CLAUDE.md - Strata Storage Marketing Website

This is a sub-project of strata-storage. See root CLAUDE.md for full project guidelines.

## Project Info

**Name**: Strata Storage Marketing Website
**Type**: React + Vite + Radix UI + Tailwind + Firebase
**Purpose**: Marketing site with auth and feedback system
**Parent**: strata-storage (workspace)

## Dev Server Port

| App | Port | Status |
|-----|------|--------|
| Marketing Website | 5948 | Registered in ~/.dev-ports.json |

### Port Management Rule (CRITICAL)

**NEVER use common/default ports** like 3000, 3001, 4000, 5000, 5173, 8000, 8080, etc.

**Three-Location Sync Required:**
1. **Project Config** - package.json dev script (`--port 5948`)
2. **This CLAUDE.md** - documented above
3. **Global Registry** - `~/.dev-ports.json` under key `strata-storage-website`

**Verification:** Before starting dev server, verify all 3 locations match.

## Commands

```bash
# Development
pnpm dev

# Build
pnpm build

# Preview production build
pnpm preview

# Lint
pnpm lint
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

### Firebase (Required)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### Analytics (Optional)
- `VITE_CLARITY_PROJECT_ID` - Microsoft Clarity
- `VITE_AMPLITUDE_API_KEY` - Amplitude

## Features

- Firebase Authentication (Email/Password + Google OAuth)
- Firestore for feedback/reviews
- Analytics integration (Firebase, Clarity, Amplitude)
- Responsive design with Radix UI + Tailwind

## Pages

- Home, Features, Docs
- Login (Auth)
- Feedback, Dashboard (Protected)
- Code Access, Privacy, Terms, Sitemap, 404

## Structure

```
marketing-website/
├── src/
│   ├── components/
│   │   ├── layout/       # Header, Footer
│   │   └── ui/           # Radix UI wrappers
│   ├── hooks/
│   │   ├── useAuth.tsx   # Firebase auth
│   │   └── useAnalytics.ts
│   ├── lib/
│   │   ├── firebase.ts   # Firebase config
│   │   └── utils.ts
│   ├── pages/            # All route pages
│   ├── services/
│   │   ├── analytics.ts  # 3-platform analytics
│   │   └── feedback.ts   # Firestore feedback
│   ├── App.tsx
│   └── main.tsx
├── .env.example
├── package.json
└── vite.config.ts
```

## Analytics Tracking

The analytics service tracks across 3 platforms:
- Page views (automatic on route change)
- Button clicks
- Form submissions
- API calls (with duration)
- Errors
- User properties

## Last Updated

2025-12-27
