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

// ============================================================================
// TYPES
// ============================================================================

interface GenerateImageParams {
  preset: StylePreset;
  productTitle: string;
  productDescription: string;
  brandColors?: string[];
  productImageUrl?: string; // Product image for img2img
  index: number;
}

interface FalImageResult {
  images: Array<{
    url: string;
    width: number;
    height: number;
    content_type: string;
  }>;
  seed?: number;
  prompt?: string;
}

interface FalRembgResult {
  image: {
    url: string;
    width: number;
    height: number;
    content_type: string;
  };
}

export interface BackgroundGenerationResult {
  url: string;
  prompt: string;
  seed?: number;
  index: number;
}

export interface CutoutResult {
  url: string;
  width: number;
  height: number;
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
// These describe the SCENE/CONTEXT for background generation
const SCENE_VARIATIONS = [
  "hero product shot, centered on clean surface, studio lighting",
  "45-degree angle view on marble countertop, soft shadows",
  "flat lay arrangement from above with lifestyle props",
  "in-use lifestyle context, hands interacting with product",
  "extreme close-up detail shot showing texture and quality",
  "artistic composition with negative space, minimalist",
  "styled scene with complementary props and accessories",
  "environmental lifestyle shot, natural setting",
  "dynamic angle on reflective surface, premium feel",
  "unboxing scene with elegant packaging",
  "scale context shot with human element",
  "macro texture focus, highlighting material quality",
];

// ============================================================================
// NEW PIPELINE: Background Removal + Scene Generation + Composite
// ============================================================================

/**
 * Remove background from product image using fal.ai rembg.
 * Returns a PNG with transparent background.
 */
export async function removeBackground(imageUrl: string): Promise<CutoutResult> {
  ensureFalConfigured();

  try {
    // Using fal-ai/imageutils/rembg for background removal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (fal.subscribe as any)("fal-ai/imageutils/rembg", {
      input: {
        image_url: imageUrl,
      },
      logs: true,
    }) as FalRembgResult;

    if (!result.image || !result.image.url) {
      throw new Error("No image returned from fal.ai rembg");
    }

