export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BrandAssetType = "product_image" | "logo" | "moodboard";
export type CampaignStatus = "draft" | "queued" | "generating" | "ready" | "failed";
export type JobStatus = "queued" | "running" | "succeeded" | "failed";
export type JobStep = "images" | "captions" | "zip" | "cutout" | "backgrounds" | "composite";
export type SubscriptionPlan = "free" | "starter" | "pro" | "agency";
export type StylePreset = "bright_minimal" | "dark_moody" | "outdoor_lifestyle" | "studio_macro";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
        };
      };
      brands: {
        Row: {
          id: string;
          owner_id: string;
          name: string | null;
          color_palette: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name?: string | null;
          color_palette?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string | null;
          color_palette?: string[] | null;
          created_at?: string;
        };
      };
      brand_assets: {
        Row: {
          id: string;
          brand_id: string;
          type: BrandAssetType;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          type: BrandAssetType;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          type?: BrandAssetType;
          storage_path?: string;
          created_at?: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          brand_id: string;
          owner_id: string;
          product_url: string;
          product_title: string | null;
          product_description: string | null;
          product_price: string | null;
          product_images: string[] | null;
          preset: StylePreset;
          status: CampaignStatus;
          regeneration_count: number;
          cutout_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          owner_id: string;
          product_url: string;
          product_title?: string | null;
          product_description?: string | null;
          product_price?: string | null;
          product_images?: string[] | null;
          preset: StylePreset;
          status?: CampaignStatus;
          regeneration_count?: number;
          cutout_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          owner_id?: string;
          product_url?: string;
          product_title?: string | null;
          product_description?: string | null;
          product_price?: string | null;
          product_images?: string[] | null;
          preset?: StylePreset;
          status?: CampaignStatus;
          regeneration_count?: number;
          cutout_path?: string | null;
          created_at?: string;
        };
      };
      generation_jobs: {
        Row: {
          id: string;
          campaign_id: string;
          status: JobStatus;
          step: JobStep;
          attempts: number;
          last_error: string | null;
          locked_at: string | null;
          run_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          status?: JobStatus;
          step: JobStep;
          attempts?: number;
          last_error?: string | null;
          locked_at?: string | null;
          run_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          status?: JobStatus;
          step?: JobStep;
          attempts?: number;
          last_error?: string | null;
          locked_at?: string | null;
          run_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      generated_images: {
        Row: {
          id: string;
          campaign_id: string;
          run_id: string | null;
          index: number;
          storage_path: string;
          thumb_path: string | null;
          metadata: Json | null;
          is_favorite: boolean;
          flagged: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          run_id?: string | null;
          index: number;
          storage_path: string;
          thumb_path?: string | null;
          metadata?: Json | null;
          is_favorite?: boolean;
          flagged?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          run_id?: string | null;
          index?: number;
          storage_path?: string;
          thumb_path?: string | null;
          metadata?: Json | null;
          is_favorite?: boolean;
          flagged?: boolean;
          created_at?: string;
        };
      };
      generated_captions: {
        Row: {
          id: string;
          campaign_id: string;
          day_index: number;
          platform: string;
          caption: string;
          hashtags: string | null;
          cta: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          day_index: number;
          platform?: string;
          caption: string;
          hashtags?: string | null;
          cta?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          day_index?: number;
          platform?: string;
          caption?: string;
          hashtags?: string | null;
          cta?: string | null;
          created_at?: string;
        };
      };
      downloads: {
        Row: {
          id: string;
          campaign_id: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          storage_path?: string;
          created_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          owner_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: SubscriptionPlan;
          current_period_start: string | null;
          current_period_end: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: SubscriptionPlan;
          current_period_start?: string | null;
          current_period_end?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: SubscriptionPlan;
          current_period_start?: string | null;
          current_period_end?: string | null;
          status?: string;
          created_at?: string;
        };
      };
      usage_ledger: {
        Row: {
          id: string;
          owner_id: string;
          period_start: string;
          period_end: string;
          campaigns_used: number;
          regenerations_used: number;
        };
        Insert: {
          id?: string;
          owner_id: string;
          period_start: string;
          period_end: string;
          campaigns_used?: number;
          regenerations_used?: number;
        };
        Update: {
          id?: string;
          owner_id?: string;
          period_start?: string;
          period_end?: string;
          campaigns_used?: number;
          regenerations_used?: number;
        };
      };
      product_cutouts: {
        Row: {
          id: string;
          image_hash: string;
          storage_path: string;
          width: number | null;
          height: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          image_hash: string;
          storage_path: string;
          width?: number | null;
          height?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          image_hash?: string;
          storage_path?: string;
          width?: number | null;
          height?: number | null;
          created_at?: string;
        };
      };
      generated_backgrounds: {
        Row: {
          id: string;
          campaign_id: string;
          run_id: string;
          index: number;
          storage_path: string;
          prompt: string | null;
          seed: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          run_id: string;
          index: number;
          storage_path: string;
          prompt?: string | null;
          seed?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          run_id?: string;
          index?: number;
          storage_path?: string;
          prompt?: string | null;
          seed?: number | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
