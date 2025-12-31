-- FluxShield Database Schema
-- Run this migration in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Brands table
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT,
  color_palette JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Brand assets table
CREATE TABLE brand_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('product_image', 'logo', 'moodboard')),
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Campaigns table
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_url TEXT NOT NULL,
  product_title TEXT,
  product_description TEXT,
  product_price TEXT,
  product_images JSONB DEFAULT '[]'::jsonb,
  preset TEXT NOT NULL CHECK (preset IN ('bright_minimal', 'dark_moody', 'outdoor_lifestyle', 'studio_macro')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'queued', 'generating', 'ready', 'failed')),
  regeneration_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Generation jobs table
CREATE TABLE generation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  step TEXT NOT NULL CHECK (step IN ('images', 'captions', 'zip')),
  attempts INT DEFAULT 0,
  last_error TEXT,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Generated images table
CREATE TABLE generated_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  index INT NOT NULL CHECK (index >= 0 AND index < 12),
  storage_path TEXT NOT NULL,
  thumb_path TEXT,
  metadata JSONB,
  is_favorite BOOLEAN DEFAULT FALSE,
  flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(campaign_id, index)
);

-- Generated captions table
CREATE TABLE generated_captions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  day_index INT NOT NULL CHECK (day_index >= 1 AND day_index <= 7),
  platform TEXT DEFAULT 'generic',
  caption TEXT NOT NULL,
  hashtags TEXT,
  cta TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(campaign_id, day_index, platform)
);

-- Downloads table
CREATE TABLE downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Subscriptions table (mirror of Stripe data)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'agency')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(owner_id)
);

-- Usage ledger table
CREATE TABLE usage_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  campaigns_used INT DEFAULT 0,
  regenerations_used INT DEFAULT 0,
  UNIQUE(owner_id, period_start, period_end)
);

-- Indexes for performance
CREATE INDEX idx_brands_owner ON brands(owner_id);
CREATE INDEX idx_brand_assets_brand ON brand_assets(brand_id);
CREATE INDEX idx_campaigns_brand ON campaigns(brand_id);
CREATE INDEX idx_campaigns_owner ON campaigns(owner_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_generation_jobs_campaign ON generation_jobs(campaign_id);
CREATE INDEX idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX idx_generation_jobs_queued ON generation_jobs(status, locked_at) WHERE status = 'queued';
CREATE INDEX idx_generated_images_campaign ON generated_images(campaign_id);
CREATE INDEX idx_generated_captions_campaign ON generated_captions(campaign_id);
CREATE INDEX idx_downloads_campaign ON downloads(campaign_id);
CREATE INDEX idx_subscriptions_owner ON subscriptions(owner_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_usage_ledger_owner_period ON usage_ledger(owner_id, period_start, period_end);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_captions ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Brands: users can only access their own brands
CREATE POLICY "Users can view own brands" ON brands
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own brands" ON brands
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own brands" ON brands
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own brands" ON brands
  FOR DELETE USING (auth.uid() = owner_id);

-- Brand assets: users can access assets of their own brands
CREATE POLICY "Users can view own brand assets" ON brand_assets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brands WHERE brands.id = brand_assets.brand_id AND brands.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own brand assets" ON brand_assets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM brands WHERE brands.id = brand_assets.brand_id AND brands.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own brand assets" ON brand_assets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM brands WHERE brands.id = brand_assets.brand_id AND brands.owner_id = auth.uid()
    )
  );

-- Campaigns: users can only access their own campaigns
CREATE POLICY "Users can view own campaigns" ON campaigns
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own campaigns" ON campaigns
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own campaigns" ON campaigns
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own campaigns" ON campaigns
  FOR DELETE USING (auth.uid() = owner_id);

-- Generation jobs: users can view jobs for their own campaigns
CREATE POLICY "Users can view own generation jobs" ON generation_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = generation_jobs.campaign_id AND campaigns.owner_id = auth.uid()
    )
  );

-- Generated images: users can access images from their own campaigns
CREATE POLICY "Users can view own generated images" ON generated_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = generated_images.campaign_id AND campaigns.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own generated images" ON generated_images
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = generated_images.campaign_id AND campaigns.owner_id = auth.uid()
    )
  );

-- Generated captions: users can access captions from their own campaigns
CREATE POLICY "Users can view own generated captions" ON generated_captions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = generated_captions.campaign_id AND campaigns.owner_id = auth.uid()
    )
  );

-- Downloads: users can access downloads from their own campaigns
CREATE POLICY "Users can view own downloads" ON downloads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = downloads.campaign_id AND campaigns.owner_id = auth.uid()
    )
  );

-- Subscriptions: users can only view their own subscription
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = owner_id);

-- Usage ledger: users can only view their own usage
CREATE POLICY "Users can view own usage" ON usage_ledger
  FOR SELECT USING (auth.uid() = owner_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);

  INSERT INTO subscriptions (owner_id, plan, status)
  VALUES (NEW.id, 'free', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile and subscription on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for generation_jobs updated_at
CREATE TRIGGER update_generation_jobs_updated_at
  BEFORE UPDATE ON generation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
