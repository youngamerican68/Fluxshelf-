"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/components/ui/use-toast";
import { FileUploader } from "@/components/file-uploader";
import { ColorPicker } from "@/components/color-picker";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function NewBrandPage() {
  const [name, setName] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [logo, setLogo] = useState<File | null>(null);
  const [moodboardImages, setMoodboardImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create the brand
      const { data: brand, error: brandError } = await (supabase
        .from("brands") as any)
        .insert({
          owner_id: user.id,
          name: name || null,
          color_palette: colors.length > 0 ? colors : null,
        })
        .select()
        .single();

      if (brandError) throw brandError;

      // Upload logo if provided
      if (logo) {
        const logoPath = `${user.id}/brands/${brand.id}/assets/logo_${Date.now()}.${logo.name.split(".").pop()}`;
        const { error: logoUploadError } = await supabase.storage
          .from("fluxshield")
          .upload(logoPath, logo);

        if (!logoUploadError) {
          await (supabase.from("brand_assets") as any).insert({
            brand_id: brand.id,
            type: "logo",
            storage_path: logoPath,
          });
        }
      }

      // Upload moodboard images
      for (let i = 0; i < moodboardImages.length && i < 3; i++) {
        const file = moodboardImages[i];
        const moodPath = `${user.id}/brands/${brand.id}/assets/moodboard_${i}_${Date.now()}.${file.name.split(".").pop()}`;
        const { error: moodUploadError } = await supabase.storage
          .from("fluxshield")
          .upload(moodPath, file);

        if (!moodUploadError) {
          await (supabase.from("brand_assets") as any).insert({
            brand_id: brand.id,
            type: "moodboard",
            storage_path: moodPath,
          });
        }
      }

      toast({
        title: "Brand created",
        description: "Your brand has been created successfully",
      });

      router.push(`/app/brands/${brand.id}`);
    } catch (error) {
      console.error("Error creating brand:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create brand",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
          <CardTitle>Set Up Your Brand (Optional)</CardTitle>
          <CardDescription>
            Add brand assets for consistent styling across campaigns. You can
            skip this and create a campaign directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Brand Name</Label>
              <Input
                id="name"
                placeholder="My Awesome Brand"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Logo (optional)</Label>
              <FileUploader
                accept="image/*"
                maxFiles={1}
                onFilesChange={(files) => setLogo(files[0] || null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Moodboard / Reference Images (optional)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Upload 1-3 images that represent your brand aesthetic
              </p>
              <FileUploader
                accept="image/*"
                maxFiles={3}
                onFilesChange={setMoodboardImages}
              />
            </div>

            <div className="space-y-2">
              <Label>Brand Colors (optional)</Label>
              <ColorPicker colors={colors} onChange={setColors} />
            </div>

            <div className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Brand
              </Button>
              <Link href="/app/campaigns/new" className="w-full">
                <Button type="button" variant="outline" className="w-full">
                  Skip for now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
