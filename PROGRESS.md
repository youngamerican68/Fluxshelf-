# FluxShield Development Progress

## Status: MVP Hardened - Ready for First Revenue

**Last Updated:** January 4, 2026

**Current Pipeline:** Cutout + Composite (background removal → lifestyle backgrounds + white backgrounds → Sharp composite)
**Output:** 18 images per campaign (12 lifestyle + 6 marketplace-compliant white)
**Billing:** Stripe disabled by default (`ENABLE_STRIPE=false`), free tier: 1 campaign lifetime, 2 regenerations

---

## Completed Phases

### Phase 1: Scaffold + Auth + DB Setup
- [x] Next.js 15 project initialized with TypeScript
- [x] Tailwind CSS + shadcn/ui components configured
- [x] Supabase client setup (browser, server, middleware)
- [x] Authentication pages (login, signup)
- [x] Google OAuth integration
- [x] Protected routes with middleware
- [x] Database schema designed (`supabase/migrations/001_initial_schema.sql`)
- [x] Storage bucket configuration (`supabase/migrations/002_storage_buckets.sql`)
- [x] Type definitions generated (`src/types/database.ts`)

### Phase 2: Brand + Asset Upload System
- [x] Brand creation page (`/app/brands/new`)
- [x] File uploader component with drag-and-drop
- [x] Color picker component for brand palette
- [x] Brand detail page (`/app/brands/[id]`)
- [x] Asset storage in Supabase Storage
- [x] Signed URL generation for secure access

### Phase 3: Shopify Product URL Ingestion
- [x] Product URL ingestion API (`/api/ingest-product`)
- [x] HTML parsing to extract product data
- [x] JSON-LD schema support
- [x] Meta tag fallbacks
- [x] Image URL extraction

### Phase 4: Generation Pipeline with Job Queue
- [x] Campaign creation API (`/api/campaigns/create`)
- [x] Job queue system with `generation_jobs` table
- [x] Worker endpoint (`/api/worker/run`)
- [x] "Skip locked" job claiming semantics
- [x] Retry logic (max 3 attempts)
- [x] fal.ai integration for image generation
- [x] OpenRouter integration for caption generation
- [x] 4 style presets implemented
- [x] 12 scene variations for image diversity

### Phase 5: Favorites, Crops, and Zip Export
- [x] Campaign detail page (`/app/campaigns/[id]`)
- [x] Image grid with selection (up to 6 favorites)
- [x] Image flagging for feedback
- [x] Sharp integration for image cropping
- [x] 3 aspect ratios (Square, Portrait, Story)
- [x] Thumbnail generation
- [x] JSZip integration for export
- [x] Captions CSV export
- [x] Product metadata JSON export

### Phase 6: Stripe Billing + Quota Enforcement
- [x] Stripe SDK integration
- [x] Checkout session creation (`/api/billing/checkout`)
- [x] Customer portal (`/api/billing/portal`)
- [x] Webhook handler (`/api/webhooks/stripe`)
- [x] Subscription status sync
- [x] Plan limits configuration (Free, Starter, Pro, Agency)
- [x] Quota checking before campaign creation
- [x] Usage ledger with monthly tracking
- [x] Billing page with plan comparison

### Phase 7: Polish, Admin, Documentation
- [x] Admin jobs page (`/app/admin/jobs`)
- [x] Job status monitoring
- [x] Manual worker trigger button
- [x] Dashboard with usage stats
- [x] README documentation
- [x] Environment variable documentation
- [x] Build successfully passes

### Phase 8: Landing Page Redesign (Dec 31, 2025)
- [x] Hero section with app screenshot mockup
- [x] Step 1: Paste Shopify URL (extracted data visual)
- [x] Step 2: Choose visual style (4 preset cards)
- [x] Step 3: 12 lifestyle product shots (image grid)
- [x] Step 4: 7 days of captions (caption cards with hashtags)
- [x] Step 5: Download pack (ZIP structure visualization)
- [x] Stats bar (5 min, 12 images, 3 formats)
- [x] Pricing section with 4 tiers
- [x] Final CTA and footer
- [x] Fixed broken Unsplash image URLs

### Phase 9: Image-to-Image & Enhanced Captions (Jan 1, 2026)
- [x] FLUX Redux integration for image-to-image generation
- [x] Product image passed from Shopify scrape to generation pipeline
- [x] Fallback to FLUX Schnell for text-to-image when no image
- [x] Platform-specific captions (Instagram, TikTok, Pinterest)
- [x] UTM-tagged links with platform-specific tracking
- [x] Posting schedule with day names and suggested dates
- [x] Updated ZIP export with multi-platform CSV format
- [x] Updated README in ZIP with platform tips

