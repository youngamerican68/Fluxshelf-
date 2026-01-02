"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { X, Loader2, ImagePlus } from "lucide-react";

interface ProductImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

export function ProductImageUploader({
  images,
  onImagesChange,
  maxImages = 5,
}: ProductImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const newImages: string[] = [];

      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          continue;
        }

        // Generate unique filename
        const ext = file.name.split(".").pop() || "jpg";
        const filename = `${crypto.randomUUID()}.${ext}`;
        const path = `${user.id}/uploads/${filename}`;

        // Upload to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from("fluxshield")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("fluxshield").getPublicUrl(path);

        newImages.push(publicUrl);
      }

      // Add new images to existing
      const combinedImages = [...images, ...newImages].slice(0, maxImages);
      onImagesChange(combinedImages);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-3">
      {/* Image grid */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={`Product ${i + 1}`}
                className="w-16 h-16 rounded-md object-cover border"
              />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
              {i === 0 && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] bg-primary text-primary-foreground px-1 rounded">
                  Primary
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {images.length < maxImages && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <ImagePlus className="mr-2 h-4 w-4" />
                {images.length === 0 ? "Upload Product Image" : "Add More"}
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            First image will be used for generation. Max {maxImages} images, 10MB each.
          </p>
        </div>
      )}
    </div>
  );
}
