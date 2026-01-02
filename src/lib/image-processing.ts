import sharp from "sharp";
import crypto from "crypto";

interface CropResult {
  square: Buffer;
  portrait: Buffer;
  story: Buffer;
}

interface CompositeResult {
  image: Buffer;
  width: number;
  height: number;
}

// Standard social media dimensions
const DIMENSIONS = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
};

export async function createCrops(imageBuffer: Buffer): Promise<CropResult> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  const width = metadata.width || 1024;
  const height = metadata.height || 1024;

  // Create square crop (1:1)
  const squareBuffer = await cropAndResize(
    imageBuffer,
    width,
    height,
    DIMENSIONS.square.width,
    DIMENSIONS.square.height
  );

  // Create portrait crop (4:5)
  const portraitBuffer = await cropAndResize(
    imageBuffer,
    width,
    height,
    DIMENSIONS.portrait.width,
    DIMENSIONS.portrait.height
  );

  // Create story crop (9:16)
  const storyBuffer = await cropAndResize(
    imageBuffer,
    width,
    height,
    DIMENSIONS.story.width,
    DIMENSIONS.story.height
  );

  return {
    square: squareBuffer,
    portrait: portraitBuffer,
    story: storyBuffer,
  };
}

async function cropAndResize(
  buffer: Buffer,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): Promise<Buffer> {
  const targetRatio = targetWidth / targetHeight;
  const sourceRatio = sourceWidth / sourceHeight;

  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  let left = 0;
  let top = 0;

  if (sourceRatio > targetRatio) {
    // Source is wider - crop sides
    cropWidth = Math.round(sourceHeight * targetRatio);
    left = Math.round((sourceWidth - cropWidth) / 2);
  } else {
    // Source is taller - crop top/bottom
    cropHeight = Math.round(sourceWidth / targetRatio);
    top = Math.round((sourceHeight - cropHeight) / 2);
  }

  return sharp(buffer)
    .extract({
      left,
      top,
      width: cropWidth,
      height: cropHeight,
    })
    .resize(targetWidth, targetHeight, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .jpeg({ quality: 90 })
    .toBuffer();
}

export async function createThumbnail(
  imageBuffer: Buffer,
  size: number = 400
): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(size, size, {
      fit: "cover",
      position: "center",
    })
    .jpeg({ quality: 80 })
    .toBuffer();
}

export async function optimizeImage(
  imageBuffer: Buffer,
  maxSize: number = 2048
): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  let resized = image;
  if ((metadata.width || 0) > maxSize || (metadata.height || 0) > maxSize) {
    resized = image.resize(maxSize, maxSize, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  return resized.jpeg({ quality: 85 }).toBuffer();
}

export async function getImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

// ============================================================================
// NEW FUNCTIONS FOR CUTOUT + COMPOSITE PIPELINE
// ============================================================================

/**
 * Compute SHA-256 hash of an image buffer.
 * Used for caching cutouts to avoid redundant background removal calls.
 */
export function hashImage(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Composite a product cutout (PNG with transparency) onto a background image.
 * The product is centered and scaled to ~60% of the background width.
 *
 * @param cutout - PNG buffer with transparent background (product cutout)
 * @param background - JPEG/PNG buffer of the background scene
 * @returns Composited image as JPEG buffer
 */
export async function compositeProductOnBackground(
  cutout: Buffer,
  background: Buffer
): Promise<CompositeResult> {
  // Get dimensions of both images
  const bgMetadata = await sharp(background).metadata();
  const cutoutMetadata = await sharp(cutout).metadata();

  const bgWidth = bgMetadata.width || 1024;
  const bgHeight = bgMetadata.height || 1024;
  const cutoutWidth = cutoutMetadata.width || 512;
  const cutoutHeight = cutoutMetadata.height || 512;

  // Scale product to ~60% of background width while maintaining aspect ratio
  const targetProductWidth = Math.round(bgWidth * 0.6);
  const scaleFactor = targetProductWidth / cutoutWidth;
  const targetProductHeight = Math.round(cutoutHeight * scaleFactor);

  // Resize the cutout
  const resizedCutout = await sharp(cutout)
    .resize(targetProductWidth, targetProductHeight, {
      fit: "inside",
      withoutEnlargement: false,
    })
    .png() // Keep PNG for transparency
    .toBuffer();

  // Get the actual dimensions after resize
  const resizedMeta = await sharp(resizedCutout).metadata();
  const finalProductWidth = resizedMeta.width || targetProductWidth;
  const finalProductHeight = resizedMeta.height || targetProductHeight;

  // Calculate position to center the product
  const left = Math.round((bgWidth - finalProductWidth) / 2);
  const top = Math.round((bgHeight - finalProductHeight) / 2);

  // Composite the cutout onto the background
  const result = await sharp(background)
    .composite([
      {
        input: resizedCutout,
        left,
        top,
        blend: "over",
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  return {
    image: result,
    width: bgWidth,
    height: bgHeight,
  };
}

/**
 * Download an image from a URL and return as Buffer.
 * Used by worker to fetch cutouts and backgrounds from Supabase storage.
 */
export async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
