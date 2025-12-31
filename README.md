# FluxShield

AI-powered marketing campaign generator for Shopify products. Paste a product URL, upload brand assets, choose a style, and generate 12 product images + 7 social media captions ready for your marketing campaigns.

## Features

- **Shopify Product Ingestion**: Automatically extract product title, description, price, and images from any Shopify product URL
- **4 Style Presets**: Bright Minimal, Dark Moody, Outdoor Lifestyle, Studio Macro
- **AI Image Generation**: Generate 12 unique product images using fal.ai's Flux Pro model
- **Caption Generation**: 7-day social media caption schedule with hooks, CTAs, and hashtags
- **Multi-format Export**: Download zip with 3 aspect ratios (Square 1080x1080, Portrait 1080x1350, Story 1080x1920)
- **Subscription Billing**: Stripe-powered subscriptions with quota enforcement
- **Job Queue**: Asynchronous generation with progress tracking

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (Postgres + Auth + Storage)
- **Image Generation**: fal.ai (Flux Pro)
- **Caption Generation**: OpenRouter (Claude 3.5 Sonnet)
- **Billing**: Stripe
- **Image Processing**: Sharp
- **Zip Generation**: JSZip

## Prerequisites

- Node.js 18+
- npm
- Supabase account
- Stripe account
- fal.ai account
- OpenRouter account

## Setup

### 1. Clone and Install

```bash
git clone <repository>
cd fluxshield
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the following values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_AGENCY=price_...

# fal.ai
FAL_KEY=your-fal-ai-key

# OpenRouter
OPENROUTER_API_KEY=your-openrouter-key

# Worker Security
WORKER_SECRET=generate-a-random-secret-here

# Admin Emails (comma-separated)
ADMIN_EMAILS=admin@example.com

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Supabase Setup

#### Create Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings > API

#### Run Migrations
1. Go to SQL Editor in your Supabase dashboard
2. Run the contents of `supabase/migrations/001_initial_schema.sql`
3. Run the contents of `supabase/migrations/002_storage_buckets.sql`

#### Enable Auth
1. Go to Authentication > Providers
2. Enable Email provider
3. Configure email templates as needed

#### Storage Setup
The migration script creates the `fluxshield` bucket automatically. Verify:
1. Go to Storage
2. Confirm `fluxshield` bucket exists with RLS policies

### 4. Stripe Setup

#### Create Products and Prices
1. Go to Stripe Dashboard > Products
2. Create three subscription products:
   - **Starter**: $29/month
   - **Pro**: $79/month
   - **Agency**: $199/month
3. Copy each price ID to your `.env.local`

#### Configure Webhooks
1. Go to Developers > Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

For local development, use Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### 5. fal.ai Setup

1. Sign up at [fal.ai](https://fal.ai)
2. Go to Dashboard > API Keys
3. Create a new API key
4. Copy to `FAL_KEY` in `.env.local`

### 6. OpenRouter Setup

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Go to Keys section
3. Create a new API key
4. Copy to `OPENROUTER_API_KEY` in `.env.local`

### 7. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Deployment (Vercel)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo>
git push -u origin main
```

### 2. Deploy to Vercel

1. Import project at [vercel.com](https://vercel.com)
2. Add all environment variables from `.env.local`
3. Deploy

### 3. Configure Production Webhooks

1. Update Stripe webhook URL to production domain
2. Update `NEXT_PUBLIC_APP_URL` to production URL

### 4. Cron Jobs

The `vercel.json` configures a cron job to run the worker every minute:

```json
{
  "crons": [
    {
      "path": "/api/worker/run",
      "schedule": "* * * * *"
    }
  ]
}
```

Note: Vercel cron requires a paid plan. Alternatively, use an external cron service to call `/api/worker/run` with the `X-WORKER-SECRET` header.

## Architecture

### Database Schema

- **profiles**: User profiles linked to auth.users
- **brands**: Brand configurations with color palettes
- **brand_assets**: Uploaded images (product, logo, moodboard)
- **campaigns**: Campaign metadata and product data
- **generation_jobs**: Job queue for async processing
- **generated_images**: AI-generated images with favorites/flags
- **generated_captions**: 7-day caption schedule
- **downloads**: Zip file download records
- **subscriptions**: Stripe subscription mirror
- **usage_ledger**: Monthly usage tracking

### Job Processing

1. Campaign creation queues `images` and `captions` jobs
2. Worker claims one job at a time using "skip locked" semantics
3. Each job type has its own processor
4. Jobs retry up to 3 times on failure
5. Campaign status updates based on job completion

### Quota Enforcement

- Free: 1 campaign total (ever)
- Starter: 10 campaigns/month
- Pro: 40 campaigns/month
- Agency: 150 campaigns/month

Quotas reset at the start of each calendar month.

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/ingest-product` | POST | Fetch Shopify product data |
| `/api/campaigns/create` | POST | Create new campaign |
| `/api/campaigns/[id]/zip` | POST | Generate export zip |
| `/api/worker/run` | POST | Process queued jobs |
| `/api/billing/checkout` | POST | Create Stripe checkout |
| `/api/billing/portal` | POST | Access Stripe portal |
| `/api/webhooks/stripe` | POST | Stripe webhook handler |

## Admin

Access admin panel at `/app/admin/jobs` (requires email in `ADMIN_EMAILS`).

Features:
- View job queue status
- Monitor failed jobs
- Manually trigger worker

## Troubleshooting

### Images not generating
1. Check `FAL_KEY` is valid
2. Check job queue in admin panel
3. Verify worker is running (check cron or trigger manually)

### Captions not generating
1. Check `OPENROUTER_API_KEY` is valid
2. Verify sufficient credits in OpenRouter account

### Stripe webhooks failing
1. Verify `STRIPE_WEBHOOK_SECRET` matches
2. Check webhook logs in Stripe dashboard
3. For local dev, ensure `stripe listen` is running

### Storage errors
1. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
2. Check storage bucket exists with correct policies

## License

MIT
