import sharp from "sharp";

interface CropResult {
  square: Buffer;
  portrait: Buffer;
  story: Buffer;
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
