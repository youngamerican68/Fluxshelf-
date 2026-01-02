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
      brandColors, // Optional: colors for new brand creation
      productUrl,
      productTitle,
      productDescription,
      productPrice,
      productImages,
      preset,
    } = body;

    // Validate preset (required)
    if (!preset) {
      return NextResponse.json(
        { error: "Style preset is required" },
        { status: 400 }
      );
    }

    // Validate product title
    if (!productTitle || typeof productTitle !== "string" || !productTitle.trim()) {
      return NextResponse.json(
        { error: "Product title is required" },
        { status: 400 }
      );
    }

    // Validate product images - at least one is required for the cutout pipeline
    if (!productImages || !Array.isArray(productImages) || productImages.length === 0) {
      return NextResponse.json(
        { error: "At least one product image is required for generation" },
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

    // Get or create brand
    let finalBrandId = brandId;

    if (brandId) {
      // Verify existing brand ownership
      const { data: brand, error: brandError } = await supabase
        .from("brands")
        .select("id")
        .eq("id", brandId)
        .eq("owner_id", user.id)
        .single();

      if (brandError || !brand) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }
    } else {
      // Create a default brand for this user
      // First check if they already have a default brand
      const { data: existingDefault } = await (supabase
        .from("brands") as ReturnType<typeof supabase.from>)
        .select("id")
        .eq("owner_id", user.id)
        .eq("name", "My Brand")
        .single();

      if (existingDefault) {
        finalBrandId = existingDefault.id;
      } else {
        // Create new default brand
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newBrand, error: createBrandError } = await (supabase
          .from("brands") as any)
          .insert({
            owner_id: user.id,
            name: "My Brand",
            color_palette: brandColors && brandColors.length > 0 ? brandColors : null,
          })
          .select()
          .single();

        if (createBrandError || !newBrand) {
          console.error("Default brand creation error:", createBrandError);
          return NextResponse.json(
            { error: "Failed to create default brand" },
            { status: 500 }
          );
        }
        finalBrandId = newBrand.id;
      }
    }

    // Check quota
    const quota = await checkCampaignQuota(user.id);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: quota.reason || "Quota exceeded" },
        { status: 403 }
      );
    }

    // Generate run_id for this generation attempt
    const runId = crypto.randomUUID();

    // Create campaign
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaign, error: campaignError } = await (supabase
      .from("campaigns") as any)
      .insert({
        brand_id: finalBrandId,
        owner_id: user.id,
        product_url: productUrl || null,
        product_title: productTitle.trim(),
        product_description: productDescription || null,
        product_price: productPrice || null,
        product_images: productImages,
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

    // Create generation jobs with new pipeline steps
    // The cutout job will automatically queue backgrounds, which will queue composite
    const jobsToCreate = [
      { campaign_id: campaign.id, step: "cutout", status: "queued", run_id: runId },
      { campaign_id: campaign.id, step: "captions", status: "queued", run_id: runId },
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: jobsError } = await (supabase
      .from("generation_jobs") as any)
      .insert(jobsToCreate);

    if (jobsError) {
      console.error("Jobs creation error:", jobsError);
      // Rollback campaign
      await (supabase.from("campaigns") as any).delete().eq("id", campaign.id);
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
