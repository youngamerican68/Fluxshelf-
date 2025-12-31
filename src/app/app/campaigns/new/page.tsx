"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  ArrowLeft,
  Sparkles,
  Camera,
  Mountain,
  Microscope,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import type { StylePreset } from "@/types/database";

const PRESETS: Array<{
  id: StylePreset;
  name: string;
  description: string;
  icon: typeof Sparkles;
}> = [
  {
    id: "bright_minimal",
    name: "Bright Minimal",
    description: "Clean, modern aesthetics with high-key lighting",
    icon: Sparkles,
  },
  {
    id: "dark_moody",
    name: "Dark Moody",
    description: "Dramatic shadows and luxury vibes",
    icon: Camera,
  },
  {
    id: "outdoor_lifestyle",
    name: "Outdoor Lifestyle",
    description: "Natural settings with golden hour warmth",
    icon: Mountain,
  },
  {
    id: "studio_macro",
    name: "Studio Macro",
    description: "Detailed close-ups with precise lighting",
    icon: Microscope,
  },
];

function NewCampaignContent() {
  const searchParams = useSearchParams();
  const brandId = searchParams.get("brandId");
  const [productUrl, setProductUrl] = useState("");
  const [preset, setPreset] = useState<StylePreset>("bright_minimal");
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [productData, setProductData] = useState<{
    title: string;
    description: string;
    price: string | null;
    images: string[];
  } | null>(null);
  const [brand, setBrand] = useState<{ id: string; name: string | null } | null>(
    null
  );
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const fetchBrand = async () => {
      if (!brandId) return;
      const { data } = await supabase
        .from("brands")
        .select("id, name")
        .eq("id", brandId)
        .single();
      setBrand(data);
    };
    fetchBrand();
  }, [brandId, supabase]);

  const handleIngestProduct = async () => {
    if (!productUrl) {
      toast({
        title: "URL required",
        description: "Please enter a Shopify product URL",
        variant: "destructive",
      });
      return;
    }

    setIngesting(true);
    setProductData(null);

    try {
      const response = await fetch("/api/ingest-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: productUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch product data");
      }

      setProductData(data);
      toast({
        title: "Product found",
        description: `Retrieved: ${data.title}`,
      });
    } catch (error) {
      toast({
        title: "Failed to fetch product",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIngesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!brandId) {
      toast({
        title: "Brand required",
        description: "Please select a brand first",
        variant: "destructive",
      });
      return;
    }

    if (!productData) {
      toast({
        title: "Product data required",
        description: "Please fetch product data first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          productUrl,
          productTitle: productData.title,
          productDescription: productData.description,
          productPrice: productData.price,
          productImages: productData.images,
          preset,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create campaign");
      }

      toast({
        title: "Campaign created",
        description: "Generation has been queued",
      });

      router.push(`/app/campaigns/${data.campaign.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create campaign",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!brandId) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link
          href="/app"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Select a Brand First</CardTitle>
            <CardDescription>
              You need to select a brand before creating a campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/app">
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/app/brands/${brandId}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to {brand?.name || "Brand"}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create New Campaign</CardTitle>
          <CardDescription>
            Paste a Shopify product URL and choose a style to generate your
            campaign pack
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product URL */}
            <div className="space-y-2">
              <Label htmlFor="productUrl">Shopify Product URL *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="productUrl"
                    placeholder="https://store.myshopify.com/products/awesome-product"
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleIngestProduct}
                  disabled={ingesting || !productUrl}
                >
                  {ingesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Fetch"
                  )}
                </Button>
              </div>
            </div>

            {/* Product Preview */}
            {productData && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium">{productData.title}</h4>
                    {productData.price && (
                      <p className="text-sm text-muted-foreground">
                        ${productData.price}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {productData.description}
                    </p>
                    {productData.images.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {productData.images.slice(0, 3).map((img, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={img}
                            alt=""
                            className="w-12 h-12 rounded object-cover border"
                          />
                        ))}
                        {productData.images.length > 3 && (
                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-sm text-muted-foreground">
                            +{productData.images.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Style Preset */}
            <div className="space-y-2">
              <Label>Style Preset *</Label>
              <RadioGroup
                value={preset}
                onValueChange={(v) => setPreset(v as StylePreset)}
                className="grid grid-cols-2 gap-4"
              >
                {PRESETS.map((p) => (
                  <div key={p.id}>
                    <RadioGroupItem
                      value={p.id}
                      id={p.id}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={p.id}
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <p.icon className="mb-3 h-6 w-6" />
                      <span className="font-medium text-center">{p.name}</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        {p.description}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Disclaimer */}
            <div className="rounded-lg border border-dashed p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground">
                AI-generated lifestyle imagery may not perfectly reproduce label
                text or fine packaging details. Review images before publishing.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !productData}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Campaign
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewCampaignContent />
    </Suspense>
  );
}
