# Personal Album

A production-focused personal photo album app built with Next.js App Router, Supabase, and Cloudinary.

## Features

- Cookie-based identity session (iron-session) with local identity cache
- Identity onboarding (name + email) with secure session login
- Deterministic color avatars from user email hash
- Albums with creator attribution
- Photo uploads with uploader attribution
- Emoji reactions on photos (party + album grids)
- Confetti delight on first-time party join and upload success
- Live party feed polling with "new photos" badge updates
- Full album or selected-photo ZIP downloads
- Party/event creation with 6-character join code
- QR-based sharing for guest participation
- Party join and shared party album views
- API hardening (validation, error contracts, and upload rate limiting)

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Supabase (Postgres)
- Cloudinary
- Tailwind CSS 4

## Environment Variables

Copy .env.example to .env.local and set values.

Required:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
- NEXT_PUBLIC_APP_URL
- SESSION_SECRET
- ADMIN_PASSWORD

Optional:

- ALLOWED_ORIGINS (comma-separated trusted browser origins for mutating API calls)

## Core Tables

- users
- albums
- photos
- parties
- party_members

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Quality Checks

```bash
npm run lint
npm run build
```

## Deploy (Vercel)

1. Add all required environment variables in project settings.
   - Include `ADMIN_PASSWORD` for `/admin` and `/api/admin/*` access.
   - Include `SESSION_SECRET` for encrypted identity sessions.
2. Deploy with npm run build.
3. Verify these flows in production:
   - identity onboarding
   - album create/upload
   - party create/join/upload
   - reactions + live party feed updates
   - ZIP download
   - admin login and admin management routes

## Security Notes

- Mutating routes validate request origin and payloads.
- Upload route enforces 10MB max size and image MIME allowlist.
- Upload route enforces per-IP quota: 20 uploads per hour.
- Shared download route enforces max photos and max archive size.