    return {
      url: result.image.url,
      width: result.image.width,
      height: result.image.height,
    };
  } catch (error) {
    console.error("fal.ai background removal error:", error);
    throw new Error(
      `Background removal failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Build a background-only prompt (no product description).
 * The product will be composited on top later.
 */
function buildBackgroundPrompt(preset: StylePreset, index: number, brandColors?: string[]): string {
  const config = PRESET_CONFIGS[preset];
  const sceneVariation = SCENE_VARIATIONS[index % SCENE_VARIATIONS.length];

  let prompt = `Professional product photography background scene. `;
  prompt += `Empty surface ready for product placement. `;
  prompt += `Scene: ${sceneVariation}. `;
  prompt += `Style: ${config.style}. `;
  prompt += `Lighting: ${config.lighting}. `;
  prompt += `Background: ${config.background}. `;
  prompt += `Mood: ${config.mood}. `;

  if (brandColors && brandColors.length > 0) {
    prompt += `Color accents: ${brandColors.join(", ")}. `;
  }

  prompt += "High resolution, commercial quality, sharp focus, professional photography, empty center space for product.";

  return prompt;
}

/**
 * Generate a single background scene using FLUX Schnell (text-to-image).
 * These backgrounds will have the product composited on top later.
 */
export async function generateBackground(params: {
  preset: StylePreset;
  index: number;
  brandColors?: string[];
}): Promise<BackgroundGenerationResult> {
  ensureFalConfigured();
  const prompt = buildBackgroundPrompt(params.preset, params.index, params.brandColors);

  try {
    // Using FLUX Schnell for fast, cheap background generation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (fal.subscribe as any)("fal-ai/flux/schnell", {
      input: {
        prompt,
        image_size: "square_hd", // 1024x1024
        num_images: 1,
        num_inference_steps: 4,
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
      index: params.index,
    };
  } catch (error) {
    console.error("fal.ai background generation error:", error);
    throw new Error(
      `Background generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generate all 12 background scenes for a campaign.
 * Processes in batches of 3 to avoid rate limiting.
 */
export async function generateAllBackgrounds(params: {
  preset: StylePreset;
  brandColors?: string[];
}): Promise<BackgroundGenerationResult[]> {
  const results: BackgroundGenerationResult[] = [];

  console.log("Generating 12 background scenes using FLUX Schnell");

  // Generate 12 backgrounds in batches of 3
  for (let batch = 0; batch < 4; batch++) {
    const batchPromises = [];
    for (let i = 0; i < 3; i++) {
      const index = batch * 3 + i;
      batchPromises.push(
        generateBackground({
          preset: params.preset,
          index,
          brandColors: params.brandColors,
        })
      );
    }

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Small delay between batches to avoid rate limiting
    if (batch < 3) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results.sort((a, b) => a.index - b.index);
}

// ============================================================================
// LEGACY FUNCTIONS (deprecated - kept for backwards compatibility)
// ============================================================================

/**
 * Build a scene-focused prompt for image-to-image generation.
 * When using Redux, we describe the desired SCENE, not the product
 * (the product identity comes from the reference image).
 * @deprecated Use generateBackground + composite instead
 */
function buildScenePrompt(params: GenerateImageParams): string {
  const config = PRESET_CONFIGS[params.preset];
  const sceneVariation = SCENE_VARIATIONS[params.index % SCENE_VARIATIONS.length];

  let prompt = `Professional e-commerce product photography. `;
  prompt += `Scene: ${sceneVariation}. `;
  prompt += `Style: ${config.style}. `;
  prompt += `Lighting: ${config.lighting}. `;
  prompt += `Background: ${config.background}. `;
  prompt += `Mood: ${config.mood}. `;

  if (params.brandColors && params.brandColors.length > 0) {
    prompt += `Brand color accents: ${params.brandColors.join(", ")}. `;
  }

  prompt += "High resolution, commercial quality, sharp focus, professional product photography.";

  return prompt;
}

/**
 * Build a full product prompt for text-to-image generation (fallback).
 * Used when no product image is available.
 */
function buildTextToImagePrompt(params: GenerateImageParams): string {
  const config = PRESET_CONFIGS[params.preset];
  const sceneVariation = SCENE_VARIATIONS[params.index % SCENE_VARIATIONS.length];

  let prompt = `Professional e-commerce product photography of ${params.productTitle}. `;
  if (params.productDescription) {
    prompt += `Product: ${params.productDescription.slice(0, 200)}. `;
  }
  prompt += `Scene: ${sceneVariation}. `;
  prompt += `Style: ${config.style}. `;
  prompt += `Lighting: ${config.lighting}. `;
  prompt += `Background: ${config.background}. `;
  prompt += `Mood: ${config.mood}. `;

  if (params.brandColors && params.brandColors.length > 0) {
    prompt += `Brand color accents: ${params.brandColors.join(", ")}. `;
  }

  prompt += "High resolution, commercial quality, 8K, sharp focus, professional product photography.";

  return prompt;
}

/**
 * Generate an image using FLUX Redux (image-to-image).
 * Takes the product image and transforms it into different lifestyle scenes.
 */
async function generateWithRedux(
  params: GenerateImageParams & { productImageUrl: string }
): Promise<{ url: string; prompt: string; seed?: number }> {
  ensureFalConfigured();
  const prompt = buildScenePrompt(params);

  try {
    // Using FLUX Redux Dev for image-to-image generation
    // This maintains product identity while transforming the scene
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (fal.subscribe as any)("fal-ai/flux/dev/redux", {
      input: {
        image_url: params.productImageUrl,
        prompt,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        image_size: "square_hd",
        output_format: "jpeg",
      },
      logs: true,
    }) as FalImageResult;

    if (!result.images || result.images.length === 0) {
      throw new Error("No images returned from fal.ai Redux");
    }

    return {
      url: result.images[0].url,
      prompt,
      seed: result.seed,
    };
  } catch (error) {
    console.error("fal.ai Redux generation error:", error);
    throw new Error(
      `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generate an image using text-to-image (fallback when no product image available).
 */
async function generateWithTextToImage(
  params: GenerateImageParams
): Promise<{ url: string; prompt: string; seed?: number }> {
  ensureFalConfigured();
  const prompt = buildTextToImagePrompt(params);

  try {
    // Fallback to text-to-image using FLUX Schnell (cheaper)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (fal.subscribe as any)("fal-ai/flux/schnell", {
      input: {
        prompt,
        image_size: "square_hd",
        num_images: 1,
        num_inference_steps: 4,
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
    console.error("fal.ai text-to-image generation error:", error);
    throw new Error(
      `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generate a single image - uses Redux if product image provided, otherwise text-to-image.
 */
export async function generateImage(
  params: GenerateImageParams
): Promise<{ url: string; prompt: string; seed?: number }> {
  if (params.productImageUrl) {
    // Use image-to-image with product photo as reference
    return generateWithRedux({ ...params, productImageUrl: params.productImageUrl });
  } else {
    // Fallback to text-to-image
    console.warn("No product image provided - falling back to text-to-image generation");
    return generateWithTextToImage(params);
  }
}

/**
 * Generate all 12 campaign images.
 */
export async function generateCampaignImages(params: {
  preset: StylePreset;
  productTitle: string;
  productDescription: string;
  brandColors?: string[];
  productImageUrl?: string; // Product image from Shopify scrape
}): Promise<Array<{ url: string; prompt: string; seed?: number; index: number }>> {
  const results: Array<{ url: string; prompt: string; seed?: number; index: number }> = [];

  const useRedux = !!params.productImageUrl;
  console.log(`Generating 12 images using ${useRedux ? "FLUX Redux (img2img)" : "FLUX Schnell (text2img)"}`);

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
