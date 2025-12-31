import { fal } from "@fal-ai/client";
import type { StylePreset } from "@/types/database";

// Configure fal.ai client lazily
let _configured = false;
function ensureFalConfigured() {
  if (!_configured && process.env.FAL_KEY) {
    fal.config({
      credentials: process.env.FAL_KEY,
    });
    _configured = true;
  }
  if (!process.env.FAL_KEY) {
    throw new Error("FAL_KEY is not configured");
  }
}

interface GenerateImageParams {
  preset: StylePreset;
  productTitle: string;
  productDescription: string;
  brandColors?: string[];
  referenceImageUrls?: string[];
  index: number;
}

interface FalImageResult {
  images: Array<{
    url: string;
    width: number;
    height: number;
    content_type: string;
  }>;
  seed: number;
  prompt: string;
}

// Preset configurations for different styles
const PRESET_CONFIGS: Record<
  StylePreset,
  {
    style: string;
    lighting: string;
    background: string;
    mood: string;
  }
> = {
  bright_minimal: {
    style: "clean minimalist product photography",
    lighting: "bright natural soft lighting, high key",
    background: "pure white or light neutral background",
    mood: "fresh, modern, airy, professional",
  },
  dark_moody: {
    style: "dramatic luxury product photography",
    lighting: "low key dramatic lighting, deep shadows, rim lighting",
    background: "dark textured background, black or deep gray",
    mood: "sophisticated, premium, mysterious, elegant",
  },
  outdoor_lifestyle: {
    style: "lifestyle product photography in natural setting",
    lighting: "golden hour natural sunlight, warm tones",
    background: "outdoor natural environment, bokeh background",
    mood: "adventurous, authentic, active, vibrant",
  },
  studio_macro: {
    style: "detailed macro product photography",
    lighting: "controlled studio lighting, precise highlights",
    background: "gradient studio backdrop",
    mood: "detailed, precise, professional, high-end",
  },
};

// Different scene variations for the 12 images
const SCENE_VARIATIONS = [
  "hero shot, centered composition",
  "45-degree angle, showing depth",
  "flat lay arrangement from above",
  "in-use lifestyle context",
  "detail close-up shot",
  "artistic composition with negative space",
  "group arrangement with props",
  "environmental context shot",
  "dynamic angle, slight motion blur suggestion",
  "packaging and product together",
  "scale reference with hand or object",
  "texture and material focus",
];

function buildPrompt(params: GenerateImageParams): string {
  const config = PRESET_CONFIGS[params.preset];
  const sceneVariation = SCENE_VARIATIONS[params.index % SCENE_VARIATIONS.length];

  let prompt = `Professional e-commerce product photography of ${params.productTitle}. `;
  prompt += `${params.productDescription ? `Product: ${params.productDescription.slice(0, 200)}. ` : ""}`;
  prompt += `Style: ${config.style}. `;
  prompt += `Lighting: ${config.lighting}. `;
  prompt += `Background: ${config.background}. `;
  prompt += `Mood: ${config.mood}. `;
  prompt += `Composition: ${sceneVariation}. `;

  if (params.brandColors && params.brandColors.length > 0) {
    prompt += `Brand color accent: ${params.brandColors.join(", ")}. `;
  }

  prompt += "High resolution, commercial quality, 8K, sharp focus, professional product photography.";

  return prompt;
}

export async function generateImage(
  params: GenerateImageParams
): Promise<{ url: string; prompt: string; seed?: number }> {
  ensureFalConfigured();
  const prompt = buildPrompt(params);

  try {
    // Using fal.ai's flux-pro model for high-quality image generation
    // Alternative models: "fal-ai/flux/schnell" (faster), "fal-ai/flux/dev" (dev mode)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (fal.subscribe as any)("fal-ai/flux-pro/v1.1", {
      input: {
        prompt,
        image_size: "square_hd", // 1024x1024 for square, will be cropped later
        num_images: 1,
        safety_tolerance: "2",
        output_format: "jpeg",
      },
      logs: true,
    }) as FalImageResult;

    if (!result.images || result.images.length === 0) {
      throw new Error("No images returned from fal.ai");
    }

    return {
      url: result.images[0].url,
      prompt,
      seed: result.seed,
    };
  } catch (error) {
    console.error("fal.ai generation error:", error);
    throw new Error(
      `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function generateCampaignImages(params: {
  preset: StylePreset;
  productTitle: string;
  productDescription: string;
  brandColors?: string[];
  referenceImageUrls?: string[];
}): Promise<Array<{ url: string; prompt: string; seed?: number; index: number }>> {
  const results: Array<{ url: string; prompt: string; seed?: number; index: number }> = [];

  // Generate 12 images with different scene variations
  // Process in batches of 3 to avoid rate limiting
  for (let batch = 0; batch < 4; batch++) {
    const batchPromises = [];
    for (let i = 0; i < 3; i++) {
      const index = batch * 3 + i;
      batchPromises.push(
        generateImage({
          ...params,
          index,
        }).then((result) => ({ ...result, index }))
      );
    }

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Small delay between batches to avoid rate limiting
    if (batch < 3) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results.sort((a, b) => a.index - b.index);
}

// Placeholder for image-to-image generation with reference images
// This would use flux/dev with image input if needed
export async function generateImageWithReference(
  params: GenerateImageParams & { referenceImageUrl: string }
): Promise<{ url: string; prompt: string; seed?: number }> {
  // For now, fall back to text-to-image
  // Image-to-image would require using a different model endpoint
  // such as "fal-ai/flux/dev" with image input
  console.log(
    "Reference image provided but not used - would require img2img model"
  );
  return generateImage(params);
}