### Phase 10: Cutout+Composite Pipeline & Pre-Commit Hardening (Jan 1, 2026)
- [x] Background removal via fal.ai/birefnet (cutout step)
- [x] Lifestyle background generation via FLUX Schnell
- [x] Sharp composite overlay (cutout onto backgrounds)
- [x] Cutout caching by SHA-256 hash (`product_cutouts` table)
- [x] 3-step job pipeline: cutout → backgrounds → composite
- [x] `run_id` versioning for idempotent regenerations
- [x] Stripe feature flag (`ENABLE_STRIPE` env var)
- [x] Quotas without Stripe (free tier: 1 campaign lifetime, 2 regenerations)
- [x] Auto-create profile + subscription on signup (DB trigger)
- [x] Cleanup intermediate backgrounds after composite
- [x] Node.js runtime for worker + ZIP routes (Sharp/JSZip compatibility)
- [x] Migration 003 applied (cutouts, triggers, quota RPCs)

### Phase 11: Merged Brand/Campaign Flow (Jan 1, 2026)
- [x] Campaign creation no longer requires brand first
- [x] Auto-create "My Brand" if user doesn't select one
- [x] Brand section is optional collapsible accordion on campaign page
- [x] Brand page removes required product image (products belong to campaigns)
- [x] Dashboard primary CTA changed from "New Brand" to "Create Campaign"
- [x] Added "Skip for now" link on brand page
- [x] Added Collapsible UI component (`@radix-ui/react-collapsible`)

**New User Flow:**
1. Sign up → Dashboard
2. Click "Create Campaign" (primary CTA)
3. Paste Shopify URL → Fetch product data
4. Select style preset
5. (Optional) Expand "Brand Settings" accordion
6. Click "Generate Campaign"

