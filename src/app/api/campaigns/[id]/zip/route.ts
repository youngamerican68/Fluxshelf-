import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { generateCampaignZip, generateProductMeta } from "@/lib/zip-generator";
import { createCrops } from "@/lib/image-processing";
import { formatCaptionsForCSV } from "@/lib/openrouter";
import type { Database, Tables } from "@/types/database";

function getServiceSupabase() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const serviceSupabase = getServiceSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { selectedImageIds } = body;

    // Get campaign and verify ownership
    const { data: campaignData, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle();

    const campaign = campaignData as Tables<"campaigns"> | null;

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.status !== "ready") {
      return NextResponse.json(
        { error: "Campaign is not ready for export" },
        { status: 400 }
      );
    }

    // Get images to include
    let imagesQuery = supabase
      .from("generated_images")
      .select("*")
      .eq("campaign_id", id)
      .order("index", { ascending: true });

    if (selectedImageIds && selectedImageIds.length > 0) {
      imagesQuery = imagesQuery.in("id", selectedImageIds);
    }

    const { data: imagesData } = await imagesQuery;
    const images = (imagesData || []) as Tables<"generated_images">[];

    if (images.length === 0) {
      return NextResponse.json({ error: "No images to export" }, { status: 400 });
    }

    // Get captions
    const { data: captionsData } = await supabase
      .from("generated_captions")
      .select("*")
      .eq("campaign_id", id)
      .order("day_index", { ascending: true });

    const captions = (captionsData || []) as Tables<"generated_captions">[];

    // Download and process images
    const processedImages = [];

    for (const image of images) {
      try {
        const { data: imageData } = await serviceSupabase.storage
          .from("fluxshield")
          .download(image.storage_path);

        if (!imageData) continue;

        const buffer = Buffer.from(await imageData.arrayBuffer());
        const crops = await createCrops(buffer);

        processedImages.push({
          name: `image_${(image.index + 1).toString().padStart(2, "0")}`,
          squareBuffer: crops.square,
          portraitBuffer: crops.portrait,
          storyBuffer: crops.story,
        });
      } catch (error) {
        console.error(`Error processing image ${image.id}:`, error);
      }
    }

    if (processedImages.length === 0) {
      return NextResponse.json(
        { error: "Failed to process images" },
        { status: 500 }
      );
    }

    // Format captions for CSV
    const formattedCaptions = formatCaptionsForCSV(
      captions.map((c) => ({
        dayIndex: c.day_index,
        caption: c.caption,
        hashtags: c.hashtags || "",
        cta: c.cta || "",
      }))
    );

    // Generate product meta
    const productMeta = generateProductMeta(campaign);

    // Generate zip
    const zipBuffer = await generateCampaignZip(
      processedImages,
      formattedCaptions,
      productMeta
    );

    // Upload zip to storage
    const zipPath = `${user.id}/campaigns/${campaign.id}/downloads/campaign_${Date.now()}.zip`;

    const { error: uploadError } = await serviceSupabase.storage
      .from("fluxshield")
      .upload(zipPath, zipBuffer, {
        contentType: "application/zip",
        upsert: true,
      });

    if (uploadError) {
      console.error("Zip upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to save zip file" },
        { status: 500 }
      );
    }

    // Create download record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (serviceSupabase.from("downloads") as any).insert({
      campaign_id: campaign.id,
      storage_path: zipPath,
    });

    // Get signed URL for download
    const { data: signedUrl } = await serviceSupabase.storage
      .from("fluxshield")
      .createSignedUrl(zipPath, 3600);

    return NextResponse.json({
      downloadUrl: signedUrl?.signedUrl || "",
      imageCount: processedImages.length,
    });
  } catch (error) {
    console.error("Zip generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate zip" },
      { status: 500 }
    );
  }
}
