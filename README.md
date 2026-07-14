# CivFlow — AI Site Diary Assistant (MVP)

A Progressive Web App for civil contractors: a supervisor captures site
photos, a voice note, and any documents; CivFlow will draft the site diary,
labor log, equipment log, weather log, and safety observations automatically.
This is Stage 1 of the CivFlow roadmap — see
`CivFlow_MVP_Technical_Plan.docx` in the outputs folder for full context.

**Status:** Phase 0 (foundations) and Phase 1 (capture) are built. Phase 2
(AI extraction) is not wired up yet — entries currently save as drafts with
raw photos/voice/documents attached, but nothing analyzes them yet.

## What's here

- Next.js 16 (App Router) + TypeScript + Tailwind, configured as an
  installable PWA (manifest + service worker).
- Supabase for Postgres, auth, and file storage.
- Email/password auth with company-scoped row-level security.
- Project creation, a project list, and a diary-entry capture screen
  (photo upload, in-browser voice recording, document upload).

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In the SQL Editor, run the contents of `supabase/migrations/0001_init.sql`.
   This creates every table, the row-level security policies, and the
   `diary-media` storage bucket.
3. In Project Settings → API, copy the **Project URL** and **anon public
   key**.

## 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with
the values from step 1.

## 3. Run it locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up for an account
— new accounts aren't linked to a company yet, so you'll see a banner asking
an admin to assign one.

## 4. Create your first company and link your account

Run this once in the Supabase SQL Editor (replace the email):

```sql
insert into companies (name) values ('Your Company Name') returning id;

-- copy the id from above, then:
update profiles
set company_id = '<the-id-above>', role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Refresh the app — you should now be able to create a project and start a
site diary entry.

## Roadmap (from the technical plan)

- **Phase 2 — AI pipeline:** transcribe the voice note, send the transcript
  + photos to Claude for structured extraction, and populate the labor,
  equipment, weather, safety, and progress records automatically.
- **Phase 3 — Review & output:** a review/edit screen for the AI's draft,
  one-tap approval, PDF generation, and client email delivery.
- **Phase 4 — Pilot polish:** auto-fetched weather by site location/date,
  better error handling, and onboarding for the first 1–2 pilot contractors.

## Deploying

This deploys cleanly to [Vercel](https://vercel.com/new) — connect the repo
and add the same environment variables from `.env.local` in the Vercel
project settings.