### Phase 12: Marketplace-Compliant White Backgrounds (Jan 4, 2026)
- [x] Added 6 programmatic white/neutral background styles (no AI cost)
- [x] Pure white (#FFFFFF) - Amazon compliant
- [x] Soft gray gradient, off-white, vignette, light neutral, subtle radial
- [x] Worker generates 12 lifestyle + 6 white = 18 total backgrounds
- [x] Same composite pipeline handles all 18 images
- [x] White backgrounds stored with descriptive prompts in metadata

**Output per campaign:** 18 images (12 lifestyle + 6 marketplace-ready white backgrounds)

---

## To Be Implemented (Lightweight)

### Copy Product Image to Storage Before Pipeline
**Problem:** Pipeline currently fetches from Shopify CDN URLs, which introduces dependency on external uptime/rate limits and makes retries less reliable.

**Recommendation:** On campaign creation (or at cutout step), copy the chosen product image into Supabase storage, then run the pipeline from that stored asset.

**Benefits:**
- Eliminates dependency on Shopify CDN uptime/rate limits for retries/regenerations
- Makes runs reproducible (same pixels even if product changes later)
- Simplifies security/logging and makes caching more reliable
- Handles "scrape found images but worker can't fetch them" edge case

**Implementation Notes:**
- Keep scraped CDN URLs in `product_images` for reference
- Add `source_image_path` column to campaigns for stored copy
- Pipeline prefers stored path once available
- `downloadFromUrl()` improvements:
  - Set reasonable User-Agent header
  - Add timeout (e.g., 30s)
  - Add max size limit (e.g., 20MB) to reject oversized files
  - Accept and normalize formats (webp common from Shopify)
  - Sharp handles most formats, but be explicit about conversions before hashing

**Files to modify:**
- `src/lib/storage.ts` - Add size/timeout limits to `downloadFromUrl()`
- `src/app/api/campaigns/create/route.ts` - Copy first product image to storage
- `src/app/api/worker/run/route.ts` - Prefer `source_image_path` over CDN URL
- Migration - Add `source_image_path TEXT` to campaigns table

---

## Future Roadmap

### Phase 13: Auto-QC / "De-AI-fy" Filter
**Problem:** AI-generated images sometimes have artifacts (hands, text, shadows).

**Solution:** Add automated quality check loop:
- Use cheap vision model to detect likely failures
- Auto-flag problematic images
- Auto-regenerate only the bad ones
- Show QC status to user

### Phase 14: Marketplace Crop Presets
**Problem:** Different platforms have different image requirements.

**Solution:** Add marketplace-specific crop presets:
- Amazon (85% product fill, white background, 1:1)
- Etsy (4:3 landscape, lifestyle preferred)
- Walmart (1:1, white background)
- eBay (1:1, clean background)
- Shopify (various aspect ratios)

**Crops per platform:** ~10 total sizes (vs current 3)

### Phase 15: Buffer Integration (Auto-Scheduling)
**Problem:** Users manually download ZIP and upload to social platforms.

**Solution:** Integrate with Buffer API for one-click scheduling:
- OAuth flow to connect user's Buffer account
- "Schedule to Buffer" button on campaign detail page
- Push 7 posts (images + captions) to Buffer queue
- Auto-space posts (1 per day)
- Supports Instagram, TikTok, Pinterest via Buffer

**Implementation:**
- Buffer OAuth (store access token per user)
- API endpoint to push campaign to Buffer
- Settings page to manage Buffer connection
- Handle image upload to Buffer's media API

**User requirements:**
- Buffer account (free tier: 3 channels)
- Social accounts connected in Buffer

---

## Build Status

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ 19 pages generated
```

### Page Summary
| Route | Type | Size |
|-------|------|------|
| `/` | Static | 176 B |
| `/login` | Static | 3.33 kB |
| `/signup` | Static | 3.41 kB |
| `/app` | Dynamic | 2.47 kB |
| `/app/billing` | Dynamic | 8.67 kB |
| `/app/brands/new` | Dynamic | 21.3 kB |
| `/app/campaigns/new` | Dynamic | 8.66 kB |
| `/app/campaigns/[id]` | Dynamic | 11.4 kB |
| `/app/admin/jobs` | Dynamic | 3.31 kB |

---

## Remaining Tasks

### Database Setup ✅
- [x] Create Supabase project (Flux Shelf - wjewmhrrkbjjqyiuggww)
- [x] Run `001_initial_schema.sql` migration
- [x] Run `002_storage_buckets.sql` migration
- [x] Run `003_cutouts_triggers_quota.sql` migration
- [x] Configure authentication providers (Email + Google OAuth)
- [x] Verify RLS policies are active

### External Service Setup
- [x] Configure fal.ai API key
- [x] Configure OpenRouter API key
- [ ] Create Stripe products and prices (optional - billing disabled by default)
- [ ] Configure Stripe webhooks (optional - billing disabled by default)

### Deployment
- [ ] Deploy to Vercel
- [ ] Configure production environment variables
- [ ] Set up cron job for worker
- [ ] Configure custom domain (optional)

### Testing
- [ ] Test full user flow (signup → brand → campaign → export)
- [ ] Test cutout+composite pipeline end-to-end
- [ ] Test quota enforcement (free tier: 1 campaign, 2 regenerations)
- [ ] Test ZIP export with all 3 aspect ratios
- [ ] (Optional) Test Stripe subscription upgrade flow

---

## File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── app/
│   │   ├── admin/jobs/page.tsx
│   │   ├── billing/page.tsx
│   │   ├── brands/[id]/page.tsx
│   │   ├── brands/new/page.tsx
│   │   ├── campaigns/[id]/page.tsx
│   │   ├── campaigns/new/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── api/
│   │   ├── billing/checkout/route.ts
│   │   ├── billing/portal/route.ts
│   │   ├── campaigns/create/route.ts
│   │   ├── campaigns/[id]/regenerate/route.ts
│   │   ├── campaigns/[id]/zip/route.ts
│   │   ├── webhooks/stripe/route.ts
│   │   ├── ingest-product/route.ts
│   │   └── worker/run/route.ts
│   └── page.tsx (landing)
├── components/
│   ├── ui/ (shadcn components)
│   ├── app-nav.tsx
│   ├── billing-actions.tsx
│   ├── campaign-detail.tsx
│   ├── color-picker.tsx
│   ├── file-uploader.tsx
│   └── trigger-worker-button.tsx
├── lib/
│   ├── supabase/
│   ├── fal.ts              # removeBackground(), generateBackground()
│   ├── flags.ts            # isStripeEnabled()
│   ├── image-processing.ts # compositeProductOnBackground(), hashImage()
│   ├── openrouter.ts       # generateCaptions(), formatCaptionsForCSV()
│   ├── quota.ts            # checkCampaignQuota(), lifetime vs monthly
│   ├── shopify.ts          # Shopify product scraper
│   ├── storage.ts          # uploadFile(), downloadFromUrl()
│   ├── stripe.ts           # PLAN_LIMITS, getStripe()
│   └── zip-generator.ts    # generateCampaignZip()
└── types/
    └── database.ts

supabase/
└── migrations/
    ├── 001_initial_schema.sql
    ├── 002_storage_buckets.sql
    └── 003_cutouts_triggers_quota.sql
```

---

## Known Issues / Warnings

1. **ESLint Warnings** (non-blocking):
   - Unused `router` variable in signup page
   - Unused `parseError` function in openrouter.ts
   - Unused eslint-disable directives in some files

2. **Supabase Edge Runtime Warning**:
   - `@supabase/realtime-js` uses Node.js APIs not supported in Edge Runtime
   - This only affects middleware, functionality still works

3. **Webpack Cache Warning**:
   - Serializing big strings impacts deserialization performance
   - Consider using Buffer for large data

---

## Environment Variables Required

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Feature Flags
ENABLE_STRIPE=false  # Set to "true" to enable billing (default: false)

# Stripe (only required if ENABLE_STRIPE=true)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
STRIPE_PRICE_AGENCY=

# AI Services (required for generation)
FAL_KEY=
OPENROUTER_API_KEY=

# Security
WORKER_SECRET=
ADMIN_EMAILS=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Quick Start (After Database Setup)

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env.local
# Fill in required values (Supabase, fal.ai, OpenRouter, WORKER_SECRET)
# ENABLE_STRIPE defaults to false - free tier works without Stripe

# 3. Run migrations in Supabase SQL Editor
# - 001_initial_schema.sql
# - 002_storage_buckets.sql
# - 003_cutouts_triggers_quota.sql

# 4. Start development server
npm run dev

# 5. Visit http://localhost:3000 (or next available port)
```
