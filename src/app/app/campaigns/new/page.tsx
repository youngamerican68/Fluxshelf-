"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";
import { ProductImageUploader } from "@/components/product-image-uploader";
import { FileUploader } from "@/components/file-uploader";
import { ColorPicker } from "@/components/color-picker";
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
  Edit2,
  ChevronDown,
  Palette,
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
  const brandIdParam = searchParams.get("brandId");
  const [productUrl, setProductUrl] = useState("");
  const [preset, setPreset] = useState<StylePreset>("bright_minimal");
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [scrapeFailed, setScrapeFailed] = useState(false);

  // Editable product fields
  const [productTitle, setProductTitle] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productImages, setProductImages] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Brand selection/creation
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(brandIdParam);
  const [existingBrands, setExistingBrands] = useState<Array<{ id: string; name: string | null }>>([]);
  const [brandSectionOpen, setBrandSectionOpen] = useState(false);

  // New brand fields (for inline brand creation)
  const [brandColors, setBrandColors] = useState<string[]>([]);

  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  // Derived state: whether we have enough data to proceed
  const hasProductData = productTitle.trim() && productImages.length > 0;

  useEffect(() => {
    const fetchBrands = async () => {
      const { data } = await supabase
        .from("brands")
        .select("id, name")
        .order("created_at", { ascending: false });
      if (data) {
        const brands = data as Array<{ id: string; name: string | null }>;
        setExistingBrands(brands);
        // If we have a brandId param, select it
        if (brandIdParam && brands.find(b => b.id === brandIdParam)) {
          setSelectedBrandId(brandIdParam);
        }
      }
    };
    fetchBrands();
  }, [brandIdParam, supabase]);

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
    setScrapeFailed(false);

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

      // Populate editable fields with scraped data
      setProductTitle(data.title || "");
      setProductDescription(data.description || "");
      setProductPrice(data.price || "");
      setProductImages(data.images || []);
      setIsEditing(false);

      if (!data.images || data.images.length === 0) {
        setScrapeFailed(true);
        toast({
          title: "No images found",
          description: "Please upload a product image manually",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Product found",
          description: `Retrieved: ${data.title}`,
        });
      }
    } catch (error) {
      setScrapeFailed(true);
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

    if (!productTitle.trim()) {
      toast({
        title: "Product title required",
        description: "Please enter a product title",
        variant: "destructive",
      });
      return;
    }

    if (productImages.length === 0) {
      toast({
        title: "Product image required",
        description: "At least one product image is required for generation",
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
          brandId: selectedBrandId || null, // Optional - API will create default if not provided
          brandColors: brandColors.length > 0 ? brandColors : null, // For default brand creation
          productUrl: productUrl || null,
          productTitle: productTitle.trim(),
          productDescription: productDescription.trim() || null,
          productPrice: productPrice.trim() || null,
          productImages,
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

  const selectedBrand = existingBrands.find(b => b.id === selectedBrandId);

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

            {/* Product Data Section - Shows after scrape attempt or when manually entering */}
            {(productTitle || scrapeFailed || productImages.length > 0) && (
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {hasProductData ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    )}
                    <span className="font-medium">Product Details</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    {isEditing ? "Done" : "Edit"}
                  </Button>
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={productTitle}
                        onChange={(e) => setProductTitle(e.target.value)}
                        placeholder="Product name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={productDescription}
                        onChange={(e) => setProductDescription(e.target.value)}
                        placeholder="Product description (optional)"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                        placeholder="e.g. 29.99"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <h4 className="font-medium">{productTitle || "No title"}</h4>
                    {productPrice && (
                      <p className="text-sm text-muted-foreground">${productPrice}</p>
                    )}
                    {productDescription && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {productDescription}
                      </p>
                    )}
                  </div>
                )}

                {/* Product Images */}
                <div>
                  <Label className="mb-2 block">Product Images *</Label>
                  <ProductImageUploader
                    images={productImages}
                    onImagesChange={setProductImages}
                    maxImages={5}
                  />
                </div>
              </div>
            )}

            {/* Manual entry prompt when no URL entered */}
            {!productTitle && !scrapeFailed && productImages.length === 0 && (
              <div className="text-center py-6 border rounded-lg border-dashed">
                <p className="text-sm text-muted-foreground mb-2">
                  Enter a Shopify URL above, or
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setScrapeFailed(true);
                    setIsEditing(true);
                  }}
                >
                  Enter product details manually
                </Button>
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

            {/* Brand Section (Optional) */}
            <Collapsible open={brandSectionOpen} onOpenChange={setBrandSectionOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Brand Settings (Optional)
                    {selectedBrand && (
                      <span className="text-muted-foreground">
                        — {selectedBrand.name || "Unnamed Brand"}
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      brandSectionOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                {/* Existing Brand Selection */}
                {existingBrands.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select Existing Brand</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={selectedBrandId === null ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedBrandId(null)}
                      >
                        New Brand
                      </Button>
                      {existingBrands.map((brand) => (
                        <Button
                          key={brand.id}
                          type="button"
                          variant={selectedBrandId === brand.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedBrandId(brand.id)}
                        >
                          {brand.name || "Unnamed Brand"}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Brand Colors - only show if creating new brand */}
                {!selectedBrandId && (
                  <div className="space-y-2">
                    <Label>Brand Colors</Label>
                    <p className="text-sm text-muted-foreground">
                      Add colors to influence the generated backgrounds
                    </p>
                    <ColorPicker colors={brandColors} onChange={setBrandColors} />
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {selectedBrandId
                    ? "Using existing brand settings for color consistency."
                    : "A default brand will be created with these settings."}
                </p>
              </CollapsibleContent>
            </Collapsible>

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
              disabled={loading || !hasProductData}
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
