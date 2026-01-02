import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { removeBackground, generateBackground } from "@/lib/fal";
import { generateCaptions } from "@/lib/openrouter";
import { uploadFile, downloadFromUrl, getStoragePath } from "@/lib/storage";
import {
  createThumbnail,
  hashImage,
  compositeProductOnBackground,
  downloadImage,
} from "@/lib/image-processing";
import type { Database, StylePreset } from "@/types/database";

// Force Node.js runtime for Sharp/JSZip compatibility
export const runtime = "nodejs";
export const maxDuration = 120; // 2 minutes per job step

// Service role client for bypassing RLS
function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const MAX_ATTEMPTS = 3;
const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(request: Request) {
  // Verify worker secret
  const workerSecret = request.headers.get("X-WORKER-SECRET");
  if (workerSecret !== process.env.WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  try {
    // Claim a job with "skip locked" semantics
    // First, find stale locked jobs (locked for too long) and reset them
    const staleThreshold = new Date(Date.now() - LOCK_TIMEOUT_MS).toISOString();
    await (supabase
      .from("generation_jobs") as any)
      .update({ status: "queued", locked_at: null })
      .eq("status", "running")
      .lt("locked_at", staleThreshold);

    // Now claim a queued job
    const { data: jobs, error: jobsError } = await (supabase
      .from("generation_jobs") as any)
      .select("*, campaigns(*)")
      .eq("status", "queued")
      .lt("attempts", MAX_ATTEMPTS)
      .order("created_at", { ascending: true })
      .limit(1);

    if (jobsError) {
      console.error("Error fetching jobs:", jobsError);
      return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: "No jobs to process" });
    }

    const job = jobs[0] as Database["public"]["Tables"]["generation_jobs"]["Row"] & {
      campaigns: Database["public"]["Tables"]["campaigns"]["Row"];
    };
    const campaign = job.campaigns;

    // Lock the job
    const { error: lockError } = await (supabase
      .from("generation_jobs") as any)
      .update({
        status: "running",
        locked_at: new Date().toISOString(),
        attempts: job.attempts + 1,
      })
      .eq("id", job.id)
      .eq("status", "queued"); // Ensure it's still queued

    if (lockError) {
      console.error("Error locking job:", lockError);
      return NextResponse.json({ error: "Failed to lock job" }, { status: 500 });
    }

    // Update campaign status to generating
    await (supabase
      .from("campaigns") as any)
      .update({ status: "generating" })
      .eq("id", campaign.id);

    try {
      // Route to appropriate job handler
      switch (job.step) {
        case "cutout":
          await processCutoutJob(supabase, job, campaign);
          break;
        case "backgrounds":
          await processBackgroundsJob(supabase, job, campaign);
          break;
        case "composite":
          await processCompositeJob(supabase, job, campaign);
          break;
        case "captions":
          await processCaptionJob(supabase, job, campaign);
          break;
        // Legacy support
        case "images":
          await processLegacyImageJob(supabase, job, campaign);
          break;
        default:
          throw new Error(`Unknown job step: ${job.step}`);
      }

      // Mark job as succeeded
      await (supabase
        .from("generation_jobs") as any)
        .update({ status: "succeeded", last_error: null })
        .eq("id", job.id);

      // Check if all jobs for this campaign are done
      const { data: pendingJobs } = await (supabase
        .from("generation_jobs") as any)
        .select("id")
        .eq("campaign_id", campaign.id)
        .in("status", ["queued", "running"]);

      if (!pendingJobs || pendingJobs.length === 0) {
        // All jobs done, mark campaign as ready
        await (supabase
          .from("campaigns") as any)
          .update({ status: "ready" })
          .eq("id", campaign.id);
      }

      return NextResponse.json({
        message: "Job processed successfully",
        jobId: job.id,
        step: job.step,
      });
    } catch (error) {
      console.error("Job processing error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Mark job as failed or requeue for retry
      await (supabase
        .from("generation_jobs") as any)
        .update({
          status: job.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "queued",
          last_error: errorMessage,
          locked_at: null,
        })
        .eq("id", job.id);

      // If all retries exhausted, mark campaign as failed
      if (job.attempts + 1 >= MAX_ATTEMPTS) {
        await (supabase
          .from("campaigns") as any)
          .update({ status: "failed" })
          .eq("id", campaign.id);
      }

      return NextResponse.json(
        { error: errorMessage, jobId: job.id },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Worker error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Worker error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// JOB STEP 1: CUTOUT
// ============================================================================

async function processCutoutJob(
  supabase: ReturnType<typeof getServiceClient>,
  job: Database["public"]["Tables"]["generation_jobs"]["Row"],
  campaign: Database["public"]["Tables"]["campaigns"]["Row"]
) {
  console.log(`Processing cutout job for campaign ${campaign.id}`);

  // Get product image URL
  const productImages = campaign.product_images as string[] | null;
  const productImageUrl = productImages?.[0];

  if (!productImageUrl) {
    throw new Error("No product image available for cutout");
  }

  // Download product image and compute hash
  const imageBuffer = await downloadFromUrl(productImageUrl);
  const imageHash = hashImage(imageBuffer);

  console.log(`Product image hash: ${imageHash}`);

  // Check if cutout already exists in cache
  const { data: existingCutout } = await (supabase
    .from("product_cutouts") as any)
    .select("storage_path, width, height")
    .eq("image_hash", imageHash)
    .single();

  let cutoutPath: string;

  if (existingCutout) {
    console.log(`Using cached cutout: ${existingCutout.storage_path}`);
    cutoutPath = existingCutout.storage_path;
  } else {
    console.log("No cached cutout, calling background removal API...");

    // Call fal.ai background removal
    const cutoutResult = await removeBackground(productImageUrl);

    // Download the cutout PNG
    const cutoutBuffer = await downloadImage(cutoutResult.url);

    // Store cutout in Supabase storage
    cutoutPath = getStoragePath(
      campaign.owner_id,
      "campaigns",
      campaign.id,
      "cutout/product.png"
    );

    await uploadFile(
      campaign.owner_id,
      cutoutPath.replace(`${campaign.owner_id}/`, ""),
      cutoutBuffer,
      "image/png"
    );

    // Cache the cutout
    await (supabase.from("product_cutouts") as any).insert({
      image_hash: imageHash,
      storage_path: cutoutPath,
      width: cutoutResult.width,
      height: cutoutResult.height,
    });

    console.log(`Cutout cached at: ${cutoutPath}`);
  }

  // Update campaign with cutout path
  await (supabase
    .from("campaigns") as any)
    .update({ cutout_path: cutoutPath })
    .eq("id", campaign.id);

  // Queue the backgrounds job
  await (supabase.from("generation_jobs") as any).insert({
    campaign_id: campaign.id,
    step: "backgrounds",
    run_id: job.run_id,
  });

  console.log("Cutout job complete, backgrounds job queued");
}

// ============================================================================
// JOB STEP 2: BACKGROUNDS
// ============================================================================

async function processBackgroundsJob(
  supabase: ReturnType<typeof getServiceClient>,
  job: Database["public"]["Tables"]["generation_jobs"]["Row"],
  campaign: Database["public"]["Tables"]["campaigns"]["Row"]
) {
  console.log(`Processing backgrounds job for campaign ${campaign.id}`);

  // Get brand colors
  const { data: brand } = await (supabase
    .from("brands") as any)
    .select("color_palette")
    .eq("id", campaign.brand_id)
    .single();

  const brandColors = (brand?.color_palette as string[]) || [];

  // Generate 12 backgrounds one at a time to avoid timeout
  for (let index = 0; index < 12; index++) {
    console.log(`Generating background ${index + 1}/12...`);

    const result = await generateBackground({
      preset: campaign.preset as StylePreset,
      index,
      brandColors,
    });

    // Download the generated background
    const bgBuffer = await downloadImage(result.url);

    // Store background in Supabase storage
    const bgPath = getStoragePath(
      campaign.owner_id,
      "campaigns",
      campaign.id,
      `backgrounds/bg_${index}.jpg`
    );

    await uploadFile(
      campaign.owner_id,
      bgPath.replace(`${campaign.owner_id}/`, ""),
      bgBuffer,
      "image/jpeg"
    );

    // Store in generated_backgrounds table
    await (supabase.from("generated_backgrounds") as any).insert({
      campaign_id: campaign.id,
      run_id: job.run_id,
      index,
      storage_path: bgPath,
      prompt: result.prompt,
      seed: result.seed,
    });

    // Small delay to avoid rate limiting
    if (index < 11) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  // Queue the composite job
  await (supabase.from("generation_jobs") as any).insert({
    campaign_id: campaign.id,
    step: "composite",
    run_id: job.run_id,
  });

  console.log("Backgrounds job complete, composite job queued");
}

// ============================================================================
// JOB STEP 3: COMPOSITE
// ============================================================================

async function processCompositeJob(
  supabase: ReturnType<typeof getServiceClient>,
  job: Database["public"]["Tables"]["generation_jobs"]["Row"],
  campaign: Database["public"]["Tables"]["campaigns"]["Row"]
) {
  console.log(`Processing composite job for campaign ${campaign.id}`);

  // Get cutout path from campaign
  const cutoutPath = campaign.cutout_path;
  if (!cutoutPath) {
    throw new Error("No cutout path found on campaign");
  }

  // Download cutout from storage
  const { data: cutoutData } = await supabase.storage
    .from("fluxshield")
    .download(cutoutPath);

  if (!cutoutData) {
    throw new Error("Failed to download cutout");
  }

  const cutoutBuffer = Buffer.from(await cutoutData.arrayBuffer());

  // Get all backgrounds for this campaign and run
  const { data: backgrounds } = await (supabase
    .from("generated_backgrounds") as any)
    .select("*")
    .eq("campaign_id", campaign.id)
    .eq("run_id", job.run_id)
    .order("index", { ascending: true });

  if (!backgrounds || backgrounds.length === 0) {
    throw new Error("No backgrounds found for composite");
  }

  // Composite each background with the cutout
  for (const bg of backgrounds) {
    console.log(`Compositing image ${bg.index + 1}/12...`);

    // Download background from storage
    const { data: bgData } = await supabase.storage
      .from("fluxshield")
      .download(bg.storage_path);

    if (!bgData) {
      console.error(`Failed to download background ${bg.index}`);
      continue;
    }

    const bgBuffer = Buffer.from(await bgData.arrayBuffer());

    // Composite cutout onto background
    const { image: compositedImage } = await compositeProductOnBackground(
      cutoutBuffer,
      bgBuffer
    );

    // Create thumbnail
    const thumbBuffer = await createThumbnail(compositedImage, 400);

    // Store composited image and thumbnail
    const imagePath = getStoragePath(
      campaign.owner_id,
      "campaigns",
      campaign.id,
      `generated/image_${bg.index}.jpg`
    );
    const thumbPath = getStoragePath(
      campaign.owner_id,
      "campaigns",
      campaign.id,
      `generated/thumb_${bg.index}.jpg`
    );

    await uploadFile(
      campaign.owner_id,
      imagePath.replace(`${campaign.owner_id}/`, ""),
      compositedImage,
      "image/jpeg"
    );
    await uploadFile(
      campaign.owner_id,
      thumbPath.replace(`${campaign.owner_id}/`, ""),
      thumbBuffer,
      "image/jpeg"
    );

    // Store in generated_images table
    await (supabase.from("generated_images") as any).insert({
      campaign_id: campaign.id,
      run_id: job.run_id,
      index: bg.index,
      storage_path: imagePath,
      thumb_path: thumbPath,
      metadata: {
        prompt: bg.prompt,
        seed: bg.seed,
        method: "cutout_composite",
      },
    });
  }

  // Cleanup intermediate generated_backgrounds (optional, saves storage)
  // Delete from storage first, then from DB
  for (const bg of backgrounds) {
    try {
      await supabase.storage.from("fluxshield").remove([bg.storage_path]);
    } catch (cleanupError) {
      console.error(`Failed to cleanup background ${bg.index}:`, cleanupError);
    }
  }

  // Delete background records from DB
  await (supabase.from("generated_backgrounds") as any)
    .delete()
    .eq("campaign_id", campaign.id)
    .eq("run_id", job.run_id);

  console.log("Composite job complete, backgrounds cleaned up");
}

// ============================================================================
// CAPTIONS JOB (unchanged)
// ============================================================================

async function processCaptionJob(
  supabase: ReturnType<typeof getServiceClient>,
  job: Database["public"]["Tables"]["generation_jobs"]["Row"],
  campaign: Database["public"]["Tables"]["campaigns"]["Row"]
) {
  // Get brand info
  const { data: brand } = await (supabase
    .from("brands") as any)
    .select("name")
    .eq("id", campaign.brand_id)
    .single();

  // Generate captions with platform variants and UTM links
  const captions = await generateCaptions({
    productTitle: campaign.product_title || "Product",
    productDescription: campaign.product_description || "",
    productPrice: campaign.product_price,
    productUrl: campaign.product_url || undefined,
    preset: campaign.preset as StylePreset,
    brandName: brand?.name || undefined,
  });

  // Store captions - one row per platform per day
  for (const caption of captions) {
    // Instagram caption
    await (supabase.from("generated_captions") as any).insert({
      campaign_id: campaign.id,
      day_index: caption.dayIndex,
      platform: "instagram",
      caption: caption.instagram.caption,
      hashtags: caption.instagram.hashtags,
      cta: `${caption.cta} | ${caption.utmLink.replace("utm_source=social", "utm_source=instagram")}`,
    });

    // TikTok caption
    await (supabase.from("generated_captions") as any).insert({
      campaign_id: campaign.id,
      day_index: caption.dayIndex,
      platform: "tiktok",
      caption: caption.tiktok.caption,
      hashtags: caption.tiktok.hashtags || null,
      cta: `${caption.cta} | ${caption.utmLink.replace("utm_source=social", "utm_source=tiktok")}`,
    });

    // Pinterest caption
    await (supabase.from("generated_captions") as any).insert({
      campaign_id: campaign.id,
      day_index: caption.dayIndex,
      platform: "pinterest",
      caption: caption.pinterest.caption,
      hashtags: caption.pinterest.hashtags,
      cta: `${caption.cta} | ${caption.utmLink.replace("utm_source=social", "utm_source=pinterest")}`,
    });
  }
}

// ============================================================================
// LEGACY: Old image generation (for backwards compatibility)
// ============================================================================

async function processLegacyImageJob(
  supabase: ReturnType<typeof getServiceClient>,
  job: Database["public"]["Tables"]["generation_jobs"]["Row"],
  campaign: Database["public"]["Tables"]["campaigns"]["Row"]
) {
  console.log("Processing legacy image job - redirecting to new pipeline");

  // Queue the new pipeline jobs instead
  await (supabase.from("generation_jobs") as any).insert({
    campaign_id: campaign.id,
    step: "cutout",
    run_id: job.run_id || crypto.randomUUID(),
  });

  console.log("Legacy job converted to new pipeline");
}
