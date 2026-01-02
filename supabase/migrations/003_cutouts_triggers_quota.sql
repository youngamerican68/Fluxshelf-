-- FluxShield Migration 003: Cutouts, Triggers, Quota
-- Run this migration in your Supabase SQL Editor

-- ============================================================================
-- 1. NEW TABLES
-- ============================================================================

-- Product cutouts cache (service-role only access)
CREATE TABLE product_cutouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_hash TEXT UNIQUE NOT NULL,
  storage_path TEXT NOT NULL,
  width INT,
  height INT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_cutouts_hash ON product_cutouts(image_hash);

-- RLS: Only service role can access (no policies = deny all for authenticated)
ALTER TABLE product_cutouts ENABLE ROW LEVEL SECURITY;

-- Generated backgrounds (intermediate storage for composite pipeline)
CREATE TABLE generated_backgrounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  run_id UUID NOT NULL,
  index INT NOT NULL CHECK (index >= 0 AND index < 12),
  storage_path TEXT NOT NULL,
  prompt TEXT,
  seed BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_backgrounds_campaign ON generated_backgrounds(campaign_id);
CREATE INDEX idx_backgrounds_run ON generated_backgrounds(run_id);

-- RLS for generated_backgrounds (same as generated_images)
ALTER TABLE generated_backgrounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generated backgrounds" ON generated_backgrounds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = generated_backgrounds.campaign_id AND campaigns.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 2. ALTER EXISTING TABLES
-- ============================================================================

-- Add run_id to generation_jobs
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS run_id UUID;
CREATE INDEX IF NOT EXISTS idx_jobs_run_id ON generation_jobs(run_id);

-- Add run_id to generated_images
ALTER TABLE generated_images ADD COLUMN IF NOT EXISTS run_id UUID;

-- Add cutout_path to campaigns (for composite job to find cutout)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cutout_path TEXT;

-- Update step CHECK constraint to include new steps
-- First drop the old constraint, then add the new one
ALTER TABLE generation_jobs DROP CONSTRAINT IF EXISTS generation_jobs_step_check;
ALTER TABLE generation_jobs ADD CONSTRAINT generation_jobs_step_check
  CHECK (step IN ('images', 'captions', 'zip', 'cutout', 'backgrounds', 'composite'));

-- ============================================================================
-- 3. IDEMPOTENCY CONSTRAINTS
-- ============================================================================

-- Drop existing unique constraint on generated_images (campaign_id, index)
-- and replace with (campaign_id, run_id, index) for run_id versioning
ALTER TABLE generated_images DROP CONSTRAINT IF EXISTS generated_images_campaign_id_index_key;

-- Add unique constraints for idempotency (prevent duplicates on retry/race)
-- Note: We use COALESCE to handle NULL run_id for backwards compatibility
CREATE UNIQUE INDEX IF NOT EXISTS unique_job_per_run
  ON generation_jobs(campaign_id, COALESCE(run_id, '00000000-0000-0000-0000-000000000000'::uuid), step);

CREATE UNIQUE INDEX IF NOT EXISTS unique_image_per_run
  ON generated_images(campaign_id, COALESCE(run_id, '00000000-0000-0000-0000-000000000000'::uuid), index);

CREATE UNIQUE INDEX IF NOT EXISTS unique_bg_per_run
  ON generated_backgrounds(campaign_id, run_id, index);

