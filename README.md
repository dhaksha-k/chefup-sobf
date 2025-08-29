# ChefUp Web — Micro‑Quiz Starter

A minimal React + Vite + Tailwind + Firebase starter implementing the ChefUp pre‑beta micro‑quiz flow.

## Features
- 3‑step tap‑only quiz → archetype mapping
- Email capture
- Teaser dashboard (4 locked cards)
- Confirmation screen (writes `welcomeComplete`)
- Event‑only print card (Avery 5390 3×4in) with QR code
- Firebase Anonymous Auth + Firestore upserts
- Tight, flat schema for easy migration later

## Quick start
```bash
npm i
cp .env.example .env
# Fill in Firebase values in .env
npm run dev
```

## Deploy
- Vercel/Netlify with environment variables: `VITE_FB_API_KEY`, `VITE_FB_AUTH_DOMAIN`, `VITE_FB_PROJECT_ID`, `VITE_FB_APP_ID`

## Firestore Rules
See `Firestore.rules` (tighten for production).

## Adjusting print size
- Default is 4x6  Edit the `@page` rule in `src/styles/globals.css` for other stock (e.g., 2x3.5in for 5371).

## Routes
- `/` quiz
- `/signup` email capture
- `/teaser` teaser
- `/done` confirmation
- `/print` event print
```

## Schema (example)
```json
{
  "email": "chef@email.com",
  "chefType": "purist",
  "wantsGigs": true,
  "offersDelivery": true,
  "chefFarmerConnect": true,
  "wantsCert": false,
  "wantsSell": true,
  "betaAccess": true,
  "welcomeComplete": true,
  "wantsEvents": true,
  "referralPending": false,
  "printedCard": false,
  "createdAt": 1724500000000
}
```
