import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, ImageIcon, ArrowRight } from "lucide-react";
import type { CampaignStatus } from "@/types/database";

function getStatusVariant(status: CampaignStatus) {
  switch (status) {
    case "ready":
      return "success";
    case "generating":
    case "queued":
      return "warning";
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Get brand
  interface Brand {
    id: string;
    name: string | null;
    color_palette: string[];
    created_at: string;
  }
  const { data: brand, error } = await (supabase
    .from("brands") as any)
    .select("*")
    .eq("id", id)
    .single() as { data: Brand | null; error: unknown };

  if (error || !brand) {
    notFound();
  }

  // Get brand assets
  interface BrandAsset {
    id: string;
    type: string;
    storage_path: string;
  }
  const { data: assets } = await (supabase
    .from("brand_assets") as any)
    .select("*")
    .eq("brand_id", id) as { data: BrandAsset[] | null };

  // Get campaigns for this brand
  interface Campaign {
    id: string;
    product_title: string | null;
    status: CampaignStatus;
    created_at: string;
  }
  const { data: campaigns } = await (supabase
    .from("campaigns") as any)
    .select("*")
    .eq("brand_id", id)
    .order("created_at", { ascending: false }) as { data: Campaign[] | null };

  // Get signed URLs for assets
  const assetUrls: Record<string, string> = {};
  if (assets && assets.length > 0) {
    const paths = assets.map((a) => a.storage_path);
    const { data: signedUrls } = await supabase.storage
      .from("fluxshield")
      .createSignedUrls(paths, 3600);

    if (signedUrls) {
      signedUrls.forEach((item, index) => {
        if (item.signedUrl) {
          assetUrls[assets[index].id] = item.signedUrl;
        }
      });
    }
  }

  const productImages = assets?.filter((a) => a.type === "product_image") || [];
  const logos = assets?.filter((a) => a.type === "logo") || [];
  const moodboards = assets?.filter((a) => a.type === "moodboard") || [];
  const colorPalette = (brand.color_palette as string[]) || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/app"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {brand.name || "Unnamed Brand"}
            </h1>
            <p className="text-muted-foreground">
              Created {new Date(brand.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Link href={`/app/campaigns/new?brandId=${brand.id}`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Brand Assets */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Assets</CardTitle>
            <CardDescription>
              Images and colors used for campaign generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Product Images */}
            <div>
              <h4 className="text-sm font-medium mb-2">Product Images</h4>
              {productImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {productImages.map((asset) => (
                    <div
                      key={asset.id}
                      className="aspect-square rounded-lg overflow-hidden border"
                    >
                      {assetUrls[asset.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={assetUrls[asset.id]}
                          alt="Product"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No product images
                </p>
              )}
            </div>

            {/* Logo */}
            <div>
              <h4 className="text-sm font-medium mb-2">Logo</h4>
              {logos.length > 0 ? (
                <div className="w-24 h-24 rounded-lg overflow-hidden border">
                  {assetUrls[logos[0].id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={assetUrls[logos[0].id]}
                      alt="Logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No logo uploaded</p>
              )}
            </div>

            {/* Moodboard */}
            <div>
              <h4 className="text-sm font-medium mb-2">Moodboard</h4>
              {moodboards.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {moodboards.map((asset) => (
                    <div
                      key={asset.id}
                      className="aspect-square rounded-lg overflow-hidden border"
                    >
                      {assetUrls[asset.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={assetUrls[asset.id]}
                          alt="Moodboard"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No moodboard images
                </p>
              )}
            </div>

            {/* Colors */}
            <div>
              <h4 className="text-sm font-medium mb-2">Brand Colors</h4>
              {colorPalette.length > 0 ? (
                <div className="flex gap-2">
                  {colorPalette.map((color, index) => (
                    <div
                      key={index}
                      className="w-10 h-10 rounded-lg border"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No colors defined
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Campaigns */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Campaigns</CardTitle>
                <CardDescription>
                  {campaigns?.length || 0} campaigns created
                </CardDescription>
              </div>
              <Link href={`/app/campaigns/new?brandId=${brand.id}`}>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {campaigns && campaigns.length > 0 ? (
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/app/campaigns/${campaign.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {campaign.product_title || "Untitled"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(campaign.status)}>
                        {campaign.status}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No campaigns yet</p>
                <Link href={`/app/campaigns/new?brandId=${brand.id}`}>
                  <Button>Create First Campaign</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
