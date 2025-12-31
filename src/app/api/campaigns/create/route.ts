import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkCampaignQuota, incrementCampaignUsage } from "@/lib/quota";
import type { StylePreset } from "@/types/database";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      brandId,
      productUrl,
      productTitle,
      productDescription,
      productPrice,
      productImages,
      preset,
    } = body;

    // Validate required fields
    if (!brandId || !productUrl || !preset) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate preset
    const validPresets: StylePreset[] = [
      "bright_minimal",
      "dark_moody",
      "outdoor_lifestyle",
      "studio_macro",
    ];
    if (!validPresets.includes(preset)) {
      return NextResponse.json({ error: "Invalid preset" }, { status: 400 });
    }

    // Verify brand ownership
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("id")
      .eq("id", brandId)
      .eq("owner_id", user.id)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Check quota
    const quota = await checkCampaignQuota(user.id);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: quota.reason || "Quota exceeded" },
        { status: 403 }
      );
    }

    // Create campaign
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaign, error: campaignError } = await (supabase
      .from("campaigns") as any)
      .insert({
        brand_id: brandId,
        owner_id: user.id,
        product_url: productUrl,
        product_title: productTitle || null,
        product_description: productDescription || null,
        product_price: productPrice || null,
        product_images: productImages || [],
        preset,
        status: "queued",
      })
      .select()
      .single();

    if (campaignError || !campaign) {
      console.error("Campaign creation error:", campaignError);
      return NextResponse.json(
        { error: "Failed to create campaign" },
        { status: 500 }
      );
    }

    // Create generation jobs
    const jobsToCreate = [
      { campaign_id: campaign.id, step: "images", status: "queued" },
      { campaign_id: campaign.id, step: "captions", status: "queued" },
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: jobsError } = await (supabase
      .from("generation_jobs") as any)
      .insert(jobsToCreate);

    if (jobsError) {
      console.error("Jobs creation error:", jobsError);
      // Rollback campaign
      await supabase.from("campaigns").delete().eq("id", campaign.id);
      return NextResponse.json(
        { error: "Failed to queue generation jobs" },
        { status: 500 }
      );
    }

    // Increment usage
    await incrementCampaignUsage(user.id);

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Campaign creation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create campaign",
      },
      { status: 500 }
    );
  }
}
