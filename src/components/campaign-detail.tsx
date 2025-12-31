"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Star,
  Flag,
  Loader2,
  ImageIcon,
  FileText,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import type { Tables } from "@/types/database";

interface CampaignDetailProps {
  campaign: Tables<"campaigns"> & { brands: { name: string | null } | null };
  images: Tables<"generated_images">[];
  imageUrls: Record<string, { full: string; thumb: string }>;
  captions: Tables<"generated_captions">[];
  jobs: Tables<"generation_jobs">[];
  downloadUrl: string;
}

function getJobStatusIcon(status: string) {
  switch (status) {
    case "succeeded":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "running":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

export function CampaignDetail({
  campaign,
  images,
  imageUrls,
  captions,
  jobs,
  downloadUrl: initialDownloadUrl,
}: CampaignDetailProps) {
  const [selectedImages, setSelectedImages] = useState<Set<string>>(
    new Set(images.filter((img) => img.is_favorite).map((img) => img.id))
  );
  const [generating, setGenerating] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(initialDownloadUrl);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const isProcessing = campaign.status === "queued" || campaign.status === "generating";
  const completedJobs = jobs.filter((j) => j.status === "succeeded").length;
  const totalJobs = jobs.length;
  const progress = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

  const toggleFavorite = async (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else if (newSelected.size < 6) {
      newSelected.add(imageId);
    } else {
      toast({
        title: "Maximum 6 favorites",
        description: "You can select up to 6 images for your zip export",
        variant: "destructive",
      });
      return;
    }
    setSelectedImages(newSelected);

    // Update in database
    await (supabase.from("generated_images") as any)
      .update({ is_favorite: newSelected.has(imageId) })
      .eq("id", imageId);
  };

  const toggleFlagged = async (imageId: string) => {
    const image = images.find((img) => img.id === imageId);
    if (!image) return;

    await (supabase.from("generated_images") as any)
      .update({ flagged: !image.flagged })
      .eq("id", imageId);

    toast({
      title: image.flagged ? "Flag removed" : "Image flagged",
      description: image.flagged
        ? "The flag has been removed"
        : "Thank you for the feedback",
    });

    router.refresh();
  };

  const handleGenerateZip = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedImageIds: Array.from(selectedImages),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate zip");
      }

      setDownloadUrl(data.downloadUrl);
      toast({
        title: "Zip ready",
        description: "Your campaign pack is ready to download",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to generate zip",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/app/brands/${campaign.brand_id}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {campaign.product_title || "Campaign"}
            </h1>
            <p className="text-muted-foreground">
              {campaign.brands?.name || "Unknown brand"} &middot;{" "}
              {campaign.preset.replace("_", " ")}
            </p>
          </div>
        </div>
        <Badge
          variant={
            campaign.status === "ready"
              ? "success"
              : campaign.status === "failed"
                ? "destructive"
                : "warning"
          }
        >
          {campaign.status}
        </Badge>
      </div>

      {/* Progress Card (while processing) */}
      {isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating your campaign...
            </CardTitle>
            <CardDescription>
              This may take a few minutes. You can leave this page and come back
              later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="h-2" />
            <div className="flex gap-4 text-sm">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center gap-2">
                  {getJobStatusIcon(job.status)}
                  <span className="capitalize">{job.step}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed Status */}
      {campaign.status === "failed" && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Generation Failed
            </CardTitle>
            <CardDescription>
              {jobs.find((j) => j.status === "failed")?.last_error ||
                "An error occurred during generation"}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Content Tabs */}
      {campaign.status === "ready" && (
        <Tabs defaultValue="images">
          <TabsList>
            <TabsTrigger value="images" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Images ({images.length})
            </TabsTrigger>
            <TabsTrigger value="captions" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Captions ({captions.length})
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Export
            </TabsTrigger>
          </TabsList>

          {/* Images Tab */}
          <TabsContent value="images" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Select up to 6 favorites for your zip export
              </p>
              <Badge variant="outline">
                {selectedImages.size} / 6 selected
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className={`relative group rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImages.has(image.id)
                      ? "border-primary"
                      : "border-transparent"
                  }`}
                >
                  {imageUrls[image.id]?.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrls[image.id].thumb}
                      alt={`Generated image ${image.index + 1}`}
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-muted flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Overlay controls */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant={
                        selectedImages.has(image.id) ? "default" : "outline"
                      }
                      onClick={() => toggleFavorite(image.id)}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          selectedImages.has(image.id) ? "fill-current" : ""
                        }`}
                      />
                    </Button>
                    <Button
                      size="icon"
                      variant={image.flagged ? "destructive" : "outline"}
                      onClick={() => toggleFlagged(image.id)}
                    >
                      <Flag className="h-4 w-4" />
                    </Button>
                    {imageUrls[image.id]?.full && (
                      <a
                        href={imageUrls[image.id].full}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="icon" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>

                  {/* Badge indicators */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    {selectedImages.has(image.id) && (
                      <Badge variant="default" className="h-6">
                        <Star className="h-3 w-3 fill-current" />
                      </Badge>
                    )}
                    {image.flagged && (
                      <Badge variant="destructive" className="h-6">
                        <Flag className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>

                  <div className="absolute bottom-2 right-2">
                    <Badge variant="secondary" className="h-6">
                      #{image.index + 1}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <Card className="border-dashed">
              <CardContent className="py-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  AI-generated lifestyle imagery may not perfectly reproduce
                  label text or fine packaging details. Flag any unusable images
                  to help improve future generations.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Captions Tab */}
          <TabsContent value="captions" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              7-day posting schedule with engaging captions, hashtags, and CTAs
            </p>

            <div className="space-y-4">
              {captions.map((caption) => (
                <Card key={caption.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Day {caption.day_index}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Caption</h4>
                      <p className="text-sm whitespace-pre-wrap">
                        {caption.caption}
                      </p>
                    </div>
                    {caption.hashtags && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Hashtags</h4>
                        <p className="text-sm text-primary">
                          {caption.hashtags}
                        </p>
                      </div>
                    )}
                    {caption.cta && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">
                          Call to Action
                        </h4>
                        <p className="text-sm">{caption.cta}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Download Campaign Pack</CardTitle>
                <CardDescription>
                  Get your images in 3 aspect ratios plus captions CSV and
                  product metadata
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="font-medium">Square</p>
                    <p className="text-sm text-muted-foreground">1080x1080</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="font-medium">Portrait</p>
                    <p className="text-sm text-muted-foreground">1080x1350</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="font-medium">Story</p>
                    <p className="text-sm text-muted-foreground">1080x1920</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-4 rounded-lg border">
                  <Checkbox
                    id="favorites-only"
                    checked={selectedImages.size > 0}
                    disabled
                  />
                  <label htmlFor="favorites-only" className="text-sm">
                    {selectedImages.size > 0
                      ? `Include ${selectedImages.size} favorite image${selectedImages.size !== 1 ? "s" : ""}`
                      : "Include all 12 images (select favorites to limit)"}
                  </label>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleGenerateZip}
                    disabled={generating}
                    className="flex-1"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Generate Zip
                      </>
                    )}
                  </Button>

                  {downloadUrl && (
                    <a href={downloadUrl} download>
                      <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Download Zip
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
