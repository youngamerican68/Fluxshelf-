import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateCampaignImages } from "@/lib/fal";
import { generateCaptions } from "@/lib/openrouter";
import { uploadFile, downloadFromUrl, getStoragePath } from "@/lib/storage";
import { createThumbnail } from "@/lib/image-processing";
import type { Database, StylePreset } from "@/types/database";

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
    await (supabase.from("generation_jobs") as any)
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

    const job = jobs[0];
    const campaign = job.campaigns as Database["public"]["Tables"]["campaigns"]["Row"];

    // Lock the job
    const { error: lockError } = await (supabase.from("generation_jobs") as any)
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
    await (supabase.from("campaigns") as any)
      .update({ status: "generating" })
      .eq("id", campaign.id);

    try {
      if (job.step === "images") {
        await processImageJob(supabase, job, campaign);
      } else if (job.step === "captions") {
        await processCaptionJob(supabase, job, campaign);
      }

      // Mark job as succeeded
      await (supabase.from("generation_jobs") as any)
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
        await (supabase.from("campaigns") as any)
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

      // Mark job as failed
      await (supabase.from("generation_jobs") as any)
        .update({
          status: job.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "queued",
          last_error: errorMessage,
          locked_at: null,
        })
        .eq("id", job.id);

      // If all retries exhausted, mark campaign as failed
      if (job.attempts + 1 >= MAX_ATTEMPTS) {
        await (supabase.from("campaigns") as any)
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

async function processImageJob(
  supabase: ReturnType<typeof getServiceClient>,
  job: Database["public"]["Tables"]["generation_jobs"]["Row"],
  campaign: Database["public"]["Tables"]["campaigns"]["Row"]
) {
  // Get brand info
  const { data: brand } = await (supabase
    .from("brands") as any)
    .select("name, color_palette")
    .eq("id", campaign.brand_id)
    .single();

  const colorPalette = (brand?.color_palette as string[]) || [];

  // Generate 12 images
  const results = await generateCampaignImages({
    preset: campaign.preset as StylePreset,
    productTitle: campaign.product_title || "Product",
    productDescription: campaign.product_description || "",
    brandColors: colorPalette,
  });

  // Download and store each image
  for (const result of results) {
    try {
      const imageBuffer = await downloadFromUrl(result.url);
      const thumbBuffer = await createThumbnail(imageBuffer, 400);

      const imagePath = getStoragePath(
        campaign.owner_id,
        "campaigns",
        campaign.id,
        `generated/image_${result.index}.jpg`
      );
      const thumbPath = getStoragePath(
        campaign.owner_id,
        "campaigns",
        campaign.id,
        `generated/thumb_${result.index}.jpg`
      );

      await uploadFile(campaign.owner_id, imagePath.replace(`${campaign.owner_id}/`, ""), imageBuffer, "image/jpeg");
      await uploadFile(campaign.owner_id, thumbPath.replace(`${campaign.owner_id}/`, ""), thumbBuffer, "image/jpeg");

      // Store in database
      await (supabase.from("generated_images") as any).insert({
        campaign_id: campaign.id,
        index: result.index,
        storage_path: imagePath,
        thumb_path: thumbPath,
        metadata: {
          prompt: result.prompt,
          seed: result.seed,
        },
      });
    } catch (error) {
      console.error(`Error processing image ${result.index}:`, error);
      // Continue with other images
    }
  }
}

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

  // Generate captions
  const captions = await generateCaptions({
    productTitle: campaign.product_title || "Product",
    productDescription: campaign.product_description || "",
    productPrice: campaign.product_price,
    preset: campaign.preset as StylePreset,
    brandName: brand?.name || undefined,
  });

  // Store captions
  for (const caption of captions) {
    await (supabase.from("generated_captions") as any).insert({
      campaign_id: campaign.id,
      day_index: caption.dayIndex,
      platform: "generic",
      caption: caption.caption,
      hashtags: caption.hashtags,
      cta: caption.cta,
    });
  }
}