-- ============================================================================
-- 4. HARDENED TRIGGER FOR NEW USERS
-- ============================================================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Replace handle_new_user function with hardened version
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Prevent search_path attacks
AS $$
BEGIN
  -- Handle null email (OAuth providers may not provide it)
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, COALESCE(NEW.email, NEW.id::text || '@placeholder.local'))
  ON CONFLICT (id) DO NOTHING;  -- Prevent duplicate row errors

  INSERT INTO public.subscriptions (owner_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (owner_id) DO NOTHING;  -- Prevent duplicate row errors

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 5. QUOTA CONSUMPTION RPC FUNCTION
-- ============================================================================

-- Function to atomically consume campaign quota
-- Returns: { allowed: boolean, remaining: number, reason: text }
-- Note: Free tier uses lifetime window (1970-01-01 to 9999-12-31), paid uses monthly
CREATE OR REPLACE FUNCTION public.consume_campaign_quota(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
  v_limit INT;
  v_used INT;
  v_period_start DATE;
  v_period_end DATE;
  v_period_text TEXT;
BEGIN
  -- Get user's current plan
  SELECT plan INTO v_plan
  FROM subscriptions
  WHERE owner_id = p_user_id AND status = 'active';

  -- Default to free if no subscription found
  IF v_plan IS NULL THEN
    v_plan := 'free';
  END IF;

  -- Get plan limit (free tier: 1 lifetime, starter: 10/mo, pro: 40/mo, agency: 150/mo)
  v_limit := CASE v_plan
    WHEN 'free' THEN 1
    WHEN 'starter' THEN 10
    WHEN 'pro' THEN 40
    WHEN 'agency' THEN 150
    ELSE 1
  END;

  -- Calculate period: lifetime for free, monthly for paid
  IF v_plan = 'free' THEN
    v_period_start := '1970-01-01'::DATE;
    v_period_end := '9999-12-31'::DATE;
    v_period_text := 'your free trial';
  ELSE
    v_period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    v_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    v_period_text := 'this month';
  END IF;

  -- Get or create usage ledger entry
  INSERT INTO usage_ledger (owner_id, period_start, period_end, campaigns_used)
  VALUES (p_user_id, v_period_start, v_period_end, 0)
  ON CONFLICT (owner_id, period_start, period_end) DO NOTHING;

  -- Get current usage
  SELECT campaigns_used INTO v_used
  FROM usage_ledger
  WHERE owner_id = p_user_id AND period_start = v_period_start AND period_end = v_period_end;

  -- Check if quota available
  IF v_used >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reason', format('You''ve used all %s campaign(s) for %s. Upgrade your plan to generate more.', v_limit, v_period_text)
    );
  END IF;

  -- Atomically increment usage
  UPDATE usage_ledger
  SET campaigns_used = campaigns_used + 1
  WHERE owner_id = p_user_id AND period_start = v_period_start AND period_end = v_period_end;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', v_limit - v_used - 1,
    'reason', NULL
  );
END;
$$;

-- Function to check regeneration quota (doesn't consume, just checks)
-- All plans now get 2 regenerations per campaign
CREATE OR REPLACE FUNCTION public.check_regeneration_quota(p_user_id UUID, p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
  v_limit INT;
  v_used INT;
BEGIN
  -- Get user's current plan
  SELECT plan INTO v_plan
  FROM subscriptions
  WHERE owner_id = p_user_id AND status = 'active';

  IF v_plan IS NULL THEN
    v_plan := 'free';
  END IF;

  -- Get regeneration limit per campaign (all plans now get 2)
  v_limit := CASE v_plan
    WHEN 'free' THEN 2
    WHEN 'starter' THEN 2
    WHEN 'pro' THEN 2
    WHEN 'agency' THEN 2
    ELSE 2
  END;

  -- Get current regeneration count for this campaign
  SELECT regeneration_count INTO v_used
  FROM campaigns
  WHERE id = p_campaign_id AND owner_id = p_user_id;

  IF v_used IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reason', 'Campaign not found'
    );
  END IF;

  IF v_used >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reason', format('You''ve used all %s regenerations for this campaign.', v_limit)
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', v_limit - v_used,
    'reason', NULL
  );
END;
$$;

-- Function to consume regeneration quota (increment count)
CREATE OR REPLACE FUNCTION public.consume_regeneration_quota(p_user_id UUID, p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check JSONB;
BEGIN
  -- First check if allowed
  v_check := check_regeneration_quota(p_user_id, p_campaign_id);

  IF NOT (v_check->>'allowed')::boolean THEN
    RETURN v_check;
  END IF;

  -- Increment regeneration count
  UPDATE campaigns
  SET regeneration_count = regeneration_count + 1
  WHERE id = p_campaign_id AND owner_id = p_user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', (v_check->>'remaining')::int - 1,
    'reason', NULL
  );
END;
$$;
