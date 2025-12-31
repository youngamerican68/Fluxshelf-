import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CampaignDetail } from "@/components/campaign-detail";
import type { Tables } from "@/types/database";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Get campaign
  const { data: campaign, error } = await (supabase
    .from("campaigns") as any)
    .select("*, brands(name)")
    .eq("id", id)
    .single();

  if (error || !campaign) {
    notFound();
  }

  // Get generated images
  const { data: images } = await (supabase
    .from("generated_images") as any)
    .select("*")
    .eq("campaign_id", id)
    .order("index", { ascending: true }) as { data: Tables<"generated_images">[] | null };

  // Get signed URLs for images
  const imageUrls: Record<string, { full: string; thumb: string }> = {};
  if (images && images.length > 0) {
    const paths = images.flatMap((img) =>
      [img.storage_path, img.thumb_path].filter(Boolean)
    );

    const { data: signedUrls } = await supabase.storage
      .from("fluxshield")
      .createSignedUrls(paths as string[], 3600);

    if (signedUrls) {
      const urlMap = new Map(signedUrls.map((u) => [u.path, u.signedUrl]));
      for (const img of images) {
        imageUrls[img.id] = {
          full: urlMap.get(img.storage_path) || "",
          thumb: urlMap.get(img.thumb_path || "") || "",
        };
      }
    }
  }

  // Get generated captions
  const { data: captions } = await (supabase
    .from("generated_captions") as any)
    .select("*")
    .eq("campaign_id", id)
    .order("day_index", { ascending: true }) as { data: Tables<"generated_captions">[] | null };

  // Get generation jobs for status
  const { data: jobs } = await (supabase
    .from("generation_jobs") as any)
    .select("*")
    .eq("campaign_id", id)
    .order("created_at", { ascending: true }) as { data: Tables<"generation_jobs">[] | null };

  // Get download if exists
  interface Download {
    storage_path: string;
  }
  const { data: downloads } = await (supabase
    .from("downloads") as any)
    .select("*")
    .eq("campaign_id", id)
    .order("created_at", { ascending: false })
    .limit(1) as { data: Download[] | null };

  let downloadUrl = "";
  if (downloads && downloads.length > 0) {
    const { data: signedDownload } = await supabase.storage
      .from("fluxshield")
      .createSignedUrl(downloads[0].storage_path, 3600);
    downloadUrl = signedDownload?.signedUrl || "";
  }

  return (
    <CampaignDetail
      campaign={campaign}
      images={images || []}
      imageUrls={imageUrls}
      captions={captions || []}
      jobs={jobs || []}
      downloadUrl={downloadUrl}
    />
  );
}
