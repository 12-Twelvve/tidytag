# Tidy Tag — House & Lease Cleaning Platform

A dynamic booking platform: live pricing built from a config file (not hardcoded),
Google Business reviews, and a real booking pipeline that emails your team (and the
customer) the moment a request comes in. Ships as a single Node/Express app, ready
for Cloud Run.

## What's dynamic / customizable

Everything a business owner needs to change lives in two JSON files —
no code edits, no redeploy of the frontend needed for content changes (just restart
the service, or move these into a database/CMS later if you want live editing):

- `server/config/business.json` — name, tagline, booking inbox, brand colors, Google Place ID
- `server/config/pricing.json` — property types + multipliers, cleaning tiers + rates,
  add-ons + prices, frequency discounts, min/max room limits

The frontend (`public/app.js`) fetches `/api/config` on load and builds every pill,
tier card, add-on, and price calculation from that data. Change the JSON, restart,
done.

## Architecture

```
public/            static frontend (vanilla HTML/CSS/JS, no build step)
server/
  index.js         Express app + static file serving
  routes/
    config.js       GET  /api/config    -> business + pricing config
    quote.js         POST /api/quote     -> server-side authoritative price calc
    reviews.js        GET  /api/reviews    -> Google Places reviews (cached) or fallback
    bookings.js       POST /api/bookings   -> validates, prices, saves, emails
  lib/
    pricing.js       shared pricing calculator (single source of truth)
    email.js         nodemailer — sends booking + confirmation emails
    store.js         Firestore persistence (graceful no-op if not configured)
  config/
    business.json, pricing.json, reviews-fallback.json
Dockerfile
```

## Local development

```bash
npm install
cp .env.example .env      # fill in what you have; everything else degrades gracefully
npm run dev                # http://localhost:8080
```

With no `.env` values set: the site fully works, quotes calculate correctly, bookings
are accepted, and emails are logged to the console instead of sent (so you can build
without needing live credentials).

## Making it production ready on GCP

### 1. Google Places reviews (optional but recommended)
- Enable the **Places API** in your GCP project, create an API key, restrict it to
  the Places API and your domain.
- Find your business's Place ID: https://developers.google.com/maps/documentation/places/web-service/place-id
- Set `GOOGLE_PLACES_API_KEY` and `GOOGLE_PLACE_ID`. Without these, the site shows
  the bundled sample reviews instead of failing.

### 2. Email (booking notifications)
Any SMTP provider works — SendGrid, Postmark, Gmail with an app password, your own
mail server. Set:
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
SMTP_FROM="Tidy Tag <bookings@yourdomain.com>"
```
Update `bookingEmail` in `server/config/business.json` to where requests should land.

### 3. Firestore (booking storage)
```bash
gcloud firestore databases create --location=<region> --type=firestore-native
```
On Cloud Run, the service picks up Application Default Credentials automatically —
no key file needed as long as the Cloud Run service account has the
**Cloud Datastore User** role.

### 4. Build & deploy to Cloud Run
```bash
# one-time
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com firestore.googleapis.com places-backend.googleapis.com

# build and push
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/tidy-tag

# deploy
gcloud run deploy tidy-tag \
  --image gcr.io/YOUR_PROJECT_ID/tidy-tag \
  --platform managed \
  --region YOUR_REGION \
  --allow-unauthenticated \
  --set-env-vars SMTP_HOST=smtp.sendgrid.net,SMTP_PORT=587,SMTP_FROM="Tidy Tag <bookings@yourdomain.com>" \
  --set-secrets SMTP_USER=smtp-user:latest,SMTP_PASS=smtp-pass:latest,GOOGLE_PLACES_API_KEY=places-key:latest
```

Prefer Secret Manager over `--set-env-vars` for anything sensitive (`SMTP_PASS`,
`GOOGLE_PLACES_API_KEY`):
```bash
echo -n "your_secret_value" | gcloud secrets create smtp-pass --data-file=-
gcloud secrets add-iam-policy-binding smtp-pass \
  --member=serviceAccount:YOUR_SERVICE_ACCOUNT --role=roles/secretmanager.secretAccessor
```

### 5. Custom domain
```bash
gcloud run domain-mappings create --service tidy-tag --domain book.yourdomain.com --region YOUR_REGION
```

## Notes on going further

- **Rate/abuse protection**: add a captcha or Cloud Armor rule in front of `/api/bookings`
  before going fully public.
- **Admin editing without redeploys**: move `pricing.json`/`business.json` into Firestore
  and read them at request time instead of `require()`, then build a small authenticated
  admin page to edit them.
- **Multiple properties/franchises**: the config shape is intentionally per-tenant —
  keying business/pricing config by subdomain or path is a straightforward next step.
